<script lang="ts">
	import DiagramCanvas from '$lib/components/canvas/DiagramCanvas.svelte';
	import { SvelteFlowProvider } from '@xyflow/svelte';
</script>

<svelte:head>
	<title>Flowd</title>
	<meta name="description" content="A fast local-first diagramming canvas" />
</svelte:head>

<SvelteFlowProvider>
	<DiagramCanvas />
</SvelteFlowProvider>
