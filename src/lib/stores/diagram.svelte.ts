import { getShapeDefinition, shapeConfig } from '$lib/config/shapes';
import type {
	DiagramDocument,
	DiagramEdge,
	DiagramNode,
	DiagramSnapshot,
	Point,
	ShapeType
} from '$lib/types/diagram';
import {
	createDiagramDocument,
	createEntityId,
	loadActiveDocument,
	saveDocument,
	serializableEdge,
	serializableNode
} from '$lib/utils/storage';
import { DiagramHistory } from './history.svelte';

const SAVE_DELAY_MS = 250;
const DUPLICATE_OFFSET = 24;

export class DiagramStore {
	document = $state<DiagramDocument>(createDiagramDocument());
	nodes = $state.raw<DiagramNode[]>([]);
	edges = $state.raw<DiagramEdge[]>([]);
	editingNodeId = $state<string | null>(null);
	readonly history = new DiagramHistory(100);
	#saveTimer: ReturnType<typeof setTimeout> | null = null;
	#dragBefore: DiagramSnapshot | null = null;

	get name(): string {
		return this.document.name;
	}

	load(): void {
		if (typeof window === 'undefined') return;
		this.document = loadActiveDocument(window.localStorage);
		this.nodes = this.document.nodes.map((node) => ({ ...node }));
		this.edges = this.document.edges.map((edge) => ({ ...edge }));
		this.history.clear();
	}

	destroy(): void {
		if (this.#saveTimer) clearTimeout(this.#saveTimer);
		this.saveNow();
	}

	snapshot(): DiagramSnapshot {
		return {
			nodes: this.nodes.map(serializableNode),
			edges: this.edges.map(serializableEdge)
		};
	}

	createNode(
		center: Point,
		shape: ShapeType = shapeConfig.defaultShape,
		sourceNodeId?: string
	): DiagramNode {
		const before = this.snapshot();
		const definition = getShapeDefinition(shape);
		const node: DiagramNode = {
			id: createEntityId('node'),
			type: 'shape',
			position: {
				x: center.x - definition.defaultWidth / 2,
				y: center.y - definition.defaultHeight / 2
			},
			data: {
				shape,
				label: '',
				width: definition.defaultWidth,
				height: definition.defaultHeight
			},
			width: definition.defaultWidth,
			height: definition.defaultHeight,
			selected: true,
			ariaLabel: `${definition.label} shape`
		};
		this.nodes = [...this.nodes.map((item) => ({ ...item, selected: false })), node];
		this.edges = this.edges.map((edge) => ({ ...edge, selected: false }));
		if (sourceNodeId) this.addEdgeInternal(sourceNodeId, node.id);
		this.history.record(before, this.snapshot());
		this.editingNodeId = node.id;
		this.scheduleSave();
		return node;
	}

	addEdge(source: string, target: string): boolean {
		const before = this.snapshot();
		const added = this.addEdgeInternal(source, target);
		if (added) {
			this.history.record(before, this.snapshot());
			this.scheduleSave();
		}
		return added;
	}

	private addEdgeInternal(source: string, target: string): boolean {
		if (
			source === target ||
			!this.nodes.some((node) => node.id === source) ||
			!this.nodes.some((node) => node.id === target)
		)
			return false;
		if (this.edges.some((edge) => edge.source === source && edge.target === target)) return false;
		const edge: DiagramEdge = {
			id: createEntityId('edge'),
			type: 'floating',
			source,
			target,
			selected: false,
			ariaLabel: 'Arrow'
		};
		this.edges = [...this.edges, edge];
		return true;
	}

	selectNode(id: string, toggle = false): void {
		this.nodes = this.nodes.map((node) => ({
			...node,
			selected: toggle ? (node.id === id ? !node.selected : node.selected) : node.id === id
		}));
		if (!toggle) this.edges = this.edges.map((edge) => ({ ...edge, selected: false }));
	}

	selectEdge(id: string, toggle = false): void {
		this.edges = this.edges.map((edge) => ({
			...edge,
			selected: toggle ? (edge.id === id ? !edge.selected : edge.selected) : edge.id === id
		}));
		if (!toggle) this.nodes = this.nodes.map((node) => ({ ...node, selected: false }));
	}

	clearSelection(): void {
		this.nodes = this.nodes.map((node) => ({ ...node, selected: false }));
		this.edges = this.edges.map((edge) => ({ ...edge, selected: false }));
	}

	selectAll(): void {
		this.nodes = this.nodes.map((node) => ({ ...node, selected: true }));
		this.edges = this.edges.map((edge) => ({ ...edge, selected: true }));
	}

	startEditing(id: string): void {
		if (this.nodes.some((node) => node.id === id)) this.editingNodeId = id;
	}

	commitText(id: string, text: string): void {
		const node = this.nodes.find((item) => item.id === id);
		if (!node) return;
		const before = this.snapshot();
		this.nodes = this.nodes.map((item) =>
			item.id === id ? { ...item, data: { ...item.data, label: text } } : item
		);
		this.editingNodeId = null;
		if (this.history.record(before, this.snapshot())) this.scheduleSave();
	}

	cancelEditing(): void {
		this.editingNodeId = null;
	}

	deleteSelection(): boolean {
		const nodeIds = new Set(this.nodes.filter((node) => node.selected).map((node) => node.id));
		const edgeIds = new Set(this.edges.filter((edge) => edge.selected).map((edge) => edge.id));
		if (nodeIds.size === 0 && edgeIds.size === 0) return false;
		const before = this.snapshot();
		this.nodes = this.nodes.filter((node) => !nodeIds.has(node.id));
		this.edges = this.edges.filter(
			(edge) => !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target)
		);
		if (this.editingNodeId && nodeIds.has(this.editingNodeId)) this.editingNodeId = null;
		this.history.record(before, this.snapshot());
		this.scheduleSave();
		return true;
	}

	deleteNode(id: string): void {
		this.clearSelection();
		this.nodes = this.nodes.map((node) => ({ ...node, selected: node.id === id }));
		this.deleteSelection();
	}

	deleteEdge(id: string): void {
		this.clearSelection();
		this.edges = this.edges.map((edge) => ({ ...edge, selected: edge.id === id }));
		this.deleteSelection();
	}

	duplicateSelection(nodeId?: string): boolean {
		if (nodeId) {
			this.nodes = this.nodes.map((node) => ({ ...node, selected: node.id === nodeId }));
			this.edges = this.edges.map((edge) => ({ ...edge, selected: false }));
		}
		const selected = this.nodes.filter((node) => node.selected);
		if (selected.length === 0) return false;
		const before = this.snapshot();
		const idMap = new Map<string, string>();
		const duplicates = selected.map((node) => {
			const id = createEntityId('node');
			idMap.set(node.id, id);
			return {
				...serializableNode(node),
				id,
				position: { x: node.position.x + DUPLICATE_OFFSET, y: node.position.y + DUPLICATE_OFFSET },
				selected: true
			};
		});
		const duplicateEdges = this.edges
			.filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
			.map((edge) => ({
				...serializableEdge(edge),
				id: createEntityId('edge'),
				source: idMap.get(edge.source)!,
				target: idMap.get(edge.target)!,
				selected: true
			}));
		this.nodes = [...this.nodes.map((node) => ({ ...node, selected: false })), ...duplicates];
		this.edges = [...this.edges.map((edge) => ({ ...edge, selected: false })), ...duplicateEdges];
		this.history.record(before, this.snapshot());
		this.scheduleSave();
		return true;
	}

	changeShape(id: string, shape: ShapeType): void {
		const node = this.nodes.find((item) => item.id === id);
		if (!node || node.data.shape === shape) return;
		const before = this.snapshot();
		const definition = getShapeDefinition(shape);
		this.nodes = this.nodes.map((item) =>
			item.id === id
				? {
						...item,
						data: {
							...item.data,
							shape,
							width: definition.defaultWidth,
							height: definition.defaultHeight
						},
						width: definition.defaultWidth,
						height: definition.defaultHeight
					}
				: item
		);
		this.history.record(before, this.snapshot());
		this.scheduleSave();
	}

	moveSelected(dx: number, dy: number): boolean {
		if (!this.nodes.some((node) => node.selected)) return false;
		const before = this.snapshot();
		this.nodes = this.nodes.map((node) =>
			node.selected
				? { ...node, position: { x: node.position.x + dx, y: node.position.y + dy } }
				: node
		);
		this.history.record(before, this.snapshot());
		this.scheduleSave();
		return true;
	}

	beginDrag(): void {
		this.#dragBefore = this.snapshot();
	}

	finishDrag(): void {
		if (!this.#dragBefore) return;
		this.history.record(this.#dragBefore, this.snapshot());
		this.#dragBefore = null;
		this.scheduleSave();
	}

	undo(): boolean {
		const snapshot = this.history.undo(this.snapshot());
		if (!snapshot) return false;
		this.restore(snapshot);
		return true;
	}

	redo(): boolean {
		const snapshot = this.history.redo(this.snapshot());
		if (!snapshot) return false;
		this.restore(snapshot);
		return true;
	}

	setViewport(viewport: DiagramDocument['viewport']): void {
		this.document.viewport = viewport;
		this.scheduleSave();
	}

	scheduleSave(): void {
		if (typeof window === 'undefined') return;
		if (this.#saveTimer) clearTimeout(this.#saveTimer);
		this.#saveTimer = setTimeout(() => this.saveNow(), SAVE_DELAY_MS);
	}

	saveNow(): void {
		if (typeof window === 'undefined') return;
		if (this.#saveTimer) clearTimeout(this.#saveTimer);
		this.#saveTimer = null;
		const now = new Date().toISOString();
		this.document = {
			...this.document,
			nodes: this.nodes,
			edges: this.edges,
			updatedAt: now
		};
		saveDocument(window.localStorage, this.document);
	}

	private restore(snapshot: DiagramSnapshot): void {
		this.nodes = snapshot.nodes;
		this.edges = snapshot.edges;
		this.editingNodeId = null;
		this.scheduleSave();
	}
}
