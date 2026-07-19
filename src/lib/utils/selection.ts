import type { SelectionIds, SelectionOperation } from '$lib/types/diagram';

type SelectionModifierEvent = Pick<PointerEvent | MouseEvent, 'ctrlKey' | 'shiftKey'>;

export function getSelectionOperation(event: SelectionModifierEvent): SelectionOperation {
	if (event.shiftKey) return 'remove';
	if (event.ctrlKey) return 'add';
	return 'replace';
}

export function emptySelection(): SelectionIds {
	return { nodeIds: new Set(), edgeIds: new Set() };
}

export function reconcileSelection(
	base: SelectionIds,
	affected: SelectionIds,
	operation: SelectionOperation
): SelectionIds {
	if (operation === 'replace') {
		return {
			nodeIds: new Set(affected.nodeIds),
			edgeIds: new Set(affected.edgeIds)
		};
	}
	const nodeIds = new Set(base.nodeIds);
	const edgeIds = new Set(base.edgeIds);
	for (const id of affected.nodeIds) {
		if (operation === 'add') nodeIds.add(id);
		else nodeIds.delete(id);
	}
	for (const id of affected.edgeIds) {
		if (operation === 'add') edgeIds.add(id);
		else edgeIds.delete(id);
	}
	return { nodeIds, edgeIds };
}
