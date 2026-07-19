import { describe, expect, it } from 'vitest';
import { resolveDiagramShortcut, type ShortcutEvent } from './keyboard';

const base: ShortcutEvent = {
	key: '',
	code: '',
	ctrlKey: false,
	shiftKey: false,
	altKey: false,
	metaKey: false,
	repeat: false
};

describe('diagram keyboard shortcuts', () => {
	it('resolves layout-independent Ctrl undo and redo', () => {
		expect(resolveDiagramShortcut({ ...base, code: 'KeyZ', key: 'w', ctrlKey: true }, false)).toBe(
			'undo'
		);
		expect(
			resolveDiagramShortcut(
				{ ...base, code: 'KeyZ', key: 'w', ctrlKey: true, shiftKey: true },
				false
			)
		).toBe('redo');
	});

	it('resolves the physical Delete key', () => {
		expect(resolveDiagramShortcut({ ...base, key: 'Delete', code: 'Delete' }, false)).toBe(
			'delete'
		);
	});

	it('ignores repeats, blocked targets, and unrelated modifiers', () => {
		const undo = { ...base, key: 'z', code: 'KeyZ', ctrlKey: true };
		expect(resolveDiagramShortcut({ ...undo, repeat: true }, false)).toBeUndefined();
		expect(resolveDiagramShortcut(undo, true)).toBeUndefined();
		expect(resolveDiagramShortcut({ ...undo, altKey: true }, false)).toBeUndefined();
		expect(resolveDiagramShortcut({ ...undo, metaKey: true }, false)).toBeUndefined();
		expect(
			resolveDiagramShortcut({ ...base, key: 'Delete', code: 'Delete' }, true)
		).toBeUndefined();
	});
});
