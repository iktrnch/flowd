import type { DiagramSnapshot } from '$lib/types/diagram';

function cloneSnapshot(snapshot: DiagramSnapshot): DiagramSnapshot {
	return structuredClone(snapshot);
}

function sameSnapshot(a: DiagramSnapshot, b: DiagramSnapshot): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

export class DiagramHistory {
	#entries: DiagramSnapshot[] = [];
	#cursor = -1;
	#groupStart: DiagramSnapshot | null = null;
	readonly limit: number;

	constructor(limit = 100) {
		this.limit = Math.max(2, limit);
	}

	get canUndo(): boolean {
		return this.#cursor > 0;
	}

	get canRedo(): boolean {
		return this.#cursor >= 0 && this.#cursor < this.#entries.length - 1;
	}

	get size(): number {
		return this.#entries.length;
	}

	get cursor(): number {
		return this.#cursor;
	}

	initialize(snapshot: DiagramSnapshot): void {
		this.#entries = [cloneSnapshot(snapshot)];
		this.#cursor = 0;
		this.#groupStart = null;
	}

	beginGroup(current: DiagramSnapshot): void {
		this.#groupStart ??= cloneSnapshot(current);
	}

	commitGroup(current: DiagramSnapshot): boolean {
		if (!this.#groupStart) return false;
		const start = this.#groupStart;
		this.#groupStart = null;
		return this.record(start, current);
	}

	cancelGroup(): void {
		this.#groupStart = null;
	}

	record(before: DiagramSnapshot, after: DiagramSnapshot): boolean {
		if (sameSnapshot(before, after)) return false;
		if (this.#cursor < 0) this.initialize(before);
		this.#entries = this.#entries.slice(0, this.#cursor + 1);
		this.#entries.push(cloneSnapshot(after));
		this.#cursor = this.#entries.length - 1;
		if (this.#entries.length > this.limit) {
			const overflow = this.#entries.length - this.limit;
			this.#entries.splice(0, overflow);
			this.#cursor -= overflow;
		}
		return true;
	}

	undo(): DiagramSnapshot | null {
		if (!this.canUndo) return null;
		this.#cursor -= 1;
		return cloneSnapshot(this.#entries[this.#cursor]);
	}

	redo(): DiagramSnapshot | null {
		if (!this.canRedo) return null;
		this.#cursor += 1;
		return cloneSnapshot(this.#entries[this.#cursor]);
	}

	clear(): void {
		this.#entries = [];
		this.#cursor = -1;
		this.#groupStart = null;
	}
}
