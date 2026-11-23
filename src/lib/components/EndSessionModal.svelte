<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import SkillBadge from './SkillBadge.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let costSummary = $derived(sessionStore.getCostSummary());
  let currency = $derived(sessionStore.session?.settings.currency || '₱');

  let sortedPlayers = $derived(() => {
    if (!sessionStore.session) return [];
    return [...sessionStore.session.players].sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.wins - a.wins);
  });

  function confirmEndSession() {
    sessionStore.endSession();
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (isOpen && e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && sessionStore.session}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="Session Summary & Settlement"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
  >
    <div class="modal-sheet end-sheet">
      <div class="sheet-handle"></div>

      <div class="sheet-header">
        <div>
          <h3>Session Summary</h3>
          <p class="subtext">Review stats and payments before closing the session</p>
        </div>
        <button class="btn-ghost icon-close" onclick={onClose} type="button" aria-label="Close">
          <Icon name="x" size={20} />
        </button>
      </div>

      <!-- Financial Recap -->
      {#if costSummary}
        <div class="financial-card tabular-nums">
          <div class="fin-header">Settlement</div>
          <div class="fin-grid">
            <div class="fin-stat">
              <span class="fin-label">Grand Total</span>
              <span class="fin-value">{currency}{costSummary.grandTotal.toFixed(2)}</span>
            </div>
            <div class="fin-stat">
              <span class="fin-label">Collected</span>
              <span class="fin-value playing">{currency}{costSummary.totalCollected.toFixed(2)}</span>
            </div>
            <div class="fin-stat">
              <span class="fin-label">Unpaid</span>
              <span class="fin-value ready">{currency}{costSummary.totalOutstanding.toFixed(2)}</span>
            </div>
            <div class="fin-stat">
              <span class="fin-label">Split / Player</span>
              <span class="fin-value">{currency}{costSummary.standardPerPlayer.toFixed(2)}</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Match Stats Recap -->
      <div class="session-stats-grid tabular-nums">
        <div class="stat-box">
          <span class="stat-num">{sessionStore.session.history.length}</span>
          <span class="stat-name">Matches</span>
        </div>
        <div class="stat-box">
          <span class="stat-num">{sessionStore.session.players.length}</span>
          <span class="stat-name">Players</span>
        </div>
        <div class="stat-box">
          <span class="stat-num">{sessionStore.session.costs.totalCourtHours}h</span>
          <span class="stat-name">Hours</span>
        </div>
      </div>

      <!-- Player Leaderboard Table -->
      <div class="leaderboard-section">
        <div class="section-title">Player Records & Payments</div>
        <div class="player-recap-list tabular-nums">
          {#each sortedPlayers() as p}
            {@const playerBreakdown = costSummary?.breakdown.find(b => b.playerId === p.id)}
            <div class="player-recap-row">
              <div class="player-recap-info">
                <span class="p-name">{p.name}</span>
                <SkillBadge skill={p.skill} compact={true} />
              </div>
              <div class="player-recap-stats">
                <span class="stat-pill">{p.gamesPlayed}G · {p.wins}W</span>
                {#if playerBreakdown}
                  <span class="pay-pill {playerBreakdown.paid ? 'paid' : 'unpaid'}">
                    {playerBreakdown.paid ? 'PAID' : 'UNPAID'} {currency}{playerBreakdown.amountDue.toFixed(2)}
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="sheet-sticky-footer">
        <p class="warning-text">Ending the session clears active matches, queue, and player records.</p>
        <button class="btn-danger finish-btn" onclick={confirmEndSession} type="button">
          <Icon name="trash" size={18} />
          End Session & Clear Data
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

  .financial-card {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--sp-3);
    margin-bottom: var(--sp-3);
  }

  .fin-header {
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: var(--sp-2);
  }

  .fin-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--sp-3);
  }

  .fin-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .fin-label {
    font-size: var(--fs-xs);
    color: var(--text-3);
  }

  .fin-value {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--text-1);
  }

  .fin-value.playing {
    color: var(--c-playing);
  }

  .fin-value.ready {
    color: var(--c-ready);
  }

  .session-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--sp-2);
    margin-bottom: var(--sp-3);
  }

  .stat-box {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--sp-2) var(--sp-3);
    text-align: center;
    display: flex;
    flex-direction: column;
  }

  .stat-num {
    font-size: var(--fs-xl);
    font-weight: 800;
    color: var(--text-1);
    font-family: var(--font-heading);
  }

  .stat-name {
    font-size: var(--fs-xs);
    color: var(--text-3);
  }

  .section-title {
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: var(--sp-2);
  }

  .player-recap-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    max-height: 200px;
    overflow-y: auto;
  }

  .player-recap-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--sp-2) var(--sp-3);
    gap: var(--sp-2);
  }

  .player-recap-info {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
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

  .player-recap-stats {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-shrink: 0;
  }

  .stat-pill {
    font-size: var(--fs-xs);
    color: var(--text-3);
  }

  .pay-pill {
    font-size: var(--fs-xs);
    font-weight: 700;
    padding: 2px var(--sp-2);
    border-radius: var(--radius-full);
  }

  .pay-pill.paid {
    background: var(--c-playing-tint);
    color: var(--c-playing);
  }

  .pay-pill.unpaid {
    background: var(--c-danger-tint);
    color: var(--c-danger-text);
  }

  .warning-text {
    font-size: var(--fs-xs);
    color: var(--text-3);
    margin-bottom: var(--sp-2);
    text-align: center;
  }

  .finish-btn {
    width: 100%;
  }
</style>
