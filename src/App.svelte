<script lang="ts">
  import { sessionStore } from './lib/state/session.svelte';
  import SetupView from './lib/views/SetupView.svelte';
  import CourtsView from './lib/views/CourtsView.svelte';
  import QueueView from './lib/views/QueueView.svelte';
  import PlayersView from './lib/views/PlayersView.svelte';
  import CostsView from './lib/views/CostsView.svelte';
  import BottomNav from './lib/components/BottomNav.svelte';
  import SettingsModal from './lib/components/SettingsModal.svelte';
  import EndSessionModal from './lib/components/EndSessionModal.svelte';

  let activeTab = $state<'courts' | 'queue' | 'players' | 'costs'>('courts');
  let isSettingsOpen = $state(false);
  let isEndSessionOpen = $state(false);
</script>

<div class="app-shell">
  {#if !sessionStore.session}
    <main class="app-container">
      <SetupView />
    </main>
  {:else}
    <!-- Top Header Bar -->
    <header class="app-topbar">
      <div class="topbar-inner">
        <div class="session-brand">
          <div class="sport-icon-bubble">
            {sessionStore.session.sport === 'badminton' ? '🏸' : '🏓'}
          </div>
          <div class="session-meta">
            <span class="app-title">Queue Master</span>
            <div class="format-pill-row">
              <span class="format-pill">
                {sessionStore.session.sport === 'badminton' ? 'Badminton' : 'Pickleball'}
              </span>
              <span class="format-pill">
                {sessionStore.session.format === 'doubles' ? '2v2 Doubles' : '1v1 Singles'}
              </span>
            </div>
          </div>
        </div>

        <div class="topbar-actions">
          <button
            class="top-icon-btn"
            onclick={() => isSettingsOpen = true}
            type="button"
            title="Settings & Weights"
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          <button
            class="top-end-btn"
            onclick={() => isEndSessionOpen = true}
            type="button"
            title="End Session"
          >
            End
          </button>
        </div>
      </div>
    </header>

    <!-- Main Tab View Content -->
    <main class="app-container">
      {#if activeTab === 'courts'}
        <CourtsView onOpenQueueTab={() => activeTab = 'queue'} />
      {:else if activeTab === 'queue'}
        <QueueView />
      {:else if activeTab === 'players'}
        <PlayersView />
      {:else if activeTab === 'costs'}
        <CostsView />
      {/if}
    </main>

    <!-- Fixed Bottom Tab Bar -->
    <BottomNav
      {activeTab}
      onSelect={(tab) => activeTab = tab}
    />

    <!-- Settings & End Session Sheets -->
    <SettingsModal
      isOpen={isSettingsOpen}
      onClose={() => isSettingsOpen = false}
    />

    <EndSessionModal
      isOpen={isEndSessionOpen}
      onClose={() => isEndSessionOpen = false}
    />
  {/if}
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
  }

  .app-topbar {
    position: sticky;
    top: 0;
    z-index: 90;
    background: rgba(9, 13, 22, 0.88);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border-subtle);
  }

  .topbar-inner {
    max-width: 680px;
    margin: 0 auto;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .session-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .sport-icon-bubble {
    font-size: 22px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: var(--radius-md);
    padding: 4px 8px;
  }

  .session-meta {
    display: flex;
    flex-direction: column;
  }

  .app-title {
    font-size: 15px;
    font-weight: 800;
    color: var(--text-primary);
    font-family: var(--font-heading);
    letter-spacing: -0.01em;
  }

  .format-pill-row {
    display: flex;
    gap: 4px;
  }

  .format-pill {
    font-size: 10px;
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 6px;
    border-radius: var(--radius-full);
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .top-icon-btn {
    padding: 8px;
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
  }

  .top-icon-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  .top-end-btn {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 700;
    color: #fb7185;
    background: rgba(244, 63, 94, 0.12);
    border: 1px solid rgba(244, 63, 94, 0.25);
    border-radius: var(--radius-sm);
  }

  .top-end-btn:hover {
    background: rgba(244, 63, 94, 0.2);
  }
</style>
