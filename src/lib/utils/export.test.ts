import { describe, expect, it } from 'vitest';
import type { DiagramEdge } from '$lib/types/diagram';
import {
	escapeXml,
	generateSvg,
	getContentBounds,
	getExportContent,
	sanitizeFilename
} from './export';
import { testNode } from './test-fixtures';

const nodes = [testNode('a', 0, true), testNode('b', 200, true), testNode('c', 400, false)];
const edges: DiagramEdge[] = [
	{ id: 'ab', type: 'floating', source: 'a', target: 'b' },
	{ id: 'bc', type: 'floating', source: 'b', target: 'c' },
	{ id: 'ac', type: 'floating', source: 'a', target: 'c', selected: true }
];

describe('diagram export', () => {
	it('calculates whole-diagram content and bounds', () => {
		const content = getExportContent(nodes, edges, 'whole');
		expect(content.nodes).toHaveLength(3);
		expect(content.edges).toHaveLength(3);
		expect(getContentBounds(content, nodes)).toEqual({ x: 0, y: 0, width: 500, height: 60 });
	});

	it('includes selected nodes, explicit edges, and edges between selected nodes', () => {
		const content = getExportContent(nodes, edges, 'selection');
		expect(content.nodes.map((node) => node.id)).toEqual(['a', 'b']);
		expect(content.edges.map((edge) => edge.id)).toEqual(['ab', 'ac']);
	});

	it('generates vector SVG primitives and optional background pattern', () => {
		const result = generateSvg(getExportContent(nodes, edges, 'whole'), nodes, true);
		expect(result?.svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
		expect(result?.svg).toContain('<pattern id="dot-grid"');
		expect(result?.svg).toContain('<rect');
		expect(result?.svg).not.toContain('foreignObject');
		expect(result?.svg).not.toContain('connection-preview');
	});

	it('escapes XML and sanitises filenames', () => {
		expect(escapeXml('<A & "B">')).toBe('&lt;A &amp; &quot;B&quot;&gt;');
		expect(sanitizeFilename('  My / Diagram!?  ')).toBe('my-diagram');
		expect(sanitizeFilename('***')).toBe('untitled-diagram');
	});
});
