<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import type { Match, Player, WandWeights } from '../types';
  import SkillBadge from './SkillBadge.svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let suggestionMatches = $state<Match[]>([]);
  let shuffledWeights = $state<WandWeights | null>(null);
  let swapSelectedPlayerId = $state<string | null>(null);
  let showWeightSettings = $state(false);

  // Editable weights for in-modal adjustments
  let customWait = $state(35);
  let customGames = $state(30);
  let customRep = $state(20);
  let customSkill = $state(15);

  // Re-generate suggestions whenever modal opens
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

  // Players currently in the suggestions
  let suggestedPlayerIds = $derived(() => {
    const ids = new Set<string>();
    for (const m of suggestionMatches) {
      m.teamA.forEach(id => ids.add(id));
      m.teamB.forEach(id => ids.add(id));
    }
    return ids;
  });

  // Waiting players from queue NOT currently inside the suggestions
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
      // Swap the two players within the suggestionMatches
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

  function handleAccept() {
    if (suggestionMatches.length > 0) {
      sessionStore.acceptMatches(suggestionMatches);
    }
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
</script>

{#if isOpen}
  <div class="modal-backdrop" onclick={onClose} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-sheet wand-sheet" onclick={(e) => e.stopPropagation()} role="document">
      <div class="sheet-handle"></div>

      <div class="sheet-header">
        <div class="header-title-group">
          <span class="wand-icon-sparkle">✨</span>
          <div>
            <h3>Magic Wand Matchmaker</h3>
            <p class="subtext">Weighted smart queue with dynamic shuffle</p>
          </div>
        </div>
        <button class="btn-ghost close-btn" onclick={onClose} type="button" aria-label="Close">✕</button>
      </div>

      <!-- Quick Weight / Tuning Bar -->
      <div class="weights-bar">
        {#if shuffledWeights && !showWeightSettings}
          <div class="weights-pill-row">
            <span class="weight-tag">⏳ Wait: {shuffledWeights.waitingTime}</span>
            <span class="weight-tag">🎮 Games: {shuffledWeights.gamesPlayed}</span>
            <span class="weight-tag">🔄 Fresh: {shuffledWeights.repetition}</span>
            <span class="weight-tag">⚖️ Skill: {shuffledWeights.skillBalance}</span>
          </div>
        {/if}
        <button
          class="btn-ghost tune-weights-btn"
          onclick={() => showWeightSettings = !showWeightSettings}
          type="button"
        >
          {showWeightSettings ? '✕ Close Sliders' : '⚙️ Tune Weights'}
        </button>
      </div>

      <!-- Expandable In-Modal Weight Sliders -->
      {#if showWeightSettings}
        <div class="weight-sliders-card glass-card">
          <div class="sliders-title">Adjust Base Weights & Re-roll</div>
          <div class="slider-item">
            <div class="slider-lbl"><span>⏳ Waiting Time</span><span>{customWait}</span></div>
            <input type="range" min="5" max="80" step="5" bind:value={customWait} />
          </div>
          <div class="slider-item">
            <div class="slider-lbl"><span>🎮 Games Played Priority</span><span>{customGames}</span></div>
            <input type="range" min="5" max="80" step="5" bind:value={customGames} />
          </div>
          <div class="slider-item">
            <div class="slider-lbl"><span>🔄 Partner Freshness</span><span>{customRep}</span></div>
            <input type="range" min="5" max="80" step="5" bind:value={customRep} />
          </div>
          <div class="slider-item">
            <div class="slider-lbl"><span>⚖️ Team Skill Balance</span><span>{customSkill}</span></div>
            <input type="range" min="5" max="80" step="5" bind:value={customSkill} />
          </div>
          <button class="btn-primary apply-weights-btn" onclick={applyCustomWeightsAndRoll} type="button">
            Apply & Roll Suggestions
          </button>
        </div>
      {/if}

      {#if suggestionMatches.length === 0}
        <div class="empty-state">
          <div class="empty-emoji">⏳</div>
          <h4>Not enough available players</h4>
          <p>You need at least {sessionStore.session?.format === 'doubles' ? 4 : 2} active players in the queue to build a match.</p>
        </div>
      {:else}
        <!-- Interactive Player Swap / Override Banner -->
        {#if swapSelectedPlayerId}
          {@const selectedPlayer = getPlayer(swapSelectedPlayerId)}
          <div class="swap-banner">
            <div class="swap-prompt">
              <span>Replacing: <strong>{selectedPlayer?.name}</strong></span>
              <span class="swap-sub">Tap another player in the match, or pick from the waiting pool below:</span>
            </div>
            <button class="btn-ghost cancel-swap-btn" onclick={() => swapSelectedPlayerId = null} type="button">✕ Cancel</button>
          </div>

          <!-- Waiting Pool Picker for Direct Override -->
          {#if unassignedWaitingPlayers().length > 0}
            <div class="waiting-pool-picker">
              <span class="picker-heading">Available in Waiting Pool:</span>
              <div class="waiting-pool-chips">
                {#each unassignedWaitingPlayers() as wp}
                  <button
                    class="waiting-chip"
                    onclick={() => handleReplaceWithWaiting(wp.id)}
                    type="button"
                    title="Swap with {wp.name}"
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
          {#each suggestionMatches as match, mIdx}
            <div class="suggestion-card">
              <div class="match-badge-row">
                <span class="match-num">Match #{mIdx + 1}</span>
                <span class="format-badge">{sessionStore.session?.format === 'doubles' ? '2v2 Doubles' : '1v1 Singles'}</span>
              </div>

              <div class="teams-container">
                <!-- Team A -->
                <div class="team-block team-a">
                  <div class="team-header">
                    <span class="team-label">Team A</span>
                    <span class="team-avg">Avg: {getTeamAvgSkill(match.teamA)}</span>
                  </div>
                  <div class="team-players">
                    {#each match.teamA as pId}
                      {@const player = getPlayer(pId)}
                      {#if player}
                        <button
                          class="player-chip {swapSelectedPlayerId === pId ? 'selected-swap' : ''}"
                          onclick={() => handlePlayerClick(pId)}
                          type="button"
                          title="Tap to swap or replace"
                        >
                          <span class="player-name">{player.name}</span>
                          <SkillBadge skill={player.skill} compact={true} />
                        </button>
                      {/if}
                    {/each}
                  </div>
                </div>

                <div class="vs-divider">VS</div>

                <!-- Team B -->
                <div class="team-block team-b">
                  <div class="team-header">
                    <span class="team-label">Team B</span>
                    <span class="team-avg">Avg: {getTeamAvgSkill(match.teamB)}</span>
                  </div>
                  <div class="team-players">
                    {#each match.teamB as pId}
                      {@const player = getPlayer(pId)}
                      {#if player}
                        <button
                          class="player-chip {swapSelectedPlayerId === pId ? 'selected-swap' : ''}"
                          onclick={() => handlePlayerClick(pId)}
                          type="button"
                          title="Tap to swap or replace"
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

      <div class="modal-actions">
        <button class="btn-secondary reroll-btn" onclick={rollWand} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
          Re-roll
        </button>

        {#if suggestionMatches.length > 0}
          <button class="wand-btn accept-btn" onclick={handleAccept} type="button">
            ✨ Accept & Queue ({suggestionMatches.length})
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .wand-sheet {
    max-height: 90vh;
  }

  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .header-title-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .wand-icon-sparkle {
    font-size: 24px;
    background: rgba(168, 85, 247, 0.2);
    border-radius: var(--radius-md);
    padding: 6px 10px;
  }

  .subtext {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .close-btn {
    font-size: 18px;
    padding: 4px 8px;
  }

  .weights-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }

  .weights-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    background: rgba(255, 255, 255, 0.04);
    padding: 6px 10px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
  }

  .weight-tag {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 7px;
    border-radius: var(--radius-sm);
  }

  .tune-weights-btn {
    font-size: 11px;
    white-space: nowrap;
    padding: 6px 10px;
    color: var(--accent-cyan);
    border: 1px solid rgba(56, 189, 248, 0.25);
    border-radius: var(--radius-sm);
  }

  .weight-sliders-card {
    padding: 14px;
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: rgba(15, 23, 42, 0.85);
    border-color: rgba(56, 189, 248, 0.3);
  }

  .sliders-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--accent-cyan);
  }

  .slider-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .slider-lbl {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-secondary);
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--accent-violet);
  }

  .apply-weights-btn {
    padding: 8px;
    font-size: 13px;
    margin-top: 4px;
  }

  .swap-banner {
    background: rgba(56, 189, 248, 0.15);
    border: 1px solid rgba(56, 189, 248, 0.35);
    color: var(--accent-cyan);
    padding: 10px 14px;
    border-radius: var(--radius-md);
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .swap-prompt {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
  }

  .swap-sub {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .cancel-swap-btn {
    font-size: 12px;
    color: #fb7185;
    padding: 2px 6px;
  }

  .waiting-pool-picker {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .picker-heading {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent-amber);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .waiting-pool-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .waiting-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 9px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 12px;
    font-weight: 600;
  }

  .waiting-chip:hover {
    background: rgba(56, 189, 248, 0.2);
    border-color: var(--accent-cyan);
  }

  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .suggestion-card {
    background: rgba(18, 26, 47, 0.9);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: 14px;
  }

  .match-badge-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .match-num {
    font-size: 13px;
    font-weight: 700;
    color: var(--accent-cyan);
  }

  .format-badge {
    font-size: 11px;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .teams-container {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 10px;
    align-items: center;
  }

  .vs-divider {
    font-size: 11px;
    font-weight: 800;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.06);
    padding: 4px 6px;
    border-radius: var(--radius-sm);
  }

  .team-block {
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-md);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .team-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .team-avg {
    font-size: 10px;
    color: var(--text-muted);
  }

  .team-players {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .player-chip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--border-subtle);
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    width: 100%;
    text-align: left;
    transition: all 0.15s ease;
  }

  .player-chip:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .player-chip.selected-swap {
    border-color: var(--accent-cyan);
    background: rgba(56, 189, 248, 0.2);
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
  }

  .player-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .empty-state {
    text-align: center;
    padding: 32px 16px;
    color: var(--text-secondary);
  }

  .empty-emoji {
    font-size: 36px;
    margin-bottom: 8px;
  }

  .empty-state h4 {
    margin-bottom: 6px;
    color: var(--text-primary);
  }

  .empty-state p {
    font-size: 14px;
    max-width: 320px;
    margin: 0 auto;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  .reroll-btn {
    flex: 1;
    padding: 12px;
  }

  .accept-btn {
    flex: 2;
    padding: 12px;
  }
</style>
