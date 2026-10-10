<script lang="ts">
  import { sessionStore } from '../state/session.svelte';
  import { SPORT_DEFAULTS } from '../constants';
  import SkillBadge from '../components/SkillBadge.svelte';

  let currency = $derived(sessionStore.session?.settings.currency || '₱');
  let sport = $derived(sessionStore.session?.sport || 'badminton');
  let defaults = $derived(SPORT_DEFAULTS[sport]);

  let hourlyRate = $state(sessionStore.session?.costs.hourlyRate || 250);
  let totalCourtHours = $state(sessionStore.session?.costs.totalCourtHours || 0);
  let shuttleCost = $state(sessionStore.session?.costs.shuttleUnitCost || 90);
  let shuttlesUsed = $state(sessionStore.session?.costs.shuttlesUsed || 0);

  // Synchronize internal state whenever session costs change
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

  let costSummary = $derived(sessionStore.getCostSummary());

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
  <!-- Top Title Bar -->
  <div class="costs-header">
    <div>
      <h2>Session Costs & Splitting</h2>
      <p class="costs-sub">Transparent expense calculator & payment settlement</p>
    </div>
  </div>

  <!-- Cost Calculator Controls Card -->
  <div class="glass-card fee-calculator-card">
    <div class="card-section-label">Session Expense Inputs</div>

    <div class="inputs-grid">
      <!-- Hourly Rate -->
      <div class="input-field">
        <label for="court-hourly-rate">Court Hourly Rate ({currency})</label>
        <input
          id="court-hourly-rate"
          type="number"
          min="0"
          step="10"
          bind:value={hourlyRate}
          onchange={saveCosts}
        />
      </div>

      <!-- Total Hours (Decimal supported) -->
      <div class="input-field">
        <label for="total-court-hours">Total Court Hours (e.g. 2.5)</label>
        <input
          id="total-court-hours"
          type="number"
          min="0"
          step="0.25"
          bind:value={totalCourtHours}
          onchange={saveCosts}
        />
      </div>

      <!-- Equipment Unit Cost -->
      <div class="input-field">
        <label for="equipment-unit-cost">{defaults.equipmentName} Unit Cost ({currency})</label>
        <input
          id="equipment-unit-cost"
          type="number"
          min="0"
          step="5"
          bind:value={shuttleCost}
          onchange={saveCosts}
        />
      </div>

      <!-- Equipment Used Stepper -->
      <div class="input-field">
        <span class="label-text">{defaults.equipmentName}s Used</span>
        <div class="stepper-box">
          <button class="step-btn" onclick={() => adjustShuttles(-1)} type="button">-</button>
          <input
            id="shuttles-used-input"
            class="stepper-input"
            type="number"
            min="0"
            aria-label="Shuttlecocks used"
            bind:value={shuttlesUsed}
            onchange={saveCosts}
          />
          <button class="step-btn" onclick={() => adjustShuttles(1)} type="button">+</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Grand Total Summary Card -->
  {#if costSummary}
    <div class="glass-card summary-card">
      <div class="summary-top">
        <div class="summary-breakdown-row">
          <div class="breakdown-item">
            <span class="bd-label">Court Total:</span>
            <span class="bd-val">{currency}{costSummary.courtTotal.toFixed(2)}</span>
          </div>
          <div class="breakdown-item">
            <span class="bd-label">{defaults.equipmentName} Total:</span>
            <span class="bd-val">{currency}{costSummary.equipmentTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="grand-total-row">
          <span class="gt-label">Grand Total</span>
          <span class="gt-val">{currency}{costSummary.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <!-- Per-player Split Banner -->
      <div class="split-banner">
        <div class="split-info">
          <span class="split-label">Standard Split / Attendee</span>
          <span class="split-sub">Split equally across {costSummary.totalAttendees} players</span>
        </div>
        <div class="split-amount">
          {currency}{costSummary.standardPerPlayer.toFixed(2)}
        </div>
      </div>

      <!-- Collection Progress Bar -->
      <div class="collection-progress">
        <div class="progress-labels">
          <span class="prog-col">Collected: {currency}{costSummary.totalCollected.toFixed(2)}</span>
          <span class="prog-rem">Remaining: {currency}{costSummary.totalOutstanding.toFixed(2)}</span>
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

  <!-- Player Payments Roster -->
  <div class="section-group">
    <div class="section-header">
      <h4>Player Payments ({sessionStore.session?.players.length || 0})</h4>
      <span class="section-sub">Tap status to toggle Paid / Unpaid</span>
    </div>

    {#if !sessionStore.session || sessionStore.session.players.length === 0}
      <div class="empty-state glass-card">
        <p>No players in session yet. Add players in the Players tab to split costs.</p>
      </div>
    {:else}
      <div class="payments-list">
        {#each sessionStore.session.players as player (player.id)}
          {@const pBreakdown = costSummary?.breakdown.find(b => b.playerId === player.id)}
          <div class="payment-card glass-card {player.payment.paid ? 'is-paid' : 'is-unpaid'}">
            <div class="payment-card-left">
              <div class="p-name-row">
                <span class="p-name">{player.name}</span>
                <SkillBadge skill={player.skill} compact={true} />
              </div>

              <!-- Amount Due & Custom Override Info -->
              <div class="amount-line">
                {#if editingCustomPlayerId === player.id}
                  <div class="inline-edit-custom">
                    <input
                      class="custom-amt-input"
                      type="number"
                      placeholder="0"
                      step="1"
                      bind:value={customInputVal}
                    />
                    <button class="btn-primary save-custom-btn" onclick={() => saveCustom(player.id)} type="button">✓</button>
                    <button class="btn-ghost reset-custom-btn" onclick={() => clearCustom(player.id)} type="button">Reset</button>
                  </div>
                {:else}
                  <span class="amt-due">
                    {currency}{(pBreakdown?.amountDue || 0).toFixed(2)}
                  </span>
                  {#if player.payment.customAmount !== null}
                    <span class="custom-badge" title="Manual override">Custom</span>
                  {/if}
                  <button
                    class="btn-ghost edit-custom-btn"
                    onclick={() => startEditCustom(player.id, player.payment.customAmount)}
                    type="button"
                    title="Set custom amount (e.g. 0 for guest)"
                  >
                    ✏️
                  </button>
                {/if}
              </div>
            </div>

            <!-- Paid / Unpaid Toggle Button -->
            <button
              class="pay-toggle-btn {player.payment.paid ? 'paid' : 'unpaid'}"
              onclick={() => sessionStore.togglePlayerPaid(player.id)}
              type="button"
            >
              {#if player.payment.paid}
                <span class="check-icon">✓</span> Paid
              {:else}
                <span class="cross-icon">✕</span> Unpaid
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
    gap: 16px;
  }

  .costs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .costs-sub {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .fee-calculator-card {
    padding: 16px;
  }

  .card-section-label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  .inputs-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .input-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .input-field label, .input-field .label-text {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .stepper-box {
    display: flex;
    align-items: center;
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .step-btn {
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.06);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .step-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .stepper-input {
    flex: 1;
    border: none;
    background: transparent;
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    padding: 8px 4px;
    width: 40px;
  }

  .summary-card {
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%);
    border-color: rgba(56, 189, 248, 0.25);
  }

  .summary-top {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .summary-breakdown-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .grand-total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-top: 1px solid var(--border-subtle);
    padding-top: 10px;
  }

  .gt-label {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .gt-val {
    font-size: 26px;
    font-weight: 800;
    color: var(--accent-cyan);
    font-family: var(--font-heading);
  }

  .split-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 12px 14px;
    border-radius: var(--radius-md);
  }

  .split-info {
    display: flex;
    flex-direction: column;
  }

  .split-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--accent-cyan);
  }

  .split-sub {
    font-size: 11px;
    color: var(--text-muted);
  }

  .split-amount {
    font-size: 20px;
    font-weight: 800;
    color: #fff;
  }

  .collection-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .progress-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 600;
  }

  .prog-col {
    color: var(--accent-emerald);
  }

  .prog-rem {
    color: var(--accent-amber);
  }

  .progress-track {
    height: 8px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #34d399);
    border-radius: var(--radius-full);
    transition: width 0.3s ease;
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

  .section-sub {
    font-size: 11px;
    color: var(--text-muted);
  }

  .payments-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .payment-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
  }

  .payment-card.is-paid {
    border-color: rgba(16, 185, 129, 0.25);
  }

  .payment-card-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .p-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .p-name {
    font-size: 14px;
    font-weight: 700;
  }

  .amount-line {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .amt-due {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .custom-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--accent-amber);
    background: rgba(245, 158, 11, 0.15);
    padding: 1px 6px;
    border-radius: var(--radius-full);
  }

  .edit-custom-btn {
    padding: 2px 4px;
    font-size: 12px;
  }

  .inline-edit-custom {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .custom-amt-input {
    width: 65px;
    padding: 4px 6px;
    font-size: 13px;
    text-align: center;
  }

  .save-custom-btn {
    padding: 4px 8px;
    font-size: 12px;
  }

  .reset-custom-btn {
    padding: 4px 6px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .pay-toggle-btn {
    padding: 8px 14px;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 700;
    transition: all 0.15s ease;
  }

  .pay-toggle-btn.paid {
    background: rgba(16, 185, 129, 0.15);
    color: var(--accent-emerald);
    border: 1px solid rgba(16, 185, 129, 0.35);
  }

  .pay-toggle-btn.paid:hover {
    background: rgba(16, 185, 129, 0.25);
  }

  .pay-toggle-btn.unpaid {
    background: rgba(244, 63, 94, 0.12);
    color: #fb7185;
    border: 1px solid rgba(244, 63, 94, 0.25);
  }

  .pay-toggle-btn.unpaid:hover {
    background: rgba(244, 63, 94, 0.2);
  }

  .empty-state {
    text-align: center;
    padding: 24px;
    color: var(--text-secondary);
  }
</style>
