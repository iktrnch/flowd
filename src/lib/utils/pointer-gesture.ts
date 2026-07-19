import type { Point } from '$lib/types/diagram';

export const RIGHT_HOLD_DELAY_MS = 350;
export const POINTER_MOVEMENT_TOLERANCE_PX = 6;
export const CONNECTION_DRAG_THRESHOLD_PX = 6;

export type NodeRightGesturePhase = 'pending' | 'connection-drag';

export function pointerDistance(origin: Point, current: Point): number {
	return Math.hypot(current.x - origin.x, current.y - origin.y);
}

export function pointerMovedBeyondTolerance(
	origin: Point,
	current: Point,
	tolerance = POINTER_MOVEMENT_TOLERANCE_PX
): boolean {
	return pointerDistance(origin, current) > tolerance;
}

export function advanceNodeRightGesture(
	phase: NodeRightGesturePhase,
	origin: Point,
	current: Point,
	threshold = CONNECTION_DRAG_THRESHOLD_PX
): NodeRightGesturePhase {
	if (phase === 'connection-drag') return phase;
	return pointerDistance(origin, current) >= threshold ? 'connection-drag' : 'pending';
}

export function classifyRightRelease(
	elapsedMs: number,
	movedBeyondTolerance: boolean,
	holdDelay = RIGHT_HOLD_DELAY_MS
): 'quick-create' | 'hold' | 'cancel' {
	if (elapsedMs >= holdDelay) return 'hold';
	return movedBeyondTolerance ? 'cancel' : 'quick-create';
}
