<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import SkillBadge from './SkillBadge.svelte';

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
</script>

{#if isOpen && sessionStore.session}
  <div class="modal-backdrop" onclick={onClose} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-sheet end-sheet" onclick={(e) => e.stopPropagation()} role="document">
      <div class="sheet-handle"></div>

      <div class="sheet-header">
        <div>
          <h3>Session Summary & Settlement</h3>
          <p class="subtext">Review total stats and payment collection before ending the session</p>
        </div>
        <button class="btn-ghost" onclick={onClose} type="button" aria-label="Close">✕</button>
      </div>

      <!-- Financial Recap -->
      {#if costSummary}
        <div class="financial-card">
          <div class="fin-header">Financial Settlement</div>
          <div class="fin-grid">
            <div class="fin-stat">
              <span class="fin-label">Grand Total</span>
              <span class="fin-value">{currency}{costSummary.grandTotal.toFixed(2)}</span>
            </div>
            <div class="fin-stat">
              <span class="fin-label">Collected</span>
              <span class="fin-value emerald">{currency}{costSummary.totalCollected.toFixed(2)}</span>
            </div>
            <div class="fin-stat">
              <span class="fin-label">Outstanding</span>
              <span class="fin-value amber">{currency}{costSummary.totalOutstanding.toFixed(2)}</span>
            </div>
            <div class="fin-stat">
              <span class="fin-label">Split / Player</span>
              <span class="fin-value">{currency}{costSummary.standardPerPlayer.toFixed(2)}</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Match Stats Recap -->
      <div class="session-stats-grid">
        <div class="stat-box">
          <span class="stat-num">{sessionStore.session.history.length}</span>
          <span class="stat-name">Matches Played</span>
        </div>
        <div class="stat-box">
          <span class="stat-num">{sessionStore.session.players.length}</span>
          <span class="stat-name">Total Players</span>
        </div>
        <div class="stat-box">
          <span class="stat-num">{sessionStore.session.costs.totalCourtHours}h</span>
          <span class="stat-name">Court Hours</span>
        </div>
      </div>

      <!-- Player Leaderboard Table -->
      <div class="leaderboard-section">
        <div class="section-title">Player Records & Payments</div>
        <div class="player-recap-list">
          {#each sortedPlayers() as p}
            {@const playerBreakdown = costSummary?.breakdown.find(b => b.playerId === p.id)}
            <div class="player-recap-row">
              <div class="player-recap-info">
                <span class="p-name">{p.name}</span>
                <SkillBadge skill={p.skill} compact={true} />
              </div>
              <div class="player-recap-stats">
                <span class="stat-pill">{p.gamesPlayed} games ({p.wins}W)</span>
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

      <div class="danger-zone">
        <p class="warning-text">Ending the session clears all active matches, queue, and player records for a fresh session.</p>
        <button class="btn-danger finish-btn" onclick={confirmEndSession} type="button">
          🛑 End Session & Clear Data
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .end-sheet {
    max-height: 90vh;
  }

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

  .financial-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: 16px;
    margin-bottom: 16px;
  }

  .fin-header {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 12px;
  }

  .fin-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .fin-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .fin-label {
    font-size: 11px;
    color: var(--text-muted);
  }

  .fin-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .fin-value.emerald {
    color: var(--accent-emerald);
  }

  .fin-value.amber {
    color: var(--accent-amber);
  }

  .session-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }

  .stat-box {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 12px;
    text-align: center;
    display: flex;
    flex-direction: column;
  }

  .stat-num {
    font-size: 22px;
    font-weight: 800;
    color: var(--accent-cyan);
  }

  .stat-name {
    font-size: 11px;
    color: var(--text-muted);
  }

  .leaderboard-section {
    margin-bottom: 20px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 10px;
  }

  .player-recap-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 220px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .player-recap-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
  }

  .player-recap-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .p-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .player-recap-stats {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stat-pill {
    font-size: 11px;
    color: var(--text-muted);
  }

  .pay-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: var(--radius-full);
  }

  .pay-pill.paid {
    background: rgba(16, 185, 129, 0.15);
    color: var(--accent-emerald);
  }

  .pay-pill.unpaid {
    background: rgba(244, 63, 94, 0.15);
    color: #fb7185;
  }

  .danger-zone {
    border-top: 1px solid rgba(244, 63, 94, 0.2);
    padding-top: 14px;
  }

  .warning-text {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 10px;
    text-align: center;
  }

  .finish-btn {
    width: 100%;
    padding: 13px;
    font-size: 14px;
    font-weight: 700;
  }
</style>
