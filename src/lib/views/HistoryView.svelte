<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import type { Match, Player } from '../types';
  import { formatElapsed } from '../engine/time';
  import SkillBadge from '../components/SkillBadge.svelte';

  function getPlayer(id: string): Player | undefined {
    return sessionStore.session?.players.find(p => p.id === id);
  }

  // Reverse chronological order (most recent match first), keeping original 1-based match number
  let historyItems = $derived(() => {
    const list = sessionStore.session?.history || [];
    return list
      .map((match, index) => ({
        match,
        matchNumber: index + 1,
      }))
      .reverse();
  });

  let avgDurationFormatted = $derived(() => {
    const list = sessionStore.session?.history || [];
    const withDuration = list.filter(m => m.startedAt && m.endedAt && m.endedAt >= m.startedAt);
    if (withDuration.length === 0) return '--:--';
    const totalMs = withDuration.reduce((acc, m) => acc + (m.endedAt! - m.startedAt!), 0);
    const avgMs = Math.round(totalMs / withDuration.length);
    return formatElapsed(0, avgMs);
  });

  function formatTimeOfDay(timestamp?: number): string {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  function getCourtLabel(match: Match): string {
    if (match.courtNumber) {
      return `Court ${match.courtNumber}`;
    }
    if (match.courtId && sessionStore.session) {
      const found = sessionStore.session.courts.find(c => c.id === match.courtId);
      if (found) return `Court ${found.courtNumber}`;
      const m = match.courtId.match(/^court_(\d+)_/);
      if (m) return `Court ${m[1]}`;
    }
    return 'Court';
  }
</script>

<div class="history-view">
  <div class="history-header">
    <div>
      <h2>Match History</h2>
      <p class="history-sub">Completed games, scores, and durations for this session</p>
    </div>
  </div>

  <!-- Summary Stats Bar -->
  <div class="history-stats-row">
    <div class="stat-chip">
      <span class="stat-count">{sessionStore.session?.history.length || 0}</span>
      <span class="stat-label">Games Played</span>
    </div>
    <div class="stat-chip">
      <span class="stat-count">{avgDurationFormatted()}</span>
      <span class="stat-label">Avg Duration</span>
    </div>
  </div>

  {#if historyItems().length === 0}
    <div class="empty-history glass-card">
      <div class="empty-icon">📜</div>
      <h4>No completed games yet</h4>
      <p>Once matches are finished on the Courts tab, their results, scores, and durations will appear here.</p>
    </div>
  {:else}
    <div class="history-list">
      {#each historyItems() as { match, matchNumber } (match.id)}
        {@const hasScore = match.scoreA !== null && match.scoreA !== undefined && match.scoreB !== null && match.scoreB !== undefined}
        <div class="history-card glass-card">
          <!-- Match Meta Header -->
          <div class="history-card-header">
            <div class="meta-left">
              <span class="match-num-badge">Match #{matchNumber}</span>
              <span class="court-tag">{getCourtLabel(match)}</span>
              {#if !match.winner}
                <span class="casual-tag">Casual</span>
              {/if}
            </div>

            <div class="meta-right">
              {#if match.startedAt && match.endedAt}
                <span class="duration-tag" title="Match duration">
                  ⏱ {formatElapsed(match.startedAt, match.endedAt)}
                </span>
              {/if}
              {#if match.endedAt}
                <span class="time-tag">{formatTimeOfDay(match.endedAt)}</span>
              {/if}
            </div>
          </div>

          <!-- Teams & Scores -->
          <div class="history-teams-grid">
            <!-- Team A -->
            <div class="team-box {match.winner === 'A' ? 'winner-box' : ''}">
              <div class="team-box-header">
                <span class="team-label">Team A</span>
                {#if match.winner === 'A'}
                  <span class="win-badge">🏆 WON</span>
                {/if}
              </div>

              <div class="team-players">
                {#each match.teamA as pId}
                  {@const p = getPlayer(pId)}
                  <div class="player-row">
                    {#if p}
                      <span class="p-name">{p.name}</span>
                      <SkillBadge skill={p.skill} compact={true} />
                    {:else}
                      <span class="p-name removed-player">Removed Player</span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>

            <!-- Center VS / Score -->
            <div class="center-score-col">
              {#if hasScore}
                <div class="score-pill">
                  <span class="score-num {match.winner === 'A' ? 'score-win' : ''}">{match.scoreA}</span>
                  <span class="score-sep">:</span>
                  <span class="score-num {match.winner === 'B' ? 'score-win' : ''}">{match.scoreB}</span>
                </div>
              {:else}
                <div class="vs-pill">VS</div>
              {/if}
            </div>

            <!-- Team B -->
            <div class="team-box {match.winner === 'B' ? 'winner-box' : ''}">
              <div class="team-box-header">
                <span class="team-label">Team B</span>
                {#if match.winner === 'B'}
                  <span class="win-badge">🏆 WON</span>
                {/if}
              </div>

              <div class="team-players">
                {#each match.teamB as pId}
                  {@const p = getPlayer(pId)}
                  <div class="player-row">
                    {#if p}
                      <span class="p-name">{p.name}</span>
                      <SkillBadge skill={p.skill} compact={true} />
                    {:else}
                      <span class="p-name removed-player">Removed Player</span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .history-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .history-sub {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .history-stats-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .stat-chip {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    text-align: center;
    display: flex;
    flex-direction: column;
  }

  .stat-count {
    font-size: 18px;
    font-weight: 800;
    color: var(--accent-cyan);
  }

  .stat-label {
    font-size: 11px;
    color: var(--text-muted);
  }

  .empty-history {
    text-align: center;
    padding: 36px 20px;
    color: var(--text-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .empty-icon {
    font-size: 36px;
    opacity: 0.7;
  }

  .empty-history h4 {
    color: var(--text-primary);
    font-size: 16px;
  }

  .empty-history p {
    font-size: 13px;
    color: var(--text-muted);
    max-width: 320px;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .history-card {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .history-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .meta-left, .meta-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .match-num-badge {
    font-size: 12px;
    font-weight: 800;
    color: var(--accent-cyan);
  }

  .court-tag {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.06);
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .casual-tag {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.04);
    padding: 2px 7px;
    border-radius: var(--radius-full);
  }

  .duration-tag {
    font-size: 11px;
    font-weight: 600;
    color: var(--accent-emerald);
    background: rgba(16, 185, 129, 0.12);
    padding: 2px 7px;
    border-radius: var(--radius-sm);
  }

  .time-tag {
    font-size: 11px;
    color: var(--text-muted);
  }

  .history-teams-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 8px;
    align-items: stretch;
  }

  .team-box {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .team-box.winner-box {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.35);
  }

  .team-box-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4px;
  }

  .team-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .win-badge {
    font-size: 10px;
    font-weight: 800;
    color: var(--accent-emerald);
  }

  .team-players {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .player-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .p-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .removed-player {
    color: var(--text-muted);
    font-style: italic;
  }

  .center-score-col {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .score-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid var(--border-subtle);
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 800;
    color: var(--text-secondary);
  }

  .score-win {
    color: var(--accent-emerald);
  }

  .score-sep {
    color: var(--text-muted);
  }

  .vs-pill {
    font-size: 11px;
    font-weight: 800;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.05);
    padding: 4px 6px;
    border-radius: var(--radius-sm);
  }
</style>

