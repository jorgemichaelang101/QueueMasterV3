<script lang="ts">
  import { uiStore } from '../state/ui.svelte';
  import Icon from './Icon.svelte';
</script>

{#if uiStore.toast}
  <div class="undo-toast" role="status" aria-live="polite">
    <span class="toast-msg">{uiStore.toast.message}</span>
    <div class="toast-actions">
      {#if uiStore.toast.onUndo}
        <button class="undo-btn" onclick={() => uiStore.triggerUndo()} type="button">
          <Icon name="undo" size={16} />
          Undo
        </button>
      {/if}
      <button
        class="dismiss-btn"
        onclick={() => uiStore.dismissToast()}
        type="button"
        aria-label="Dismiss notification"
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  </div>
{/if}

<style>
  .undo-toast {
    position: fixed;
    left: var(--sp-4);
    right: var(--sp-4);
    bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    max-width: 648px;
    margin: 0 auto;
    background: var(--bg-elevated);
    color: var(--text-1);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    padding: var(--sp-2) var(--sp-3);
    box-shadow: var(--shadow-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    z-index: 250;
  }

  .toast-msg {
    font-size: var(--fs-sm);
    font-weight: 600;
  }

  .toast-actions {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    flex-shrink: 0;
  }

  .undo-btn {
    min-height: 36px;
    padding: var(--sp-1) var(--sp-3);
    border-radius: var(--radius-sm);
    background: var(--c-action-tint);
    color: var(--c-action);
    border: 1px solid var(--c-action-border);
    font-size: var(--fs-sm);
    font-weight: 700;
  }

  .dismiss-btn {
    min-height: 36px;
    width: 36px;
    padding: 0;
    color: var(--text-3);
    border-radius: var(--radius-sm);
  }
</style>

