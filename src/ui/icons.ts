import type { PoseId } from "../core/poses.ts";

/** Small line drawings of each pose, for the pose bar. 34×24 viewBox. */
export const POSE_ICONS: Record<PoseId, string> = {
  closed: `<svg viewBox="0 0 34 24"><rect x="11" y="2" width="12" height="20" rx="2.5"/><circle cx="20" cy="5" r="0.9"/></svg>`,
  "closed-landscape": `<svg viewBox="0 0 34 24"><rect x="7" y="6" width="20" height="12" rx="2.5"/><circle cx="24" cy="9" r="0.9"/></svg>`,
  open: `<svg viewBox="0 0 34 24"><rect x="3" y="3" width="28" height="18" rx="2.5"/><path d="M17 3v18" stroke-dasharray="2 2"/></svg>`,
  "open-portrait": `<svg viewBox="0 0 34 24"><rect x="9" y="1" width="16" height="22" rx="2.5"/><path d="M9 12h16" stroke-dasharray="2 2"/></svg>`,
  book: `<svg viewBox="0 0 34 24"><path d="M17 4 5 1v19l12 3 12-3V1z"/><path d="M17 4v19"/></svg>`,
  table: `<svg viewBox="0 0 34 24"><path d="M8 22h22L26 14H4z"/><path d="M8 14 11 2h18l-3 12"/></svg>`,
};
