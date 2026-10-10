<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import { DEFAULT_WAND_WEIGHTS } from '../constants';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let currency = $state(sessionStore.session?.settings.currency || '₱');
  let waitWeight = $state(sessionStore.session?.settings.baseWeights.waitingTime || DEFAULT_WAND_WEIGHTS.waitingTime);
  let gamesWeight = $state(sessionStore.session?.settings.baseWeights.gamesPlayed || DEFAULT_WAND_WEIGHTS.gamesPlayed);
  let repWeight = $state(sessionStore.session?.settings.baseWeights.repetition || DEFAULT_WAND_WEIGHTS.repetition);
  let skillWeight = $state(sessionStore.session?.settings.baseWeights.skillBalance || DEFAULT_WAND_WEIGHTS.skillBalance);

  $effect(() => {
    if (sessionStore.session) {
      currency = sessionStore.session.settings.currency;
      waitWeight = sessionStore.session.settings.baseWeights.waitingTime;
      gamesWeight = sessionStore.session.settings.baseWeights.gamesPlayed;
      repWeight = sessionStore.session.settings.baseWeights.repetition;
      skillWeight = sessionStore.session.settings.baseWeights.skillBalance;
    }
  });

  function saveSettings() {
    sessionStore.updateSettings(currency, {
      waitingTime: waitWeight,
      gamesPlayed: gamesWeight,
      repetition: repWeight,
      skillBalance: skillWeight,
    });
    onClose();
  }

  function resetWeights() {
    waitWeight = DEFAULT_WAND_WEIGHTS.waitingTime;
    gamesWeight = DEFAULT_WAND_WEIGHTS.gamesPlayed;
    repWeight = DEFAULT_WAND_WEIGHTS.repetition;
    skillWeight = DEFAULT_WAND_WEIGHTS.skillBalance;
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" onclick={onClose} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-sheet" onclick={(e) => e.stopPropagation()} role="document">
      <div class="sheet-handle"></div>

      <div class="sheet-header">
        <div>
          <h3>Session Settings</h3>
          <p class="subtext">Configure currency and tune Magic Wand matchmaking weights</p>
        </div>
        <button class="btn-ghost" onclick={onClose} type="button" aria-label="Close">✕</button>
      </div>

      <!-- Currency selection -->
      <div class="setting-group">
        <label for="currency-select" class="group-label">Currency Symbol</label>
        <div class="currency-row">
          <input
            id="currency-select"
            class="currency-input"
            type="text"
            maxlength="4"
            bind:value={currency}
            placeholder="₱"
          />
          <div class="currency-presets">
            {#each ['₱', '$', '€', '¥', '£'] as sym}
              <button
                class="preset-chip {currency === sym ? 'active' : ''}"
                onclick={() => currency = sym}
                type="button"
              >
                {sym}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Magic Wand Weight Sliders -->
      <div class="setting-group">
        <div class="group-title-row">
          <span class="group-label">Magic Wand Base Weights</span>
          <button class="btn-ghost reset-btn" onclick={resetWeights} type="button">Reset Defaults</button>
        </div>
        <p class="slider-hint">Weights are automatically shuffled ±40% on every wand tap for variety.</p>

        <!-- Slider 1: Waiting Time -->
        <div class="slider-item">
          <div class="slider-header">
            <span>⏳ Waiting Time</span>
            <span class="slider-val">{waitWeight}</span>
          </div>
          <input type="range" min="5" max="80" step="5" bind:value={waitWeight} />
        </div>

        <!-- Slider 2: Games Played -->
        <div class="slider-item">
          <div class="slider-header">
            <span>🎮 Games Played Priority (Fewer Games First)</span>
            <span class="slider-val">{gamesWeight}</span>
          </div>
          <input type="range" min="5" max="80" step="5" bind:value={gamesWeight} />
        </div>

        <!-- Slider 3: Repetition Avoidance -->
        <div class="slider-item">
          <div class="slider-header">
            <span>🔄 Partner Repetition Avoidance</span>
            <span class="slider-val">{repWeight}</span>
          </div>
          <input type="range" min="5" max="80" step="5" bind:value={repWeight} />
        </div>

        <!-- Slider 4: Skill Balance -->
        <div class="slider-item">
          <div class="slider-header">
            <span>⚖️ Team Skill Balance</span>
            <span class="slider-val">{skillWeight}</span>
          </div>
          <input type="range" min="5" max="80" step="5" bind:value={skillWeight} />
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-primary save-btn" onclick={saveSettings} type="button">
          Save Settings
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .subtext {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .setting-group {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: 16px;
    margin-bottom: 16px;
  }

  .group-label {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .group-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .reset-btn {
    font-size: 11px;
    color: var(--accent-cyan);
    padding: 2px 6px;
  }

  .slider-hint {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 14px;
  }

  .currency-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .currency-input {
    width: 64px;
    text-align: center;
    font-size: 18px;
    font-weight: 700;
  }

  .currency-presets {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .preset-chip {
    padding: 6px 14px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 600;
  }

  .preset-chip.active {
    background: rgba(56, 189, 248, 0.2);
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
  }

  .slider-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .slider-val {
    color: var(--accent-cyan);
    font-weight: 700;
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--accent-violet);
    cursor: pointer;
    background: transparent;
  }

  .modal-actions {
    margin-top: 10px;
  }

  .save-btn {
    width: 100%;
    padding: 14px;
    font-size: 15px;
  }
</style>
