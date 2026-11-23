<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import { SPORT_DEFAULTS } from '../constants';
  import SkillBadge from '../components/SkillBadge.svelte';
  import Icon from '../components/Icon.svelte';

  let currency = $derived(sessionStore.session?.settings.currency || '₱');
  let sport = $derived(sessionStore.session?.sport || 'badminton');
  let defaults = $derived(SPORT_DEFAULTS[sport]);

  let hourlyRate = $state(sessionStore.session?.costs.hourlyRate || 250);
  let totalCourtHours = $state(sessionStore.session?.costs.totalCourtHours || 0);
  let shuttleCost = $state(sessionStore.session?.costs.shuttleUnitCost || 90);
  let shuttlesUsed = $state(sessionStore.session?.costs.shuttlesUsed || 0);
  let showOnlyUnpaid = $state(false);

  $effect(() => {
    if (sessionStore.session) {
      hourlyRate = sessionStore.session.costs.hourlyRate;
      totalCourtHours = sessionStore.session.costs.totalCourtHours;
      shuttleCost = sessionStore.session.costs.shuttleUnitCost;
      shuttlesUsed = sessionStore.session.costs.shuttlesUsed;
    }
  });

  function saveCosts() {
    sessionStore.setCosts({
      hourlyRate: Number(hourlyRate) || 0,
      totalCourtHours: Number(totalCourtHours) || 0,
      shuttleUnitCost: Number(shuttleCost) || 0,
      shuttlesUsed: Number(shuttlesUsed) || 0,
    });
  }

  function adjustShuttles(delta: number) {
    shuttlesUsed = Math.max(0, shuttlesUsed + delta);
    saveCosts();
  }

  function adjustHours(delta: number) {
    totalCourtHours = Math.max(0, Math.round((Number(totalCourtHours) + delta) * 4) / 4);
    saveCosts();
  }

  let costSummary = $derived(sessionStore.getCostSummary());

  let unpaidCount = $derived(
    sessionStore.session?.players.filter(p => !p.payment.paid).length || 0
  );

  let displayedPlayers = $derived(() => {
    const list = sessionStore.session?.players || [];
    if (!showOnlyUnpaid) return list;
    return list.filter(p => !p.payment.paid);
  });

  let editingCustomPlayerId = $state<string | null>(null);
  let customInputVal = $state<string>('');

  function startEditCustom(playerId: string, currentVal: number | null) {
    editingCustomPlayerId = playerId;
    customInputVal = currentVal !== null ? String(currentVal) : '';
  }

  function saveCustom(playerId: string) {
    const val = customInputVal.trim() === '' ? null : parseFloat(customInputVal);
    sessionStore.setPlayerCustomAmount(playerId, val);
    editingCustomPlayerId = null;
  }

  function clearCustom(playerId: string) {
    sessionStore.setPlayerCustomAmount(playerId, null);
    editingCustomPlayerId = null;
  }
</script>

<div class="costs-view">
  <!-- Per-Head Split & Grand Total Summary Card -->
  {#if costSummary}
    <div class="surface-card summary-card">
      <div class="split-hero">
        <div class="split-info">
          <span class="split-overline">Standard Split / Player</span>
          <span class="split-sub">Across {costSummary.totalAttendees} attendees</span>
        </div>
        <div class="split-amount tabular-nums">
          {currency}{costSummary.standardPerPlayer.toFixed(2)}
        </div>
      </div>

      <div class="summary-breakdown tabular-nums">
        <div class="bd-item">
          <span class="bd-label">Court ({totalCourtHours}h)</span>
          <span class="bd-val">{currency}{costSummary.courtTotal.toFixed(2)}</span>
        </div>
        <div class="bd-item">
          <span class="bd-label">{defaults.equipmentName}s ({shuttlesUsed})</span>
          <span class="bd-val">{currency}{costSummary.equipmentTotal.toFixed(2)}</span>
        </div>
        <div class="bd-item total">
          <span class="bd-label">Grand Total</span>
          <span class="bd-val">{currency}{costSummary.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <!-- Collection Progress Bar -->
      <div class="collection-progress">
        <div class="progress-labels tabular-nums">
          <span class="prog-col">Collected: {currency}{costSummary.totalCollected.toFixed(2)}</span>
          <span class="prog-rem">Unpaid: {currency}{costSummary.totalOutstanding.toFixed(2)}</span>
        </div>
        <div class="progress-track">
          <div
            class="progress-fill"
            style="width: {costSummary.grandTotal > 0 ? Math.min(100, (costSummary.totalCollected / costSummary.grandTotal) * 100) : 0}%;"
          ></div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Expense Inputs Card -->
  <div class="surface-card fee-calculator-card">
    <div class="card-section-label">Expense Calculator</div>

    <div class="inputs-grid">
      <div class="input-field">
        <label for="court-hourly-rate">Court Rate / Hr ({currency})</label>
        <input
          id="court-hourly-rate"
          class="tabular-nums"
          type="number"
          min="0"
          step="10"
          bind:value={hourlyRate}
          onchange={saveCosts}
        />
      </div>

      <div class="input-field">
        <span class="label-text">Total Court Hours</span>
        <div class="stepper-box">
          <button
            class="step-btn"
            onclick={() => adjustHours(-0.5)}
            type="button"
            aria-label="Decrease court hours"
          >
            <Icon name="minus" size={16} />
          </button>
          <input
            id="total-court-hours"
            class="stepper-input tabular-nums"
            type="number"
            min="0"
            step="0.25"
            aria-label="Total court hours"
            bind:value={totalCourtHours}
            onchange={saveCosts}
          />
          <button
            class="step-btn"
            onclick={() => adjustHours(0.5)}
            type="button"
            aria-label="Increase court hours"
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>

      <div class="input-field">
        <label for="equipment-unit-cost">{defaults.equipmentName} Cost ({currency})</label>
        <input
          id="equipment-unit-cost"
          class="tabular-nums"
          type="number"
          min="0"
          step="5"
          bind:value={shuttleCost}
          onchange={saveCosts}
        />
      </div>

      <div class="input-field">
        <span class="label-text">{defaults.equipmentName}s Used</span>
        <div class="stepper-box">
          <button
            class="step-btn"
            onclick={() => adjustShuttles(-1)}
            type="button"
            aria-label="Decrease {defaults.equipmentName}s used"
          >
            <Icon name="minus" size={16} />
          </button>
          <input
            id="shuttles-used-input"
            class="stepper-input tabular-nums"
            type="number"
            min="0"
            aria-label="{defaults.equipmentName}s used"
            bind:value={shuttlesUsed}
            onchange={saveCosts}
          />
          <button
            class="step-btn"
            onclick={() => adjustShuttles(1)}
            type="button"
            aria-label="Increase {defaults.equipmentName}s used"
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Player Payments Roster -->
  <div class="section-group">
    <div class="section-header">
      <h3>Payments ({sessionStore.session?.players.length || 0})</h3>

      {#if (sessionStore.session?.players.length || 0) > 0}
        <button
          class="filter-chip {showOnlyUnpaid ? 'active' : ''}"
          onclick={() => (showOnlyUnpaid = !showOnlyUnpaid)}
          type="button"
        >
          Unpaid only ({unpaidCount})
        </button>
      {/if}
    </div>

    {#if !sessionStore.session || sessionStore.session.players.length === 0}
      <div class="empty-state surface-card">
        <p>No players in session yet. Add players in the Players tab to split costs.</p>
      </div>
    {:else if displayedPlayers().length === 0}
      <div class="empty-state surface-card">
        <p>All players are marked as paid.</p>
      </div>
    {:else}
      <div class="payments-list">
        {#each displayedPlayers() as player (player.id)}
          {@const pBreakdown = costSummary?.breakdown.find(b => b.playerId === player.id)}
          <div class="payment-card surface-card {player.payment.paid ? 'is-paid' : 'is-unpaid'}">
            <div class="payment-card-left">
              <div class="p-name-row">
                <span class="p-name">{player.name}</span>
                <SkillBadge skill={player.skill} compact={true} />
              </div>

              <div class="amount-line">
                {#if editingCustomPlayerId === player.id}
                  <div class="inline-edit-custom">
                    <input
                      class="custom-amt-input tabular-nums"
                      type="number"
                      placeholder="0"
                      step="1"
                      aria-label="Custom payment amount for {player.name}"
                      bind:value={customInputVal}
                    />
                    <button
                      class="btn-primary save-custom-btn"
                      onclick={() => saveCustom(player.id)}
                      type="button"
                      aria-label="Save custom amount"
                    >
                      <Icon name="check" size={16} />
                    </button>
                    <button
                      class="btn-ghost reset-custom-btn"
                      onclick={() => clearCustom(player.id)}
                      type="button"
                    >
                      Reset
                    </button>
                  </div>
                {:else}
                  <span class="amt-due tabular-nums">
                    {currency}{(pBreakdown?.amountDue || 0).toFixed(2)}
                  </span>
                  {#if player.payment.customAmount !== null}
                    <span class="custom-badge">Custom</span>
                  {/if}
                  <button
                    class="btn-ghost edit-custom-btn"
                    onclick={() => startEditCustom(player.id, player.payment.customAmount)}
                    type="button"
                    aria-label="Edit custom amount for {player.name}"
                  >
                    <Icon name="edit" size={14} />
                    <span>Override</span>
                  </button>
                {/if}
              </div>
            </div>

            <button
              class="pay-toggle-btn {player.payment.paid ? 'paid' : 'unpaid'}"
              onclick={() => sessionStore.togglePlayerPaid(player.id)}
              type="button"
            >
              {#if player.payment.paid}
                <Icon name="check" size={16} />
                Paid
              {:else}
                Mark Paid
              {/if}
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .costs-view {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }

  .summary-card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }

  .split-hero {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--c-action-tint);
    border: 1px solid var(--c-action-border);
    padding: var(--sp-3) var(--sp-4);
    border-radius: var(--radius-md);
  }

  .split-info {
    display: flex;
    flex-direction: column;
  }

  .split-overline {
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--c-action);
  }

  .split-sub {
    font-size: var(--fs-xs);
    color: var(--text-2);
  }

  .split-amount {
    font-size: var(--fs-2xl);
    font-weight: 800;
    color: var(--text-1);
    font-family: var(--font-heading);
    line-height: 1;
  }

  .summary-breakdown {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--sp-2);
    border-top: 1px solid var(--border-subtle);
    padding-top: var(--sp-3);
  }

  .bd-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .bd-label {
    font-size: var(--fs-xs);
    color: var(--text-3);
  }

  .bd-val {
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text-1);
  }

  .bd-item.total .bd-val {
    color: var(--c-action);
  }

  .collection-progress {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }

  .progress-labels {
    display: flex;
    justify-content: space-between;
    font-size: var(--fs-xs);
    font-weight: 700;
  }

  .prog-col {
    color: var(--c-playing);
  }

  .prog-rem {
    color: var(--c-ready);
  }

  .progress-track {
    height: 8px;
    background: var(--bg-subtle);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--c-playing);
    border-radius: var(--radius-full);
    transition: width 0.25s ease;
  }

  .fee-calculator-card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .card-section-label {
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-2);
  }

  .inputs-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-3);
  }

  @media (max-width: 360px) {
    .inputs-grid {
      grid-template-columns: 1fr;
    }
  }

  .input-field {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    min-width: 0;
  }

  .input-field label,
  .input-field .label-text {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-2);
  }

  .input-field > input {
    width: 100%;
  }

  .stepper-box {
    display: flex;
    align-items: center;
    background: var(--bg-input);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .step-btn {
    width: var(--tap-min);
    min-height: var(--tap-min);
    padding: 0;
    background: var(--bg-subtle);
    color: var(--text-1);
    flex-shrink: 0;
  }

  .step-btn:hover {
    background: var(--bg-subtle-hover);
  }

  .stepper-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    text-align: center;
    font-size: var(--fs-md);
    font-weight: 700;
    padding: 0 var(--sp-1);
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .stepper-input::-webkit-outer-spin-button,
  .stepper-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .section-group {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-header h3 {
    font-size: var(--fs-lg);
  }

  .filter-chip {
    min-height: 36px;
    padding: var(--sp-1) var(--sp-3);
    border-radius: var(--radius-full);
    font-size: var(--fs-xs);
    font-weight: 700;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    color: var(--text-2);
  }

  .filter-chip.active {
    background: var(--c-ready-tint);
    border-color: var(--c-ready-border);
    color: var(--c-ready);
  }

  .payments-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .payment-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--sp-3);
    gap: var(--sp-2);
  }

  .payment-card.is-paid {
    border-color: var(--c-playing-border);
  }

  .payment-card-left {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    min-width: 0;
  }

  .p-name-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .p-name {
    font-size: var(--fs-md);
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .amount-line {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-wrap: wrap;
  }

  .amt-due {
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text-1);
  }

  .custom-badge {
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--c-ready);
    background: var(--c-ready-tint);
    padding: 2px var(--sp-2);
    border-radius: var(--radius-full);
  }

  .edit-custom-btn {
    min-height: 32px;
    padding: 2px var(--sp-2);
    font-size: var(--fs-xs);
    gap: 4px;
    color: var(--text-3);
  }

  .inline-edit-custom {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
  }

  .custom-amt-input {
    width: 84px;
    min-height: 38px;
    padding: var(--sp-1) var(--sp-2);
    font-size: var(--fs-sm);
    text-align: center;
  }

  .save-custom-btn {
    min-height: 38px;
    padding: var(--sp-1) var(--sp-2);
  }

  .reset-custom-btn {
    min-height: 38px;
    padding: var(--sp-1) var(--sp-2);
    font-size: var(--fs-xs);
  }

  .pay-toggle-btn {
    min-height: var(--tap-min);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    font-weight: 700;
    flex-shrink: 0;
  }

  .pay-toggle-btn.paid {
    background: var(--c-playing-tint);
    color: var(--c-playing);
    border: 1px solid var(--c-playing-border);
  }

  .pay-toggle-btn.unpaid {
    background: var(--bg-subtle);
    color: var(--text-1);
    border: 1px solid var(--border-strong);
  }

  .empty-state {
    text-align: center;
    padding: var(--sp-5);
    color: var(--text-2);
  }
</style>
