/**
 * Timestamp-based time utilities.
 * Survives page reloads, app backgrounding, and system sleeps.
 */

export function formatElapsed(startedAtMs: number | undefined | null, nowMs = Date.now()): string {
  if (!startedAtMs) return '00:00';
  const diffSec = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatWaitMinutes(waitingSinceMs: number, nowMs = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((nowMs - waitingSinceMs) / 1000));
  const mins = Math.floor(diffSec / 60);
  if (mins < 1) return '< 1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}
