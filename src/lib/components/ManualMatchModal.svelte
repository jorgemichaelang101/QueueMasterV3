<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import type { Player, Match } from '../types';
  import SkillBadge from './SkillBadge.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    isOpen: boolean;
    editingMatch?: Match | null;
    onClose: () => void;
  }

  let { isOpen, editingMatch = null, onClose }: Props = $props();

  let teamA = $state<string[]>([]);
  let teamB = $state<string[]>([]);
  let activeTargetSlot = $state<{ team: 'A' | 'B'; index: number } | null>(null);

  let format = $derived(sessionStore.session?.format || 'doubles');
  let requiredPerTeam = $derived(format === 'doubles' ? 2 : 1);

  $effect(() => {
    if (isOpen) {
      if (editingMatch) {
        teamA = [...editingMatch.teamA];
        teamB = [...editingMatch.teamB];
      } else {
        teamA = [];
        teamB = [];
      }
      activeTargetSlot = { team: 'A', index: 0 };
    }
  });

  function getPlayer(id: string): Player | undefined {
    return sessionStore.session?.players.find(p => p.id === id);
  }

  let selectedPlayerIds = $derived(new Set([...teamA, ...teamB]));

  let availableCandidates = $derived(() => {
    if (!sessionStore.session) return [];

    const busyIds = new Set<string>();

    for (const c of sessionStore.session.courts) {
      if (c.match) {
        c.match.teamA.forEach(id => busyIds.add(id));
        c.match.teamB.forEach(id => busyIds.add(id));
      }
    }

    for (const m of sessionStore.session.nextUp) {
      if (editingMatch && m.id === editingMatch.id) continue;
      m.teamA.forEach(id => busyIds.add(id));
      m.teamB.forEach(id => busyIds.add(id));
    }

    return sessionStore.session.players.filter(p =>
      p.status === 'active' && !busyIds.has(p.id)
    );
  });

  function handleCandidateClick(playerId: string) {
    if (teamA.includes(playerId)) {
      teamA = teamA.filter(id => id !== playerId);
      return;
    }
    if (teamB.includes(playerId)) {
      teamB = teamB.filter(id => id !== playerId);
      return;
    }

    if (activeTargetSlot) {
      if (activeTargetSlot.team === 'A') {
        const nextA = [...teamA];
        nextA[activeTargetSlot.index] = playerId;
        teamA = nextA;
      } else {
        const nextB = [...teamB];
        nextB[activeTargetSlot.index] = playerId;
        teamB = nextB;
      }
      advanceTargetSlot();
      return;
    }

    if (teamA.length < requiredPerTeam) {
      teamA = [...teamA, playerId];
    } else if (teamB.length < requiredPerTeam) {
      teamB = [...teamB, playerId];
    }
  }

  function advanceTargetSlot() {
    if (teamA.length < requiredPerTeam) {
      activeTargetSlot = { team: 'A', index: teamA.length };
    } else if (teamB.length < requiredPerTeam) {
      activeTargetSlot = { team: 'B', index: teamB.length };
    } else {
      activeTargetSlot = null;
    }
  }

  function removePlayerFromSlot(team: 'A' | 'B', index: number) {
    if (team === 'A') {
      teamA = teamA.filter((_, i) => i !== index);
      activeTargetSlot = { team: 'A', index: teamA.length };
    } else {
      teamB = teamB.filter((_, i) => i !== index);
      activeTargetSlot = { team: 'B', index: teamB.length };
    }
  }

  let isMatchValid = $derived(
    teamA.length === requiredPerTeam && teamB.length === requiredPerTeam
  );

  function handleSubmit() {
    if (!isMatchValid) return;

    if (editingMatch) {
      sessionStore.updateNextUpMatch(editingMatch.id, teamA, teamB);
    } else {
      sessionStore.addManualMatch(teamA, teamB);
    }
    onClose();
  }

  function getTeamAvg(playerIds: string[]): string {
    if (playerIds.length === 0) return '0.0';
    const sum = playerIds.reduce((acc, id) => {
      const p = getPlayer(id);
      return acc + (p?.skill || 0);
    }, 0);
    return (sum / playerIds.length).toFixed(1);
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
    aria-label={editingMatch ? 'Edit Queued Match' : 'Manual Match Builder'}
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
  >
    <div class="modal-sheet manual-sheet">
      <div class="sheet-handle"></div>

      <div class="sheet-header">
        <div>
          <h3>{editingMatch ? 'Edit Match' : 'Manual Match'}</h3>
          <p class="subtext">Tap players below to fill Team A and Team B</p>
        </div>
        <button class="btn-ghost icon-close" onclick={onClose} type="button" aria-label="Close">
          <Icon name="x" size={20} />
        </button>
      </div>

      <!-- Teams Slots Board -->
      <div class="match-board surface-card">
        <div class="board-team">
          <div class="team-top">
            <span class="team-name">Team A</span>
            <span class="team-avg tabular-nums">Avg {getTeamAvg(teamA)}</span>
          </div>

          <div class="slots-container">
            {#each Array(requiredPerTeam) as _, idx}
              {@const pid = teamA[idx]}
              {@const player = pid ? getPlayer(pid) : null}
              {#if player}
                <button
                  class="slot-filled"
                  onclick={() => removePlayerFromSlot('A', idx)}
                  type="button"
                  title="Tap to remove"
                >
                  <span class="slot-pname">{player.name}</span>
                  <SkillBadge skill={player.skill} compact={true} />
                  <span class="remove-x"><Icon name="x" size={14} /></span>
                </button>
              {:else}
                <button
                  class="slot-empty {activeTargetSlot?.team === 'A' && activeTargetSlot?.index === idx ? 'active-target' : ''}"
                  onclick={() => (activeTargetSlot = { team: 'A', index: idx })}
                  type="button"
                >
                  <Icon name="plus" size={14} />
                  <span>Slot {idx + 1}</span>
                </button>
              {/if}
            {/each}
          </div>
        </div>

        <div class="board-vs">VS</div>

        <div class="board-team">
          <div class="team-top">
            <span class="team-name">Team B</span>
            <span class="team-avg tabular-nums">Avg {getTeamAvg(teamB)}</span>
          </div>

          <div class="slots-container">
            {#each Array(requiredPerTeam) as _, idx}
              {@const pid = teamB[idx]}
              {@const player = pid ? getPlayer(pid) : null}
              {#if player}
                <button
                  class="slot-filled"
                  onclick={() => removePlayerFromSlot('B', idx)}
                  type="button"
                  title="Tap to remove"
                >
                  <span class="slot-pname">{player.name}</span>
                  <SkillBadge skill={player.skill} compact={true} />
                  <span class="remove-x"><Icon name="x" size={14} /></span>
                </button>
              {:else}
                <button
                  class="slot-empty {activeTargetSlot?.team === 'B' && activeTargetSlot?.index === idx ? 'active-target' : ''}"
                  onclick={() => (activeTargetSlot = { team: 'B', index: idx })}
                  type="button"
                >
                  <Icon name="plus" size={14} />
                  <span>Slot {idx + 1}</span>
                </button>
              {/if}
            {/each}
          </div>
        </div>
      </div>

      <!-- Available Candidate Players Picker -->
      <div class="candidate-section">
        <div class="cand-header">
          <span>Available Players</span>
          <span class="cand-count tabular-nums">{availableCandidates().length} in pool</span>
        </div>

        <div class="candidates-grid">
          {#each availableCandidates() as player (player.id)}
            {@const isSelected = selectedPlayerIds.has(player.id)}
            <button
              class="candidate-btn {isSelected ? 'selected' : ''}"
              onclick={() => handleCandidateClick(player.id)}
              type="button"
            >
              <div class="cand-info">
                <span class="cand-name">{player.name}</span>
                <span class="cand-meta tabular-nums">{player.gamesPlayed}G</span>
              </div>
              <SkillBadge skill={player.skill} compact={true} />
            </button>
          {/each}
        </div>
      </div>

      <div class="sheet-sticky-footer">
        <button
          class="btn-primary submit-match-btn"
          disabled={!isMatchValid}
          onclick={handleSubmit}
          type="button"
        >
          {#if editingMatch}
            <Icon name="check" size={18} />
            Save Match Changes
          {:else}
            <Icon name="plus" size={18} />
            Add Match to Queue
          {/if}
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

  .match-board {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: var(--sp-2);
    align-items: center;
    padding: var(--sp-3);
    margin-bottom: var(--sp-3);
  }

  .board-vs {
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--text-3);
  }

  .board-team {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    min-width: 0;
  }

  .team-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .team-name {
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-2);
  }

  .team-avg {
    font-size: var(--fs-xs);
    color: var(--text-3);
  }

  .slots-container {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }

  .slot-empty {
    min-height: var(--tap-min);
    border: 1px dashed var(--border-strong);
    background: var(--bg-subtle);
    color: var(--text-3);
    padding: var(--sp-2);
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    font-weight: 600;
    width: 100%;
    gap: 4px;
  }

  .slot-empty.active-target {
    border-style: solid;
    border-color: var(--c-action);
    color: var(--c-action);
    background: var(--c-action-tint);
  }

  .slot-filled {
    min-height: var(--tap-min);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-subtle);
    border: 1px solid var(--border-strong);
    padding: var(--sp-1) var(--sp-2);
    border-radius: var(--radius-sm);
    width: 100%;
    gap: var(--sp-1);
    min-width: 0;
  }

  .slot-pname {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-1);
    flex: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-x {
    color: var(--c-danger);
    display: inline-flex;
  }

  .candidate-section {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .cand-header {
    display: flex;
    justify-content: space-between;
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-2);
  }

  .cand-count {
    color: var(--text-3);
  }

  .candidates-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-2);
    max-height: 220px;
    overflow-y: auto;
  }

  .candidate-btn {
    min-height: var(--tap-min);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-md);
    text-align: left;
    gap: var(--sp-1);
    min-width: 0;
  }

  .candidate-btn.selected {
    border-color: var(--c-action);
    background: var(--c-action-tint);
  }

  .cand-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .cand-name {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cand-meta {
    font-size: var(--fs-xs);
    color: var(--text-3);
  }

  .submit-match-btn {
    width: 100%;
  }
</style>
