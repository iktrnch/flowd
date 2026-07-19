export type DiagramShortcut = 'undo' | 'redo' | 'delete';

export interface ShortcutEvent {
	key: string;
	code: string;
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	metaKey: boolean;
	repeat: boolean;
}

export function resolveDiagramShortcut(
	event: ShortcutEvent,
	blocked: boolean
): DiagramShortcut | undefined {
	if (blocked || event.repeat || event.altKey || event.metaKey) return undefined;
	const isZ = event.code === 'KeyZ' || event.key.toLowerCase() === 'z';
	if (event.ctrlKey && isZ) return event.shiftKey ? 'redo' : 'undo';
	if (!event.ctrlKey && event.key === 'Delete') return 'delete';
}

export function isTextInputTarget(target: EventTarget | null): boolean {
	if (typeof Element === 'undefined' || !(target instanceof Element)) return false;
	return (
		target.matches('input, textarea, select, [contenteditable="true"], [contenteditable=""]') ||
		target.closest('[contenteditable="true"], [contenteditable=""]') !== null
	);
}

export function isModalTarget(target: EventTarget | null): boolean {
	return typeof Element !== 'undefined' && target instanceof Element
		? target.closest('[role="dialog"]') !== null
		: false;
}
