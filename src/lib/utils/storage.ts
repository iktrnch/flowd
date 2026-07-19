import type { DiagramDocument, DiagramEdge, DiagramNode } from '$lib/types/diagram';

export const DOCUMENTS_STORAGE_KEY = 'diagram-app:documents:v1';
export const ACTIVE_DOCUMENT_STORAGE_KEY = 'diagram-app:active-document:v1';

function makeId(prefix: string): string {
	return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function createDiagramDocument(now = new Date()): DiagramDocument {
	const timestamp = now.toISOString();
	return {
		version: 1,
		id: makeId('diagram'),
		name: 'Untitled diagram',
		nodes: [],
		edges: [],
		viewport: { x: 0, y: 0, zoom: 1 },
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function parseDiagramDocument(value: unknown): DiagramDocument | null {
	if (
		!isRecord(value) ||
		value.version !== 1 ||
		typeof value.id !== 'string' ||
		typeof value.name !== 'string'
	)
		return null;
	if (!Array.isArray(value.nodes) || !Array.isArray(value.edges) || !isRecord(value.viewport))
		return null;
	if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') return null;
	const { x, y, zoom } = value.viewport;
	if (
		![x, y, zoom].every((item) => typeof item === 'number' && Number.isFinite(item)) ||
		(zoom as number) <= 0
	)
		return null;
	const nodes = value.nodes.filter(isValidNode) as DiagramNode[];
	const edges = value.edges.filter(isValidEdge) as DiagramEdge[];
	if (nodes.length !== value.nodes.length || edges.length !== value.edges.length) return null;
	return {
		...value,
		nodes,
		edges,
		viewport: { x: x as number, y: y as number, zoom: zoom as number }
	} as DiagramDocument;
}

function isValidNode(value: unknown): boolean {
	if (
		!isRecord(value) ||
		typeof value.id !== 'string' ||
		!isRecord(value.position) ||
		!isRecord(value.data)
	)
		return false;
	return (
		value.type === 'shape' &&
		['rectangle', 'rounded-rectangle', 'ellipse', 'diamond'].includes(String(value.data.shape)) &&
		typeof value.data.label === 'string' &&
		typeof value.data.width === 'number' &&
		typeof value.data.height === 'number' &&
		typeof value.position.x === 'number' &&
		typeof value.position.y === 'number'
	);
}

function isValidEdge(value: unknown): boolean {
	return (
		isRecord(value) &&
		value.type === 'floating' &&
		typeof value.id === 'string' &&
		typeof value.source === 'string' &&
		typeof value.target === 'string'
	);
}

export function parseStoredDocuments(raw: string | null): DiagramDocument[] {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.map(parseDiagramDocument).filter((doc): doc is DiagramDocument => doc !== null);
	} catch {
		return [];
	}
}

export function loadActiveDocument(storage: Pick<Storage, 'getItem'>): DiagramDocument {
	const documents = parseStoredDocuments(storage.getItem(DOCUMENTS_STORAGE_KEY));
	const activeId = storage.getItem(ACTIVE_DOCUMENT_STORAGE_KEY);
	return (
		documents.find((document) => document.id === activeId) ??
		documents[0] ??
		createDiagramDocument()
	);
}

export function serializableNode(node: DiagramNode): DiagramNode {
	return {
		id: node.id,
		type: 'shape',
		position: { x: node.position.x, y: node.position.y },
		data: {
			shape: node.data.shape,
			label: node.data.label,
			width: node.data.width,
			height: node.data.height
		},
		width: node.width ?? node.data.width,
		height: node.height ?? node.data.height,
		ariaLabel: node.ariaLabel
	};
}

export function serializableEdge(edge: DiagramEdge): DiagramEdge {
	return {
		id: edge.id,
		type: 'floating',
		source: edge.source,
		target: edge.target,
		sourceHandle: edge.sourceHandle,
		targetHandle: edge.targetHandle,
		ariaLabel: edge.ariaLabel
	};
}

export function saveDocument(
	storage: Pick<Storage, 'getItem' | 'setItem'>,
	document: DiagramDocument
): void {
	const documents = parseStoredDocuments(storage.getItem(DOCUMENTS_STORAGE_KEY));
	const clean = {
		...document,
		nodes: document.nodes.map(serializableNode),
		edges: document.edges.map(serializableEdge)
	};
	const index = documents.findIndex((item) => item.id === clean.id);
	if (index >= 0) documents[index] = clean;
	else documents.push(clean);
	storage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
	storage.setItem(ACTIVE_DOCUMENT_STORAGE_KEY, clean.id);
}

export function createEntityId(prefix: 'node' | 'edge'): string {
	return makeId(prefix);
}
