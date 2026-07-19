import { describe, expect, it } from 'vitest';
import { testNode } from '$lib/utils/test-fixtures';
import { DiagramHistory } from './history.svelte';

function snapshot(x: number) {
	return { nodes: [testNode('a', x)], edges: [] };
}

describe('diagram history', () => {
	it('groups a continuous change into one undo entry', () => {
		const history = new DiagramHistory();
		const start = snapshot(0);
		const end = snapshot(50);
		history.initialize(start);
		history.beginGroup(start);
		expect(history.commitGroup(end)).toBe(true);
		expect(history.size).toBe(2);
		expect(history.undo()).toEqual(start);
		expect(history.undo()).toBeNull();
	});

	it('supports redo and does nothing at either boundary', () => {
		const history = new DiagramHistory();
		const start = snapshot(0);
		const end = snapshot(10);
		history.initialize(start);
		expect(history.undo()).toBeNull();
		history.record(start, end);
		expect(history.redo()).toBeNull();
		expect(history.undo()).toEqual(start);
		expect(history.redo()).toEqual(end);
	});

	it('discards the redo branch after a new committed action', () => {
		const history = new DiagramHistory();
		const start = snapshot(0);
		const first = snapshot(10);
		const replacement = snapshot(20);
		history.initialize(start);
		history.record(start, first);
		expect(history.undo()).toEqual(start);
		history.record(start, replacement);
		expect(history.canRedo).toBe(false);
		expect(history.undo()).toEqual(start);
	});

	it('does not record an unchanged group', () => {
		const history = new DiagramHistory();
		const start = snapshot(0);
		history.initialize(start);
		history.beginGroup(start);
		expect(history.commitGroup(start)).toBe(false);
		expect(history.size).toBe(1);
	});

	it('enforces the configured history limit', () => {
		const history = new DiagramHistory(3);
		let current = snapshot(0);
		history.initialize(current);
		for (let x = 1; x <= 6; x += 1) {
			const next = snapshot(x);
			history.record(current, next);
			current = next;
		}
		expect(history.size).toBe(3);
		expect(history.undo()?.nodes[0].position.x).toBe(5);
		expect(history.undo()?.nodes[0].position.x).toBe(4);
		expect(history.undo()).toBeNull();
	});
});
