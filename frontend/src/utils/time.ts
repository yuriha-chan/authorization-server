/** @format */

export const timeAgo = (ts: string | number | Date): string => {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
};

export const expiryLabel = (ms?: number): string => {
  if (!ms) return 'Never';
  const d = ms - Date.now();
  if (d < 0) return 'Expired';
  const days = Math.floor(d / 86400000);
  if (days === 0) return 'Today';
  return `${days}d`;
};

export const stateColor = (s?: string): string => {
  if (s === 'active' || s === 'approved') return 'green';
  if (s === 'expired' || s === 'revoked' || s === 'denied') return 'red';
  if (s === 'pending') return 'yellow';
  return 'gray';
};

export const formatDuration = (ms?: number): string => {
  if (!ms) return 'Never';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} days`;
  return `${hours} hours`;
};
