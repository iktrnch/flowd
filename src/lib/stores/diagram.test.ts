import { describe, expect, it } from 'vitest';
import { testNode } from '$lib/utils/test-fixtures';
import { DiagramStore } from './diagram.svelte';

describe('diagram connection commands', () => {
	it('rejects self-connections and duplicate directed edges', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('source', 0), testNode('target', 200)];
		expect(store.addEdge('source', 'source')).toBe(false);
		expect(store.addEdge('source', 'target')).toBe(true);
		expect(store.addEdge('source', 'target')).toBe(false);
		expect(store.edges).toHaveLength(1);
	});

	it('creates a wheel node and its edge as one undoable operation', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('source', 0)];
		const created = store.createNode({ x: 300, y: 200 }, 'ellipse', 'source');
		expect(store.nodes).toHaveLength(2);
		expect(store.edges).toMatchObject([{ source: 'source', target: created.id }]);
		expect(store.editingNodeId).toBe(created.id);
		expect(store.undo()).toBe(true);
		expect(store.nodes).toHaveLength(1);
		expect(store.edges).toHaveLength(0);
	});

	it('records direct edge creation as one history entry', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('source', 0), testNode('target', 200)];
		expect(store.addEdge('source', 'target')).toBe(true);
		expect(store.undo()).toBe(true);
		expect(store.edges).toHaveLength(0);
		expect(store.nodes).toHaveLength(2);
	});
});
