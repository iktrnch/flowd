<script lang="ts">
	import { shapeRegistry } from '$lib/config/shapes';
	import type { Point, ShapeType } from '$lib/types/diagram';
	import { Copy, Shapes, Trash2 } from 'lucide-svelte';

	let {
		position,
		onduplicate,
		onchange,
		ondelete,
		onclose
	}: {
		position: Point;
		onduplicate: () => void;
		onchange: (shape: ShapeType) => void;
		ondelete: () => void;
		onclose: () => void;
	} = $props();
	let changing = $state(false);
</script>

<div class="menu-dismiss" data-diagram-overlay role="presentation" onpointerdown={onclose}></div>
<div
	class="context-menu"
	data-diagram-overlay
	role="menu"
	style:left={`${position.x}px`}
	style:top={`${position.y}px`}
>
	<button type="button" role="menuitem" onclick={onduplicate}><Copy size={15} />Duplicate</button>
	<button type="button" role="menuitem" onclick={() => (changing = !changing)}
		><Shapes size={15} />Change shape</button
	>
	{#if changing}
		<div class="shape-submenu">
			{#each shapeRegistry as shape}
				<button type="button" role="menuitem" onclick={() => onchange(shape.type)}
					>{shape.label}</button
				>
			{/each}
		</div>
	{/if}
	<div class="separator"></div>
	<button type="button" role="menuitem" class="danger" onclick={ondelete}
		><Trash2 size={15} />Delete</button
	>
</div>

<style>
	.menu-dismiss {
		position: fixed;
		z-index: 44;
		inset: 0;
	}
	.context-menu {
		position: fixed;
		z-index: 45;
		min-width: 164px;
		max-width: calc(100vw - 24px);
		padding: 5px;
		transform: translate(4px, 4px);
		border: 1px solid var(--surface-border);
		border-radius: 7px;
		background: white;
		box-shadow: var(--surface-shadow);
	}
	button {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 9px;
		padding: 7px 9px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: #27313b;
		text-align: left;
		cursor: pointer;
	}
	button:hover {
		background: #f1f5f9;
	}
	.danger {
		color: #b42318;
	}
	.separator {
		height: 1px;
		margin: 4px;
		background: #e5e7eb;
	}
	.shape-submenu {
		margin: 2px 0 3px 24px;
		border-left: 1px solid #e5e7eb;
		padding-left: 4px;
		font-size: 13px;
	}
</style>
