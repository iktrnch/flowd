<script lang="ts">
	import { X } from 'lucide-svelte';
	import { tick, type Snippet } from 'svelte';

	let {
		open,
		title,
		children,
		footer,
		onclose,
		returnFocus
	}: {
		open: boolean;
		title: string;
		children: Snippet;
		footer?: Snippet;
		onclose: () => void;
		returnFocus?: HTMLElement | null;
	} = $props();

	let dialog = $state<HTMLDivElement>();
	const titleId = `modal-title-${Math.random().toString(36).slice(2)}`;

	$effect(() => {
		if (!open || typeof document === 'undefined') return;
		const previous =
			returnFocus ??
			(document.activeElement instanceof HTMLElement ? document.activeElement : null);
		void tick().then(() => {
			const first = dialog?.querySelector<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			);
			(first ?? dialog)?.focus();
		});
		return () => previous?.focus();
	});

	function handleKeydown(event: KeyboardEvent): void {
		event.stopPropagation();
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
			return;
		}
		if (event.key !== 'Tab' || !dialog) return;
		const focusable = Array.from(
			dialog.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		);
		if (focusable.length === 0) {
			event.preventDefault();
			return;
		}
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}
</script>

{#if open}
	<div
		class="modal-backdrop"
		data-diagram-overlay
		role="presentation"
		onpointerdown={(event) => {
			if (event.target === event.currentTarget) onclose();
		}}
	>
		<div
			bind:this={dialog}
			class="modal-panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			tabindex="-1"
			onkeydown={handleKeydown}
		>
			<header>
				<h2 id={titleId}>{title}</h2>
				<button type="button" class="close-button" aria-label={`Close ${title}`} onclick={onclose}>
					<X size={18} />
				</button>
			</header>
			<div class="modal-body">{@render children()}</div>
			{#if footer}
				<footer>{@render footer()}</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		z-index: 60;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 20px;
		background: rgb(15 23 42 / 0.24);
	}
	.modal-panel {
		width: min(440px, 100%);
		max-height: calc(100vh - 40px);
		overflow: auto;
		border: 1px solid var(--surface-border);
		border-radius: 8px;
		background: white;
		box-shadow: 0 18px 50px rgb(15 23 42 / 0.2);
		color: #27313b;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 17px 18px 12px;
	}
	h2 {
		margin: 0;
		font-size: 17px;
		font-weight: 650;
		letter-spacing: 0;
	}
	.close-button {
		display: grid;
		width: 32px;
		height: 32px;
		place-items: center;
		border: 0;
		border-radius: 5px;
		background: transparent;
		color: #475569;
		cursor: pointer;
	}
	.close-button:hover {
		background: #f1f5f9;
		color: #0f172a;
	}
	.modal-body {
		padding: 6px 18px 18px;
	}
	footer {
		padding: 14px 18px 18px;
		border-top: 1px solid #e5e7eb;
	}
</style>
