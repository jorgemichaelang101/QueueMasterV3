<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import type { Player, Match } from '../types';
  import SkillBadge from './SkillBadge.svelte';

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

  // Synchronize when opening or editing
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

  // Selected player IDs in this match builder
  let selectedPlayerIds = $derived(new Set([...teamA, ...teamB]));

  // Available players who can be assigned:
  // Active players not currently on court, and not in other Next Up matches (except the one being edited)
  let availableCandidates = $derived(() => {
    if (!sessionStore.session) return [];

    const busyIds = new Set<string>();

    // Players on courts
    for (const c of sessionStore.session.courts) {
      if (c.match) {
        c.match.teamA.forEach(id => busyIds.add(id));
        c.match.teamB.forEach(id => busyIds.add(id));
      }
    }

    // Players in other Next Up matches
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
    // If already in match, remove from team
    if (teamA.includes(playerId)) {
      teamA = teamA.filter(id => id !== playerId);
      return;
    }
    if (teamB.includes(playerId)) {
      teamB = teamB.filter(id => id !== playerId);
      return;
    }

    // Assign to activeTargetSlot or next available slot
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

    // Fallback: fill first open slot
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
</script>

{#if isOpen}
  <div class="modal-backdrop" onclick={onClose} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-sheet manual-sheet" onclick={(e) => e.stopPropagation()} role="document">
      <div class="sheet-handle"></div>

      <div class="sheet-header">
        <div>
          <h3>{editingMatch ? 'Edit Queued Match' : 'Manual Match Builder'}</h3>
          <p class="subtext">Custom QM pairing · Tap players to build teams</p>
        </div>
        <button class="btn-ghost" onclick={onClose} type="button" aria-label="Close">✕</button>
      </div>

      <!-- Teams Slots Board -->
      <div class="match-board glass-card">
        <!-- Team A Slots -->
        <div class="board-team team-a">
          <div class="team-top">
            <span class="team-name">Team A</span>
            <span class="team-avg">Avg: {getTeamAvg(teamA)}</span>
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
                  <span class="remove-x">✕</span>
                </button>
              {:else}
                <button
                  class="slot-empty {activeTargetSlot?.team === 'A' && activeTargetSlot?.index === idx ? 'active-target' : ''}"
                  onclick={() => activeTargetSlot = { team: 'A', index: idx }}
                  type="button"
                >
                  + Slot {idx + 1}
                </button>
              {/if}
            {/each}
          </div>
        </div>

        <div class="board-vs">VS</div>

        <!-- Team B Slots -->
        <div class="board-team team-b">
          <div class="team-top">
            <span class="team-name">Team B</span>
            <span class="team-avg">Avg: {getTeamAvg(teamB)}</span>
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
                  <span class="remove-x">✕</span>
                </button>
              {:else}
                <button
                  class="slot-empty {activeTargetSlot?.team === 'B' && activeTargetSlot?.index === idx ? 'active-target' : ''}"
                  onclick={() => activeTargetSlot = { team: 'B', index: idx }}
                  type="button"
                >
                  + Slot {idx + 1}
                </button>
              {/if}
            {/each}
          </div>
        </div>
      </div>

      <!-- Available Candidate Players Picker -->
      <div class="candidate-section">
        <div class="cand-header">
          <span>Tap Available Players to Assign:</span>
          <span class="cand-count">{availableCandidates().length} in pool</span>
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
                <span class="cand-meta">{player.gamesPlayed}G</span>
              </div>
              <SkillBadge skill={player.skill} compact={true} />
              {#if isSelected}
                <span class="assigned-mark">✓ Assigned</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Action Button -->
      <div class="modal-actions">
        <button
          class="btn-primary submit-match-btn"
          disabled={!isMatchValid}
          onclick={handleSubmit}
          type="button"
        >
          {editingMatch ? '✓ Save Changes to Queue' : '+ Add Match to Queue'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .manual-sheet {
    max-height: 90vh;
  }

  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
  }

  .subtext {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .match-board {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 10px;
    align-items: center;
    padding: 14px;
    margin-bottom: 16px;
    background: rgba(18, 26, 47, 0.9);
  }

  .board-vs {
    font-size: 12px;
    font-weight: 800;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.06);
    padding: 4px 6px;
    border-radius: var(--radius-sm);
  }

  .board-team {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .team-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .team-name {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .team-avg {
    font-size: 10px;
    color: var(--text-muted);
  }

  .slots-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .slot-empty {
    border: 1px dashed var(--border-subtle);
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-muted);
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 600;
    width: 100%;
    justify-content: center;
  }

  .slot-empty.active-target {
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
    background: rgba(56, 189, 248, 0.1);
  }

  .slot-filled {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--border-subtle);
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    width: 100%;
    gap: 6px;
  }

  .slot-pname {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
    text-align: left;
  }

  .remove-x {
    font-size: 10px;
    color: #fb7185;
  }

  .candidate-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  .cand-header {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .cand-count {
    color: var(--text-muted);
  }

  .candidates-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    max-height: 240px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .candidate-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-subtle);
    padding: 8px 10px;
    border-radius: var(--radius-md);
    text-align: left;
    transition: all 0.15s ease;
  }

  .candidate-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .candidate-btn.selected {
    border-color: var(--accent-cyan);
    background: rgba(56, 189, 248, 0.15);
  }

  .cand-info {
    display: flex;
    flex-direction: column;
  }

  .cand-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .cand-meta {
    font-size: 10px;
    color: var(--text-muted);
  }

  .assigned-mark {
    font-size: 9px;
    color: var(--accent-cyan);
    font-weight: 700;
  }

  .modal-actions {
    margin-top: 10px;
  }

  .submit-match-btn {
    width: 100%;
    padding: 13px;
    font-size: 15px;
    font-weight: 700;
  }

  .submit-match-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
</style>
