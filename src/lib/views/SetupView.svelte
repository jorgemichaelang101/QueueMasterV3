<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import { uiStore } from '../state/ui.svelte';
  import type { Sport, Format } from '../types';
  import Icon from '../components/Icon.svelte';

  let selectedSport = $state<Sport>('badminton');
  let selectedFormat = $state<Format>('doubles');
  let courtCount = $state<number>(2);
  let currency = $state<string>('₱');

  function handleStart() {
    sessionStore.startSession(selectedSport, selectedFormat, courtCount, currency);
  }
</script>

<div class="setup-view">
  <div class="setup-top-row">
    <div class="brand-group">
      <div class="logo-badge">
        <Icon name={selectedSport === 'badminton' ? 'shuttlecock' : 'pickleball'} size={28} />
      </div>
      <div>
        <h1>Queue Master</h1>
        <p class="hero-subtitle">Courtside Queue & Session Manager</p>
      </div>
    </div>

    <button
      class="btn-secondary theme-btn"
      onclick={() => uiStore.toggleTheme()}
      type="button"
      aria-label={uiStore.theme === 'dark' ? 'Switch to Gym light mode' : 'Switch to Dark mode'}
    >
      <Icon name={uiStore.theme === 'dark' ? 'sun' : 'moon'} size={18} />
      <span>{uiStore.theme === 'dark' ? 'Gym Mode' : 'Dark'}</span>
    </button>
  </div>

  <div class="surface-card setup-card">
    <!-- Sport Selection -->
    <div class="section-block">
      <span class="block-label">Sport</span>
      <div class="pill-grid">
        <button
          class="choice-card {selectedSport === 'badminton' ? 'active' : ''}"
          onclick={() => (selectedSport = 'badminton')}
          type="button"
        >
          <span class="choice-icon"><Icon name="shuttlecock" size={26} /></span>
          <span class="choice-title">Badminton</span>
          <span class="choice-desc">21 pts · Shuttles</span>
        </button>

        <button
          class="choice-card {selectedSport === 'pickleball' ? 'active' : ''}"
          onclick={() => (selectedSport = 'pickleball')}
          type="button"
        >
          <span class="choice-icon"><Icon name="pickleball" size={26} /></span>
          <span class="choice-title">Pickleball</span>
          <span class="choice-desc">11 pts · Balls</span>
        </button>
      </div>
    </div>

    <!-- Match Format Selection (Segmented) -->
    <div class="section-block">
      <span class="block-label">Format</span>
      <div class="pill-grid">
        <button
          class="choice-card {selectedFormat === 'doubles' ? 'active' : ''}"
          onclick={() => (selectedFormat = 'doubles')}
          type="button"
        >
          <span class="choice-icon"><Icon name="users" size={22} /></span>
          <span class="choice-title">Doubles (2v2)</span>
          <span class="choice-desc">4 players per court</span>
        </button>

        <button
          class="choice-card {selectedFormat === 'singles' ? 'active' : ''}"
          onclick={() => (selectedFormat = 'singles')}
          type="button"
        >
          <span class="choice-icon"><Icon name="user" size={22} /></span>
          <span class="choice-title">Singles (1v1)</span>
          <span class="choice-desc">2 players per court</span>
        </button>
      </div>
    </div>

    <!-- Initial Court Count -->
    <div class="section-block">
      <div class="label-with-hint">
        <span class="block-label">Courts</span>
        <span class="hint-text">Add or remove anytime</span>
      </div>
      <div class="stepper-row tabular-nums">
        {#each [1, 2, 3, 4, 5, 6] as num}
          <button
            class="court-chip {courtCount === num ? 'active' : ''}"
            onclick={() => (courtCount = num)}
            type="button"
          >
            {num}
          </button>
        {/each}
      </div>
    </div>

    <!-- Currency Selection -->
    <div class="section-block">
      <span class="block-label">Currency</span>
      <div class="currency-presets">
        {#each ['₱', '$', '€', '¥', '£'] as sym}
          <button
            class="sym-chip {currency === sym ? 'active' : ''}"
            onclick={() => (currency = sym)}
            type="button"
          >
            {sym}
          </button>
        {/each}
      </div>
    </div>

    <button class="btn-primary start-btn" onclick={handleStart} type="button">
      <Icon name="play" size={18} />
      Start Session
    </button>
  </div>
</div>

<style>
  .setup-view {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding-top: var(--sp-3);
  }

  .setup-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-2);
  }

  .brand-group {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  .logo-badge {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: var(--c-action-tint);
    border: 1px solid var(--c-action-border);
    color: var(--c-action);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .brand-group h1 {
    font-size: var(--fs-xl);
  }

  .hero-subtitle {
    color: var(--text-2);
    font-size: var(--fs-sm);
  }

  .theme-btn {
    font-size: var(--fs-xs);
    padding: var(--sp-2) var(--sp-3);
  }

  .setup-card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }

  .section-block {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .block-label {
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .label-with-hint {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .hint-text {
    font-size: var(--fs-xs);
    color: var(--text-3);
  }

  .pill-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-2);
  }

  .choice-card {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--sp-3);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .choice-card.active {
    border-color: var(--c-action);
    background: var(--c-action-tint);
  }

  .choice-icon {
    color: var(--text-2);
    margin-bottom: 2px;
  }

  .choice-card.active .choice-icon {
    color: var(--c-action);
  }

  .choice-title {
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text-1);
  }

  .choice-desc {
    font-size: var(--fs-xs);
    color: var(--text-3);
  }

  .stepper-row,
  .currency-presets {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: var(--sp-2);
  }

  .currency-presets {
    grid-template-columns: repeat(5, 1fr);
  }

  .court-chip,
  .sym-chip {
    min-height: var(--tap-min);
    padding: 0;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text-2);
  }

  .court-chip.active,
  .sym-chip.active {
    border-color: var(--c-action);
    background: var(--c-action);
    color: var(--c-action-text);
  }

  .start-btn {
    width: 100%;
    margin-top: var(--sp-1);
  }
</style>
