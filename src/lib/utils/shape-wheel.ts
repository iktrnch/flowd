import type { Point, ShapeType } from '$lib/types/diagram';

export const WHEEL_RADIUS_PX = 70;
export const WHEEL_DEAD_ZONE_PX = 24;
export const WHEEL_ITEM_RADIUS_PX = 21;

export function wheelItemPosition(index: number, count: number, radius = WHEEL_RADIUS_PX): Point {
	const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
	return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

export function shapeAtWheelPoint(
	point: Point,
	center: Point,
	shapes: readonly ShapeType[],
	deadZone = WHEEL_DEAD_ZONE_PX,
	outerRadius = WHEEL_RADIUS_PX + WHEEL_ITEM_RADIUS_PX
): ShapeType | undefined {
	const dx = point.x - center.x;
	const dy = point.y - center.y;
	const distance = Math.hypot(dx, dy);
	if (distance < deadZone || distance > outerRadius || shapes.length === 0) return undefined;
	const normalized = (Math.atan2(dy, dx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
	const segment = (Math.PI * 2) / shapes.length;
	return shapes[Math.floor((normalized + segment / 2) / segment) % shapes.length];
}

export function clampWheelCenter(
	center: Point,
	width: number,
	height: number,
	margin = 100
): Point {
	return {
		x: Math.min(Math.max(center.x, margin), Math.max(margin, width - margin)),
		y: Math.min(Math.max(center.y, margin), Math.max(margin, height - margin))
	};
}
