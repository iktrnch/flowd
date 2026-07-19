<script lang="ts">
	import type { DiagramNode } from '$lib/types/diagram';
	import { getShapeBoundaryPoint, getNodeRect, straightPath } from '$lib/utils/geometry';
	import { useConnection } from '@xyflow/svelte';

	const connection = useConnection();
	let path = $derived.by(() => {
		if (!connection.current.inProgress) return '';
		const source = connection.current.fromNode.internals.userNode as DiagramNode;
		const start = getShapeBoundaryPoint(
			source.data.shape,
			getNodeRect(source),
			connection.current.to
		);
		return straightPath(start, connection.current.to);
	});
</script>

<path
	d={path}
	fill="none"
	stroke="var(--edge-color)"
	stroke-width="var(--edge-width)"
	stroke-dasharray="4 3"
	stroke-linecap="round"
/>
