import { describe, expect, it } from 'vitest';
import { testNode } from './test-fixtures';
import {
	ACTIVE_DOCUMENT_STORAGE_KEY,
	createDiagramDocument,
	DOCUMENTS_STORAGE_KEY,
	loadActiveDocument,
	parseDiagramDocument,
	parseStoredDocuments
} from './storage';

class MemoryStorage {
	items = new Map<string, string>();
	getItem(key: string): string | null {
		return this.items.get(key) ?? null;
	}
	setItem(key: string, value: string): void {
		this.items.set(key, value);
	}
}

describe('diagram storage', () => {
	it('parses a valid versioned document', () => {
		const document = createDiagramDocument(new Date('2026-01-01T00:00:00.000Z'));
		document.nodes = [testNode('a', 0)];
		expect(parseDiagramDocument(document)?.nodes).toHaveLength(1);
	});

	it('rejects malformed and outdated documents', () => {
		expect(parseDiagramDocument({ version: 2 })).toBeNull();
		expect(parseStoredDocuments('{bad json')).toEqual([]);
		expect(parseStoredDocuments(JSON.stringify([{ version: 1, id: 'broken' }]))).toEqual([]);
	});

	it('falls back safely when stored data is malformed', () => {
		const storage = new MemoryStorage();
		storage.setItem(DOCUMENTS_STORAGE_KEY, 'not-json');
		storage.setItem(ACTIVE_DOCUMENT_STORAGE_KEY, 'missing');
		const document = loadActiveDocument(storage);
		expect(document.version).toBe(1);
		expect(document.nodes).toEqual([]);
	});
});
