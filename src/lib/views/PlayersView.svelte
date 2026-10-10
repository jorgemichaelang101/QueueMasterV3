<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import { SKILL_TIERS } from '../constants';
  import type { Player, SkillTier } from '../types';
  import { formatWaitMinutes } from '../engine/time';
  import SkillBadge from '../components/SkillBadge.svelte';

  let newName = $state('');
  let newSkill = $state<SkillTier>(3); // Default High Beginner
  let searchFilter = $state('');

  let now = $state(Date.now());
  $effect(() => {
    const timer = setInterval(() => {
      now = Date.now();
    }, 5000);
    return () => clearInterval(timer);
  });

  function handleAdd() {
    if (!newName.trim()) return;
    sessionStore.addPlayer(newName, newSkill);
    newName = '';
  }

  function getPlayerStatusInfo(p: Player): { label: string; type: string } {
    if (!sessionStore.session) return { label: 'Idle', type: 'idle' };

    if (p.status === 'sitting_out') {
      return { label: 'Sitting Out', type: 'resting' };
    }

    // Check if on court
    for (const court of sessionStore.session.courts) {
      if (court.match) {
        if (court.match.teamA.includes(p.id) || court.match.teamB.includes(p.id)) {
          return {
            label: `Court ${court.courtNumber} (${court.status === 'in_use' ? 'Playing' : 'Ready'})`,
            type: court.status === 'in_use' ? 'playing' : 'ready',
          };
        }
      }
    }

    // Check if in Next Up
    for (const match of sessionStore.session.nextUp) {
      if (match.teamA.includes(p.id) || match.teamB.includes(p.id)) {
        return { label: 'Next Up', type: 'nextup' };
      }
    }

    return { label: `Waiting ${formatWaitMinutes(p.waitingSince, now)}`, type: 'waiting' };
  }

  let filteredPlayers = $derived(() => {
    if (!sessionStore.session) return [];
    const list = sessionStore.session.players;
    if (!searchFilter.trim()) return list;
    return list.filter(p => p.name.toLowerCase().includes(searchFilter.toLowerCase().trim()));
  });

  function cycleSkill(player: Player) {
    const nextSkill = ((player.skill % 6) + 1) as SkillTier;
    sessionStore.updatePlayerSkill(player.id, nextSkill);
  }
</script>

<div class="players-view">
  <!-- Add Player Card -->
  <div class="add-player-card glass-card">
    <div class="card-title">Add Player to Session</div>

    <form class="add-form" onsubmit={(e) => { e.preventDefault(); handleAdd(); }}>
      <div class="name-input-row">
        <input
          class="name-input"
          type="text"
          placeholder="Enter player name..."
          bind:value={newName}
          maxlength="28"
        />
        <button class="btn-primary add-submit-btn" type="submit">
          + Add
        </button>
      </div>

      <!-- Skill Selection Pills -->
      <div class="skill-picker-row">
        <span class="picker-label">Skill Level:</span>
        <div class="pills-scroll">
          {#each [1, 2, 3, 4, 5, 6] as SkillTier}
            {@const info = SKILL_TIERS[SkillTier as SkillTier]}
            <button
              class="skill-pill {newSkill === SkillTier ? 'active' : ''}"
              onclick={() => newSkill = SkillTier as SkillTier}
              style="--pill-color: {info.color}; --pill-bg: {info.bgTint};"
              type="button"
            >
              {info.label}
            </button>
          {/each}
        </div>
      </div>
    </form>
  </div>

  <!-- Players List Header & Filter -->
  <div class="list-controls-bar">
    <div class="controls-left">
      <h3>Players ({sessionStore.session?.players.length || 0})</h3>
      <span class="active-sub">
        {sessionStore.session?.players.filter(p => p.status === 'active').length || 0} active
      </span>
    </div>

    {#if (sessionStore.session?.players.length || 0) > 4}
      <input
        class="search-input"
        type="text"
        placeholder="Search players..."
        bind:value={searchFilter}
      />
    {/if}
  </div>

  <!-- Player List Cards -->
  {#if filteredPlayers().length === 0}
    <div class="empty-players glass-card">
      <p>No players added yet. Add players using the form above to start matchmaking.</p>
    </div>
  {:else}
    <div class="players-list">
      {#each filteredPlayers() as p (p.id)}
        {@const statusInfo = getPlayerStatusInfo(p)}
        <div class="player-card glass-card {p.status === 'sitting_out' ? 'is-sitout' : ''}">
          <div class="player-card-main">
            <div class="p-title-line">
              <span class="p-name">{p.name}</span>
              <!-- Tapping the badge cycles skill -->
              <button
                class="skill-badge-btn"
                onclick={() => cycleSkill(p)}
                type="button"
                title="Tap to change skill tier"
              >
                <SkillBadge skill={p.skill} />
              </button>
            </div>

            <div class="p-stats-line">
              <span class="status-tag {statusInfo.type}">
                {statusInfo.label}
              </span>
              <span class="record-tag">
                {p.gamesPlayed}G · {p.wins}W
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="player-actions">
            <button
              class="btn-ghost sit-toggle-btn {p.status === 'active' ? 'active-state' : 'sit-state'}"
              onclick={() => sessionStore.toggleSitOut(p.id)}
              type="button"
            >
              {p.status === 'active' ? 'Sit Out' : 'Activate'}
            </button>

            <button
              class="btn-ghost delete-p-btn"
              onclick={() => sessionStore.removePlayer(p.id)}
              type="button"
              title="Remove player"
            >
              ✕
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .players-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .add-player-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .card-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
  }

  .add-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .name-input-row {
    display: flex;
    gap: 8px;
  }

  .name-input {
    flex: 1;
    font-size: 15px;
  }

  .add-submit-btn {
    padding: 10px 18px;
    font-size: 14px;
    white-space: nowrap;
  }

  .skill-picker-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .picker-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .pills-scroll {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .skill-pill {
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    border: 1px solid var(--border-subtle);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-secondary);
  }

  .skill-pill.active {
    border-color: var(--pill-color);
    background: var(--pill-bg);
    color: var(--pill-color);
  }

  .list-controls-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .controls-left {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .active-sub {
    font-size: 12px;
    color: var(--text-muted);
  }

  .search-input {
    padding: 6px 12px;
    font-size: 13px;
    max-width: 170px;
  }

  .players-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .player-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    transition: all 0.15s ease;
  }

  .player-card.is-sitout {
    opacity: 0.6;
    background: rgba(15, 23, 42, 0.4);
  }

  .player-card-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .p-title-line {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .p-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .skill-badge-btn {
    padding: 0;
  }

  .p-stats-line {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .status-tag {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .status-tag.playing {
    color: var(--accent-emerald);
    background: rgba(16, 185, 129, 0.12);
  }

  .status-tag.ready {
    color: var(--accent-amber);
    background: rgba(245, 158, 11, 0.12);
  }

  .status-tag.nextup {
    color: var(--accent-violet);
    background: rgba(139, 92, 246, 0.12);
  }

  .status-tag.waiting {
    color: var(--accent-cyan);
    background: rgba(56, 189, 248, 0.12);
  }

  .status-tag.resting {
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.05);
  }

  .record-tag {
    font-size: 11px;
    color: var(--text-muted);
  }

  .player-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .sit-toggle-btn {
    font-size: 12px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
  }

  .sit-toggle-btn.active-state {
    color: var(--text-secondary);
  }

  .sit-toggle-btn.sit-state {
    color: var(--accent-emerald);
    background: rgba(16, 185, 129, 0.1);
  }

  .delete-p-btn {
    color: var(--text-muted);
    font-size: 12px;
    padding: 6px 8px;
  }

  .delete-p-btn:hover {
    color: #fb7185;
  }

  .empty-players {
    text-align: center;
    padding: 24px;
    color: var(--text-secondary);
  }
</style>
