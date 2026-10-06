export function formatTime(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatClock(startedAt: number, limitSec: number, now: number): {
  remaining: number;
  overtime: boolean;
} {
  const remaining = Math.ceil(limitSec - (now - startedAt) / 1000);
  return { remaining: Math.abs(remaining), overtime: remaining < 0 };
}
