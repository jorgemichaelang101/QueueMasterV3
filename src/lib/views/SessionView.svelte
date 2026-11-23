<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import CostsView from './CostsView.svelte';
  import HistoryView from './HistoryView.svelte';
  import Icon from '../components/Icon.svelte';

  interface Props {
    onOpenEndSession: () => void;
  }

  let { onOpenEndSession }: Props = $props();

  let subTab = $state<'costs' | 'history'>('costs');

  let historyCount = $derived(sessionStore.session?.history.length || 0);
</script>

<div class="session-view">
  <!-- Segmented Control: Costs | History -->
  <div class="segmented-bar" role="tablist" aria-label="Session view selector">
    <button
      role="tab"
      aria-selected={subTab === 'costs'}
      class="seg-btn {subTab === 'costs' ? 'active' : ''}"
      onclick={() => (subTab = 'costs')}
      type="button"
    >
      <Icon name="receipt" size={16} />
      <span>Costs & Split</span>
    </button>

    <button
      role="tab"
      aria-selected={subTab === 'history'}
      class="seg-btn {subTab === 'history' ? 'active' : ''}"
      onclick={() => (subTab = 'history')}
      type="button"
    >
      <Icon name="history" size={16} />
      <span>History ({historyCount})</span>
    </button>
  </div>

  <!-- Active Sub-View -->
  <div class="subview-body">
    {#if subTab === 'costs'}
      <CostsView />
    {:else}
      <HistoryView />
    {/if}
  </div>

  <!-- End Session Section at bottom of Session Tab -->
  <div class="end-session-card surface-card">
    <div class="end-session-info">
      <h4>Wrap Up Session</h4>
      <p>Review final settlement, match records, and close out this session.</p>
    </div>
    <button class="btn-danger end-session-btn" onclick={onOpenEndSession} type="button">
      End Session & Summary
    </button>
  </div>
</div>

<style>
  .session-view {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }

  .segmented-bar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-1);
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--sp-1);
  }

  .seg-btn {
    min-height: 40px;
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text-2);
    gap: 6px;
  }

  .seg-btn.active {
    background: var(--c-action);
    color: var(--c-action-text);
  }

  .subview-body {
    display: flex;
    flex-direction: column;
  }

  .end-session-card {
    margin-top: var(--sp-3);
    border-color: var(--c-danger-border);
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .end-session-info h4 {
    font-size: var(--fs-md);
    color: var(--text-1);
  }

  .end-session-info p {
    font-size: var(--fs-sm);
    color: var(--text-2);
    margin-top: 2px;
  }

  .end-session-btn {
    width: 100%;
  }
</style>

