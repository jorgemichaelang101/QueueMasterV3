<script lang="ts">
  import { SKILL_TIERS } from '../constants';
  import type { SkillTier } from '../types';

  interface Props {
    skill: SkillTier;
    compact?: boolean;
  }

  let { skill, compact = false }: Props = $props();
  let info = $derived(SKILL_TIERS[skill] || SKILL_TIERS[1]);
</script>

<span class="skill-chip" title={info.label}>
  {compact ? info.shortLabel : info.label}
</span>

<style>
  .skill-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-xs);
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    color: var(--text-2);
    white-space: nowrap;
    flex-shrink: 0;
    line-height: 1.3;
  }
</style>
