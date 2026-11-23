<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import { uiStore } from '../state/ui.svelte';
  import { DEFAULT_WAND_WEIGHTS } from '../constants';
  import Icon from './Icon.svelte';

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
    aria-label="Session Settings"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
  >
    <div class="modal-sheet">
      <div class="sheet-handle"></div>

      <div class="sheet-header">
        <div>
          <h3>Session Settings</h3>
          <p class="subtext">Display mode, currency, and matchmaking weights</p>
        </div>
        <button class="btn-ghost icon-close" onclick={onClose} type="button" aria-label="Close">
          <Icon name="x" size={20} />
        </button>
      </div>

      <!-- Display Theme Mode -->
      <div class="setting-group">
        <span class="group-label">Display Theme</span>
        <div class="theme-segmented">
          <button
            class="theme-opt {uiStore.theme === 'dark' ? 'active' : ''}"
            onclick={() => uiStore.setTheme('dark')}
            type="button"
          >
            <Icon name="moon" size={16} />
            <span>Dark Mode</span>
          </button>
          <button
            class="theme-opt {uiStore.theme === 'light' ? 'active' : ''}"
            onclick={() => uiStore.setTheme('light')}
            type="button"
          >
            <Icon name="sun" size={16} />
            <span>Gym Mode (Light)</span>
          </button>
        </div>
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
                onclick={() => (currency = sym)}
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
        <p class="slider-hint">Weights shuffle ±40% on each roll for match variety.</p>

        <div class="slider-item">
          <div class="slider-header tabular-nums">
            <label for="w-wait">Waiting Time Priority</label>
            <span class="slider-val">{waitWeight}</span>
          </div>
          <input id="w-wait" type="range" min="5" max="80" step="5" bind:value={waitWeight} />
        </div>

        <div class="slider-item">
          <div class="slider-header tabular-nums">
            <label for="w-games">Fewer Games Priority</label>
            <span class="slider-val">{gamesWeight}</span>
          </div>
          <input id="w-games" type="range" min="5" max="80" step="5" bind:value={gamesWeight} />
        </div>

        <div class="slider-item">
          <div class="slider-header tabular-nums">
            <label for="w-rep">Partner Freshness</label>
            <span class="slider-val">{repWeight}</span>
          </div>
          <input id="w-rep" type="range" min="5" max="80" step="5" bind:value={repWeight} />
        </div>

        <div class="slider-item">
          <div class="slider-header tabular-nums">
            <label for="w-skill">Team Skill Balance</label>
            <span class="slider-val">{skillWeight}</span>
          </div>
          <input id="w-skill" type="range" min="5" max="80" step="5" bind:value={skillWeight} />
        </div>
      </div>

      <div class="sheet-sticky-footer">
        <button class="btn-primary save-btn" onclick={saveSettings} type="button">
          <Icon name="check" size={18} />
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
    margin-bottom: var(--sp-3);
  }

  .sheet-header h3 {
    font-size: var(--fs-lg);
  }

  .subtext {
    font-size: var(--fs-sm);
    color: var(--text-2);
    margin-top: 2px;
  }

  .icon-close {
    width: var(--tap-min);
    height: var(--tap-min);
    padding: 0;
  }

  .setting-group {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--sp-3);
    margin-bottom: var(--sp-3);
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .group-label {
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .theme-segmented {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-2);
  }

  .theme-opt {
    min-height: var(--tap-min);
    border-radius: var(--radius-sm);
    background: var(--bg-input);
    border: 1px solid var(--border-subtle);
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text-2);
  }

  .theme-opt.active {
    background: var(--c-action);
    border-color: var(--c-action);
    color: var(--c-action-text);
  }

  .group-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .reset-btn {
    min-height: 32px;
    font-size: var(--fs-xs);
    color: var(--c-action);
    padding: 2px var(--sp-2);
  }

  .slider-hint {
    font-size: var(--fs-xs);
    color: var(--text-3);
  }

  .currency-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-wrap: wrap;
  }

  .currency-input {
    width: 64px;
    text-align: center;
    font-size: var(--fs-lg);
    font-weight: 700;
  }

  .currency-presets {
    display: flex;
    gap: var(--sp-1);
    flex: 1;
  }

  .preset-chip {
    flex: 1;
    min-height: var(--tap-min);
    padding: 0;
    background: var(--bg-input);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--text-2);
    font-size: var(--fs-md);
    font-weight: 700;
  }

  .preset-chip.active {
    background: var(--c-action);
    border-color: var(--c-action);
    color: var(--c-action-text);
  }

  .slider-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-1);
  }

  .slider-val {
    color: var(--c-action);
    font-weight: 700;
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--c-action);
    cursor: pointer;
    background: transparent;
    min-height: 32px;
    padding: 0;
    border: none;
  }

  .save-btn {
    width: 100%;
  }
</style>
