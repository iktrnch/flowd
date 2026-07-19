import { describe, expect, it } from 'vitest';
import { testNode } from '$lib/utils/test-fixtures';
import { DiagramHistory } from './history.svelte';

describe('diagram history', () => {
	it('groups a continuous change into one undo entry', () => {
		const history = new DiagramHistory();
		const start = { nodes: [testNode('a', 0)], edges: [] };
		const middle = { nodes: [testNode('a', 20)], edges: [] };
		const end = { nodes: [testNode('a', 50)], edges: [] };
		history.beginGroup(start);
		expect(history.commitGroup(end)).toBe(true);
		expect(history.undo(end)).toEqual(start);
		expect(history.undo(middle)).toBeNull();
	});

	it('supports redo after undo', () => {
		const history = new DiagramHistory();
		const start = { nodes: [testNode('a', 0)], edges: [] };
		const end = { nodes: [testNode('a', 10)], edges: [] };
		history.record(start, end);
		expect(history.undo(end)).toEqual(start);
		expect(history.redo(start)).toEqual(end);
	});
});
