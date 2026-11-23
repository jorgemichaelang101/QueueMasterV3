<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import { uiStore } from '../state/ui.svelte';
  import type { Court, Player, Match } from '../types';
  import { formatElapsed, formatWaitMinutes } from '../engine/time';
  import SkillBadge from '../components/SkillBadge.svelte';
  import Icon from '../components/Icon.svelte';
  import EndMatchModal from '../components/EndMatchModal.svelte';
  import WandModal from '../components/WandModal.svelte';
  import ManualMatchModal from '../components/ManualMatchModal.svelte';
  import ActionMenu, { type ActionMenuItem } from '../components/ActionMenu.svelte';
  import ConfirmSheet from '../components/ConfirmSheet.svelte';

  interface Props {
    onOpenPlayersTab?: () => void;
  }

  let { onOpenPlayersTab }: Props = $props();

  let endingCourt = $state<Court | null>(null);
  let isEndModalOpen = $state(false);
  let isWandModalOpen = $state(false);
  let isManualModalOpen = $state(false);
  let editingMatch = $state<Match | null>(null);

  // Compact mode for 4+ courts: track which court IDs are manually expanded/collapsed
  let expandedCourts = $state<Record<string, boolean>>({});
  let isManyCourts = $derived((sessionStore.session?.courts.length || 0) >= 4);

  function isCourtExpanded(court: Court): boolean {
    if (!isManyCourts) return true;
    if (court.id in expandedCourts) return expandedCourts[court.id];
    // By default in 4+ court mode, keep 'ready' courts expanded so the QM notices them, collapse others
    return court.status === 'ready';
  }

  function toggleCourtExpand(court: Court) {
    expandedCourts[court.id] = !isCourtExpanded(court);
  }

  // ActionMenu state
  let menuState = $state<{
    title: string;
    subtitle?: string;
    items: ActionMenuItem[];
  } | null>(null);

  // ConfirmSheet state (for removing a court)
  let courtToRemove = $state<Court | null>(null);

  // Live timer interval
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

  function formatTeamNames(playerIds: string[]): string {
    return playerIds
      .map(id => getPlayer(id)?.name || 'Unknown')
      .join(' / ');
  }

  let availablePlayers = $derived(() => {
    return sessionStore.getAvailablePlayers().sort((a, b) => a.waitingSince - b.waitingSince);
  });

  let busyCourtsCount = $derived(
    sessionStore.session?.courts.filter(c => c.status === 'in_use').length || 0
  );

  function handleStartMatch(courtId: string) {
    sessionStore.startMatch(courtId);
  }

  function handleOpenEndModal(court: Court) {
    endingCourt = court;
    isEndModalOpen = true;
  }

  function handleCancelCourtMatch(court: Court) {
    if (!court.match) return;
    const savedTeamA = [...court.match.teamA];
    const savedTeamB = [...court.match.teamB];
    sessionStore.cancelMatch(court.id);
    uiStore.showToast(`Court ${court.courtNumber} match returned to pool`, () => {
      sessionStore.addManualMatch(savedTeamA, savedTeamB);
    });
  }

  function handleAddCourt() {
    sessionStore.addCourt();
  }

  function openCourtMenu(court: Court) {
    const items: ActionMenuItem[] = [];
    if (isManyCourts) {
      items.push({
        label: isCourtExpanded(court) ? 'Collapse Court Card' : 'Expand Court Card',
        icon: isCourtExpanded(court) ? 'chevron-up' : 'chevron-down',
        onSelect: () => toggleCourtExpand(court),
      });
    }
    if (court.status === 'ready') {
      items.push({
        label: 'Put Players Back in Pool',
        icon: 'undo',
        onSelect: () => handleCancelCourtMatch(court),
      });
    }
    items.push({
      label: `Remove Court ${court.courtNumber}`,
      icon: 'trash',
      variant: 'danger',
      disabled: court.status === 'in_use',
      onSelect: () => {
        courtToRemove = court;
      },
    });

    menuState = {
      title: `Court ${court.courtNumber}`,
      subtitle:
        court.status === 'in_use'
          ? 'Finish the active match before removing this court'
          : undefined,
      items,
    };
  }

  function openNextUpMenu(match: Match, idx: number, total: number) {
    const items: ActionMenuItem[] = [
      {
        label: 'Edit Match Players',
        icon: 'edit',
        onSelect: () => {
          editingMatch = match;
          isManualModalOpen = true;
        },
      },
      {
        label: 'Move Up in Line',
        icon: 'arrow-up',
        disabled: idx === 0,
        onSelect: () => sessionStore.moveNextUp(idx, 'up'),
      },
      {
        label: 'Move Down in Line',
        icon: 'arrow-down',
        disabled: idx >= total - 1,
        onSelect: () => sessionStore.moveNextUp(idx, 'down'),
      },
      {
        label: 'Cancel Queued Match',
        icon: 'trash',
        variant: 'danger',
        onSelect: () => {
          const savedTeamA = [...match.teamA];
          const savedTeamB = [...match.teamB];
          sessionStore.removeFromNextUp(match.id);
          uiStore.showToast(`Match #${idx + 1} cancelled`, () => {
            sessionStore.addManualMatch(savedTeamA, savedTeamB);
          });
        },
      },
    ];

    menuState = {
      title: `Next Up #${idx + 1}`,
      subtitle: `${formatTeamNames(match.teamA)} vs ${formatTeamNames(match.teamB)}`,
      items,
    };
  }

  function openWaitingPlayerMenu(player: Player) {
    menuState = {
      title: player.name,
      subtitle: `Waiting ${formatWaitMinutes(player.waitingSince, now)} · ${player.gamesPlayed} games`,
      items: [
        {
          label: 'Sit Out Player',
          icon: 'pause-circle',
          onSelect: () => {
            sessionStore.toggleSitOut(player.id);
            uiStore.showToast(`${player.name} is sitting out`, () => {
              sessionStore.toggleSitOut(player.id);
            });
          },
        },
      ],
    };
  }

  function handleOpenManualBuilder() {
    editingMatch = null;
    isManualModalOpen = true;
  }
</script>

<div class="live-view">
  <!-- COURTS SECTION -->
  <section class="live-section" aria-label="Courts">
    <div class="section-bar">
      <div class="section-title-group">
        <h2>Courts</h2>
        <span class="section-meta tabular-nums">
          {busyCourtsCount}/{sessionStore.session?.courts.length || 0} playing
        </span>
      </div>

      {#if isManyCourts}
        <span class="compact-hint">Tap court to expand</span>
      {/if}
    </div>

    {#if !sessionStore.session || sessionStore.session.courts.length === 0}
      <div class="empty-card surface-card">
        <p>No courts configured yet.</p>
        <button class="btn-secondary" onclick={handleAddCourt} type="button">
          <Icon name="plus" size={18} />
          Add Court
        </button>
      </div>
    {:else}
      <div class="courts-list">
        {#each sessionStore.session.courts as court (court.id)}
          {@const expanded = isCourtExpanded(court)}
          <div class="court-card surface-card status-{court.status}">
            <!-- Court Header Row (Tappable in 4+ court mode to expand/collapse) -->
            <div class="court-header">
              {#if isManyCourts}
                <button
                  class="court-collapse-trigger"
                  onclick={() => toggleCourtExpand(court)}
                  type="button"
                  aria-expanded={expanded}
                >
                  <span class="court-number">Court {court.courtNumber}</span>
                  {#if court.status === 'in_use'}
                    <span class="status-pill playing">
                      <span class="live-pulse"></span>
                      Playing
                    </span>
                  {:else if court.status === 'ready'}
                    <span class="status-pill ready">Ready</span>
                  {:else}
                    <span class="status-pill open">Open</span>
                  {/if}

                  {#if !expanded && court.match}
                    <span class="compact-match-summary">
                      {formatTeamNames(court.match.teamA)} vs {formatTeamNames(court.match.teamB)}
                    </span>
                  {/if}
                </button>
              {:else}
                <div class="court-title-group">
                  <span class="court-number">Court {court.courtNumber}</span>
                  {#if court.status === 'in_use'}
                    <span class="status-pill playing">
                      <span class="live-pulse"></span>
                      Playing
                    </span>
                  {:else if court.status === 'ready'}
                    <span class="status-pill ready">Ready</span>
                  {:else}
                    <span class="status-pill open">Open</span>
                  {/if}
                </div>
              {/if}

              <div class="court-header-right">
                {#if court.status === 'in_use' && court.match?.startedAt}
                  <div class="court-timer tabular-nums" title="Elapsed match time">
                    <Icon name="clock" size={14} />
                    <span>{formatElapsed(court.match.startedAt, now)}</span>
                  </div>
                {/if}

                <button
                  class="icon-menu-btn"
                  onclick={() => openCourtMenu(court)}
                  type="button"
                  aria-label="Court {court.courtNumber} options"
                >
                  <Icon name="more-vertical" size={18} />
                </button>
              </div>
            </div>

            {#if expanded}
              {#if court.match}
                {@const match = court.match}
                <div class="match-teams">
                  <!-- Team A -->
                  <div class="team-box">
                    <span class="team-tag">Team A</span>
                    <div class="team-roster">
                      {#each match.teamA as pId}
                        {@const p = getPlayer(pId)}
                        {#if p}
                          <div class="player-slot">
                            <span class="p-name">{p.name}</span>
                            <SkillBadge skill={p.skill} compact={true} />
                          </div>
                        {/if}
                      {/each}
                    </div>
                  </div>

                  <div class="vs-badge" aria-hidden="true">VS</div>

                  <!-- Team B -->
                  <div class="team-box">
                    <span class="team-tag">Team B</span>
                    <div class="team-roster">
                      {#each match.teamB as pId}
                        {@const p = getPlayer(pId)}
                        {#if p}
                          <div class="player-slot">
                            <span class="p-name">{p.name}</span>
                            <SkillBadge skill={p.skill} compact={true} />
                          </div>
                        {/if}
                      {/each}
                    </div>
                  </div>
                </div>

                <!-- Primary Court Actions -->
                <div class="court-actions">
                  {#if court.status === 'ready'}
                    <button
                      class="btn-primary start-match-btn"
                      onclick={() => handleStartMatch(court.id)}
                      type="button"
                    >
                      <Icon name="play" size={16} />
                      Start Match
                    </button>
                    <button
                      class="btn-secondary put-back-btn"
                      onclick={() => handleCancelCourtMatch(court)}
                      type="button"
                    >
                      Put Back
                    </button>
                  {:else if court.status === 'in_use'}
                    <button
                      class="btn-primary finish-match-btn"
                      onclick={() => handleOpenEndModal(court)}
                      type="button"
                    >
                      <Icon name="check" size={18} />
                      Finish Match
                    </button>
                  {/if}
                </div>
              {:else}
                <!-- Open Court Direct CTA -->
                <div class="open-court-body">
                  <span class="open-court-text">No match assigned</span>
                  <button
                    class="btn-secondary make-match-btn"
                    onclick={() => (isWandModalOpen = true)}
                    type="button"
                  >
                    <Icon name="sparkles" size={16} />
                    Make a Match
                  </button>
                </div>
              {/if}
            {/if}
          </div>
        {/each}
      </div>

      <button class="btn-ghost add-court-inline" onclick={handleAddCourt} type="button">
        <Icon name="plus" size={16} />
        Add Court
      </button>
    {/if}
  </section>

  <!-- NEXT UP SECTION -->
  <section class="live-section" aria-label="Next Up Queue">
    <div class="section-bar">
      <div class="section-title-group">
        <h3>Next Up ({sessionStore.session?.nextUp.length || 0})</h3>
      </div>
      <span class="section-hint">Auto-fills open courts</span>
    </div>

    {#if !sessionStore.session || sessionStore.session.nextUp.length === 0}
      <div class="empty-inline surface-card">
        <span>No matches pre-queued. Use Magic Wand or Manual below.</span>
      </div>
    {:else}
      <div class="nextup-list">
        {#each sessionStore.session.nextUp as match, idx (match.id)}
          <div class="nextup-card surface-card">
            <div class="nextup-top">
              <span class="nextup-num tabular-nums">#{idx + 1}</span>
              <div class="nextup-matchup">
                <div class="nextup-side">
                  {#each match.teamA as pId}
                    {@const p = getPlayer(pId)}
                    {#if p}
                      <div class="nextup-player">
                        <span class="p-name">{p.name}</span>
                        <SkillBadge skill={p.skill} compact={true} />
                      </div>
                    {/if}
                  {/each}
                </div>

                <span class="vs-inline">vs</span>

                <div class="nextup-side">
                  {#each match.teamB as pId}
                    {@const p = getPlayer(pId)}
                    {#if p}
                      <div class="nextup-player">
                        <span class="p-name">{p.name}</span>
                        <SkillBadge skill={p.skill} compact={true} />
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>

              <button
                class="icon-menu-btn"
                onclick={() => openNextUpMenu(match, idx, sessionStore.session?.nextUp.length || 0)}
                type="button"
                aria-label="Options for queued match #{idx + 1}"
              >
                <Icon name="more-vertical" size={18} />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- WAITING POOL SECTION -->
  <section class="live-section" aria-label="Waiting Players">
    <div class="section-bar">
      <div class="section-title-group">
        <h3>Waiting ({availablePlayers().length})</h3>
      </div>
      <span class="section-hint">Longest wait first</span>
    </div>

    {#if availablePlayers().length === 0}
      <div class="empty-card surface-card">
        <p>No players waiting in the pool.</p>
        {#if onOpenPlayersTab}
          <button class="btn-secondary" onclick={onOpenPlayersTab} type="button">
            <Icon name="users" size={16} />
            Go to Players
          </button>
        {/if}
      </div>
    {:else}
      <div class="waiting-list">
        {#each availablePlayers() as p (p.id)}
          <div class="waiting-row surface-card">
            <div class="waiting-main">
              <span class="p-name">{p.name}</span>
              <SkillBadge skill={p.skill} compact={true} />
            </div>

            <div class="waiting-right">
              <span class="wait-meta tabular-nums">
                <Icon name="clock" size={13} />
                {formatWaitMinutes(p.waitingSince, now)}
              </span>
              <span class="games-meta tabular-nums">
                {p.gamesPlayed}G
              </span>
              <button
                class="icon-menu-btn"
                onclick={() => openWaitingPlayerMenu(p)}
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
  </section>

  <!-- STICKY BOTTOM ACTION BAR (In Thumb Zone) -->
  <div class="sticky-matchmaker-bar">
    <div class="sticky-bar-inner">
      <button
        class="wand-btn sticky-wand-btn"
        onclick={() => (isWandModalOpen = true)}
        type="button"
      >
        <Icon name="sparkles" size={18} />
        Magic Wand
      </button>

      <button
        class="btn-secondary sticky-manual-btn"
        onclick={handleOpenManualBuilder}
        type="button"
      >
        <Icon name="plus" size={18} />
        Manual
      </button>
    </div>
  </div>
</div>

<!-- Modals & Menus -->
<EndMatchModal
  court={endingCourt}
  isOpen={isEndModalOpen}
  onClose={() => {
    isEndModalOpen = false;
    endingCourt = null;
  }}
/>

<WandModal
  isOpen={isWandModalOpen}
  onClose={() => (isWandModalOpen = false)}
/>

<ManualMatchModal
  isOpen={isManualModalOpen}
  editingMatch={editingMatch}
  onClose={() => {
    isManualModalOpen = false;
    editingMatch = null;
  }}
/>

<ActionMenu
  isOpen={menuState !== null}
  title={menuState?.title || ''}
  subtitle={menuState?.subtitle}
  items={menuState?.items || []}
  onClose={() => (menuState = null)}
/>

<ConfirmSheet
  isOpen={courtToRemove !== null}
  title={courtToRemove ? `Remove Court ${courtToRemove.courtNumber}?` : 'Remove Court?'}
  description={courtToRemove?.status === 'ready'
    ? 'The match currently ready on this court will be returned to the waiting pool.'
    : 'You can add a court back at any time during the session.'}
  confirmLabel="Remove Court"
  variant="danger"
  onConfirm={() => {
    if (courtToRemove) {
      sessionStore.removeCourt(courtToRemove.id);
      courtToRemove = null;
    }
  }}
  onClose={() => (courtToRemove = null)}
/>

<style>
  .live-view {
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
    padding-bottom: 76px; /* Room for sticky matchmaker bar */
  }

  .live-section {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .section-bar {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--sp-2);
  }

  .section-title-group {
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
  }

  .section-title-group h2 {
    font-size: var(--fs-xl);
  }

  .section-title-group h3 {
    font-size: var(--fs-lg);
  }

  .section-meta {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-3);
  }

  .section-hint,
  .compact-hint {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-3);
  }

  /* Courts List */
  .courts-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .court-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-3) var(--sp-3) calc(var(--sp-3) + 6px);
    overflow: hidden;
  }

  /* Left State Color Bar */
  .court-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 6px;
    background: var(--c-open);
  }

  .court-card.status-in_use {
    border-color: var(--c-playing-border);
  }

  .court-card.status-in_use::before {
    background: var(--c-playing);
  }

  .court-card.status-ready {
    border-color: var(--c-ready-border);
  }

  .court-card.status-ready::before {
    background: var(--c-ready);
  }

  .court-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-2);
  }

  .court-title-group {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    min-width: 0;
  }

  .court-collapse-trigger {
    flex: 1;
    min-width: 0;
    min-height: var(--tap-min);
    justify-content: flex-start;
    padding: 0;
    text-align: left;
    gap: var(--sp-2);
  }

  .court-number {
    font-size: var(--fs-lg);
    font-weight: 700;
    font-family: var(--font-heading);
    white-space: nowrap;
  }

  .compact-match-summary {
    font-size: var(--fs-sm);
    color: var(--text-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 2px var(--sp-2);
    border-radius: var(--radius-full);
    flex-shrink: 0;
  }

  .status-pill.playing {
    background: var(--c-playing-tint);
    color: var(--c-playing);
    border: 1px solid var(--c-playing-border);
  }

  .status-pill.ready {
    background: var(--c-ready-tint);
    color: var(--c-ready);
    border: 1px solid var(--c-ready-border);
  }

  .status-pill.open {
    background: var(--c-open-tint);
    color: var(--text-3);
    border: 1px solid var(--c-open-border);
  }

  .court-header-right {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    flex-shrink: 0;
  }

  .court-timer {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--c-playing);
    background: var(--c-playing-tint);
    padding: 4px var(--sp-2);
    border-radius: var(--radius-sm);
  }

  .icon-menu-btn {
    width: var(--tap-min);
    height: var(--tap-min);
    padding: 0;
    color: var(--text-3);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .icon-menu-btn:hover {
    color: var(--text-1);
    background: var(--bg-subtle-hover);
  }

  /* Match Teams Layout */
  .match-teams {
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

  .team-tag {
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .team-roster {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }

  .player-slot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sp-2);
    min-width: 0;
  }

  .p-name {
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vs-badge {
    align-self: center;
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--text-3);
    padding: 0 2px;
  }

  .court-actions {
    display: flex;
    gap: var(--sp-2);
  }

  .start-match-btn,
  .finish-match-btn {
    flex: 1;
  }

  .put-back-btn {
    flex-shrink: 0;
  }

  .open-court-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    padding-top: var(--sp-1);
  }

  .open-court-text {
    font-size: var(--fs-sm);
    color: var(--text-3);
  }

  .make-match-btn {
    font-size: var(--fs-sm);
    font-weight: 700;
  }

  .add-court-inline {
    align-self: center;
    font-size: var(--fs-sm);
    color: var(--text-2);
  }

  /* Next Up Cards */
  .nextup-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .nextup-card {
    padding: var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-3);
  }

  .nextup-top {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .nextup-num {
    font-size: var(--fs-sm);
    font-weight: 800;
    color: var(--text-3);
    min-width: 24px;
  }

  .nextup-matchup {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: var(--sp-2);
  }

  .nextup-side {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .nextup-player {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-1);
    min-width: 0;
  }

  .vs-inline {
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--text-3);
    text-transform: uppercase;
  }

  /* Waiting List */
  .waiting-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .waiting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--sp-1) var(--sp-1) var(--sp-1) var(--sp-3);
    gap: var(--sp-2);
  }

  .waiting-main {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    min-width: 0;
    flex: 1;
  }

  .waiting-right {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-shrink: 0;
  }

  .wait-meta,
  .games-meta {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-2);
  }

  .games-meta {
    color: var(--text-3);
  }

  .empty-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-3);
    text-align: center;
    padding: var(--sp-5);
    color: var(--text-2);
  }

  .empty-inline {
    padding: var(--sp-3) var(--sp-4);
    font-size: var(--fs-sm);
    color: var(--text-3);
    text-align: center;
  }

  /* Sticky Bottom Matchmaker Bar */
  .sticky-matchmaker-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    z-index: 85;
    pointer-events: none;
    padding: 0 var(--sp-4);
  }

  .sticky-bar-inner {
    max-width: 648px;
    margin: 0 auto;
    display: flex;
    gap: var(--sp-2);
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: var(--sp-2);
    box-shadow: var(--shadow-md);
    pointer-events: auto;
  }

  .sticky-wand-btn {
    flex: 1.5;
  }

  .sticky-manual-btn {
    flex: 1;
  }
</style>

