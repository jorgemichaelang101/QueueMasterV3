<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => void;
    onClose: () => void;
  }

  let {
    isOpen,
    title,
    description,
    confirmLabel,
    variant = 'danger',
    onConfirm,
    onClose,
  }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (isOpen && e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    class="modal-backdrop"
    role="alertdialog"
    aria-modal="true"
    aria-label={title}
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
  >
    <div class="modal-sheet confirm-sheet">
      <div class="sheet-handle"></div>

      <div class="confirm-header">
        <div class="confirm-title-row">
          {#if variant === 'danger'}
            <span class="danger-icon"><Icon name="alert-triangle" size={22} /></span>
          {/if}
          <h3>{title}</h3>
        </div>
        <p class="confirm-desc">{description}</p>
      </div>

      <div class="confirm-actions">
        <button class="btn-secondary cancel-btn" onclick={onClose} type="button">
          Cancel
        </button>
        <button
          class={variant === 'danger' ? 'btn-danger confirm-btn' : 'btn-primary confirm-btn'}
          onclick={() => {
            onConfirm();
            onClose();
          }}
          type="button"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .confirm-sheet {
    padding-bottom: calc(var(--sp-4) + env(safe-area-inset-bottom, 0px));
    gap: var(--sp-4);
  }

  .confirm-header {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .confirm-title-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .confirm-title-row h3 {
    font-size: var(--fs-lg);
  }

  .danger-icon {
    color: var(--c-danger);
    display: inline-flex;
  }

  .confirm-desc {
    font-size: var(--fs-md);
    color: var(--text-2);
  }

  .confirm-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-3);
  }

  .cancel-btn,
  .confirm-btn {
    width: 100%;
  }
</style>

