import type { ReactNode } from "react";

const drawings = {
  brand: <><path d="M3 5.5c3.5-1 6.5-.4 9 1.5 2.5-1.9 5.5-2.5 9-1.5v13c-3.5-1-6.5-.4-9 1.5-2.5-1.9-5.5-2.5-9-1.5z"/><path d="M12 7v13M7 10l2 1m6 0 2-1"/></>,
  overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/></>,
  schedule: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-14 5h3m4 0h3"/></>,
  materials: <><path d="M5 4h11a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m-2 13h14M8 8h6m-6 4h6m6-5v13"/></>,
  homework: <><rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m8 14 2 2 5-5"/></>,
  notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 6-2 7-3 8h18c-1-1-3-2-3-8m-8 11a2 2 0 0 0 4 0"/></>,
  logout: <path d="M10 4H5v16h5m3-4 4-4-4-4m-4 4h11"/>,
  refresh: <path d="M20 10a8 8 0 1 0-1 7m1-13v6h-6"/>,
  clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3 2"/></>,
  download: <path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  chevron: <path d="m9 6 6 6-6 6"/>,
  check: <path d="m5 12 4 4 10-10"/>,
  pin: <><path d="M18 10c0 4-6 9-6 9s-6-5-6-9a6 6 0 1 1 12 0Z"/><circle cx="12" cy="10" r="2"/></>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof drawings;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[name]}</svg>;
}
