import { describe, expect, it } from 'vitest';
import { classifyRightRelease, pointerMovedBeyondTolerance } from './pointer-gesture';

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
});
