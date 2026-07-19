import type { ShapeType } from '$lib/types/diagram';
import { theme } from './theme';

export interface ShapeDefinition {
	type: ShapeType;
	label: string;
	preview: ShapeType;
	defaultWidth: number;
	defaultHeight: number;
	cornerRadius: number;
}

export const shapeRegistry: readonly ShapeDefinition[] = [
	{
		type: 'rectangle',
		label: 'Rectangle',
		preview: 'rectangle',
		defaultWidth: theme.defaultNodeWidth,
		defaultHeight: theme.defaultNodeHeight,
		cornerRadius: theme.shapeCornerRadius
	},
	{
		type: 'rounded-rectangle',
		label: 'Rounded rectangle',
		preview: 'rounded-rectangle',
		defaultWidth: theme.defaultNodeWidth,
		defaultHeight: theme.defaultNodeHeight,
		cornerRadius: 20
	},
	{
		type: 'ellipse',
		label: 'Ellipse',
		preview: 'ellipse',
		defaultWidth: theme.defaultNodeWidth,
		defaultHeight: theme.defaultNodeHeight,
		cornerRadius: 999
	},
	{
		type: 'diamond',
		label: 'Diamond',
		preview: 'diamond',
		defaultWidth: 176,
		defaultHeight: 112,
		cornerRadius: 0
	}
] as const;

export const shapeConfig = {
	defaultShape: 'rectangle' as ShapeType,
	wheelShapes: shapeRegistry.map((shape) => shape.type)
} as const;

export function getShapeDefinition(type: ShapeType): ShapeDefinition {
	return shapeRegistry.find((shape) => shape.type === type) ?? shapeRegistry[0];
}
