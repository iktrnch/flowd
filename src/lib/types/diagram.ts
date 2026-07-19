import type { Edge, Node, Viewport, XYPosition } from '@xyflow/svelte';

export type ShapeType = 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'diamond';

export interface ShapeNodeData extends Record<string, unknown> {
	shape: ShapeType;
	label: string;
	width: number;
	height: number;
}

export type DiagramNode = Node<ShapeNodeData, 'shape'>;
export type DiagramEdge = Edge<Record<string, never>, 'floating'>;
export type ShapeWheelMode = 'right-hold-create' | 'connection-drop-create';

export type CanvasInteractionState =
	| { type: 'idle' }
	| {
			type: 'right-press-pending';
			pointerId: number;
			screenOrigin: XYPosition;
			flowOrigin: XYPosition;
			startedAt: number;
			moved: boolean;
	  }
	| {
			type: 'shape-wheel';
			mode: ShapeWheelMode;
			screenOrigin: XYPosition;
			flowOrigin: XYPosition;
			sourceNodeId?: string;
			hoveredShape?: ShapeType;
	  }
	| { type: 'editing-node'; nodeId: string; previousText: string };

export interface DiagramDocument {
	version: 1;
	id: string;
	name: string;
	nodes: DiagramNode[];
	edges: DiagramEdge[];
	viewport: Viewport;
	createdAt: string;
	updatedAt: string;
}

export interface DiagramSnapshot {
	nodes: DiagramNode[];
	edges: DiagramEdge[];
}

export interface Point extends XYPosition {}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}
