<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import type { Match, Player, WandWeights } from '../types';
  import SkillBadge from './SkillBadge.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let suggestionMatches = $state<Match[]>([]);
  let selectedMatchIds = $state<string[]>([]);
  let shuffledWeights = $state<WandWeights | null>(null);
  let swapSelectedPlayerId = $state<string | null>(null);
  let showWeightSettings = $state(false);

  let hasMultipleSuggestions = $derived(suggestionMatches.length > 1);
  let selectedMatches = $derived(
    suggestionMatches.filter(m => selectedMatchIds.includes(m.id))
  );

  let customWait = $state(35);
  let customGames = $state(30);
  let customRep = $state(20);
  let customSkill = $state(15);

  $effect(() => {
    if (isOpen) {
      if (sessionStore.session) {
        customWait = sessionStore.session.settings.baseWeights.waitingTime;
        customGames = sessionStore.session.settings.baseWeights.gamesPlayed;
        customRep = sessionStore.session.settings.baseWeights.repetition;
        customSkill = sessionStore.session.settings.baseWeights.skillBalance;
      }
      rollWand();
    }
  });

  function rollWand() {
    swapSelectedPlayerId = null;
    const res = sessionStore.suggestMatches();
    suggestionMatches = res.matches;
    selectedMatchIds = res.matches.map(m => m.id);
    shuffledWeights = res.shuffledWeights;
  }

  function applyCustomWeightsAndRoll() {
    sessionStore.updateSettings(undefined, {
      waitingTime: customWait,
      gamesPlayed: customGames,
      repetition: customRep,
      skillBalance: customSkill,
    });
    rollWand();
    showWeightSettings = false;
  }

  function getPlayer(id: string): Player | undefined {
    return sessionStore.session?.players.find(p => p.id === id);
  }

  let suggestedPlayerIds = $derived(() => {
    const ids = new Set<string>();
    for (const m of suggestionMatches) {
      m.teamA.forEach(id => ids.add(id));
      m.teamB.forEach(id => ids.add(id));
    }
    return ids;
  });

  let unassignedWaitingPlayers = $derived(() => {
    const used = suggestedPlayerIds();
    return sessionStore.getAvailablePlayers().filter(p => !used.has(p.id));
  });

  function handlePlayerClick(playerId: string) {
    if (!swapSelectedPlayerId) {
      swapSelectedPlayerId = playerId;
    } else if (swapSelectedPlayerId === playerId) {
      swapSelectedPlayerId = null;
    } else {
      performSwap(swapSelectedPlayerId, playerId);
      swapSelectedPlayerId = null;
    }
  }

  function handleReplaceWithWaiting(waitingPlayerId: string) {
    if (!swapSelectedPlayerId) return;
    performSwap(swapSelectedPlayerId, waitingPlayerId);
    swapSelectedPlayerId = null;
  }

  function performSwap(id1: string, id2: string) {
    suggestionMatches = suggestionMatches.map(m => {
      const newTeamA = m.teamA.map(id => (id === id1 ? id2 : id === id2 ? id1 : id));
      const newTeamB = m.teamB.map(id => (id === id1 ? id2 : id === id2 ? id1 : id));
      return { ...m, teamA: newTeamA, teamB: newTeamB };
    });
  }

  function toggleMatchSelection(matchId: string) {
    if (selectedMatchIds.includes(matchId)) {
      selectedMatchIds = selectedMatchIds.filter(id => id !== matchId);
    } else {
      selectedMatchIds = [...selectedMatchIds, matchId];
    }
  }

  function handleAccept() {
    if (selectedMatches.length === 0) return;
    sessionStore.acceptMatches(selectedMatches);
    onClose();
  }

  function handleAcceptSingle(match: Match) {
    sessionStore.acceptMatches([match]);
    onClose();
  }

  function getTeamAvgSkill(playerIds: string[]): string {
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
    aria-label="Magic Wand Matchmaker"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
  >
    <div class="modal-sheet wand-sheet">
      <div class="sheet-handle"></div>

      <div class="sheet-header">
        <div class="header-title-group">
          <div class="wand-icon-badge" aria-hidden="true">
            <Icon name="sparkles" size={20} />
          </div>
          <div>
            <h3>Magic Wand</h3>
            <p class="subtext">
              {sessionStore.session?.format === 'doubles' ? '2v2 Doubles' : '1v1 Singles'} · Tap players to swap
            </p>
          </div>
        </div>
        <button class="btn-ghost icon-close" onclick={onClose} type="button" aria-label="Close">
          <Icon name="x" size={20} />
        </button>
      </div>

      <!-- Quick Weight / Tuning Bar -->
      <div class="weights-bar tabular-nums">
        {#if shuffledWeights && !showWeightSettings}
          <div class="weights-pill-row">
            <span class="weight-tag">Wait {shuffledWeights.waitingTime}</span>
            <span class="weight-tag">Games {shuffledWeights.gamesPlayed}</span>
            <span class="weight-tag">Fresh {shuffledWeights.repetition}</span>
            <span class="weight-tag">Skill {shuffledWeights.skillBalance}</span>
          </div>
        {/if}
        <button
          class="btn-secondary tune-weights-btn"
          onclick={() => (showWeightSettings = !showWeightSettings)}
          type="button"
        >
          <Icon name={showWeightSettings ? 'x' : 'sliders'} size={14} />
          <span>{showWeightSettings ? 'Close' : 'Tune'}</span>
        </button>
      </div>

      <!-- Expandable In-Modal Weight Sliders -->
      {#if showWeightSettings}
        <div class="weight-sliders-card surface-card tabular-nums">
          <div class="sliders-title">Adjust Base Weights & Roll</div>
          <div class="slider-item">
            <div class="slider-lbl"><span>Waiting Time</span><span>{customWait}</span></div>
            <input type="range" min="5" max="80" step="5" bind:value={customWait} />
          </div>
          <div class="slider-item">
            <div class="slider-lbl"><span>Games Played Priority</span><span>{customGames}</span></div>
            <input type="range" min="5" max="80" step="5" bind:value={customGames} />
          </div>
          <div class="slider-item">
            <div class="slider-lbl"><span>Partner Freshness</span><span>{customRep}</span></div>
            <input type="range" min="5" max="80" step="5" bind:value={customRep} />
          </div>
          <div class="slider-item">
            <div class="slider-lbl"><span>Team Skill Balance</span><span>{customSkill}</span></div>
            <input type="range" min="5" max="80" step="5" bind:value={customSkill} />
          </div>
          <button class="btn-primary apply-weights-btn" onclick={applyCustomWeightsAndRoll} type="button">
            Apply & Re-roll
          </button>
        </div>
      {/if}

      {#if suggestionMatches.length === 0}
        <div class="empty-state surface-card">
          <Icon name="users" size={32} />
          <h4>Not enough available players</h4>
          <p>You need at least {sessionStore.session?.format === 'doubles' ? 4 : 2} active players in the waiting pool to build a match.</p>
        </div>
      {:else}
        {#if swapSelectedPlayerId}
          {@const selectedPlayer = getPlayer(swapSelectedPlayerId)}
          <div class="swap-banner">
            <div class="swap-prompt">
              <span>Swapping <strong>{selectedPlayer?.name}</strong></span>
              <span class="swap-sub">Tap another player or pick from the pool below:</span>
            </div>
            <button class="btn-ghost cancel-swap-btn" onclick={() => (swapSelectedPlayerId = null)} type="button">
              Cancel
            </button>
          </div>

          {#if unassignedWaitingPlayers().length > 0}
            <div class="waiting-pool-picker">
              <span class="picker-heading">Waiting Pool</span>
              <div class="waiting-pool-chips">
                {#each unassignedWaitingPlayers() as wp}
                  <button
                    class="waiting-chip"
                    onclick={() => handleReplaceWithWaiting(wp.id)}
                    type="button"
                  >
                    <span>{wp.name}</span>
                    <SkillBadge skill={wp.skill} compact={true} />
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/if}

        <div class="suggestions-list">
          {#each suggestionMatches as match, mIdx (match.id)}
            {@const isSelected = selectedMatchIds.includes(match.id)}
            <div class="suggestion-card surface-card {hasMultipleSuggestions ? (isSelected ? 'is-selected' : 'is-deselected') : ''}">
              <div class="match-badge-row">
                {#if hasMultipleSuggestions}
                  <button
                    class="select-match-btn"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label="Include Match #{mIdx + 1}"
                    onclick={() => toggleMatchSelection(match.id)}
                    type="button"
                  >
                    <span class="checkbox-box {isSelected ? 'checked' : ''}" aria-hidden="true">
                      {#if isSelected}
                        <Icon name="check" size={14} strokeWidth={2.5} />
                      {/if}
                    </span>
                    <span class="match-num tabular-nums">Match #{mIdx + 1}</span>
                  </button>

                  <button
                    class="btn-secondary accept-one-btn"
                    onclick={() => handleAcceptSingle(match)}
                    type="button"
                    aria-label="Accept only Match #{mIdx + 1}"
                  >
                    Accept only
                  </button>
                {:else}
                  <span class="match-num tabular-nums">Match #{mIdx + 1}</span>
                  <span class="format-badge">{sessionStore.session?.format === 'doubles' ? '2v2 Doubles' : '1v1 Singles'}</span>
                {/if}
              </div>

              <div class="teams-container">
                <div class="team-block">
                  <div class="team-header">
                    <span class="team-label">Team A</span>
                    <span class="team-avg tabular-nums">Avg {getTeamAvgSkill(match.teamA)}</span>
                  </div>
                  <div class="team-players">
                    {#each match.teamA as pId}
                      {@const player = getPlayer(pId)}
                      {#if player}
                        <button
                          class="player-chip {swapSelectedPlayerId === pId ? 'selected-swap' : ''}"
                          onclick={() => handlePlayerClick(pId)}
                          type="button"
                        >
                          <span class="player-name">{player.name}</span>
                          <SkillBadge skill={player.skill} compact={true} />
                        </button>
                      {/if}
                    {/each}
                  </div>
                </div>

                <div class="vs-divider">VS</div>

                <div class="team-block">
                  <div class="team-header">
                    <span class="team-label">Team B</span>
                    <span class="team-avg tabular-nums">Avg {getTeamAvgSkill(match.teamB)}</span>
                  </div>
                  <div class="team-players">
                    {#each match.teamB as pId}
                      {@const player = getPlayer(pId)}
                      {#if player}
                        <button
                          class="player-chip {swapSelectedPlayerId === pId ? 'selected-swap' : ''}"
                          onclick={() => handlePlayerClick(pId)}
                          type="button"
                        >
                          <span class="player-name">{player.name}</span>
                          <SkillBadge skill={player.skill} compact={true} />
                        </button>
                      {/if}
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="sheet-sticky-footer wand-footer">
        <button class="btn-secondary reroll-btn" onclick={rollWand} type="button">
          <Icon name="refresh" size={18} />
          Re-roll
        </button>

        {#if suggestionMatches.length > 0}
          <button
            class="wand-btn accept-btn"
            disabled={selectedMatches.length === 0}
            onclick={handleAccept}
            type="button"
          >
            <Icon name="sparkles" size={18} />
            {#if !hasMultipleSuggestions}
              Accept Match
            {:else if selectedMatches.length === 0}
              Select a Match
            {:else if selectedMatches.length === suggestionMatches.length}
              Accept All ({selectedMatches.length})
            {:else}
              Accept Selected ({selectedMatches.length})
            {/if}
          </button>
        {/if}
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

  .header-title-group {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  .wand-icon-badge {
    width: 40px;
    height: 40px;
    background: var(--c-wand-tint);
    border: 1px solid var(--c-wand-border);
    color: var(--c-wand-text);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sheet-header h3 {
    font-size: var(--fs-lg);
  }

  .subtext {
    font-size: var(--fs-sm);
    color: var(--text-2);
  }

  .icon-close {
    width: var(--tap-min);
    height: var(--tap-min);
    padding: 0;
  }

  .weights-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-2);
    margin-bottom: var(--sp-3);
  }

  .weights-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-1);
  }

  .weight-tag {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-2);
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    padding: 3px var(--sp-2);
    border-radius: var(--radius-sm);
  }

  .tune-weights-btn {
    min-height: 36px;
    font-size: var(--fs-xs);
    padding: var(--sp-1) var(--sp-2);
    gap: 4px;
    flex-shrink: 0;
  }

  .weight-sliders-card {
    padding: var(--sp-3);
    margin-bottom: var(--sp-3);
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .sliders-title {
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-2);
  }

  .slider-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .slider-lbl {
    display: flex;
    justify-content: space-between;
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-2);
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--c-action);
    min-height: 28px;
    padding: 0;
    border: none;
    background: transparent;
  }

  .apply-weights-btn {
    margin-top: var(--sp-1);
  }

  .swap-banner {
    background: var(--c-action-tint);
    border: 1px solid var(--c-action-border);
    color: var(--text-1);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-md);
    margin-bottom: var(--sp-2);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-2);
  }

  .swap-prompt {
    display: flex;
    flex-direction: column;
    font-size: var(--fs-sm);
  }

  .swap-sub {
    font-size: var(--fs-xs);
    color: var(--text-2);
  }

  .cancel-swap-btn {
    min-height: 36px;
    font-size: var(--fs-xs);
    padding: var(--sp-1) var(--sp-2);
  }

  .waiting-pool-picker {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--sp-2) var(--sp-3);
    margin-bottom: var(--sp-3);
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .picker-heading {
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--text-2);
    text-transform: uppercase;
  }

  .waiting-pool-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-1);
  }

  .waiting-chip {
    min-height: 38px;
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-card);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    font-weight: 600;
    gap: 6px;
  }

  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .suggestion-card {
    padding: var(--sp-3);
    transition: opacity 0.15s ease, border-color 0.15s ease;
  }

  .suggestion-card.is-selected {
    border-color: var(--c-action-border);
  }

  .suggestion-card.is-deselected {
    opacity: 0.55;
    border-style: dashed;
  }

  .match-badge-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-2);
    margin-bottom: var(--sp-2);
  }

  .select-match-btn {
    min-height: var(--tap-min);
    padding: 0 var(--sp-2) 0 0;
    gap: var(--sp-2);
    justify-content: flex-start;
    border-radius: var(--radius-sm);
  }

  .checkbox-box {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 2px solid var(--border-strong);
    background: var(--bg-input);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--c-action-text);
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .checkbox-box.checked {
    background: var(--c-action);
    border-color: var(--c-action);
  }

  .accept-one-btn {
    min-height: 36px;
    padding: var(--sp-1) var(--sp-3);
    font-size: var(--fs-xs);
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .accept-one-btn:hover:not(:disabled) {
    border-color: var(--c-action-border);
    background: var(--c-action-tint);
    color: var(--c-action);
  }

  .match-num {
    font-size: var(--fs-sm);
    font-weight: 800;
    color: var(--text-1);
  }

  .format-badge {
    font-size: var(--fs-xs);
    color: var(--text-3);
    background: var(--bg-subtle);
    padding: 2px var(--sp-2);
    border-radius: var(--radius-full);
  }

  .teams-container {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: var(--sp-2);
    align-items: center;
  }

  .vs-divider {
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--text-3);
  }

  .team-block {
    background: var(--bg-subtle);
    border-radius: var(--radius-md);
    padding: var(--sp-2);
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    min-width: 0;
  }

  .team-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-2);
  }

  .team-avg {
    color: var(--text-3);
  }

  .team-players {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }

  .player-chip {
    min-height: var(--tap-min);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    padding: var(--sp-1) var(--sp-2);
    border-radius: var(--radius-sm);
    width: 100%;
    text-align: left;
    gap: var(--sp-1);
    min-width: 0;
  }

  .player-chip.selected-swap {
    border-color: var(--c-action);
    background: var(--c-action-tint);
  }

  .player-name {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-state {
    text-align: center;
    padding: var(--sp-5) var(--sp-4);
    color: var(--text-2);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-2);
  }

  .empty-state h4 {
    color: var(--text-1);
    font-size: var(--fs-lg);
  }

  .empty-state p {
    font-size: var(--fs-sm);
    max-width: 300px;
  }

  .wand-footer {
    display: flex;
    gap: var(--sp-2);
  }

  .reroll-btn {
    flex: 1;
  }

  .accept-btn {
    flex: 1.8;
  }
</style>
