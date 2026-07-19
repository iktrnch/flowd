import { describe, expect, it } from 'vitest';
import type { ShapeType } from '$lib/types/diagram';
import {
	classifyConnectionDrop,
	distanceToSegment,
	findEdgeAtPoint,
	findNodeAtPoint,
	getShapeBoundaryPoint,
	isPointInShape,
	screenToFlowPoint
} from './geometry';
import { testNode } from './test-fixtures';

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

	it('hit-tests all shape silhouettes rather than only their bounding boxes', () => {
		expect(isPointInShape('rectangle', rect, { x: 11, y: 21 })).toBe(true);
		expect(isPointInShape('rounded-rectangle', rect, { x: 10, y: 20 })).toBe(false);
		expect(isPointInShape('ellipse', rect, { x: 10, y: 20 })).toBe(false);
		expect(isPointInShape('diamond', rect, { x: 10, y: 20 })).toBe(false);
		expect(isPointInShape('diamond', rect, { x: 60, y: 50 })).toBe(true);
	});

	it('resolves the topmost target and can exclude the connection source', () => {
		const source = testNode('source', 0);
		const target = testNode('target', 50);
		expect(findNodeAtPoint([source, target], { x: 60, y: 30 })?.id).toBe('target');
		expect(findNodeAtPoint([source, target], { x: 20, y: 30 }, 'source')).toBeUndefined();
	});

	it('classifies releases over the source, a target, and empty canvas', () => {
		const source = testNode('source', 0);
		const target = testNode('target', 200);
		expect(classifyConnectionDrop([source, target], 'source', { x: 20, y: 30 })).toEqual({
			type: 'source'
		});
		expect(classifyConnectionDrop([source, target], 'source', { x: 220, y: 30 })).toEqual({
			type: 'target',
			node: target
		});
		expect(classifyConnectionDrop([source, target], 'source', { x: 500, y: 500 })).toEqual({
			type: 'empty'
		});
	});

	it('hit-tests floating edges by distance from their shape-aware segment', () => {
		const source = testNode('source', 0);
		const target = testNode('target', 200);
		const edge = { id: 'edge', type: 'floating' as const, source: source.id, target: target.id };
		expect(distanceToSegment({ x: 150, y: 35 }, { x: 100, y: 30 }, { x: 200, y: 30 })).toBe(5);
		expect(findEdgeAtPoint([source, target], [edge], { x: 150, y: 35 }, 6)).toBe(edge);
		expect(findEdgeAtPoint([source, target], [edge], { x: 150, y: 50 }, 6)).toBeUndefined();
	});
});
