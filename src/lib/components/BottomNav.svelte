<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import Icon from './Icon.svelte';

  export type MainTab = 'live' | 'players' | 'session';

  interface Props {
    activeTab: MainTab;
    onSelect: (tab: MainTab) => void;
  }

  let { activeTab, onSelect }: Props = $props();

  // Actionable badge only: number of courts in 'ready' state waiting to start
  let readyCourtCount = $derived(
    sessionStore.session?.courts.filter(c => c.status === 'ready').length || 0
  );
</script>

<nav class="bottom-nav" aria-label="Main navigation">
  <div class="nav-inner">
    <button
      class="nav-item {activeTab === 'live' ? 'active' : ''}"
      onclick={() => onSelect('live')}
      type="button"
      aria-current={activeTab === 'live' ? 'page' : undefined}
    >
      <div class="icon-wrap">
        <Icon name="courts" size={22} />
        {#if readyCourtCount > 0}
          <span class="action-badge tabular-nums" title="{readyCourtCount} court ready to start">
            {readyCourtCount}
          </span>
        {/if}
      </div>
      <span>Live</span>
    </button>

    <button
      class="nav-item {activeTab === 'players' ? 'active' : ''}"
      onclick={() => onSelect('players')}
      type="button"
      aria-current={activeTab === 'players' ? 'page' : undefined}
    >
      <div class="icon-wrap">
        <Icon name="users" size={22} />
      </div>
      <span>Players</span>
    </button>

    <button
      class="nav-item {activeTab === 'session' ? 'active' : ''}"
      onclick={() => onSelect('session')}
      type="button"
      aria-current={activeTab === 'session' ? 'page' : undefined}
    >
      <div class="icon-wrap">
        <Icon name="receipt" size={22} />
      </div>
      <span>Session</span>
    </button>
  </div>
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-nav);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--border-subtle);
    z-index: 100;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .nav-inner {
    max-width: 680px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: center;
    padding: var(--sp-1) var(--sp-3);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--text-3);
    font-size: var(--fs-xs);
    font-weight: 700;
    min-height: 56px;
    padding: var(--sp-1) var(--sp-2);
    border-radius: var(--radius-md);
    position: relative;
  }

  .nav-item.active {
    color: var(--c-action);
  }

  .icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-badge {
    position: absolute;
    top: -4px;
    right: -10px;
    min-width: 16px;
    height: 16px;
    border-radius: var(--radius-full);
    font-size: 10px;
    font-weight: 800;
    background: var(--c-ready);
    color: #090d16;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }
</style>
