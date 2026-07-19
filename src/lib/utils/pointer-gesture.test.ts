import { describe, expect, it } from 'vitest';
import {
	advanceNodeRightGesture,
	classifyRightRelease,
	pointerMovedBeyondTolerance
} from './pointer-gesture';

describe('right pointer gesture', () => {
	it('distinguishes quick release from a hold', () => {
		expect(classifyRightRelease(100, false)).toBe('quick-create');
		expect(classifyRightRelease(350, false)).toBe('hold');
	});

	it('cancels a moved quick press using the configured tolerance', () => {
		expect(pointerMovedBeyondTolerance({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(false);
		expect(pointerMovedBeyondTolerance({ x: 0, y: 0 }, { x: 7, y: 0 })).toBe(true);
		expect(classifyRightRelease(100, true)).toBe('cancel');
	});

	it('keeps a node right press pending below six pixels', () => {
		expect(advanceNodeRightGesture('pending', { x: 10, y: 10 }, { x: 15, y: 10 })).toBe('pending');
	});

	it('starts a connection at six pixels and never reverts to a click', () => {
		const phase = advanceNodeRightGesture('pending', { x: 10, y: 10 }, { x: 16, y: 10 });
		expect(phase).toBe('connection-drag');
		expect(advanceNodeRightGesture(phase, { x: 10, y: 10 }, { x: 11, y: 10 })).toBe(
			'connection-drag'
		);
	});
});
