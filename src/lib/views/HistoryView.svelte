<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import type { Match, Player } from '../types';
  import { formatElapsed } from '../engine/time';
  import SkillBadge from '../components/SkillBadge.svelte';
  import Icon from '../components/Icon.svelte';

  function getPlayer(id: string): Player | undefined {
    return sessionStore.session?.players.find(p => p.id === id);
  }

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
  <!-- Summary Stats Bar -->
  <div class="history-stats-row tabular-nums">
    <div class="stat-chip surface-card">
      <span class="stat-count">{sessionStore.session?.history.length || 0}</span>
      <span class="stat-label">Completed Matches</span>
    </div>
    <div class="stat-chip surface-card">
      <span class="stat-count">{avgDurationFormatted()}</span>
      <span class="stat-label">Average Duration</span>
    </div>
  </div>

  {#if historyItems().length === 0}
    <div class="empty-history surface-card">
      <Icon name="history" size={32} />
      <h4>No completed games yet</h4>
      <p>Finished matches on the Live tab will appear here with scores and durations.</p>
    </div>
  {:else}
    <div class="history-list">
      {#each historyItems() as { match, matchNumber } (match.id)}
        {@const hasScore = match.scoreA !== null && match.scoreA !== undefined && match.scoreB !== null && match.scoreB !== undefined}
        <div class="history-card surface-card">
          <div class="history-card-header">
            <div class="meta-left">
              <span class="match-num-badge tabular-nums">#{matchNumber}</span>
              <span class="court-tag">{getCourtLabel(match)}</span>
              {#if !match.winner}
                <span class="casual-tag">Casual</span>
              {/if}
            </div>

            <div class="meta-right tabular-nums">
              {#if match.startedAt && match.endedAt}
                <span class="duration-tag" title="Match duration">
                  <Icon name="clock" size={12} />
                  {formatElapsed(match.startedAt, match.endedAt)}
                </span>
              {/if}
              {#if match.endedAt}
                <span class="time-tag">{formatTimeOfDay(match.endedAt)}</span>
              {/if}
            </div>
          </div>

          <div class="history-teams-grid">
            <!-- Team A -->
            <div class="team-box {match.winner === 'A' ? 'winner-box' : ''}">
              <div class="team-box-header">
                <span class="team-label">Team A</span>
                {#if match.winner === 'A'}
                  <span class="win-badge">
                    <Icon name="trophy" size={12} />
                    Won
                  </span>
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
                      <span class="p-name removed-player">Removed</span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>

            <!-- Center VS / Score -->
            <div class="center-score-col tabular-nums">
              {#if hasScore}
                <div class="score-pill">
                  <span class="score-num {match.winner === 'A' ? 'score-win' : ''}">{match.scoreA}</span>
                  <span class="score-sep">–</span>
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
                  <span class="win-badge">
                    <Icon name="trophy" size={12} />
                    Won
                  </span>
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
                      <span class="p-name removed-player">Removed</span>
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
    gap: var(--sp-3);
  }

  .history-stats-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-2);
  }

  .stat-chip {
    padding: var(--sp-3);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-count {
    font-size: var(--fs-xl);
    font-weight: 800;
    color: var(--text-1);
    font-family: var(--font-heading);
  }

  .stat-label {
    font-size: var(--fs-xs);
    color: var(--text-3);
  }

  .empty-history {
    text-align: center;
    padding: var(--sp-6) var(--sp-4);
    color: var(--text-3);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-2);
  }

  .empty-history h4 {
    color: var(--text-1);
    font-size: var(--fs-lg);
  }

  .empty-history p {
    font-size: var(--fs-sm);
    color: var(--text-2);
    max-width: 320px;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .history-card {
    padding: var(--sp-3);
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .history-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--sp-2);
  }

  .meta-left,
  .meta-right {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .match-num-badge {
    font-size: var(--fs-sm);
    font-weight: 800;
    color: var(--text-1);
  }

  .court-tag {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-2);
    background: var(--bg-subtle);
    padding: 2px var(--sp-2);
    border-radius: var(--radius-full);
  }

  .casual-tag {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-3);
    background: var(--bg-subtle);
    padding: 2px var(--sp-2);
    border-radius: var(--radius-full);
  }

  .duration-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-2);
    background: var(--bg-subtle);
    padding: 2px var(--sp-2);
    border-radius: var(--radius-sm);
  }

  .time-tag {
    font-size: var(--fs-xs);
    color: var(--text-3);
  }

  .history-teams-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: var(--sp-2);
    align-items: stretch;
  }

  .team-box {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--sp-2) var(--sp-3);
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    min-width: 0;
  }

  .team-box.winner-box {
    background: var(--c-playing-tint);
    border-color: var(--c-playing-border);
  }

  .team-box-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-1);
  }

  .team-label {
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .win-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: var(--fs-xs);
    font-weight: 800;
    text-transform: uppercase;
    color: var(--c-playing);
  }

  .team-players {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }

  .player-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-1);
    min-width: 0;
  }

  .p-name {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .removed-player {
    color: var(--text-3);
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
    background: var(--bg-input);
    border: 1px solid var(--border-subtle);
    padding: var(--sp-1) var(--sp-2);
    border-radius: var(--radius-sm);
    font-size: var(--fs-md);
    font-weight: 800;
    color: var(--text-2);
  }

  .score-win {
    color: var(--c-playing);
  }

  .score-sep {
    color: var(--text-3);
  }

  .vs-pill {
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--text-3);
    padding: 0 2px;
  }
</style>
