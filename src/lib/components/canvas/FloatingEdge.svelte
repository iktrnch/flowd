<script lang="ts">
	import type { DiagramEdge, DiagramNode } from '$lib/types/diagram';
	import { getEdgeEndpoints, straightPath } from '$lib/utils/geometry';
	import { BaseEdge, type EdgeProps } from '@xyflow/svelte';
	import { getContext } from 'svelte';
	import { DIAGRAM_CONTEXT, type DiagramCanvasContext } from './context';

	let { id, source, target, markerEnd, selected }: EdgeProps<DiagramEdge> = $props();
	const context = getContext<DiagramCanvasContext>(DIAGRAM_CONTEXT);
	let sourceNode = $derived(context.store.nodes.find((node) => node.id === source));
	let targetNode = $derived(context.store.nodes.find((node) => node.id === target));
	let path = $derived.by(() => {
		if (!sourceNode || !targetNode) return '';
		const endpoints = getEdgeEndpoints(sourceNode as DiagramNode, targetNode as DiagramNode);
		return straightPath(endpoints.source, endpoints.target);
	});
</script>

{#if path}
	<BaseEdge
		{id}
		{path}
		{markerEnd}
		class={selected ? 'diagram-edge-path selected' : 'diagram-edge-path'}
		style="stroke: var(--edge-color); stroke-width: var(--edge-width)"
		data-diagram-edge
		data-diagram-edge-id={id}
	/>
{/if}

<style>
	:global(path[data-diagram-edge]) {
		stroke: transparent;
	}
</style>
