<script lang="ts">
	import type { DiagramStore } from '$lib/stores/diagram.svelte';
	import {
		downloadBlob,
		generateSvg,
		getExportContent,
		sanitizeFilename,
		svgToPng,
		type ExportFormat,
		type ExportScope
	} from '$lib/utils/export';
	import { Download } from 'lucide-svelte';
	import Modal from './Modal.svelte';

	let {
		open,
		store,
		onclose,
		returnFocus
	}: { open: boolean; store: DiagramStore; onclose: () => void; returnFocus?: HTMLElement | null } =
		$props();

	let scope = $state<ExportScope>('whole');
	let format = $state<ExportFormat>('svg');
	let keepBackground = $state(true);
	let exporting = $state(false);
	let error = $state('');
	let selectionAvailable = $derived(
		store.nodes.some((node) => node.selected) || store.edges.some((edge) => edge.selected)
	);
	let selectedContent = $derived(getExportContent(store.nodes, store.edges, 'selection'));
	let currentContent = $derived(
		scope === 'whole' ? getExportContent(store.nodes, store.edges, 'whole') : selectedContent
	);
	let canExport = $derived(currentContent.nodes.length > 0 || currentContent.edges.length > 0);

	$effect(() => {
		if (!open || typeof sessionStorage === 'undefined') return;
		try {
			const saved = JSON.parse(
				sessionStorage.getItem('diagram-app:export-options:v1') ?? '{}'
			) as Record<string, unknown>;
			if (saved.scope === 'whole' || saved.scope === 'selection') scope = saved.scope;
			if (saved.format === 'svg' || saved.format === 'png') format = saved.format;
			if (typeof saved.keepBackground === 'boolean') keepBackground = saved.keepBackground;
		} catch {
			// Session-only options are optional; invalid data simply resets them.
		}
	});

	$effect(() => {
		if (scope === 'selection' && !selectionAvailable) scope = 'whole';
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem(
				'diagram-app:export-options:v1',
				JSON.stringify({ scope, format, keepBackground })
			);
		}
	});

	async function download(): Promise<void> {
		error = '';
		const result = generateSvg(currentContent, store.nodes, keepBackground);
		if (!result) {
			error = 'There is no diagram content to export.';
			return;
		}
		exporting = true;
		try {
			const filename = `${sanitizeFilename(store.name)}.${format}`;
			if (format === 'svg') {
				downloadBlob(new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' }), filename);
			} else {
				downloadBlob(await svgToPng(result), filename);
			}
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'The export could not be created.';
		} finally {
			exporting = false;
		}
	}
</script>

<Modal {open} title="Download" {onclose} {returnFocus}>
	<div class="field-group">
		<span class="field-label">Export</span>
		<div class="segmented" aria-label="Export scope">
			<button type="button" class:active={scope === 'whole'} onclick={() => (scope = 'whole')}
				>Whole diagram</button
			>
			<button
				type="button"
				class:active={scope === 'selection'}
				disabled={!selectionAvailable}
				onclick={() => (scope = 'selection')}>Selection only</button
			>
		</div>
		{#if !selectionAvailable}<p class="hint">
				Select a shape or arrow to export only that selection.
			</p>{/if}
	</div>

	<div class="field-group row">
		<label class="toggle-label" for="keep-background">Keep background</label>
		<button
			id="keep-background"
			type="button"
			class:active={keepBackground}
			class="toggle"
			role="switch"
			aria-checked={keepBackground}
			aria-label="Keep background"
			onclick={() => (keepBackground = !keepBackground)}><span></span></button
		>
	</div>

	<div class="field-group">
		<span class="field-label">Format</span>
		<div class="segmented compact" aria-label="Export format">
			<button type="button" class:active={format === 'svg'} onclick={() => (format = 'svg')}
				>SVG</button
			>
			<button type="button" class:active={format === 'png'} onclick={() => (format = 'png')}
				>PNG</button
			>
		</div>
	</div>

	{#if error}<p class="error" role="alert">{error}</p>{/if}
	<button
		type="button"
		class="download-button"
		disabled={!canExport || exporting}
		onclick={download}
	>
		<Download size={17} />{exporting ? 'Preparing...' : 'Download'}
	</button>
</Modal>

<style>
	.field-group {
		margin-bottom: 18px;
	}
	.field-label {
		display: block;
		margin-bottom: 7px;
		color: #475569;
		font-size: 13px;
		font-weight: 600;
	}
	.segmented {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2px;
		padding: 3px;
		border: 1px solid #d8dde3;
		border-radius: 7px;
		background: #f8fafc;
	}
	.segmented.compact {
		width: 164px;
	}
	.segmented button {
		min-height: 34px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: #475569;
		cursor: pointer;
	}
	.segmented button.active {
		background: white;
		color: #0f172a;
		box-shadow: 0 1px 3px rgb(15 23 42 / 0.12);
	}
	.segmented button:disabled {
		opacity: 0.42;
		cursor: not-allowed;
	}
	.hint {
		margin: 6px 0 0;
		color: #64748b;
		font-size: 12px;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.toggle-label {
		color: #27313b;
		font-size: 14px;
	}
	.toggle {
		position: relative;
		width: 38px;
		height: 22px;
		padding: 2px;
		border: 0;
		border-radius: 999px;
		background: #cbd5e1;
		cursor: pointer;
		transition: background 120ms ease;
	}
	.toggle span {
		display: block;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: white;
		box-shadow: 0 1px 3px rgb(15 23 42 / 0.24);
		transition: transform 120ms ease;
	}
	.toggle.active {
		background: var(--selection-color);
	}
	.toggle.active span {
		transform: translateX(16px);
	}
	.error {
		margin: 0 0 12px;
		color: #b42318;
		font-size: 13px;
	}
	.download-button {
		display: flex;
		width: 100%;
		min-height: 40px;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border: 1px solid #1d4ed8;
		border-radius: 6px;
		background: #2563eb;
		color: white;
		font-weight: 600;
		cursor: pointer;
	}
	.download-button:hover:not(:disabled) {
		background: #1d4ed8;
	}
	.download-button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
