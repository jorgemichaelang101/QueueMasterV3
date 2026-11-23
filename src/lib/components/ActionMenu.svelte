<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte';

  export interface ActionMenuItem {
    label: string;
    icon?: IconName;
    variant?: 'default' | 'danger';
    disabled?: boolean;
    onSelect: () => void;
  }

  interface Props {
    isOpen: boolean;
    title: string;
    subtitle?: string;
    items: ActionMenuItem[];
    onClose: () => void;
  }

  let { isOpen, title, subtitle, items, onClose }: Props = $props();

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
    role="dialog"
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
    <div class="modal-sheet menu-sheet">
      <div class="sheet-handle"></div>

      <div class="menu-header">
        <div class="menu-titles">
          <h4>{title}</h4>
          {#if subtitle}
            <p class="menu-sub">{subtitle}</p>
          {/if}
        </div>
        <button class="btn-ghost icon-close" onclick={onClose} type="button" aria-label="Close menu">
          <Icon name="x" size={20} />
        </button>
      </div>

      <div class="menu-list">
        {#each items as item}
          <button
            class="menu-row {item.variant === 'danger' ? 'danger' : ''}"
            disabled={item.disabled}
            onclick={() => {
              item.onSelect();
              onClose();
            }}
            type="button"
          >
            {#if item.icon}
              <Icon name={item.icon} size={20} />
            {/if}
            <span>{item.label}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .menu-sheet {
    padding-bottom: calc(var(--sp-4) + env(safe-area-inset-bottom, 0px));
  }

  .menu-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: var(--sp-2);
  }

  .menu-titles h4 {
    font-size: var(--fs-lg);
  }

  .menu-sub {
    font-size: var(--fs-sm);
    color: var(--text-3);
    margin-top: 2px;
  }

  .icon-close {
    width: var(--tap-min);
    height: var(--tap-min);
    padding: 0;
  }

  .menu-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }

  .menu-row {
    width: 100%;
    min-height: var(--tap-lg);
    justify-content: flex-start;
    padding: var(--sp-3);
    border-radius: var(--radius-md);
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--text-1);
    gap: var(--sp-3);
  }

  .menu-row:hover:not(:disabled) {
    background: var(--bg-subtle-hover);
  }

  .menu-row.danger {
    color: var(--c-danger-text);
  }

  .menu-row.danger:hover:not(:disabled) {
    background: var(--c-danger-tint);
  }
</style>

