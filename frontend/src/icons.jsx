// ==========================================
// Lightweight inline icon set (no external deps)
// Stroke-based, 20x20, currentColor
// ==========================================
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const UploadIcon = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}>
    <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const SparkleIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M12 3l1.6 4.9L18 9.5l-4.4 1.6L12 16l-1.6-4.9L6 9.5l4.4-1.6L12 3z" />
    <path d="M19 15l.7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9L19 15z" />
  </svg>
);

export const CompassIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.8 9.2l-2.1 5.4-5.4 2.1 2.1-5.4 5.4-2.1z" />
  </svg>
);

export const LayersIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" />
    <path d="M4 12l8 4.5 8-4.5" />
    <path d="M4 16.5L12 21l8-4.5" />
  </svg>
);

export const CalendarIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
);

export const CheckBadgeIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M12 3.5l2.1 1.4 2.5-.3 1 2.3 2.3 1-.3 2.5 1.4 2.1-1.4 2.1.3 2.5-2.3 1-1 2.3-2.5-.3L12 20.5l-2.1-1.4-2.5.3-1-2.3-2.3-1 .3-2.5L3 12l1.4-2.1-.3-2.5 2.3-1 1-2.3 2.5.3L12 3.5z" />
    <path d="M8.7 12.2l2.2 2.2 4.4-4.6" />
  </svg>
);

export const AlertIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M12 4.5L21 19.5H3L12 4.5z" />
    <path d="M12 10v4M12 16.5v.1" />
  </svg>
);

export const ArrowNextIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const FlagIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M6 21V4" />
    <path d="M6 4.5c2-1.2 4-1.2 6 0s4 1.2 6 0v9c-2 1.2-4 1.2-6 0s-4-1.2-6 0" />
  </svg>
);

export const DocIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
    <path d="M14 3.5V8h4" />
    <path d="M9 13h6M9 16.5h6" />
  </svg>
);

export const CopyIcon = (p) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
    <rect x="8.5" y="8.5" width="11" height="12" rx="1.6" />
    <path d="M5.5 15V5.9A1.4 1.4 0 0 1 6.9 4.5H15" />
  </svg>
);

export const DownloadIcon = (p) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
    <path d="M12 3.5v11M12 14.5l-3.5-3.5M12 14.5l3.5-3.5" />
    <path d="M4.5 17v2.2a1.3 1.3 0 0 0 1.3 1.3h12.4a1.3 1.3 0 0 0 1.3-1.3V17" />
  </svg>
);

export const TrashIcon = (p) => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...base} {...p}>
    <path d="M5 7h14M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M7 7l.8 12a1.4 1.4 0 0 0 1.4 1.3h5.6a1.4 1.4 0 0 0 1.4-1.3L17 7" />
  </svg>
);

export const ShieldIcon = (p) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...base} {...p}>
    <path d="M12 3l7 3v5.2c0 4.6-3 8.4-7 9.8-4-1.4-7-5.2-7-9.8V6l7-3z" />
    <path d="M9 12l2 2 4-4.3" />
  </svg>
);

export const ClockIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.5l3.6 2.1" />
  </svg>
);

export const GaugeIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M4 15.5a8 8 0 1 1 16 0" />
    <path d="M12 15.5l3.4-4.6" />
    <path d="M12 15.5h.01" />
  </svg>
);

export const TargetIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
  </svg>
);

export const BuildingIcon = (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}>
    <rect x="5" y="3.5" width="10" height="17" rx="1.2" />
    <path d="M15 9.5h4a1 1 0 0 1 1 1V20a.5.5 0 0 1-.5.5H15" />
    <path d="M8 7.5h.01M12 7.5h.01M8 11h.01M12 11h.01M8 14.5h.01M12 14.5h.01" />
    <path d="M9 20.5v-3.2a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v3.2" />
  </svg>
);

export const StarIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M12 3.7l2.5 5.3 5.7.7-4.2 4 1.1 5.8L12 16.6l-5.1 2.9 1.1-5.8-4.2-4 5.7-.7L12 3.7z" />
  </svg>
);

export const FolderIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M3.5 6.2a1 1 0 0 1 1-1h4.4l1.8 2h8.8a1 1 0 0 1 1 1V17a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V6.2z" />
  </svg>
);

export const BotIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <rect x="4.5" y="8.5" width="15" height="10.5" rx="2.4" />
    <path d="M12 8.5V5.3M12 5.3h.01" />
    <path d="M8.5 13.3v1.4M15.5 13.3v1.4" />
    <path d="M2.5 12v4M21.5 12v4" />
  </svg>
);

export const PercentIcon = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M5 19L19 5" />
    <circle cx="7" cy="7" r="2.3" />
    <circle cx="17" cy="17" r="2.3" />
  </svg>
);
