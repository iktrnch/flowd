import type { Point } from '$lib/types/diagram';

export const RIGHT_HOLD_DELAY_MS = 350;
export const POINTER_MOVEMENT_TOLERANCE_PX = 6;

export function pointerMovedBeyondTolerance(
	origin: Point,
	current: Point,
	tolerance = POINTER_MOVEMENT_TOLERANCE_PX
): boolean {
	return Math.hypot(current.x - origin.x, current.y - origin.y) > tolerance;
}

export function classifyRightRelease(
	elapsedMs: number,
	movedBeyondTolerance: boolean,
	holdDelay = RIGHT_HOLD_DELAY_MS
): 'quick-create' | 'hold' | 'cancel' {
	if (elapsedMs >= holdDelay) return 'hold';
	return movedBeyondTolerance ? 'cancel' : 'quick-create';
}
