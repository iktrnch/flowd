import { describe, expect, it } from 'vitest';
import type { ShapeType } from '$lib/types/diagram';
import { shapeAtWheelPoint } from './shape-wheel';

const shapes: ShapeType[] = ['rectangle', 'rounded-rectangle', 'ellipse', 'diamond'];
const center = { x: 100, y: 100 };

describe('shape wheel geometry', () => {
	it('maps clockwise wheel angles to registry order', () => {
		expect(shapeAtWheelPoint({ x: 100, y: 40 }, center, shapes)).toBe('rectangle');
		expect(shapeAtWheelPoint({ x: 160, y: 100 }, center, shapes)).toBe('rounded-rectangle');
		expect(shapeAtWheelPoint({ x: 100, y: 160 }, center, shapes)).toBe('ellipse');
		expect(shapeAtWheelPoint({ x: 40, y: 100 }, center, shapes)).toBe('diamond');
	});

	it('has a dead zone and an outer cancellation zone', () => {
		expect(shapeAtWheelPoint(center, center, shapes)).toBeUndefined();
		expect(shapeAtWheelPoint({ x: 110, y: 100 }, center, shapes)).toBeUndefined();
		expect(shapeAtWheelPoint({ x: 300, y: 100 }, center, shapes)).toBeUndefined();
	});
});
