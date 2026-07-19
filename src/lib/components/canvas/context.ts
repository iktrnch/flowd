import type { DiagramStore } from '$lib/stores/diagram.svelte';

export const DIAGRAM_CONTEXT = Symbol('diagram-context');

export interface DiagramCanvasContext {
	store: DiagramStore;
	moveModifier: { active: boolean };
}
