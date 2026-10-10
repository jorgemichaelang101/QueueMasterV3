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

<span
  class="skill-badge"
  style="color: {info.color}; background-color: {info.bgTint}; border: 1px solid {info.color}40;"
>
  {compact ? info.shortLabel : info.label}
</span>

<style>
  .skill-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 9999px;
    letter-spacing: 0.02em;
    white-space: nowrap;
    text-transform: uppercase;
  }
</style>
