import type { DiagramSnapshot } from '$lib/types/diagram';

function cloneSnapshot(snapshot: DiagramSnapshot): DiagramSnapshot {
	return structuredClone(snapshot);
}

function sameSnapshot(a: DiagramSnapshot, b: DiagramSnapshot): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

export class DiagramHistory {
	#past: DiagramSnapshot[] = [];
	#future: DiagramSnapshot[] = [];
	#groupStart: DiagramSnapshot | null = null;

	constructor(private readonly limit = 100) {}

	get canUndo(): boolean {
		return this.#past.length > 0;
	}

	get canRedo(): boolean {
		return this.#future.length > 0;
	}

	beginGroup(current: DiagramSnapshot): void {
		this.#groupStart ??= cloneSnapshot(current);
	}

	commitGroup(current: DiagramSnapshot): boolean {
		if (!this.#groupStart) return false;
		const start = this.#groupStart;
		this.#groupStart = null;
		if (sameSnapshot(start, current)) return false;
		this.#pushPast(start);
		this.#future = [];
		return true;
	}

	cancelGroup(): void {
		this.#groupStart = null;
	}

	record(before: DiagramSnapshot, after: DiagramSnapshot): boolean {
		if (sameSnapshot(before, after)) return false;
		this.#pushPast(cloneSnapshot(before));
		this.#future = [];
		return true;
	}

	undo(current: DiagramSnapshot): DiagramSnapshot | null {
		const previous = this.#past.pop();
		if (!previous) return null;
		this.#future.push(cloneSnapshot(current));
		return cloneSnapshot(previous);
	}

	redo(current: DiagramSnapshot): DiagramSnapshot | null {
		const next = this.#future.pop();
		if (!next) return null;
		this.#pushPast(cloneSnapshot(current));
		return cloneSnapshot(next);
	}

	clear(): void {
		this.#past = [];
		this.#future = [];
		this.#groupStart = null;
	}

	#pushPast(snapshot: DiagramSnapshot): void {
		this.#past.push(snapshot);
		if (this.#past.length > this.limit) this.#past.shift();
	}
}
