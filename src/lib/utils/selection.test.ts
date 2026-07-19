import { describe, expect, it } from 'vitest';
import type { SelectionIds } from '$lib/types/diagram';
import { getSelectionOperation, reconcileSelection } from './selection';

function ids(nodes: string[] = [], edges: string[] = []): SelectionIds {
	return { nodeIds: new Set(nodes), edgeIds: new Set(edges) };
}

function values(selection: SelectionIds) {
	return {
		nodes: [...selection.nodeIds].sort(),
		edges: [...selection.edgeIds].sort()
	};
}

describe('selection operations', () => {
	it('resolves replace, add, and remove with Shift taking precedence', () => {
		expect(getSelectionOperation({ ctrlKey: false, shiftKey: false })).toBe('replace');
		expect(getSelectionOperation({ ctrlKey: true, shiftKey: false })).toBe('add');
		expect(getSelectionOperation({ ctrlKey: false, shiftKey: true })).toBe('remove');
		expect(getSelectionOperation({ ctrlKey: true, shiftKey: true })).toBe('remove');
	});

	it('plain selection replaces nodes and edges', () => {
		expect(values(reconcileSelection(ids(['a'], ['ab']), ids(['b'], ['bc']), 'replace'))).toEqual({
			nodes: ['b'],
			edges: ['bc']
		});
	});

	it('Ctrl selection adds without toggling existing items', () => {
		expect(values(reconcileSelection(ids(['a'], ['ab']), ids(['a', 'b'], ['ab']), 'add'))).toEqual({
			nodes: ['a', 'b'],
			edges: ['ab']
		});
	});

	it('Shift selection removes selected items and ignores unselected items', () => {
		expect(
			values(reconcileSelection(ids(['a', 'b'], ['ab']), ids(['a', 'c'], ['bc']), 'remove'))
		).toEqual({
			nodes: ['b'],
			edges: ['ab']
		});
	});

	it('modifier selection with an empty marquee preserves the base', () => {
		expect(values(reconcileSelection(ids(['a'], ['ab']), ids(), 'add'))).toEqual({
			nodes: ['a'],
			edges: ['ab']
		});
		expect(values(reconcileSelection(ids(['a'], ['ab']), ids(), 'remove'))).toEqual({
			nodes: ['a'],
			edges: ['ab']
		});
	});
});
