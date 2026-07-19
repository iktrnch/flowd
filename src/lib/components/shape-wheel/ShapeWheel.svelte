<script lang="ts">
	import { shapeConfig, shapeRegistry } from '$lib/config/shapes';
	import type { Point, ShapeType, ShapeWheelMode } from '$lib/types/diagram';
	import { clampWheelCenter, shapeAtWheelPoint, wheelItemPosition } from '$lib/utils/shape-wheel';

	let {
		mode,
		center,
		hoveredShape,
		onhover,
		onselect,
		oncancel
	}: {
		mode: ShapeWheelMode;
		center: Point;
		hoveredShape?: ShapeType;
		onhover: (shape?: ShapeType) => void;
		onselect: (shape: ShapeType) => void;
		oncancel: () => void;
	} = $props();

	let displayCenter = $derived(
		clampWheelCenter(
			center,
			typeof window === 'undefined' ? 1000 : window.innerWidth,
			typeof window === 'undefined' ? 800 : window.innerHeight
		)
	);

	function updateHover(event: PointerEvent): void {
		onhover(
			shapeAtWheelPoint(
				{ x: event.clientX, y: event.clientY },
				displayCenter,
				shapeConfig.wheelShapes
			)
		);
	}
</script>

<div
	class="wheel-overlay"
	data-diagram-overlay
	role="presentation"
	onpointermove={updateHover}
	onpointerdown={(event) => {
		if (event.target === event.currentTarget && mode === 'connection-drop-create') oncancel();
	}}
	oncontextmenu={(event) => event.preventDefault()}
>
	<div
		class="wheel"
		style:left={`${displayCenter.x}px`}
		style:top={`${displayCenter.y}px`}
		role="menu"
		aria-label="Choose a shape"
	>
		<div class="wheel-center"></div>
		{#each shapeRegistry as shape, index (shape.type)}
			{@const position = wheelItemPosition(index, shapeRegistry.length)}
			<button
				type="button"
				class:active={hoveredShape === shape.type}
				class="shape-option"
				style:transform={`translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`}
				aria-label={shape.label}
				title={shape.label}
				onpointerenter={() => onhover(shape.type)}
				onclick={() => onselect(shape.type)}
			>
				<span class:diamond={shape.type === 'diamond'} class={`shape-preview ${shape.type}`}></span>
			</button>
		{/each}
	</div>
</div>

<style>
	.wheel-overlay {
		position: fixed;
		z-index: 40;
		inset: 0;
	}

	.wheel {
		position: absolute;
		width: 184px;
		height: 184px;
		transform: translate(-50%, -50%) scale(1);
		border: 1px solid var(--surface-border);
		border-radius: 50%;
		background: rgb(255 255 255 / 0.94);
		box-shadow: var(--surface-shadow);
		animation: wheel-in 100ms ease-out;
	}

	.wheel-center {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 40px;
		height: 40px;
		transform: translate(-50%, -50%);
		border: 1px solid #e5e7eb;
		border-radius: 50%;
		background: #f8fafc;
	}

	.shape-option {
		position: absolute;
		top: 50%;
		left: 50%;
		display: grid;
		width: 42px;
		height: 42px;
		place-items: center;
		border: 1px solid #d8dde3;
		border-radius: 50%;
		background: white;
		color: var(--shape-border-color);
		cursor: pointer;
		transition:
			border-color 100ms ease,
			background 100ms ease,
			transform 100ms ease;
	}

	.shape-option.active,
	.shape-option:hover {
		border-color: var(--selection-color);
		background: #eff6ff;
	}

	.shape-preview {
		display: block;
		width: 22px;
		height: 15px;
		border: 1.8px solid currentColor;
		border-radius: 2px;
	}

	.shape-preview.rounded-rectangle {
		border-radius: 6px;
	}

	.shape-preview.ellipse {
		border-radius: 50%;
	}

	.shape-preview.diamond {
		width: 17px;
		height: 17px;
		transform: rotate(45deg);
		border-radius: 1px;
	}

	@keyframes wheel-in {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.96);
		}
	}
</style>
