import { describe, expect, it } from 'vitest';
import type { ShapeType } from '$lib/types/diagram';
import { getShapeBoundaryPoint, screenToFlowPoint } from './geometry';

const rect = { x: 10, y: 20, width: 100, height: 60 };

describe('diagram geometry', () => {
	it('converts screen coordinates through a viewport transform', () => {
		expect(screenToFlowPoint({ x: 210, y: 120 }, { x: 10, y: 20, zoom: 2 })).toEqual({
			x: 100,
			y: 50
		});
	});

	it.each<[ShapeType, { x: number; y: number }]>([
		['rectangle', { x: 110, y: 50 }],
		['rounded-rectangle', { x: 110, y: 50 }],
		['ellipse', { x: 110, y: 50 }],
		['diamond', { x: 110, y: 50 }]
	])('finds the right boundary for %s', (shape, expected) => {
		expect(getShapeBoundaryPoint(shape, rect, { x: 300, y: 50 })).toEqual(expected);
	});

	it('uses ellipse and diamond equations for diagonal intersections', () => {
		const ellipse = getShapeBoundaryPoint('ellipse', rect, { x: 160, y: 110 });
		const diamond = getShapeBoundaryPoint('diamond', rect, { x: 160, y: 110 });
		expect(ellipse.x).toBeCloseTo(95, 0);
		expect(ellipse.y).toBeCloseTo(71, 0);
		expect(diamond.x).toBeCloseTo(85, 0);
		expect(diamond.y).toBeCloseTo(65, 0);
	});
});
