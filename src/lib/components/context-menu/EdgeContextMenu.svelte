<script lang="ts">
	import type { Point } from '$lib/types/diagram';
	import { Trash2 } from 'lucide-svelte';
	let {
		position,
		ondelete,
		onclose
	}: { position: Point; ondelete: () => void; onclose: () => void } = $props();
</script>

<div class="menu-dismiss" data-diagram-overlay role="presentation" onpointerdown={onclose}></div>
<div
	class="context-menu"
	data-diagram-overlay
	role="menu"
	style:left={`${position.x}px`}
	style:top={`${position.y}px`}
>
	<button type="button" role="menuitem" onclick={ondelete}><Trash2 size={15} />Delete</button>
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
		min-width: 120px;
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
		color: #b42318;
		cursor: pointer;
	}
	button:hover {
		background: #fef2f2;
	}
</style>
