<script lang="ts">
	import Modal from './Modal.svelte';
	let {
		open,
		onclose,
		returnFocus
	}: { open: boolean; onclose: () => void; returnFocus?: HTMLElement | null } = $props();
</script>

<Modal {open} title="Settings" {onclose} {returnFocus}>
	<p>Diagram settings will be added here.</p>
</Modal>

<style>
	p {
		margin: 0;
		color: #64748b;
		font-size: 14px;
		line-height: 1.5;
	}
</style>
