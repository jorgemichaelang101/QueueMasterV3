<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import type { Court, Player } from '../types';
  import SkillBadge from './SkillBadge.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    court: Court | null;
    isOpen: boolean;
    onClose: () => void;
  }

  let { court, isOpen, onClose }: Props = $props();

  let selectedWinner = $state<'A' | 'B' | null>('A');
  let scoreA = $state<number | null>(null);
  let scoreB = $state<number | null>(null);

  function getPlayer(id: string): Player | undefined {
    return sessionStore.session?.players.find(p => p.id === id);
  }

  function handleComplete() {
    if (!court) return;
    sessionStore.endMatch(court.id, selectedWinner, scoreA, scoreB);
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (isOpen && e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && court && court.match}
  {@const match = court.match}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="Finish Match — Court {court.courtNumber}"
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
          <h3>Finish Match · Court {court.courtNumber}</h3>
          <p class="subtext">Select the winning team or mark as casual</p>
        </div>
        <button class="btn-ghost icon-close" onclick={onClose} type="button" aria-label="Close">
          <Icon name="x" size={20} />
        </button>
      </div>

      <!-- Winner Selection Buttons -->
      <div class="winner-selection-grid">
        <button
          class="winner-card {selectedWinner === 'A' ? 'selected' : ''}"
          onclick={() => (selectedWinner = 'A')}
          type="button"
        >
          <div class="winner-title-row">
            <Icon name="trophy" size={16} />
            <span class="winner-tag">Team A Won</span>
          </div>
          <div class="players-list">
            {#each match.teamA as pId}
              {@const p = getPlayer(pId)}
              {#if p}
                <div class="player-line">
                  <span class="p-name">{p.name}</span>
                  <SkillBadge skill={p.skill} compact={true} />
                </div>
              {/if}
            {/each}
          </div>
        </button>

        <button
          class="winner-card {selectedWinner === 'B' ? 'selected' : ''}"
          onclick={() => (selectedWinner = 'B')}
          type="button"
        >
          <div class="winner-title-row">
            <Icon name="trophy" size={16} />
            <span class="winner-tag">Team B Won</span>
          </div>
          <div class="players-list">
            {#each match.teamB as pId}
              {@const p = getPlayer(pId)}
              {#if p}
                <div class="player-line">
                  <span class="p-name">{p.name}</span>
                  <SkillBadge skill={p.skill} compact={true} />
                </div>
              {/if}
            {/each}
          </div>
        </button>
      </div>

      <!-- Skip Winner Option -->
      <div class="skip-winner-wrap">
        <button
          class="skip-btn {selectedWinner === null ? 'selected' : ''}"
          onclick={() => (selectedWinner = null)}
          type="button"
        >
          No Winner / Casual Match
        </button>
      </div>

      <!-- Optional Exact Score Inputs -->
      <div class="score-inputs-card">
        <div class="score-header">
          <span>Final Score</span>
          <span class="score-hint">Optional</span>
        </div>
        <div class="score-inputs-row tabular-nums">
          <div class="score-field">
            <label for="score-a">Team A</label>
            <input
              id="score-a"
              type="number"
              min="0"
              max="99"
              placeholder="0"
              value={scoreA ?? ''}
              oninput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                scoreA = val ? parseInt(val) : null;
              }}
            />
          </div>
          <span class="score-vs">–</span>
          <div class="score-field">
            <label for="score-b">Team B</label>
            <input
              id="score-b"
              type="number"
              min="0"
              max="99"
              placeholder="0"
              value={scoreB ?? ''}
              oninput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                scoreB = val ? parseInt(val) : null;
              }}
            />
          </div>
        </div>
      </div>

      <div class="sheet-sticky-footer">
        <button class="btn-primary complete-btn" onclick={handleComplete} type="button">
          <Icon name="check" size={18} />
          Finish Match & Free Court
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
    margin-bottom: var(--sp-4);
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

  .winner-selection-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-3);
    margin-bottom: var(--sp-3);
  }

  .winner-card {
    background: var(--bg-subtle);
    border: 2px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--sp-3);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--sp-2);
    text-align: left;
  }

  .winner-card.selected {
    border-color: var(--c-playing);
    background: var(--c-playing-tint);
  }

  .winner-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-2);
  }

  .winner-card.selected .winner-title-row {
    color: var(--c-playing);
  }

  .winner-tag {
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text-1);
  }

  .players-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    width: 100%;
  }

  .player-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-1);
    min-width: 0;
  }

  .p-name {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .skip-winner-wrap {
    margin-bottom: var(--sp-3);
  }

  .skip-btn {
    width: 100%;
    min-height: var(--tap-min);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-2);
    border: 1px dashed var(--border-strong);
    background: var(--bg-subtle);
  }

  .skip-btn.selected {
    border-style: solid;
    border-color: var(--c-action);
    color: var(--text-1);
    background: var(--c-action-tint);
  }

  .score-inputs-card {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--sp-3);
  }

  .score-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-2);
    margin-bottom: var(--sp-2);
  }

  .score-hint {
    color: var(--text-3);
    font-weight: 600;
  }

  .score-inputs-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-4);
  }

  .score-field {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-1);
  }

  .score-field label {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-3);
  }

  .score-field input {
    width: 80px;
    text-align: center;
    font-size: var(--fs-xl);
    font-weight: 700;
    padding: var(--sp-2);
  }

  .score-vs {
    font-size: var(--fs-xl);
    font-weight: 700;
    color: var(--text-3);
    margin-top: 18px;
  }

  .complete-btn {
    width: 100%;
  }
</style>
