<script lang="ts">
	import EdgeContextMenu from '$lib/components/context-menu/EdgeContextMenu.svelte';
	import NodeContextMenu from '$lib/components/context-menu/NodeContextMenu.svelte';
	import DownloadModal from '$lib/components/modal/DownloadModal.svelte';
	import SettingsModal from '$lib/components/modal/SettingsModal.svelte';
	import ShapeWheel from '$lib/components/shape-wheel/ShapeWheel.svelte';
	import { shapeConfig } from '$lib/config/shapes';
	import { theme } from '$lib/config/theme';
	import { DiagramStore } from '$lib/stores/diagram.svelte';
	import type {
		CanvasInteractionState,
		DiagramEdge,
		DiagramNode,
		Point,
		ShapeType
	} from '$lib/types/diagram';
	import { classifyConnectionDrop, findEdgeAtPoint, findNodeAtPoint } from '$lib/utils/geometry';
	import {
		advanceNodeRightGesture,
		classifyRightRelease,
		pointerMovedBeyondTolerance,
		RIGHT_HOLD_DELAY_MS
	} from '$lib/utils/pointer-gesture';
	import { clampWheelCenter, shapeAtWheelPoint } from '$lib/utils/shape-wheel';
	import {
		Background,
		BackgroundVariant,
		ConnectionMode,
		MarkerType,
		SelectionMode,
		SvelteFlow,
		useSvelteFlow,
		type OnMoveEnd
	} from '@xyflow/svelte';
	import { Download, Settings } from 'lucide-svelte';
	import { onMount, setContext } from 'svelte';
	import ConnectionPreview from './ConnectionPreview.svelte';
	import { DIAGRAM_CONTEXT } from './context';
	import DiagramNodeComponent from './DiagramNode.svelte';
	import FloatingEdge from './FloatingEdge.svelte';

	const LEFT_BUTTON = 0;
	const MIDDLE_BUTTON = 1;
	const RIGHT_BUTTON = 2;
	const DISABLED_FLOW_KEY = { key: '__flowd-disabled__' };

	const store = new DiagramStore();
	const flow = useSvelteFlow<DiagramNode, DiagramEdge>();
	const nodeTypes = { shape: DiagramNodeComponent };
	const edgeTypes = { floating: FloatingEdge };
	const defaultEdgeOptions = {
		type: 'floating',
		markerEnd: { type: MarkerType.ArrowClosed, color: theme.edgeColor, width: 16, height: 16 }
	};

	let ready = $state(false);
	let canvasHost = $state<HTMLDivElement>();
	let interaction = $state<CanvasInteractionState>({ type: 'idle' });
	let settingsOpen = $state(false);
	let downloadOpen = $state(false);
	let settingsButton = $state<HTMLButtonElement>();
	let downloadButton = $state<HTMLButtonElement>();
	let viewport = $state({ x: 0, y: 0, zoom: 1 });
	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let capturedPointerId: number | null = null;

	function beginEditing(nodeId: string): void {
		clearHoldTimer();
		const node = store.nodes.find((item) => item.id === nodeId);
		if (!node) return;
		interaction = { type: 'editing-node', nodeId, previousText: node.data.label };
		store.startEditing(nodeId);
	}

	function commitEditing(nodeId: string, text: string): void {
		store.commitText(nodeId, text);
		if (interaction.type === 'editing-node' && interaction.nodeId === nodeId) {
			interaction = { type: 'idle' };
		}
	}

	function cancelEditing(nodeId: string): void {
		store.cancelEditing();
		if (interaction.type === 'editing-node' && interaction.nodeId === nodeId) {
			interaction = { type: 'idle' };
		}
	}

	setContext(DIAGRAM_CONTEXT, { store, beginEditing, commitEditing, cancelEditing });

	onMount(() => {
		store.load();
		viewport = { ...store.document.viewport };
		ready = true;
		return () => {
			clearHoldTimer();
			releaseCapture();
			store.destroy();
		};
	});

	function isTextTarget(target: EventTarget | null): boolean {
		return (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			(target instanceof HTMLElement && target.isContentEditable)
		);
	}

	function ownedNodeId(event: PointerEvent): string | undefined {
		for (const target of event.composedPath()) {
			if (target instanceof HTMLElement && target.dataset.diagramNodeId) {
				return target.dataset.diagramNodeId;
			}
		}
	}

	function ownedEdgeId(event: PointerEvent): string | undefined {
		for (const target of event.composedPath()) {
			if (target instanceof SVGElement && target.dataset.diagramEdgeId) {
				return target.dataset.diagramEdgeId;
			}
		}
	}

	function startsOnOverlay(event: PointerEvent): boolean {
		return event
			.composedPath()
			.some(
				(target) => target instanceof HTMLElement && target.dataset.diagramOverlay !== undefined
			);
	}

	function screenPoint(event: PointerEvent): Point {
		return { x: event.clientX, y: event.clientY };
	}

	function screenToFlow(position: Point): Point {
		return flow.screenToFlowPosition(position, { snapToGrid: false });
	}

	function withMeasurement(node: DiagramNode): DiagramNode {
		const measured = flow.getInternalNode(node.id)?.measured;
		return measured?.width && measured.height
			? { ...node, measured: { width: measured.width, height: measured.height } }
			: node;
	}

	function measuredNodes(): DiagramNode[] {
		return store.nodes.map(withMeasurement);
	}

	function clearHoldTimer(): void {
		if (holdTimer) clearTimeout(holdTimer);
		holdTimer = null;
	}

	function capturePointer(pointerId: number): void {
		canvasHost?.setPointerCapture(pointerId);
		capturedPointerId = pointerId;
	}

	function releaseCapture(pointerId = capturedPointerId): void {
		if (pointerId !== null && canvasHost?.hasPointerCapture(pointerId)) {
			canvasHost.releasePointerCapture(pointerId);
		}
		if (pointerId === capturedPointerId) capturedPointerId = null;
	}

	function closeMenusAndWheel(): void {
		if (
			interaction.type === 'node-context-menu' ||
			interaction.type === 'edge-context-menu' ||
			interaction.type === 'shape-wheel'
		) {
			interaction = { type: 'idle' };
		}
	}

	function cancelPointerInteraction(pointerId?: number): void {
		clearHoldTimer();
		releaseCapture(pointerId ?? capturedPointerId);
		if (interaction.type !== 'editing-node') interaction = { type: 'idle' };
	}

	function openWheel(
		mode: 'right-hold-create' | 'connection-drop-create',
		screenOrigin: Point,
		flowOrigin: Point,
		sourceNodeId?: string
	): void {
		clearHoldTimer();
		interaction = { type: 'shape-wheel', mode, screenOrigin, flowOrigin, sourceNodeId };
	}

	function handleCanvasPointerDown(event: PointerEvent): void {
		if (event.button === LEFT_BUTTON) return;
		if (event.button === MIDDLE_BUTTON) {
			clearHoldTimer();
			closeMenusAndWheel();
			return;
		}
		if (event.button !== RIGHT_BUTTON || isTextTarget(event.target) || startsOnOverlay(event)) {
			return;
		}

		event.preventDefault();
		clearHoldTimer();
		const position = screenPoint(event);
		const flowPosition = screenToFlow(position);
		const nodes = measuredNodes();
		const nodeId = ownedNodeId(event) ?? findNodeAtPoint(nodes, flowPosition)?.id;
		const edgeId =
			ownedEdgeId(event) ??
			findEdgeAtPoint(nodes, store.edges, flowPosition, 10 / viewport.zoom)?.id;

		if (nodeId) {
			store.selectNode(nodeId);
			interaction = {
				type: 'node-right-press',
				pointerId: event.pointerId,
				sourceNodeId: nodeId,
				startScreenPosition: position,
				currentScreenPosition: position
			};
		} else if (edgeId) {
			store.selectEdge(edgeId);
			interaction = {
				type: 'edge-right-press',
				pointerId: event.pointerId,
				edgeId,
				startScreenPosition: position,
				currentScreenPosition: position
			};
		} else {
			interaction = {
				type: 'pane-right-press',
				pointerId: event.pointerId,
				startScreenPosition: position,
				flowPosition,
				startedAt: performance.now()
			};
			holdTimer = setTimeout(() => {
				if (interaction.type === 'pane-right-press') {
					openWheel('right-hold-create', interaction.startScreenPosition, interaction.flowPosition);
				}
			}, RIGHT_HOLD_DELAY_MS);
		}
		capturePointer(event.pointerId);
	}

	function handleCanvasPointerMove(event: PointerEvent): void {
		const current = screenPoint(event);
		if (interaction.type === 'node-right-press' && interaction.pointerId === event.pointerId) {
			const phase = advanceNodeRightGesture('pending', interaction.startScreenPosition, current);
			interaction =
				phase === 'connection-drag'
					? { ...interaction, type: 'connection-drag', currentScreenPosition: current }
					: { ...interaction, currentScreenPosition: current };
		} else if (
			interaction.type === 'connection-drag' &&
			interaction.pointerId === event.pointerId
		) {
			interaction = { ...interaction, currentScreenPosition: current };
		} else if (
			interaction.type === 'edge-right-press' &&
			interaction.pointerId === event.pointerId
		) {
			if (
				advanceNodeRightGesture('pending', interaction.startScreenPosition, current) ===
				'connection-drag'
			) {
				cancelPointerInteraction(event.pointerId);
			} else {
				interaction = { ...interaction, currentScreenPosition: current };
			}
		} else if (
			interaction.type === 'pane-right-press' &&
			interaction.pointerId === event.pointerId &&
			pointerMovedBeyondTolerance(interaction.startScreenPosition, current)
		) {
			cancelPointerInteraction(event.pointerId);
		} else if (interaction.type === 'shape-wheel' && interaction.mode === 'right-hold-create') {
			const center = clampWheelCenter(
				interaction.screenOrigin,
				window.innerWidth,
				window.innerHeight
			);
			interaction = {
				...interaction,
				hoveredShape: shapeAtWheelPoint(current, center, shapeConfig.wheelShapes)
			};
		}
	}

	function finishConnectionDrag(event: PointerEvent): void {
		if (interaction.type !== 'connection-drag') return;
		const sourceNodeId = interaction.sourceNodeId;
		const position = screenPoint(event);
		const flowPosition = screenToFlow(position);
		const nodes = measuredNodes();
		const drop = classifyConnectionDrop(nodes, sourceNodeId, flowPosition);
		if (drop.type === 'source') {
			interaction = { type: 'idle' };
			return;
		}
		if (drop.type === 'target') {
			store.addEdge(sourceNodeId, drop.node.id);
			interaction = { type: 'idle' };
			return;
		}
		openWheel('connection-drop-create', position, flowPosition, sourceNodeId);
	}

	function handleCanvasPointerUp(event: PointerEvent): void {
		if (event.button !== RIGHT_BUTTON) return;
		clearHoldTimer();
		if (interaction.type === 'node-right-press' && interaction.pointerId === event.pointerId) {
			interaction = {
				type: 'node-context-menu',
				nodeId: interaction.sourceNodeId,
				screenPosition: screenPoint(event)
			};
		} else if (
			interaction.type === 'edge-right-press' &&
			interaction.pointerId === event.pointerId
		) {
			interaction = {
				type: 'edge-context-menu',
				edgeId: interaction.edgeId,
				screenPosition: screenPoint(event)
			};
		} else if (
			interaction.type === 'connection-drag' &&
			interaction.pointerId === event.pointerId
		) {
			finishConnectionDrag(event);
		} else if (
			interaction.type === 'pane-right-press' &&
			interaction.pointerId === event.pointerId
		) {
			const action = classifyRightRelease(performance.now() - interaction.startedAt, false);
			if (action === 'quick-create') {
				const node = store.createNode(interaction.flowPosition, shapeConfig.defaultShape);
				interaction = { type: 'editing-node', nodeId: node.id, previousText: '' };
			} else {
				interaction = { type: 'idle' };
			}
		} else if (interaction.type === 'shape-wheel' && interaction.mode === 'right-hold-create') {
			if (interaction.hoveredShape) chooseWheelShape(interaction.hoveredShape);
			else interaction = { type: 'idle' };
		}
		releaseCapture(event.pointerId);
	}

	function chooseWheelShape(shape: ShapeType): void {
		if (interaction.type !== 'shape-wheel') return;
		const node = store.createNode(interaction.flowOrigin, shape, interaction.sourceNodeId);
		interaction = { type: 'editing-node', nodeId: node.id, previousText: '' };
	}

	const handleMoveEnd: OnMoveEnd = (_event, nextViewport) => {
		viewport = nextViewport;
		store.setViewport(nextViewport);
	};

	function openSettings(): void {
		clearHoldTimer();
		interaction = { type: 'idle' };
		settingsOpen = true;
	}

	function openDownload(): void {
		clearHoldTimer();
		interaction = { type: 'idle' };
		downloadOpen = true;
	}

	let previewNodes = $derived.by(() => measuredNodes());
	let previewSource = $derived.by(() => {
		if (interaction.type !== 'connection-drag') return undefined;
		const sourceNodeId = interaction.sourceNodeId;
		return previewNodes.find((node) => node.id === sourceNodeId);
	});
	let previewTarget = $derived.by(() => {
		if (interaction.type !== 'connection-drag') return undefined;
		return findNodeAtPoint(
			previewNodes,
			screenToFlow(interaction.currentScreenPosition),
			interaction.sourceNodeId
		);
	});
</script>

<svelte:window
	onblur={() => cancelPointerInteraction()}
	onpointerup={(event) => {
		if (event.button === RIGHT_BUTTON && interaction.type !== 'idle') handleCanvasPointerUp(event);
	}}
/>

<div class="diagram-shell">
	<div
		bind:this={canvasHost}
		class:connecting={interaction.type === 'connection-drag'}
		class="canvas-host"
		role="application"
		aria-label="Diagram canvas"
		onpointerdowncapture={handleCanvasPointerDown}
		onpointermove={handleCanvasPointerMove}
		onpointerup={handleCanvasPointerUp}
		onpointercancel={(event) => cancelPointerInteraction(event.pointerId)}
		onauxclick={(event) => {
			if (event.button === MIDDLE_BUTTON) event.preventDefault();
		}}
		oncontextmenu={(event) => {
			if (!isTextTarget(event.target)) event.preventDefault();
		}}
	>
		{#if ready}
			<SvelteFlow
				bind:nodes={store.nodes}
				bind:edges={store.edges}
				{nodeTypes}
				{edgeTypes}
				{defaultEdgeOptions}
				initialViewport={viewport}
				nodesDraggable={true}
				nodesConnectable={false}
				elementsSelectable={true}
				selectionOnDrag={true}
				selectionMode={SelectionMode.Partial}
				selectNodesOnDrag={true}
				connectionMode={ConnectionMode.Loose}
				panOnDrag={[MIDDLE_BUTTON]}
				panActivationKey={DISABLED_FLOW_KEY}
				selectionKey={DISABLED_FLOW_KEY}
				multiSelectionKey={DISABLED_FLOW_KEY}
				deleteKey={DISABLED_FLOW_KEY}
				zoomActivationKey={DISABLED_FLOW_KEY}
				disableKeyboardA11y={true}
				nodesFocusable={false}
				edgesFocusable={false}
				zoomOnScroll={true}
				zoomOnPinch={true}
				zoomOnDoubleClick={false}
				proOptions={{ hideAttribution: true }}
				onnodedragstart={() => {
					clearHoldTimer();
					interaction = { type: 'idle' };
					store.beginDrag();
				}}
				onnodedragstop={() => store.finishDrag()}
				onnodeclick={() => closeMenusAndWheel()}
				onedgeclick={() => closeMenusAndWheel()}
				onpaneclick={() => {
					store.clearSelection();
					closeMenusAndWheel();
				}}
				onselectionstart={closeMenusAndWheel}
				onmovestart={closeMenusAndWheel}
				onmove={(_event, nextViewport) => (viewport = nextViewport)}
				onmoveend={handleMoveEnd}
			>
				<Background
					variant={BackgroundVariant.Dots}
					gap={20}
					size={1}
					patternColor={theme.gridDotColor}
					bgColor={theme.canvasBackground}
				/>
			</SvelteFlow>
		{/if}
	</div>

	{#if interaction.type === 'connection-drag' && previewSource}
		<ConnectionPreview
			sourceNode={previewSource}
			targetNode={previewTarget}
			nodes={previewNodes}
			currentScreenPosition={interaction.currentScreenPosition}
			screenToFlowPosition={screenToFlow}
			flowToScreenPosition={flow.flowToScreenPosition}
		/>
	{/if}

	<div class="floating-controls" data-diagram-overlay>
		<button
			bind:this={settingsButton}
			type="button"
			aria-label="Settings"
			title="Settings"
			onclick={openSettings}><Settings size={20} /></button
		>
		<button
			bind:this={downloadButton}
			type="button"
			aria-label="Download diagram"
			title="Download"
			onclick={openDownload}><Download size={20} /></button
		>
	</div>

	{#if interaction.type === 'shape-wheel'}
		<ShapeWheel
			mode={interaction.mode}
			center={interaction.screenOrigin}
			hoveredShape={interaction.hoveredShape}
			onhover={(shape) => {
				if (interaction.type === 'shape-wheel') {
					interaction = { ...interaction, hoveredShape: shape };
				}
			}}
			onselect={chooseWheelShape}
			oncancel={() => (interaction = { type: 'idle' })}
		/>
	{/if}

	{#if interaction.type === 'node-context-menu'}
		<NodeContextMenu
			position={interaction.screenPosition}
			onduplicate={() => {
				if (interaction.type === 'node-context-menu') {
					store.duplicateSelection(interaction.nodeId);
				}
				interaction = { type: 'idle' };
			}}
			onchange={(shape) => {
				if (interaction.type === 'node-context-menu') {
					store.changeShape(interaction.nodeId, shape);
				}
				interaction = { type: 'idle' };
			}}
			ondelete={() => {
				if (interaction.type === 'node-context-menu') store.deleteNode(interaction.nodeId);
				interaction = { type: 'idle' };
			}}
			onclose={() => (interaction = { type: 'idle' })}
		/>
	{:else if interaction.type === 'edge-context-menu'}
		<EdgeContextMenu
			position={interaction.screenPosition}
			ondelete={() => {
				if (interaction.type === 'edge-context-menu') store.deleteEdge(interaction.edgeId);
				interaction = { type: 'idle' };
			}}
			onclose={() => (interaction = { type: 'idle' })}
		/>
	{/if}

	<SettingsModal
		open={settingsOpen}
		onclose={() => (settingsOpen = false)}
		returnFocus={settingsButton}
	/>
	<DownloadModal
		open={downloadOpen}
		{store}
		onclose={() => (downloadOpen = false)}
		returnFocus={downloadButton}
	/>
</div>

<style>
	.diagram-shell,
	.canvas-host {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: var(--canvas-background);
	}

	.canvas-host.connecting {
		cursor: crosshair;
	}

	.floating-controls {
		position: fixed;
		z-index: 30;
		right: max(18px, env(safe-area-inset-right));
		bottom: max(18px, env(safe-area-inset-bottom));
		display: flex;
		gap: 10px;
	}

	.floating-controls button {
		display: grid;
		width: 42px;
		height: 42px;
		place-items: center;
		border: 1px solid #d8dde3;
		border-radius: 50%;
		background: white;
		color: #27313b;
		box-shadow: 0 2px 8px rgb(15 23 42 / 0.1);
		cursor: pointer;
		transition:
			border-color 120ms ease,
			background 120ms ease,
			transform 120ms ease;
	}

	.floating-controls button:hover {
		border-color: #94a3b8;
		background: #f8fafc;
		transform: translateY(-1px);
	}
</style>
