import type { DiagramStore } from '$lib/stores/diagram.svelte';

export const DIAGRAM_CONTEXT = Symbol('diagram-context');

export interface DiagramCanvasContext {
	store: DiagramStore;
	beginEditing: (nodeId: string) => void;
	commitEditing: (nodeId: string, text: string) => void;
	cancelEditing: (nodeId: string) => void;
}
