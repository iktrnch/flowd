import { getShapeDefinition } from '$lib/config/shapes';
import { theme } from '$lib/config/theme';
import type { DiagramEdge, DiagramNode, Rect } from '$lib/types/diagram';
import { getEdgeEndpoints, getNodeRect } from './geometry';

export type ExportScope = 'whole' | 'selection';
export type ExportFormat = 'svg' | 'png';

export interface ExportContent {
	nodes: DiagramNode[];
	edges: DiagramEdge[];
}

export interface SvgExportResult {
	svg: string;
	width: number;
	height: number;
}

export function getExportContent(
	nodes: DiagramNode[],
	edges: DiagramEdge[],
	scope: ExportScope
): ExportContent {
	if (scope === 'whole') return { nodes: [...nodes], edges: [...edges] };
	const selectedNodes = nodes.filter((node) => node.selected);
	const selectedIds = new Set(selectedNodes.map((node) => node.id));
	return {
		nodes: selectedNodes,
		edges: edges.filter(
			(edge) => edge.selected || (selectedIds.has(edge.source) && selectedIds.has(edge.target))
		)
	};
}

export function getContentBounds(content: ExportContent, allNodes = content.nodes): Rect | null {
	const rects = content.nodes.map(getNodeRect);
	const lookup = new Map(allNodes.map((node) => [node.id, node]));
	for (const edge of content.edges) {
		const source = lookup.get(edge.source);
		const target = lookup.get(edge.target);
		if (!source || !target) continue;
		const endpoints = getEdgeEndpoints(source, target);
		rects.push({
			x: Math.min(endpoints.source.x, endpoints.target.x),
			y: Math.min(endpoints.source.y, endpoints.target.y),
			width: Math.abs(endpoints.target.x - endpoints.source.x),
			height: Math.abs(endpoints.target.y - endpoints.source.y)
		});
	}
	if (rects.length === 0) return null;
	const left = Math.min(...rects.map((rect) => rect.x));
	const top = Math.min(...rects.map((rect) => rect.y));
	const right = Math.max(...rects.map((rect) => rect.x + rect.width));
	const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
	return { x: left, y: top, width: right - left, height: bottom - top };
}

export function escapeXml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		const entities: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&apos;'
		};
		return entities[character];
	});
}

export function sanitizeFilename(value: string): string {
	const sanitized = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
	return sanitized || 'untitled-diagram';
}

function nodeSvg(node: DiagramNode, offsetX: number, offsetY: number): string {
	const rect = getNodeRect(node);
	const x = rect.x + offsetX;
	const y = rect.y + offsetY;
	const centerX = x + rect.width / 2;
	const centerY = y + rect.height / 2;
	const style = `fill="${theme.shapeFill}" stroke="${theme.shapeBorderColor}" stroke-width="${theme.shapeBorderWidth}"`;
	let shape: string;
	if (node.data.shape === 'ellipse') {
		shape = `<ellipse cx="${centerX}" cy="${centerY}" rx="${rect.width / 2}" ry="${rect.height / 2}" ${style}/>`;
	} else if (node.data.shape === 'diamond') {
		shape = `<polygon points="${centerX},${y} ${x + rect.width},${centerY} ${centerX},${y + rect.height} ${x},${centerY}" ${style}/>`;
	} else {
		shape = `<rect x="${x}" y="${y}" width="${rect.width}" height="${rect.height}" rx="${getShapeDefinition(node.data.shape).cornerRadius}" ${style}/>`;
	}
	const lines = node.data.label.split('\n');
	const lineHeight = theme.fontSize * 1.3;
	const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
	const text = lines
		.map(
			(line, index) =>
				`<tspan x="${centerX}" y="${startY + index * lineHeight}">${escapeXml(line)}</tspan>`
		)
		.join('');
	return `${shape}<text text-anchor="middle" dominant-baseline="middle" fill="${theme.shapeTextColor}" font-family="${escapeXml(theme.fontFamily)}" font-size="${theme.fontSize}">${text}</text>`;
}

export function generateSvg(
	content: ExportContent,
	allNodes: DiagramNode[],
	keepBackground: boolean,
	padding = 40
): SvgExportResult | null {
	const bounds = getContentBounds(content, allNodes);
	if (!bounds) return null;
	const width = Math.max(1, Math.ceil(bounds.width + padding * 2));
	const height = Math.max(1, Math.ceil(bounds.height + padding * 2));
	const offsetX = -bounds.x + padding;
	const offsetY = -bounds.y + padding;
	const lookup = new Map(allNodes.map((node) => [node.id, node]));
	const marker = `<marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 8 4 L 0 8 z" fill="${theme.edgeColor}"/></marker>`;
	const background = keepBackground
		? `<defs><pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${theme.gridDotColor}"/></pattern>${marker}</defs><rect width="100%" height="100%" fill="${theme.canvasBackground}"/><rect width="100%" height="100%" fill="url(#dot-grid)"/>`
		: `<defs>${marker}</defs>`;
	const edgeSvg = content.edges
		.map((edge) => {
			const source = lookup.get(edge.source);
			const target = lookup.get(edge.target);
			if (!source || !target) return '';
			const endpoints = getEdgeEndpoints(source, target);
			return `<path d="M ${endpoints.source.x + offsetX} ${endpoints.source.y + offsetY} L ${endpoints.target.x + offsetX} ${endpoints.target.y + offsetY}" fill="none" stroke="${theme.edgeColor}" stroke-width="${theme.edgeWidth}" marker-end="url(#arrowhead)"/>`;
		})
		.join('');
	const nodeMarkup = content.nodes.map((node) => nodeSvg(node, offsetX, offsetY)).join('');
	return {
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${background}${edgeSvg}${nodeMarkup}</svg>`,
		width,
		height
	};
}

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function svgToPng(result: SvgExportResult): Promise<Blob> {
	const scale = Math.min(2, 8192 / Math.max(result.width, result.height));
	const imageUrl = URL.createObjectURL(
		new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' })
	);
	try {
		const image = new Image();
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error('The exported SVG could not be rendered.'));
			image.src = imageUrl;
		});
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, Math.round(result.width * scale));
		canvas.height = Math.max(1, Math.round(result.height * scale));
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Canvas export is unavailable in this browser.');
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		return await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed.'))),
				'image/png'
			)
		);
	} finally {
		URL.revokeObjectURL(imageUrl);
	}
}
