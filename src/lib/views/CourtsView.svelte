<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import type { Court, Player } from '../types';
  import { formatElapsed } from '../engine/time';
  import SkillBadge from '../components/SkillBadge.svelte';
  import EndMatchModal from '../components/EndMatchModal.svelte';

  interface Props {
    onOpenQueueTab: () => void;
  }

  let { onOpenQueueTab }: Props = $props();

  let endingCourt = $state<Court | null>(null);
  let isEndModalOpen = $state(false);

  // Live timer interval to keep active match timers ticking
  let now = $state(Date.now());
  $effect(() => {
    const timer = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(timer);
  });

  function getPlayer(id: string): Player | undefined {
    return sessionStore.session?.players.find(p => p.id === id);
  }

  function handleStartMatch(courtId: string) {
    sessionStore.startMatch(courtId);
  }

  function handleOpenEndModal(court: Court) {
    endingCourt = court;
    isEndModalOpen = true;
  }

  function handleCancelMatch(courtId: string) {
    sessionStore.cancelMatch(courtId);
  }

  function handleAddCourt() {
    sessionStore.addCourt();
  }

  function handleRemoveCourt(court: Court) {
    if (court.status === 'in_use') return;
    sessionStore.removeCourt(court.id);
  }
</script>

<div class="courts-view">
  <!-- Courts Top Bar -->
  <div class="courts-header-bar">
    <div class="court-header-title">
      <h2>Courts</h2>
      <span class="court-sub">{sessionStore.session?.courts.length || 0} courts total</span>
    </div>

    <!-- Dynamic Court Buttons -->
    <div class="court-actions-wrap">
      <button class="btn-primary add-court-btn" onclick={handleAddCourt} type="button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Court
      </button>
    </div>
  </div>

  {#if !sessionStore.session || sessionStore.session.courts.length === 0}
    <div class="empty-courts glass-card">
      <p>No courts available. Add a court using the button above.</p>
    </div>
  {:else}
    <div class="courts-list">
      {#each sessionStore.session.courts as court (court.id)}
        <div class="court-card glass-card {court.status}">
          <!-- Court Title & Status Header -->
          <div class="court-card-header">
            <div class="court-title-group">
              <span class="court-number">Court {court.courtNumber}</span>
              {#if court.status === 'in_use'}
                <span class="court-status-badge in-use">
                  <span class="live-pulse"></span>
                  In Match
                </span>
              {:else if court.status === 'ready'}
                <span class="court-status-badge ready">Ready</span>
              {:else}
                <span class="court-status-badge idle">Idle</span>
              {/if}
            </div>

            <div class="court-header-right">
              {#if court.status === 'in_use' && court.match?.startedAt}
                <div class="court-timer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{formatElapsed(court.match.startedAt, now)}</span>
                </div>
              {/if}

              <!-- Remove Court Button (Disabled if in use) -->
              <button
                class="remove-court-btn"
                disabled={court.status === 'in_use'}
                onclick={() => handleRemoveCourt(court)}
                type="button"
                title={court.status === 'in_use' ? 'Finish match before removing court' : 'Remove court'}
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Court Body -->
          {#if court.match}
            {@const match = court.match}
            <div class="match-content">
              <!-- Team A -->
              <div class="team-side team-a">
                <div class="team-tag">Team A</div>
                <div class="players-column">
                  {#each match.teamA as pId}
                    {@const p = getPlayer(pId)}
                    {#if p}
                      <div class="player-pill">
                        <span class="p-name">{p.name}</span>
                        <SkillBadge skill={p.skill} compact={true} />
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>

              <div class="court-vs">VS</div>

              <!-- Team B -->
              <div class="team-side team-b">
                <div class="team-tag">Team B</div>
                <div class="players-column">
                  {#each match.teamB as pId}
                    {@const p = getPlayer(pId)}
                    {#if p}
                      <div class="player-pill">
                        <span class="p-name">{p.name}</span>
                        <SkillBadge skill={p.skill} compact={true} />
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>
            </div>

            <!-- Court Match Actions -->
            <div class="court-match-actions">
              {#if court.status === 'ready'}
                <button
                  class="btn-primary start-match-btn"
                  onclick={() => handleStartMatch(court.id)}
                  type="button"
                >
                  ▶ Start Match
                </button>
                <button
                  class="btn-ghost cancel-match-btn"
                  onclick={() => handleCancelMatch(court.id)}
                  type="button"
                >
                  Put Back
                </button>
              {:else if court.status === 'in_use'}
                <button
                  class="btn-primary end-match-btn"
                  onclick={() => handleOpenEndModal(court)}
                  type="button"
                >
                  ✓ Finish Match
                </button>
              {/if}
            </div>
          {:else}
            <!-- Idle Court State -->
            <div class="idle-court-state">
              <span class="idle-icon">🏸</span>
              <p>Court is open</p>
              <button class="btn-ghost queue-hint-btn" onclick={onOpenQueueTab} type="button">
                Tap Magic Wand in Queue to assign →
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<EndMatchModal
  court={endingCourt}
  isOpen={isEndModalOpen}
  onClose={() => {
    isEndModalOpen = false;
    endingCourt = null;
  }}
/>

<style>
  .courts-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .courts-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .court-header-title {
    display: flex;
    flex-direction: column;
  }

  .court-sub {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .add-court-btn {
    padding: 8px 14px;
    font-size: 13px;
    border-radius: var(--radius-md);
  }

  .courts-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .court-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: var(--gradient-court);
    border: 1px solid var(--border-subtle);
    transition: all 0.2s ease;
  }

  .court-card.in_use {
    border-color: rgba(16, 185, 129, 0.4);
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.12);
  }

  .court-card.ready {
    border-color: rgba(245, 158, 11, 0.35);
  }

  .court-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .court-title-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .court-number {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .court-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: var(--radius-full);
  }

  .court-status-badge.in-use {
    background: rgba(16, 185, 129, 0.15);
    color: var(--accent-emerald);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .court-status-badge.ready {
    background: rgba(245, 158, 11, 0.15);
    color: var(--accent-amber);
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .court-status-badge.idle {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-muted);
  }

  .court-header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .court-timer {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 14px;
    font-weight: 700;
    color: var(--accent-emerald);
    background: rgba(16, 185, 129, 0.12);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
  }

  .remove-court-btn {
    color: var(--text-muted);
    font-size: 12px;
    padding: 4px 6px;
    border-radius: var(--radius-sm);
  }

  .remove-court-btn:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }

  .remove-court-btn:not(:disabled):hover {
    color: #fb7185;
    background: rgba(244, 63, 94, 0.1);
  }

  .match-content {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 10px;
    align-items: center;
  }

  .team-side {
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-md);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .team-tag {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .players-column {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .player-pill {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    padding: 5px 8px;
    border-radius: var(--radius-sm);
  }

  .p-name {
    font-size: 13px;
    font-weight: 600;
  }

  .court-vs {
    font-size: 11px;
    font-weight: 800;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.05);
    padding: 4px;
    border-radius: var(--radius-sm);
  }

  .court-match-actions {
    display: flex;
    gap: 8px;
  }

  .start-match-btn {
    flex: 1;
    padding: 11px;
    font-size: 14px;
  }

  .cancel-match-btn {
    font-size: 12px;
  }

  .end-match-btn {
    width: 100%;
    padding: 12px;
    font-size: 14px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
  }

  .idle-court-state {
    text-align: center;
    padding: 20px 10px;
    color: var(--text-secondary);
  }

  .idle-icon {
    font-size: 28px;
    opacity: 0.5;
    margin-bottom: 4px;
    display: inline-block;
  }

  .queue-hint-btn {
    font-size: 12px;
    color: var(--accent-cyan);
    margin-top: 6px;
  }
</style>
