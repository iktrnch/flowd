<script lang="ts">
	import EdgeContextMenu from '$lib/components/context-menu/EdgeContextMenu.svelte';
	import NodeContextMenu from '$lib/components/context-menu/NodeContextMenu.svelte';
	import DownloadModal from '$lib/components/modal/DownloadModal.svelte';
	import SettingsModal from '$lib/components/modal/SettingsModal.svelte';
	import ShapeWheel from '$lib/components/shape-wheel/ShapeWheel.svelte';
	import { shapeConfig } from '$lib/config/shapes';
	import { theme } from '$lib/config/theme';
	import { DiagramStore } from '$lib/stores/diagram.svelte';
	import type { CanvasInteractionState, DiagramNode, Point, ShapeType } from '$lib/types/diagram';
	import {
		classifyRightRelease,
		pointerMovedBeyondTolerance,
		RIGHT_HOLD_DELAY_MS
	} from '$lib/utils/pointer-gesture';
	import { shapeAtWheelPoint, clampWheelCenter } from '$lib/utils/shape-wheel';
	import {
		Background,
		BackgroundVariant,
		ConnectionLineType,
		ConnectionMode,
		MarkerType,
		SvelteFlow,
		type Connection,
		type OnConnectEnd,
		type OnConnectStart,
		type OnMoveEnd
	} from '@xyflow/svelte';
	import { Download, Settings } from 'lucide-svelte';
	import { onMount, setContext } from 'svelte';
	import ConnectionLine from './ConnectionLine.svelte';
	import { DIAGRAM_CONTEXT } from './context';
	import DiagramNodeComponent from './DiagramNode.svelte';
	import FloatingEdge from './FloatingEdge.svelte';

	type ContextMenuState =
		| { type: 'node'; id: string; position: Point }
		| { type: 'edge'; id: string; position: Point }
		| null;

	const store = new DiagramStore();
	let moveModifier = $state({ active: false });
	setContext(DIAGRAM_CONTEXT, { store, moveModifier });

	const nodeTypes = { shape: DiagramNodeComponent };
	const edgeTypes = { floating: FloatingEdge };
	const defaultEdgeOptions = {
		type: 'floating',
		markerEnd: { type: MarkerType.ArrowClosed, color: theme.edgeColor, width: 16, height: 16 }
	};

	let ready = $state(false);
	let canvasHost = $state<HTMLDivElement>();
	let interaction = $state<CanvasInteractionState>({ type: 'idle' });
	let contextMenu = $state<ContextMenuState>(null);
	let settingsOpen = $state(false);
	let downloadOpen = $state(false);
	let settingsButton = $state<HTMLButtonElement>();
	let downloadButton = $state<HTMLButtonElement>();
	let viewport = $state({ x: 0, y: 0, zoom: 1 });
	let holdTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		store.load();
		viewport = { ...store.document.viewport };
		ready = true;
		return () => {
			if (holdTimer) clearTimeout(holdTimer);
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

	function hasOwnedMarker(event: PointerEvent): boolean {
		return (
			event
				.composedPath()
				.some(
					(target) =>
						target instanceof HTMLElement &&
						(target.dataset.diagramNode !== undefined ||
							target.dataset.diagramOverlay !== undefined)
				) ||
			event
				.composedPath()
				.some((target) => target instanceof SVGElement && target.dataset.diagramEdge !== undefined)
		);
	}

	function clientPoint(event: MouseEvent | PointerEvent | TouchEvent): Point {
		if ('touches' in event && event.changedTouches.length > 0) {
			return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
		}
		return { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };
	}

	function toFlow(point: Point): Point {
		const rect = canvasHost?.getBoundingClientRect() ?? { left: 0, top: 0 };
		return {
			x: (point.x - rect.left - viewport.x) / viewport.zoom,
			y: (point.y - rect.top - viewport.y) / viewport.zoom
		};
	}

	function clearHoldTimer(): void {
		if (holdTimer) clearTimeout(holdTimer);
		holdTimer = null;
	}

	function openWheel(
		mode: 'right-hold-create' | 'connection-drop-create',
		screenOrigin: Point,
		flowOrigin: Point,
		sourceNodeId?: string
	): void {
		contextMenu = null;
		interaction = { type: 'shape-wheel', mode, screenOrigin, flowOrigin, sourceNodeId };
	}

	function handleCanvasPointerDown(event: PointerEvent): void {
		if (event.button !== 2 || hasOwnedMarker(event)) return;
		event.preventDefault();
		clearHoldTimer();
		const origin = { x: event.clientX, y: event.clientY };
		interaction = {
			type: 'right-press-pending',
			pointerId: event.pointerId,
			screenOrigin: origin,
			flowOrigin: toFlow(origin),
			startedAt: performance.now(),
			moved: false
		};
		canvasHost?.setPointerCapture(event.pointerId);
		holdTimer = setTimeout(() => {
			if (interaction.type === 'right-press-pending' && !interaction.moved) {
				openWheel('right-hold-create', interaction.screenOrigin, interaction.flowOrigin);
			}
		}, RIGHT_HOLD_DELAY_MS);
	}

	function handleCanvasPointerMove(event: PointerEvent): void {
		if (interaction.type === 'right-press-pending') {
			if (
				pointerMovedBeyondTolerance(interaction.screenOrigin, {
					x: event.clientX,
					y: event.clientY
				})
			) {
				interaction = { ...interaction, moved: true };
				clearHoldTimer();
			}
		} else if (interaction.type === 'shape-wheel' && interaction.mode === 'right-hold-create') {
			const center = clampWheelCenter(
				interaction.screenOrigin,
				window.innerWidth,
				window.innerHeight
			);
			interaction = {
				...interaction,
				hoveredShape: shapeAtWheelPoint(
					{ x: event.clientX, y: event.clientY },
					center,
					shapeConfig.wheelShapes
				)
			};
		}
	}

	function handleCanvasPointerUp(event: PointerEvent): void {
		if (event.button !== 2) return;
		clearHoldTimer();
		if (interaction.type === 'right-press-pending' && interaction.pointerId === event.pointerId) {
			const action = classifyRightRelease(
				performance.now() - interaction.startedAt,
				interaction.moved
			);
			if (action === 'quick-create')
				store.createNode(interaction.flowOrigin, shapeConfig.defaultShape);
			interaction = { type: 'idle' };
		} else if (interaction.type === 'shape-wheel' && interaction.mode === 'right-hold-create') {
			if (interaction.hoveredShape) chooseWheelShape(interaction.hoveredShape);
			else interaction = { type: 'idle' };
		}
		if (canvasHost?.hasPointerCapture(event.pointerId))
			canvasHost.releasePointerCapture(event.pointerId);
	}

	function chooseWheelShape(shape: ShapeType): void {
		if (interaction.type !== 'shape-wheel') return;
		store.createNode(interaction.flowOrigin, shape, interaction.sourceNodeId);
		interaction = { type: 'idle' };
	}

	const handleConnectStart: OnConnectStart = (_event, params) => {
		if (params.nodeId) store.selectNode(params.nodeId);
	};

	function handleConnect(connection: Connection): void {
		store.addEdge(connection.source, connection.target);
	}

	const handleConnectEnd: OnConnectEnd = (event, state) => {
		if (state.toNode || !state.fromNode) return;
		const point = clientPoint(event);
		openWheel('connection-drop-create', point, toFlow(point), state.fromNode.id);
	};

	function isValidConnection(
		connection: Connection | import('$lib/types/diagram').DiagramEdge
	): boolean {
		return (
			connection.source !== connection.target &&
			!store.edges.some(
				(edge) => edge.source === connection.source && edge.target === connection.target
			)
		);
	}

	const handleMoveEnd: OnMoveEnd = (_event, nextViewport) => {
		viewport = nextViewport;
		store.setViewport(nextViewport);
	};

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Alt') moveModifier.active = true;
		if (isTextTarget(event.target)) return;
		const command = event.metaKey || event.ctrlKey;
		if (event.key === 'Escape') {
			if (store.editingNodeId) store.cancelEditing();
			else if (interaction.type !== 'idle') interaction = { type: 'idle' };
			else if (contextMenu) contextMenu = null;
			else return;
			event.preventDefault();
			return;
		}
		if ((event.key === 'Delete' || event.key === 'Backspace') && store.deleteSelection())
			event.preventDefault();
		else if (
			command &&
			event.key.toLowerCase() === 'a' &&
			(store.nodes.length > 0 || store.edges.length > 0)
		) {
			event.preventDefault();
			store.selectAll();
		} else if (command && event.key.toLowerCase() === 'd' && store.duplicateSelection())
			event.preventDefault();
		else if (command && event.key.toLowerCase() === 'z') {
			const changed = event.shiftKey ? store.redo() : store.undo();
			if (changed) event.preventDefault();
		} else if (command && event.key.toLowerCase() === 'y' && store.redo()) event.preventDefault();
		else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
			const amount = event.shiftKey ? 10 : 1;
			const deltas: Record<string, [number, number]> = {
				ArrowLeft: [-amount, 0],
				ArrowRight: [amount, 0],
				ArrowUp: [0, -amount],
				ArrowDown: [0, amount]
			};
			const [dx, dy] = deltas[event.key];
			if (store.moveSelected(dx, dy)) event.preventDefault();
		}
	}

	function closeContextMenu(): void {
		contextMenu = null;
	}
</script>

<svelte:window
	onkeydown={handleKeydown}
	onkeyup={(event) => {
		if (event.key === 'Alt') moveModifier.active = false;
	}}
	onblur={() => (moveModifier.active = false)}
/>

<div class="diagram-shell">
	<div
		bind:this={canvasHost}
		class="canvas-host"
		role="application"
		aria-label="Diagram canvas"
		onpointerdowncapture={handleCanvasPointerDown}
		onpointermove={handleCanvasPointerMove}
		onpointerup={handleCanvasPointerUp}
		oncontextmenu={(event) => event.preventDefault()}
	>
		{#if ready}
			<SvelteFlow
				bind:nodes={store.nodes}
				bind:edges={store.edges}
				{nodeTypes}
				{edgeTypes}
				{defaultEdgeOptions}
				initialViewport={viewport}
				connectionMode={ConnectionMode.Loose}
				connectionLineType={ConnectionLineType.Straight}
				connectionLineComponent={ConnectionLine}
				nodesDraggable={moveModifier.active}
				panOnDrag={[1]}
				panActivationKey="Space"
				selectionKey="Shift"
				deleteKey={null}
				zoomOnScroll={true}
				zoomOnPinch={true}
				zoomOnDoubleClick={false}
				clickConnect={false}
				connectionDragThreshold={2}
				connectionRadius={28}
				proOptions={{ hideAttribution: true }}
				{isValidConnection}
				onconnectstart={handleConnectStart}
				onconnect={handleConnect}
				onconnectend={handleConnectEnd}
				onnodedragstart={() => store.beginDrag()}
				onnodedragstop={() => store.finishDrag()}
				onnodecontextmenu={({ event, node }) => {
					event.preventDefault();
					store.selectNode(node.id);
					contextMenu = {
						type: 'node',
						id: node.id,
						position: { x: event.clientX, y: event.clientY }
					};
				}}
				onedgeclick={({ event, edge }) => store.selectEdge(edge.id, event.metaKey || event.ctrlKey)}
				onedgecontextmenu={({ event, edge }) => {
					event.preventDefault();
					store.selectEdge(edge.id);
					contextMenu = {
						type: 'edge',
						id: edge.id,
						position: { x: event.clientX, y: event.clientY }
					};
				}}
				onpaneclick={() => {
					store.clearSelection();
					closeContextMenu();
				}}
				onmovestart={closeContextMenu}
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

	<div class="floating-controls" data-diagram-overlay>
		<button
			bind:this={settingsButton}
			type="button"
			aria-label="Settings"
			title="Settings"
			onclick={() => (settingsOpen = true)}><Settings size={20} /></button
		>
		<button
			bind:this={downloadButton}
			type="button"
			aria-label="Download diagram"
			title="Download"
			onclick={() => (downloadOpen = true)}><Download size={20} /></button
		>
	</div>

	{#if interaction.type === 'shape-wheel'}
		<ShapeWheel
			mode={interaction.mode}
			center={interaction.screenOrigin}
			hoveredShape={interaction.hoveredShape}
			onhover={(shape) => {
				if (interaction.type === 'shape-wheel')
					interaction = { ...interaction, hoveredShape: shape };
			}}
			onselect={chooseWheelShape}
			oncancel={() => (interaction = { type: 'idle' })}
		/>
	{/if}

	{#if contextMenu?.type === 'node'}
		<NodeContextMenu
			position={contextMenu.position}
			onduplicate={() => {
				store.duplicateSelection(contextMenu?.type === 'node' ? contextMenu.id : undefined);
				closeContextMenu();
			}}
			onchange={(shape) => {
				if (contextMenu?.type === 'node') store.changeShape(contextMenu.id, shape);
				closeContextMenu();
			}}
			ondelete={() => {
				if (contextMenu?.type === 'node') store.deleteNode(contextMenu.id);
				closeContextMenu();
			}}
			onclose={closeContextMenu}
		/>
	{:else if contextMenu?.type === 'edge'}
		<EdgeContextMenu
			position={contextMenu.position}
			ondelete={() => {
				if (contextMenu?.type === 'edge') store.deleteEdge(contextMenu.id);
				closeContextMenu();
			}}
			onclose={closeContextMenu}
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
