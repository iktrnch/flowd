import { getShapeDefinition } from '$lib/config/shapes';
import type { DiagramNode, Point, Rect, ShapeType } from '$lib/types/diagram';

const EPSILON = 0.0001;

export function getNodeSize(node: DiagramNode): { width: number; height: number } {
	const definition = getShapeDefinition(node.data.shape);
	return {
		width: node.measured?.width ?? node.width ?? node.data.width ?? definition.defaultWidth,
		height: node.measured?.height ?? node.height ?? node.data.height ?? definition.defaultHeight
	};
}

export function getNodeRect(node: DiagramNode): Rect {
	const { width, height } = getNodeSize(node);
	return { x: node.position.x, y: node.position.y, width, height };
}

export function getRectCenter(rect: Rect): Point {
	return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function screenToFlowPoint(
	point: Point,
	viewport: { x: number; y: number; zoom: number }
): Point {
	return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom };
}

function ellipseIntersection(rect: Rect, toward: Point): Point {
	const center = getRectCenter(rect);
	const dx = toward.x - center.x;
	const dy = toward.y - center.y;
	const rx = rect.width / 2;
	const ry = rect.height / 2;
	const scale = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
	return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function diamondIntersection(rect: Rect, toward: Point): Point {
	const center = getRectCenter(rect);
	const dx = toward.x - center.x;
	const dy = toward.y - center.y;
	const scale = 1 / (Math.abs(dx) / (rect.width / 2) + Math.abs(dy) / (rect.height / 2));
	return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function rectangleIntersection(rect: Rect, toward: Point): Point {
	const center = getRectCenter(rect);
	const dx = toward.x - center.x;
	const dy = toward.y - center.y;
	const scale = Math.min(
		rect.width / 2 / Math.max(Math.abs(dx), EPSILON),
		rect.height / 2 / Math.max(Math.abs(dy), EPSILON)
	);
	return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function roundedRectangleIntersection(rect: Rect, toward: Point, radius: number): Point {
	const point = rectangleIntersection(rect, toward);
	const center = getRectCenter(rect);
	const halfWidth = rect.width / 2;
	const halfHeight = rect.height / 2;
	const clampedRadius = Math.min(radius, halfWidth, halfHeight);
	const localX = Math.abs(point.x - center.x);
	const localY = Math.abs(point.y - center.y);
	if (localX <= halfWidth - clampedRadius || localY <= halfHeight - clampedRadius) return point;

	const corner = {
		x: center.x + Math.sign(toward.x - center.x) * (halfWidth - clampedRadius),
		y: center.y + Math.sign(toward.y - center.y) * (halfHeight - clampedRadius)
	};
	const dx = toward.x - center.x;
	const dy = toward.y - center.y;
	const ox = center.x - corner.x;
	const oy = center.y - corner.y;
	const a = dx * dx + dy * dy;
	const b = 2 * (ox * dx + oy * dy);
	const c = ox * ox + oy * oy - clampedRadius * clampedRadius;
	const discriminant = Math.max(0, b * b - 4 * a * c);
	const roots = [
		(-b + Math.sqrt(discriminant)) / (2 * a),
		(-b - Math.sqrt(discriminant)) / (2 * a)
	];
	const scale = Math.max(...roots.filter((value) => value >= 0));
	return Number.isFinite(scale) ? { x: center.x + dx * scale, y: center.y + dy * scale } : point;
}

export function getShapeBoundaryPoint(shape: ShapeType, rect: Rect, toward: Point): Point {
	const center = getRectCenter(rect);
	if (Math.abs(toward.x - center.x) < EPSILON && Math.abs(toward.y - center.y) < EPSILON) {
		return { x: rect.x + rect.width, y: center.y };
	}
	if (shape === 'ellipse') return ellipseIntersection(rect, toward);
	if (shape === 'diamond') return diamondIntersection(rect, toward);
	if (shape === 'rounded-rectangle') {
		return roundedRectangleIntersection(rect, toward, getShapeDefinition(shape).cornerRadius);
	}
	return rectangleIntersection(rect, toward);
}

export function getEdgeEndpoints(
	source: DiagramNode,
	target: DiagramNode
): { source: Point; target: Point } {
	const sourceRect = getNodeRect(source);
	const targetRect = getNodeRect(target);
	const sourceCenter = getRectCenter(sourceRect);
	const targetCenter = getRectCenter(targetRect);
	return {
		source: getShapeBoundaryPoint(source.data.shape, sourceRect, targetCenter),
		target: getShapeBoundaryPoint(target.data.shape, targetRect, sourceCenter)
	};
}

export function straightPath(source: Point, target: Point): string {
	return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
}
