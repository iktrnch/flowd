<script lang="ts">
	import type { DiagramNode, Point, Rect } from '$lib/types/diagram';
	import {
		getEdgeEndpoints,
		getNodeRect,
		getShapeBoundaryPoint,
		straightPath
	} from '$lib/utils/geometry';

	let {
		sourceNode,
		targetNode,
		nodes,
		currentScreenPosition,
		screenToFlowPosition,
		flowToScreenPosition
	}: {
		sourceNode: DiagramNode;
		targetNode?: DiagramNode;
		nodes: DiagramNode[];
		currentScreenPosition: Point;
		screenToFlowPosition: (position: Point) => Point;
		flowToScreenPosition: (position: Point) => Point;
	} = $props();

	const maskId = 'connection-preview-node-mask';

	function toScreenRect(node: DiagramNode): Rect {
		const rect = getNodeRect(node);
		const topLeft = flowToScreenPosition({ x: rect.x, y: rect.y });
		const bottomRight = flowToScreenPosition({
			x: rect.x + rect.width,
			y: rect.y + rect.height
		});
		return {
			x: topLeft.x,
			y: topLeft.y,
			width: bottomRight.x - topLeft.x,
			height: bottomRight.y - topLeft.y
		};
	}

	let endpoints = $derived.by(() => {
		if (targetNode) {
			const edge = getEdgeEndpoints(sourceNode, targetNode);
			return {
				source: flowToScreenPosition(edge.source),
				target: flowToScreenPosition(edge.target)
			};
		}
		const pointerFlow = screenToFlowPosition(currentScreenPosition);
		const source = getShapeBoundaryPoint(
			sourceNode.data.shape,
			getNodeRect(sourceNode),
			pointerFlow
		);
		return { source: flowToScreenPosition(source), target: currentScreenPosition };
	});
	let path = $derived(straightPath(endpoints.source, endpoints.target));
	let maskedNodes = $derived(
		nodes.filter((node) => node.id !== sourceNode.id && node.id !== targetNode?.id)
	);
</script>

<svg class="connection-preview" aria-hidden="true">
	<defs>
		<marker
			id="connection-preview-arrow"
			markerWidth="8"
			markerHeight="8"
			refX="7"
			refY="4"
			orient="auto"
			markerUnits="strokeWidth"
		>
			<path d="M 0 0 L 8 4 L 0 8 z" fill="var(--edge-color)" />
		</marker>
		<mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
			<rect width="100%" height="100%" fill="white" />
			{#each maskedNodes as node (node.id)}
				{@const rect = toScreenRect(node)}
				{#if node.data.shape === 'ellipse'}
					<ellipse
						cx={rect.x + rect.width / 2}
						cy={rect.y + rect.height / 2}
						rx={rect.width / 2 + 2}
						ry={rect.height / 2 + 2}
						fill="black"
					/>
				{:else if node.data.shape === 'diamond'}
					<polygon
						points={`${rect.x + rect.width / 2},${rect.y - 2} ${rect.x + rect.width + 2},${rect.y + rect.height / 2} ${rect.x + rect.width / 2},${rect.y + rect.height + 2} ${rect.x - 2},${rect.y + rect.height / 2}`}
						fill="black"
					/>
				{:else}
					<rect
						x={rect.x - 2}
						y={rect.y - 2}
						width={rect.width + 4}
						height={rect.height + 4}
						rx={node.data.shape === 'rounded-rectangle' ? 22 : 8}
						fill="black"
					/>
				{/if}
			{/each}
		</mask>
	</defs>
	<path
		d={path}
		fill="none"
		stroke="var(--edge-color)"
		stroke-width="var(--edge-width)"
		stroke-linecap="round"
		marker-end="url(#connection-preview-arrow)"
		mask={`url(#${maskId})`}
	/>
</svg>

<style>
	.connection-preview {
		position: fixed;
		z-index: 5;
		inset: 0;
		width: 100vw;
		height: 100vh;
		overflow: visible;
		pointer-events: none;
	}
</style>
