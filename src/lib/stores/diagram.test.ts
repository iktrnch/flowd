import { describe, expect, it } from 'vitest';
import type { DiagramEdge } from '$lib/types/diagram';
import { testNode } from '$lib/utils/test-fixtures';
import { DiagramStore } from './diagram.svelte';

function testEdge(id: string, source: string, target: string, selected = false): DiagramEdge {
	return { id, type: 'floating', source, target, selected };
}

describe('diagram commands and history', () => {
	it('rejects self-connections and duplicate directed edges', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('source', 0), testNode('target', 200)];
		expect(store.addEdge('source', 'source')).toBe(false);
		expect(store.addEdge('source', 'target')).toBe(true);
		expect(store.addEdge('source', 'target')).toBe(false);
		expect(store.edges).toHaveLength(1);
	});

	it('undoes and redoes shape creation', () => {
		const store = new DiagramStore();
		store.createNode({ x: 100, y: 100 });
		expect(store.nodes).toHaveLength(1);
		expect(store.undo()).toBe(true);
		expect(store.nodes).toHaveLength(0);
		expect(store.redo()).toBe(true);
		expect(store.nodes).toHaveLength(1);
	});

	it('creates a wheel node and its edge as one undoable operation', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('source', 0)];
		const created = store.createNode({ x: 300, y: 200 }, 'ellipse', 'source');
		expect(store.nodes).toHaveLength(2);
		expect(store.edges).toMatchObject([{ source: 'source', target: created.id }]);
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

	it('groups all intermediate drag positions into one entry', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('a', 0, true), testNode('b', 200, true)];
		store.beginDrag();
		store.nodes = store.nodes.map((node) => ({
			...node,
			position: { x: node.position.x + 20, y: 10 }
		}));
		store.nodes = store.nodes.map((node) => ({
			...node,
			position: { x: node.position.x + 30, y: 20 }
		}));
		store.finishDrag();
		expect(store.history.size).toBe(2);
		expect(store.undo()).toBe(true);
		expect(store.nodes.map((node) => node.position)).toEqual([
			{ x: 0, y: 0 },
			{ x: 200, y: 0 }
		]);
	});

	it('does not commit a drag when no position changes', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('a', 0, true)];
		store.history.initialize(store.snapshot());
		store.beginDrag();
		store.finishDrag();
		expect(store.history.size).toBe(1);
	});

	it('records a committed text edit once and restores it on undo', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('a', 0)];
		store.startEditing('a');
		store.commitText('a', 'Changed');
		expect(store.history.size).toBe(2);
		expect(store.undo()).toBe(true);
		expect(store.nodes[0].data.label).toBe('a');
	});

	it('deletes selected nodes, selected edges, and connected edges atomically', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('a', 0, true), testNode('b', 200), testNode('c', 400)];
		store.edges = [testEdge('ab', 'a', 'b'), testEdge('bc', 'b', 'c', true)];
		expect(store.deleteSelection()).toBe(true);
		expect(store.nodes.map((node) => node.id)).toEqual(['b', 'c']);
		expect(store.edges).toHaveLength(0);
		expect(store.undo()).toBe(true);
		expect(store.nodes).toHaveLength(3);
		expect(store.edges).toHaveLength(2);
		expect(store.nodes.every((node) => !node.selected)).toBe(true);
		expect(store.edges.every((edge) => !edge.selected)).toBe(true);
	});

	it('deletes an explicitly selected edge without deleting its nodes', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('a', 0), testNode('b', 200)];
		store.edges = [testEdge('ab', 'a', 'b', true)];
		expect(store.deleteSelection()).toBe(true);
		expect(store.nodes).toHaveLength(2);
		expect(store.edges).toHaveLength(0);
		expect(store.undo()).toBe(true);
		expect(store.edges).toHaveLength(1);
	});

	it('does nothing when deletion has no selection', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('a', 0)];
		expect(store.deleteSelection()).toBe(false);
		expect(store.history.size).toBe(0);
	});

	it('uses equivalent atomic deletion for context-menu and selection commands', () => {
		const keyboardStore = new DiagramStore();
		keyboardStore.nodes = [testNode('a', 0, true), testNode('b', 200)];
		keyboardStore.edges = [testEdge('ab', 'a', 'b')];
		keyboardStore.deleteSelection();

		const menuStore = new DiagramStore();
		menuStore.nodes = [testNode('a', 0), testNode('b', 200)];
		menuStore.edges = [testEdge('ab', 'a', 'b')];
		menuStore.deleteNode('a');

		expect(menuStore.snapshot()).toEqual(keyboardStore.snapshot());
	});

	it('clears the redo branch after a new action', () => {
		const store = new DiagramStore();
		store.createNode({ x: 100, y: 100 });
		store.createNode({ x: 300, y: 100 });
		expect(store.undo()).toBe(true);
		store.createNode({ x: 500, y: 100 });
		expect(store.redo()).toBe(false);
	});

	it('does not add selection or viewport changes to history', () => {
		const store = new DiagramStore();
		store.nodes = [testNode('a', 0), testNode('b', 200)];
		store.history.initialize(store.snapshot());
		store.selectNode('a');
		store.addToSelection({ nodeIds: new Set(['b']), edgeIds: new Set() });
		store.setViewport({ x: 50, y: 20, zoom: 1.5 });
		expect(store.history.size).toBe(1);
		expect(store.history.canUndo).toBe(false);
	});
});
