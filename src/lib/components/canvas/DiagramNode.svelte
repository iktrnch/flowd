<script lang="ts">
	import type { DiagramNode as DiagramNodeType } from '$lib/types/diagram';
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import { getContext, tick } from 'svelte';
	import { DIAGRAM_CONTEXT, type DiagramCanvasContext } from './context';

	let { id, data, selected, isConnectable }: NodeProps<DiagramNodeType> = $props();
	const context = getContext<DiagramCanvasContext>(DIAGRAM_CONTEXT);
	let draft = $state('');
	let textarea = $state<HTMLTextAreaElement>();
	let cancelling = $state(false);
	let editing = $derived(context.store.editingNodeId === id);

	$effect(() => {
		if (editing) {
			cancelling = false;
			draft = data.label;
			void tick().then(() => {
				textarea?.focus();
				textarea?.select();
			});
		}
	});

	function selectBeforeConnect(event: PointerEvent): void {
		if (event.button !== 0 || editing) return;
		context.store.selectNode(id, event.metaKey || event.ctrlKey);
	}

	function commit(): void {
		if (editing && !cancelling) context.store.commitText(id, draft);
	}

	function handleEditorKeydown(event: KeyboardEvent): void {
		event.stopPropagation();
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			commit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelling = true;
			context.store.cancelEditing();
		}
	}
</script>

<div
	class:movement-active={context.moveModifier.active}
	class="diagram-node"
	data-diagram-node
	role="group"
	aria-label={`${data.shape} shape`}
	style:width={`${data.width}px`}
	style:height={`${data.height}px`}
	onpointerdowncapture={selectBeforeConnect}
	ondblclick={(event) => {
		event.stopPropagation();
		context.store.startEditing(id);
	}}
>
	<svg class="shape-surface" viewBox={`0 0 ${data.width} ${data.height}`} aria-hidden="true">
		{#if data.shape === 'ellipse'}
			<ellipse
				cx={data.width / 2}
				cy={data.height / 2}
				rx={data.width / 2 - 1.5}
				ry={data.height / 2 - 1.5}
			/>
		{:else if data.shape === 'diamond'}
			<polygon
				points={`${data.width / 2},2 ${data.width - 2},${data.height / 2} ${data.width / 2},${data.height - 2} 2,${data.height / 2}`}
			/>
		{:else}
			<rect
				x="1.5"
				y="1.5"
				width={data.width - 3}
				height={data.height - 3}
				rx={data.shape === 'rounded-rectangle' ? 20 : 6}
			/>
		{/if}
	</svg>

	{#if editing}
		<textarea
			bind:this={textarea}
			bind:value={draft}
			class="nodrag nopan nowheel node-editor"
			placeholder="Type here"
			aria-label="Shape text"
			onpointerdown={(event) => event.stopPropagation()}
			onkeydown={handleEditorKeydown}
			onblur={commit}></textarea>
	{:else}
		<div class="node-label">{data.label}</div>
	{/if}

	<Handle
		type="source"
		position={Position.Top}
		{isConnectable}
		class={`whole-node-handle ${context.moveModifier.active || editing ? 'movement-disabled' : ''}`}
	/>
</div>

<style>
	.diagram-node {
		position: relative;
		display: grid;
		place-items: center;
		color: var(--shape-text-color);
		font-size: var(--font-size);
		cursor: crosshair;
	}

	.diagram-node.movement-active {
		cursor: move;
	}

	.shape-surface {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
	}

	.shape-surface :global(*) {
		fill: var(--shape-fill);
		stroke: var(--shape-border-color);
		stroke-width: var(--shape-border-width);
		vector-effect: non-scaling-stroke;
	}

	:global(.svelte-flow__node.selected) .shape-surface :global(*) {
		stroke: var(--selection-color);
	}

	.node-label,
	.node-editor {
		position: relative;
		z-index: 2;
		width: calc(100% - 32px);
		max-height: calc(100% - 22px);
		margin: 0;
		padding: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: inherit;
		line-height: 1.3;
		text-align: center;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.node-editor {
		min-height: 2.6em;
		resize: none;
		overflow: hidden;
	}

	:global(.whole-node-handle) {
		position: absolute !important;
		inset: 0 !important;
		z-index: 3 !important;
		width: 100% !important;
		height: 100% !important;
		transform: none !important;
		border: 0 !important;
		border-radius: 0 !important;
		background: transparent !important;
		opacity: 0 !important;
	}

	:global(.whole-node-handle.movement-disabled) {
		pointer-events: none !important;
	}
</style>
