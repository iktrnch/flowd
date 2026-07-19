import type { DiagramNode } from '$lib/types/diagram';

export function testNode(id: string, x: number, selected = false): DiagramNode {
	return {
		id,
		type: 'shape',
		position: { x, y: 0 },
		data: { shape: 'rectangle', label: id, width: 100, height: 60 },
		width: 100,
		height: 60,
		selected
	};
}
