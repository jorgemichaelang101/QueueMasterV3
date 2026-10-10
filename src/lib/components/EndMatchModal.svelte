<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import type { Court, Player } from '../types';
  import SkillBadge from './SkillBadge.svelte';

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
</script>

{#if isOpen && court && court.match}
  {@const match = court.match}
  <div class="modal-backdrop" onclick={onClose} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-sheet" onclick={(e) => e.stopPropagation()} role="document">
      <div class="sheet-handle"></div>

      <div class="sheet-header">
        <div>
          <h3>Finish Match — Court {court.courtNumber}</h3>
          <p class="subtext">Select the winning team or skip recording a winner</p>
        </div>
        <button class="btn-ghost" onclick={onClose} type="button" aria-label="Close">✕</button>
      </div>

      <!-- Winner Selection Buttons -->
      <div class="winner-selection-grid">
        <!-- Team A Winner Card -->
        <button
          class="winner-card team-a {selectedWinner === 'A' ? 'selected' : ''}"
          onclick={() => selectedWinner = 'A'}
          type="button"
        >
          <div class="winner-title-row">
            <span class="winner-tag">Team A Won 🏆</span>
          </div>
          <div class="players-list">
            {#each match.teamA as pId}
              {@const p = getPlayer(pId)}
              {#if p}
                <div class="player-line">
                  <span>{p.name}</span>
                  <SkillBadge skill={p.skill} compact={true} />
                </div>
              {/if}
            {/each}
          </div>
        </button>

        <!-- Team B Winner Card -->
        <button
          class="winner-card team-b {selectedWinner === 'B' ? 'selected' : ''}"
          onclick={() => selectedWinner = 'B'}
          type="button"
        >
          <div class="winner-title-row">
            <span class="winner-tag">Team B Won 🏆</span>
          </div>
          <div class="players-list">
            {#each match.teamB as pId}
              {@const p = getPlayer(pId)}
              {#if p}
                <div class="player-line">
                  <span>{p.name}</span>
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
          onclick={() => selectedWinner = null}
          type="button"
        >
          <span>⚪ No Winner / Casual Match</span>
        </button>
      </div>

      <!-- Optional Exact Score Inputs -->
      <div class="score-inputs-card">
        <div class="score-header">
          <span>Optional Final Score</span>
          <span class="score-hint">(leave empty if not keeping scores)</span>
        </div>
        <div class="score-inputs-row">
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
          <span class="score-vs">-</span>
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

      <div class="action-buttons">
        <button class="btn-primary complete-btn" onclick={handleComplete} type="button">
          ✓ Finish Match & Free Court
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
    margin-bottom: 16px;
  }

  .subtext {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .winner-selection-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .winner-card {
    background: rgba(255, 255, 255, 0.04);
    border: 2px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    transition: all 0.18s ease;
  }

  .winner-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .winner-card.selected {
    border-color: var(--accent-emerald);
    background: rgba(16, 185, 129, 0.12);
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.2);
  }

  .winner-tag {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .players-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  .player-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .skip-winner-wrap {
    margin-bottom: 16px;
  }

  .skip-btn {
    width: 100%;
    padding: 8px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    border: 1px dashed var(--border-subtle);
    background: rgba(255, 255, 255, 0.02);
  }

  .skip-btn.selected {
    border-color: var(--text-secondary);
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  .score-inputs-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 12px;
    margin-bottom: 20px;
  }

  .score-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 10px;
  }

  .score-hint {
    font-size: 11px;
    color: var(--text-muted);
  }

  .score-inputs-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .score-field {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .score-field label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .score-field input {
    width: 72px;
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    padding: 8px;
  }

  .score-vs {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-muted);
    margin-top: 14px;
  }

  .action-buttons {
    display: flex;
  }

  .complete-btn {
    width: 100%;
    padding: 14px;
    font-size: 15px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
  }
</style>
