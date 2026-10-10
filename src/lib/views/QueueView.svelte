<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import type { Player, Match } from '../types';
  import { formatWaitMinutes } from '../engine/time';
  import SkillBadge from '../components/SkillBadge.svelte';
  import WandModal from '../components/WandModal.svelte';
  import ManualMatchModal from '../components/ManualMatchModal.svelte';

  let isWandModalOpen = $state(false);
  let isManualModalOpen = $state(false);
  let editingMatch = $state<Match | null>(null);

  let now = $state(Date.now());
  $effect(() => {
    const timer = setInterval(() => {
      now = Date.now();
    }, 5000);
    return () => clearInterval(timer);
  });

  function getPlayer(id: string): Player | undefined {
    return sessionStore.session?.players.find(p => p.id === id);
  }

  let availablePlayers = $derived(() => {
    return sessionStore.getAvailablePlayers().sort((a, b) => a.waitingSince - b.waitingSince);
  });

  let busyOnCourtCount = $derived(() => {
    if (!sessionStore.session) return 0;
    let count = 0;
    for (const c of sessionStore.session.courts) {
      if (c.match) {
        count += c.match.teamA.length + c.match.teamB.length;
      }
    }
    return count;
  });

  function handleRemoveNextUp(matchId: string) {
    sessionStore.removeFromNextUp(matchId);
  }

  function handleEditNextUp(match: Match) {
    editingMatch = match;
    isManualModalOpen = true;
  }

  function handleMoveQueue(idx: number, dir: 'up' | 'down') {
    sessionStore.moveNextUp(idx, dir);
  }

  function handleOpenManualBuilder() {
    editingMatch = null;
    isManualModalOpen = true;
  }

  function handleToggleSitOut(pId: string) {
    sessionStore.toggleSitOut(pId);
  }
</script>

<div class="queue-view">
  <!-- Top Matchmaker Controls Card -->
  <div class="wand-banner-card glass-card">
    <div class="banner-top-row">
      <div class="wand-text-group">
        <div class="wand-sparkle">✨</div>
        <div>
          <h3>Queue Matchmaker</h3>
          <p class="wand-subtext">Smart Wand or Manual QM Pairings</p>
        </div>
      </div>
    </div>

    <!-- Matchmaker Buttons Row -->
    <div class="matchmaker-actions-row">
      <button class="wand-btn main-wand-trigger" onclick={() => isWandModalOpen = true} type="button">
        ✨ Magic Wand
      </button>

      <button class="btn-secondary manual-match-trigger" onclick={handleOpenManualBuilder} type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        + Manual Match
      </button>
    </div>
  </div>

  <!-- Queue Stats Bar -->
  <div class="queue-stats-row">
    <div class="stat-chip">
      <span class="stat-count">{availablePlayers().length}</span>
      <span class="stat-label">Waiting</span>
    </div>
    <div class="stat-chip">
      <span class="stat-count">{sessionStore.session?.nextUp.length || 0}</span>
      <span class="stat-label">Next Up</span>
    </div>
    <div class="stat-chip">
      <span class="stat-count">{busyOnCourtCount()}</span>
      <span class="stat-label">In Court</span>
    </div>
  </div>

  <!-- Next Up Section (Pre-queued Matches) -->
  {#if sessionStore.session && sessionStore.session.nextUp.length > 0}
    <div class="section-group">
      <div class="section-header">
        <h4>Next Up ({sessionStore.session.nextUp.length})</h4>
        <span class="section-hint">Auto-moves to court when free</span>
      </div>

      <div class="nextup-list">
        {#each sessionStore.session.nextUp as match, idx (match.id)}
          <div class="nextup-card glass-card">
            <div class="nextup-header">
              <div class="pos-group">
                <span class="nextup-pos">#{idx + 1} In Line</span>

                <!-- Order Move Buttons -->
                <div class="reorder-btns">
                  {#if idx > 0}
                    <button class="reorder-btn" onclick={() => handleMoveQueue(idx, 'up')} type="button" title="Move Up">▲</button>
                  {/if}
                  {#if idx < sessionStore.session.nextUp.length - 1}
                    <button class="reorder-btn" onclick={() => handleMoveQueue(idx, 'down')} type="button" title="Move Down">▼</button>
                  {/if}
                </div>
              </div>

              <div class="card-action-btns">
                <button
                  class="btn-ghost edit-nextup-btn"
                  onclick={() => handleEditNextUp(match)}
                  type="button"
                  title="Edit players in this match"
                >
                  ✏️ Edit
                </button>
                <button
                  class="btn-ghost remove-nextup-btn"
                  onclick={() => handleRemoveNextUp(match.id)}
                  type="button"
                  title="Return players to waiting pool"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>

            <div class="nextup-teams">
              <div class="nextup-team">
                <span class="team-label">Team A</span>
                {#each match.teamA as pId}
                  {@const p = getPlayer(pId)}
                  {#if p}
                    <div class="p-item">
                      <span class="p-name">{p.name}</span>
                      <SkillBadge skill={p.skill} compact={true} />
                    </div>
                  {/if}
                {/each}
              </div>

              <div class="nextup-vs">VS</div>

              <div class="nextup-team">
                <span class="team-label">Team B</span>
                {#each match.teamB as pId}
                  {@const p = getPlayer(pId)}
                  {#if p}
                    <div class="p-item">
                      <span class="p-name">{p.name}</span>
                      <SkillBadge skill={p.skill} compact={true} />
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Waiting Players Pool -->
  <div class="section-group">
    <div class="section-header">
      <h4>Waiting Pool ({availablePlayers().length})</h4>
      <span class="section-hint">Ordered by waiting time (FIFO)</span>
    </div>

    {#if availablePlayers().length === 0}
      <div class="empty-waiting glass-card">
        <p>No waiting players available.</p>
        <p class="empty-sub">Add players in the Players tab or finish ongoing matches.</p>
      </div>
    {:else}
      <div class="waiting-list">
        {#each availablePlayers() as p (p.id)}
          <div class="waiting-player-card glass-card">
            <div class="waiting-player-main">
              <div class="player-title-row">
                <span class="p-name">{p.name}</span>
                <SkillBadge skill={p.skill} />
              </div>
              <div class="player-meta-row">
                <span class="meta-tag wait-tag">
                  ⏳ {formatWaitMinutes(p.waitingSince, now)}
                </span>
                <span class="meta-tag games-tag">
                  🎮 {p.gamesPlayed} games ({p.wins}W)
                </span>
              </div>
            </div>

            <div class="waiting-player-actions">
              <button
                class="btn-ghost sitout-btn"
                onclick={() => handleToggleSitOut(p.id)}
                type="button"
                title="Sit out this player"
              >
                Sit Out
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Modals -->
<WandModal
  isOpen={isWandModalOpen}
  onClose={() => isWandModalOpen = false}
/>

<ManualMatchModal
  isOpen={isManualModalOpen}
  editingMatch={editingMatch}
  onClose={() => {
    isManualModalOpen = false;
    editingMatch = null;
  }}
/>

<style>
  .queue-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .wand-banner-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%);
    border: 1px solid rgba(139, 92, 246, 0.25);
  }

  .banner-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .wand-text-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .wand-sparkle {
    font-size: 26px;
  }

  .wand-subtext {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .matchmaker-actions-row {
    display: flex;
    gap: 10px;
  }

  .main-wand-trigger {
    flex: 1.3;
    padding: 12px 16px;
    font-size: 14px;
    white-space: nowrap;
  }

  .manual-match-trigger {
    flex: 1;
    padding: 12px 14px;
    font-size: 13px;
    white-space: nowrap;
    border-color: rgba(56, 189, 248, 0.3);
  }

  .queue-stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .stat-chip {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 8px 12px;
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

  .section-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .section-hint {
    font-size: 11px;
    color: var(--text-muted);
  }

  .nextup-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .nextup-card {
    padding: 12px;
    border-color: rgba(139, 92, 246, 0.3);
  }

  .nextup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .pos-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nextup-pos {
    font-size: 12px;
    font-weight: 700;
    color: var(--accent-violet);
  }

  .reorder-btns {
    display: flex;
    gap: 2px;
  }

  .reorder-btn {
    font-size: 10px;
    padding: 2px 4px;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  .reorder-btn:hover {
    color: var(--accent-cyan);
  }

  .card-action-btns {
    display: flex;
    gap: 4px;
  }

  .edit-nextup-btn {
    font-size: 11px;
    padding: 2px 6px;
    color: var(--accent-cyan);
  }

  .remove-nextup-btn {
    font-size: 11px;
    padding: 2px 6px;
    color: #fb7185;
  }

  .nextup-teams {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
    align-items: center;
  }

  .nextup-team {
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-sm);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .team-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .p-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
  }

  .nextup-vs {
    font-size: 11px;
    font-weight: 800;
    color: var(--text-muted);
  }

  .waiting-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .waiting-player-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
  }

  .waiting-player-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .player-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .p-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .player-meta-row {
    display: flex;
    gap: 8px;
  }

  .meta-tag {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .sitout-btn {
    font-size: 12px;
    padding: 4px 8px;
    color: var(--text-muted);
  }

  .sitout-btn:hover {
    color: var(--accent-amber);
  }

  .empty-waiting {
    text-align: center;
    padding: 24px;
    color: var(--text-secondary);
  }

  .empty-sub {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }
</style>
