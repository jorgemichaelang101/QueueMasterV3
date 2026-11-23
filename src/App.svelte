<script lang="ts">
  import { sessionStore } from './lib/state/session.svelte';
  import { uiStore } from './lib/state/ui.svelte';
  import SetupView from './lib/views/SetupView.svelte';
  import LiveView from './lib/views/LiveView.svelte';
  import PlayersView from './lib/views/PlayersView.svelte';
  import SessionView from './lib/views/SessionView.svelte';
  import BottomNav, { type MainTab } from './lib/components/BottomNav.svelte';
  import SettingsModal from './lib/components/SettingsModal.svelte';
  import EndSessionModal from './lib/components/EndSessionModal.svelte';
  import UndoToast from './lib/components/UndoToast.svelte';
  import Icon from './lib/components/Icon.svelte';

  let activeTab = $state<MainTab>('live');
  let isSettingsOpen = $state(false);
  let isEndSessionOpen = $state(false);
</script>

<div class="app-shell">
  {#if !sessionStore.session}
    <main class="app-container">
      <SetupView />
    </main>
  {:else}
    <!-- Compact 48px Top Header Bar -->
    <header class="app-topbar">
      <div class="topbar-inner">
        <div class="session-brand">
          <div class="sport-icon-wrap" aria-hidden="true">
            <Icon
              name={sessionStore.session.sport === 'badminton' ? 'shuttlecock' : 'pickleball'}
              size={20}
            />
          </div>
          <div class="session-meta">
            <span class="app-title">Queue Master</span>
            <span class="meta-dot" aria-hidden="true">·</span>
            <span class="session-format">
              {sessionStore.session.sport === 'badminton' ? 'Badminton' : 'Pickleball'}
              {sessionStore.session.format === 'doubles' ? '2v2' : '1v1'}
            </span>
          </div>
        </div>

        <div class="topbar-actions">
          <button
            class="top-icon-btn"
            onclick={() => uiStore.toggleTheme()}
            type="button"
            aria-label={uiStore.theme === 'dark' ? 'Switch to Gym light mode' : 'Switch to Dark mode'}
            title={uiStore.theme === 'dark' ? 'Gym Mode (Light)' : 'Dark Mode'}
          >
            <Icon name={uiStore.theme === 'dark' ? 'sun' : 'moon'} size={20} />
          </button>

          <button
            class="top-icon-btn"
            onclick={() => (isSettingsOpen = true)}
            type="button"
            aria-label="Session settings"
            title="Settings & Weights"
          >
            <Icon name="settings" size={20} />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Tab View Content -->
    <main class="app-container">
      {#if activeTab === 'live'}
        <LiveView onOpenPlayersTab={() => (activeTab = 'players')} />
      {:else if activeTab === 'players'}
        <PlayersView />
      {:else if activeTab === 'session'}
        <SessionView onOpenEndSession={() => (isEndSessionOpen = true)} />
      {/if}
    </main>

    <!-- Fixed 3-Tab Bottom Navigation -->
    <BottomNav
      {activeTab}
      onSelect={(tab) => (activeTab = tab)}
    />

    <!-- Settings & End Session Sheets -->
    <SettingsModal
      isOpen={isSettingsOpen}
      onClose={() => (isSettingsOpen = false)}
    />

    <EndSessionModal
      isOpen={isEndSessionOpen}
      onClose={() => (isEndSessionOpen = false)}
    />
  {/if}

  <UndoToast />
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
    background: var(--bg-header);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-subtle);
  }

  .topbar-inner {
    max-width: 680px;
    min-height: 52px;
    margin: 0 auto;
    padding: var(--sp-1) var(--sp-4);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-2);
  }

  .session-brand {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    min-width: 0;
  }

  .sport-icon-wrap {
    width: 34px;
    height: 34px;
    background: var(--c-action-tint);
    color: var(--c-action);
    border: 1px solid var(--c-action-border);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .session-meta {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
    min-width: 0;
  }

  .app-title {
    font-size: var(--fs-md);
    font-weight: 800;
    color: var(--text-1);
    font-family: var(--font-heading);
    letter-spacing: -0.01em;
  }

  .meta-dot {
    color: var(--text-3);
    font-weight: 700;
  }

  .session-format {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-2);
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    flex-shrink: 0;
  }

  .top-icon-btn {
    width: var(--tap-min);
    height: var(--tap-min);
    padding: 0;
    color: var(--text-2);
    border-radius: var(--radius-sm);
  }

  .top-icon-btn:hover {
    color: var(--text-1);
    background: var(--bg-subtle-hover);
  }
</style>
