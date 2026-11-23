<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import { uiStore } from '../state/ui.svelte';
  import { SKILL_TIERS } from '../constants';
  import type { Player, SkillTier } from '../types';
  import { formatWaitMinutes } from '../engine/time';
  import SkillBadge from '../components/SkillBadge.svelte';
  import Icon from '../components/Icon.svelte';
  import ActionMenu, { type ActionMenuItem } from '../components/ActionMenu.svelte';
  import ConfirmSheet from '../components/ConfirmSheet.svelte';

  let newName = $state('');
  let newSkill = $state<SkillTier>(3);
  let searchFilter = $state('');
  let addError = $state('');

  let menuPlayer = $state<Player | null>(null);
  let playerToRemove = $state<Player | null>(null);

  let now = $state(Date.now());
  $effect(() => {
    const timer = setInterval(() => {
      now = Date.now();
    }, 5000);
    return () => clearInterval(timer);
  });

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const existing = sessionStore.session?.players.some(
      p => p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      addError = `Player "${trimmed}" is already in the session.`;
      return;
    }

    const added = sessionStore.addPlayer(trimmed, newSkill);
    if (added) {
      newName = '';
      addError = '';
    }
  }

  function getPlayerStatusInfo(p: Player): { label: string; type: string } {
    if (!sessionStore.session) return { label: 'Idle', type: 'idle' };

    if (p.status === 'sitting_out') {
      return { label: 'Sitting Out', type: 'resting' };
    }

    for (const court of sessionStore.session.courts) {
      if (court.match) {
        if (court.match.teamA.includes(p.id) || court.match.teamB.includes(p.id)) {
          return {
            label: `Court ${court.courtNumber} · ${court.status === 'in_use' ? 'Playing' : 'Ready'}`,
            type: court.status === 'in_use' ? 'playing' : 'ready',
          };
        }
      }
    }

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

  function getPlayerMenuItems(player: Player): ActionMenuItem[] {
    const nextSkill = ((player.skill % 6) + 1) as SkillTier;
    const nextSkillInfo = SKILL_TIERS[nextSkill];
    return [
      {
        label: player.status === 'active' ? 'Sit Out Player' : 'Activate Player',
        icon: player.status === 'active' ? 'pause-circle' : 'play-circle',
        onSelect: () => {
          sessionStore.toggleSitOut(player.id);
          uiStore.showToast(
            `${player.name} is now ${player.status === 'active' ? 'active' : 'sitting out'}`,
            () => sessionStore.toggleSitOut(player.id)
          );
        },
      },
      {
        label: `Change Skill to ${nextSkillInfo.label}`,
        icon: 'sliders',
        onSelect: () => {
          sessionStore.updatePlayerSkill(player.id, nextSkill);
        },
      },
      {
        label: `Remove ${player.name}`,
        icon: 'trash',
        variant: 'danger',
        onSelect: () => {
          playerToRemove = player;
        },
      },
    ];
  }
</script>

<div class="players-view">
  <!-- Sticky Add Player Card -->
  <div class="add-player-card surface-card">
    <form class="add-form" onsubmit={(e) => { e.preventDefault(); handleAdd(); }}>
      <div class="name-input-row">
        <input
          class="name-input {addError ? 'input-error' : ''}"
          type="text"
          placeholder="Add player name..."
          aria-label="New player name"
          bind:value={newName}
          oninput={() => { if (addError) addError = ''; }}
          maxlength="28"
        />
        <button class="btn-primary add-submit-btn" type="submit">
          <Icon name="plus" size={18} />
          Add
        </button>
      </div>

      {#if addError}
        <div class="add-error-msg" role="alert">
          <Icon name="alert-triangle" size={16} />
          <span>{addError}</span>
        </div>
      {/if}

      <!-- Skill Level Selection Grid (Novice -> Pro) -->
      <div class="skill-picker-block">
        <div class="skill-picker-header">
          <span class="picker-label">Skill Level</span>
          <span class="picker-selected">{SKILL_TIERS[newSkill].label}</span>
        </div>
        <div class="skill-segmented" role="radiogroup" aria-label="Skill level">
          {#each [1, 2, 3, 4, 5, 6] as tier}
            {@const s = tier as SkillTier}
            {@const info = SKILL_TIERS[s]}
            <button
              role="radio"
              aria-checked={newSkill === s}
              class="skill-seg-btn {newSkill === s ? 'active' : ''}"
              onclick={() => (newSkill = s)}
              type="button"
              title={info.label}
            >
              {info.label}
            </button>
          {/each}
        </div>
      </div>
    </form>
  </div>

  <!-- Players List Header & Search (Search appears when > 12 players) -->
  <div class="list-controls-bar">
    <div class="controls-left">
      <h2>Players ({sessionStore.session?.players.length || 0})</h2>
      <span class="active-sub tabular-nums">
        {sessionStore.session?.players.filter(p => p.status === 'active').length || 0} active
      </span>
    </div>

    {#if (sessionStore.session?.players.length || 0) > 12}
      <div class="search-wrap">
        <Icon name="search" size={16} />
        <input
          class="search-input"
          type="search"
          placeholder="Filter..."
          aria-label="Search players"
          bind:value={searchFilter}
        />
      </div>
    {/if}
  </div>

  <!-- Player List Rows -->
  {#if filteredPlayers().length === 0}
    <div class="empty-players surface-card">
      <p>No players found. Add players above to start matchmaking.</p>
    </div>
  {:else}
    <div class="players-list">
      {#each filteredPlayers() as p (p.id)}
        {@const statusInfo = getPlayerStatusInfo(p)}
        <div class="player-card surface-card {p.status === 'sitting_out' ? 'is-sitout' : ''}">
          <div class="player-card-main">
            <div class="p-title-line">
              <span class="p-name">{p.name}</span>
              <SkillBadge skill={p.skill} />
            </div>

            <div class="p-stats-line tabular-nums">
              <span class="status-tag {statusInfo.type}">
                {statusInfo.label}
              </span>
              <span class="record-tag">
                {p.gamesPlayed}G · {p.wins}W
              </span>
            </div>
          </div>

          <div class="player-actions">
            <button
              class="icon-menu-btn"
              onclick={() => (menuPlayer = p)}
              type="button"
              aria-label="Options for {p.name}"
            >
              <Icon name="more-vertical" size={18} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<ActionMenu
  isOpen={menuPlayer !== null}
  title={menuPlayer?.name || ''}
  subtitle={menuPlayer ? `${SKILL_TIERS[menuPlayer.skill].label} · ${menuPlayer.gamesPlayed}G ${menuPlayer.wins}W` : undefined}
  items={menuPlayer ? getPlayerMenuItems(menuPlayer) : []}
  onClose={() => (menuPlayer = null)}
/>

<ConfirmSheet
  isOpen={playerToRemove !== null}
  title={playerToRemove ? `Remove ${playerToRemove.name}?` : 'Remove Player?'}
  description="Removing this player will also clear them from any queued matches."
  confirmLabel="Remove Player"
  variant="danger"
  onConfirm={() => {
    if (playerToRemove) {
      sessionStore.removePlayer(playerToRemove.id);
      playerToRemove = null;
    }
  }}
  onClose={() => (playerToRemove = null)}
/>

<style>
  .players-view {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }

  .add-player-card {
    padding: var(--sp-3);
  }

  .add-form {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .name-input-row {
    display: flex;
    gap: var(--sp-2);
  }

  .name-input {
    flex: 1;
    min-width: 0;
  }

  .name-input.input-error {
    border-color: var(--c-danger);
  }

  .add-error-msg {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--c-danger-text);
    background: var(--c-danger-tint);
    border: 1px solid var(--c-danger-border);
    border-radius: var(--radius-sm);
    padding: var(--sp-2) var(--sp-3);
  }

  .add-submit-btn {
    flex-shrink: 0;
  }

  .skill-picker-block {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }

  .skill-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--fs-xs);
  }

  .picker-label {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-3);
  }

  .picker-selected {
    font-weight: 600;
    color: var(--text-2);
  }

  .skill-segmented {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--sp-1);
    background: var(--bg-input);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--sp-1);
  }

  .skill-seg-btn {
    min-height: var(--tap-min);
    padding: var(--sp-1) var(--sp-2);
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
    color: var(--text-2);
  }

  .skill-seg-btn.active {
    background: var(--c-action);
    color: var(--c-action-text);
  }

  .list-controls-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-2);
  }

  .controls-left {
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
  }

  .controls-left h2 {
    font-size: var(--fs-xl);
  }

  .active-sub {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-3);
  }

  .search-wrap {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    background: var(--bg-input);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 0 var(--sp-2);
    color: var(--text-3);
    max-width: 180px;
  }

  .search-input {
    border: none;
    background: transparent;
    padding: var(--sp-1);
    font-size: var(--fs-sm);
    min-height: 38px;
    width: 100%;
  }

  .search-input:focus {
    box-shadow: none;
  }

  .players-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .player-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-3);
    gap: var(--sp-2);
  }

  .player-card.is-sitout {
    opacity: 0.65;
  }

  .player-card-main {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    min-width: 0;
    flex: 1;
  }

  .p-title-line {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    min-width: 0;
  }

  .p-name {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .p-stats-line {
    display: flex;
    gap: var(--sp-2);
    align-items: center;
  }

  .status-tag {
    font-size: var(--fs-xs);
    font-weight: 700;
    padding: 2px var(--sp-2);
    border-radius: var(--radius-sm);
  }

  .status-tag.playing {
    color: var(--c-playing);
    background: var(--c-playing-tint);
  }

  .status-tag.ready {
    color: var(--c-ready);
    background: var(--c-ready-tint);
  }

  .status-tag.nextup {
    color: var(--c-wand-text);
    background: var(--c-wand-tint);
  }

  .status-tag.waiting {
    color: var(--text-2);
    background: var(--bg-subtle);
  }

  .status-tag.resting {
    color: var(--text-3);
    background: var(--bg-subtle);
  }

  .record-tag {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-3);
  }

  .player-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .icon-menu-btn {
    width: var(--tap-min);
    height: var(--tap-min);
    padding: 0;
    color: var(--text-3);
    border-radius: var(--radius-sm);
  }

  .icon-menu-btn:hover {
    color: var(--text-1);
    background: var(--bg-subtle-hover);
  }

  .empty-players {
    text-align: center;
    padding: var(--sp-5);
    color: var(--text-2);
  }
</style>
