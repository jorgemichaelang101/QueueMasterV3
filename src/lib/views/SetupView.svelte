<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import type { Sport, Format } from '../types';

  let selectedSport = $state<Sport>('badminton');
  let selectedFormat = $state<Format>('doubles');
  let courtCount = $state<number>(2);
  let currency = $state<string>('₱');

  function handleStart() {
    sessionStore.startSession(selectedSport, selectedFormat, courtCount, currency);
  }
</script>

<div class="setup-view">
  <div class="setup-hero">
    <div class="logo-badge">🏸</div>
    <h1>Queue Master v3</h1>
    <p class="hero-subtitle">Offline-First Badminton & Pickleball Session Manager</p>
  </div>

  <div class="glass-card setup-card">
    <!-- Sport Selection -->
    <div class="section-block">
      <span class="block-label">Select Sport</span>
      <div class="pill-grid">
        <button
          class="choice-card {selectedSport === 'badminton' ? 'active' : ''}"
          onclick={() => selectedSport = 'badminton'}
          type="button"
        >
          <span class="choice-icon">🏸</span>
          <span class="choice-title">Badminton</span>
          <span class="choice-desc">Target 21 pts</span>
        </button>

        <button
          class="choice-card {selectedSport === 'pickleball' ? 'active' : ''}"
          onclick={() => selectedSport = 'pickleball'}
          type="button"
        >
          <span class="choice-icon">🏓</span>
          <span class="choice-title">Pickleball</span>
          <span class="choice-desc">Target 11 pts</span>
        </button>
      </div>
    </div>

    <!-- Match Format Selection -->
    <div class="section-block">
      <span class="block-label">Match Format</span>
      <div class="pill-grid">
        <button
          class="choice-card {selectedFormat === 'doubles' ? 'active' : ''}"
          onclick={() => selectedFormat = 'doubles'}
          type="button"
        >
          <span class="choice-icon">👥</span>
          <span class="choice-title">Doubles</span>
          <span class="choice-desc">2 vs 2 (4 players)</span>
        </button>

        <button
          class="choice-card {selectedFormat === 'singles' ? 'active' : ''}"
          onclick={() => selectedFormat = 'singles'}
          type="button"
        >
          <span class="choice-icon">👤</span>
          <span class="choice-title">Singles</span>
          <span class="choice-desc">1 vs 1 (2 players)</span>
        </button>
      </div>
    </div>

    <!-- Initial Court Count -->
    <div class="section-block">
      <div class="label-with-hint">
        <span class="block-label">Initial Court Count</span>
        <span class="hint-text">(Can be dynamically added/removed anytime)</span>
      </div>
      <div class="stepper-row">
        {#each [1, 2, 3, 4, 5, 6] as num}
          <button
            class="court-chip {courtCount === num ? 'active' : ''}"
            onclick={() => courtCount = num}
            type="button"
          >
            {num}
          </button>
        {/each}
      </div>
    </div>

    <!-- Currency Selection -->
    <div class="section-block">
      <span class="block-label">Currency Symbol</span>
      <div class="currency-presets">
        {#each ['₱', '$', '€', '¥', '£'] as sym}
          <button
            class="sym-chip {currency === sym ? 'active' : ''}"
            onclick={() => currency = sym}
            type="button"
          >
            {sym}
          </button>
        {/each}
      </div>
    </div>

    <button class="btn-primary start-btn" onclick={handleStart} type="button">
      🚀 Start Session
    </button>
  </div>
</div>

<style>
  .setup-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 24px;
  }

  .setup-hero {
    text-align: center;
    margin-bottom: 24px;
  }

  .logo-badge {
    font-size: 42px;
    margin-bottom: 8px;
    display: inline-block;
  }

  .hero-subtitle {
    color: var(--text-secondary);
    font-size: 14px;
    margin-top: 4px;
  }

  .setup-card {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
  }

  .section-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .block-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .label-with-hint {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .hint-text {
    font-size: 11px;
    color: var(--text-muted);
  }

  .pill-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .choice-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    transition: all 0.18s ease;
  }

  .choice-card:hover {
    border-color: rgba(255, 255, 255, 0.18);
  }

  .choice-card.active {
    border-color: var(--accent-cyan);
    background: rgba(56, 189, 248, 0.12);
    box-shadow: 0 0 16px rgba(56, 189, 248, 0.2);
  }

  .choice-icon {
    font-size: 26px;
    margin-bottom: 2px;
  }

  .choice-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .choice-desc {
    font-size: 11px;
    color: var(--text-muted);
  }

  .stepper-row {
    display: flex;
    gap: 8px;
  }

  .court-chip {
    flex: 1;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .court-chip.active {
    border-color: var(--accent-cyan);
    background: rgba(56, 189, 248, 0.2);
    color: #fff;
  }

  .currency-presets {
    display: flex;
    gap: 8px;
  }

  .sym-chip {
    flex: 1;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    font-size: 15px;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .sym-chip.active {
    border-color: var(--accent-cyan);
    background: rgba(56, 189, 248, 0.2);
    color: var(--accent-cyan);
  }

  .start-btn {
    width: 100%;
    padding: 15px;
    font-size: 16px;
    font-weight: 700;
    margin-top: 10px;
  }
</style>
