<script lang="ts">
  import { sessionStore } from '../state/session.svelte';

  interface Props {
    activeTab: 'courts' | 'queue' | 'players' | 'costs';
    onSelect: (tab: 'courts' | 'queue' | 'players' | 'costs') => void;
  }

  let { activeTab, onSelect }: Props = $props();

  let activeCourtCount = $derived(
    sessionStore.session?.courts.filter(c => c.status === 'in_use').length || 0
  );

  let queuedCount = $derived(
    (sessionStore.session?.nextUp.length || 0) + (sessionStore.getAvailablePlayers().length || 0)
  );

  let unpaidCount = $derived(() => {
    if (!sessionStore.session) return 0;
    return sessionStore.session.players.filter(p => !p.payment.paid).length;
  });
</script>

<nav class="bottom-nav">
  <div class="nav-inner">
    <button
      class="nav-item {activeTab === 'courts' ? 'active' : ''}"
      onclick={() => onSelect('courts')}
      type="button"
    >
      <div class="icon-wrap">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="18" rx="2"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <line x1="12" y1="3" x2="12" y2="21"/>
        </svg>
        {#if activeCourtCount > 0}
          <span class="bubble bubble-emerald">{activeCourtCount}</span>
        {/if}
      </div>
      <span>Courts</span>
    </button>

    <button
      class="nav-item {activeTab === 'queue' ? 'active' : ''}"
      onclick={() => onSelect('queue')}
      type="button"
    >
      <div class="icon-wrap">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m19 11-4-7"/>
          <path d="m2 11 20 0"/>
          <path d="m5 11 4-7"/>
          <path d="m15 11 2 9"/>
          <path d="m9 11-2 9"/>
          <path d="M12 21a9 9 0 0 0 9-9"/>
        </svg>
        {#if sessionStore.session && sessionStore.session.nextUp.length > 0}
          <span class="bubble bubble-violet">{sessionStore.session.nextUp.length}</span>
        {/if}
      </div>
      <span>Queue</span>
    </button>

    <button
      class="nav-item {activeTab === 'players' ? 'active' : ''}"
      onclick={() => onSelect('players')}
      type="button"
    >
      <div class="icon-wrap">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <span>Players</span>
    </button>

    <button
      class="nav-item {activeTab === 'costs' ? 'active' : ''}"
      onclick={() => onSelect('costs')}
      type="button"
    >
      <div class="icon-wrap">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
          <path d="M12 18V6"/>
        </svg>
        {#if unpaidCount() > 0}
          <span class="bubble bubble-amber">{unpaidCount()}</span>
        {/if}
      </div>
      <span>Costs</span>
    </button>
  </div>
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(15, 23, 42, 0.94);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 100;
    padding-bottom: env(safe-area-inset-bottom, 8px);
  }

  .nav-inner {
    max-width: 680px;
    margin: 0 auto;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 8px 12px 6px;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: var(--radius-md);
    transition: all 0.15s ease;
    position: relative;
  }

  .nav-item.active {
    color: var(--accent-cyan);
  }

  .icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bubble {
    position: absolute;
    top: -5px;
    right: -8px;
    min-width: 16px;
    height: 16px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 800;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }

  .bubble-emerald {
    background-color: var(--accent-emerald);
  }

  .bubble-violet {
    background-color: var(--accent-violet);
  }

  .bubble-amber {
    background-color: var(--accent-amber);
  }
</style>
