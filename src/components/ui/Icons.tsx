import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const IconLibrary = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.5" y="3" width="7" height="10" rx="1.5" />
    <path d="M12 4.5v7a1.5 1.5 0 0 0 1.5 1.5" />
  </svg>
);

export const IconPlay = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconPause = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="3.5" width="3" height="9" rx="1" fill="currentColor" stroke="none" />
    <rect x="9" y="3.5" width="3" height="9" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconHeart = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 13.5S2.5 10 2.5 6.2A2.9 2.9 0 0 1 8 4.6a2.9 2.9 0 0 1 5.5 1.6C13.5 10 8 13.5 8 13.5z" />
  </svg>
);

export const IconFolder = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z" />
  </svg>
);

export const IconMetronome = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 2.5h4l2.5 11h-9z" />
    <path d="M8 9.5 12 4" />
  </svg>
);

export const IconSettings = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="2" />
    <path d="M8 2.5v1.6M8 11.9v1.6M2.5 8h1.6M11.9 8h1.6M4.1 4.1l1.2 1.2M10.7 10.7l1.2 1.2M4.1 11.9l1.2-1.2M10.7 5.3l1.2-1.2" />
  </svg>
);

export const IconHelp = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M6.3 6.4a1.8 1.8 0 1 1 2.6 1.6c-.6.3-.9.7-.9 1.3M8 11.3v.1" />
  </svg>
);

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="7" cy="7" r="4" />
    <path d="M10 10l3 3" />
  </svg>
);

export const IconChevron = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 4l4 4-4 4" />
  </svg>
);

export const IconChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6l4 4 4-4" />
  </svg>
);

export const IconChevronUpDown = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 6.5 8 3.5l3 3M5 9.5l3 3 3-3" />
  </svg>
);

export const IconCollapse = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.5" y="3" width="11" height="10" rx="2" />
    <path d="M6 3v10" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 3.5v9M3.5 8h9" />
  </svg>
);

export const IconArrow = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export const IconRetry = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 8a5 5 0 1 1-1.6-3.7" />
    <path d="M13 3v3h-3" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
);

export const IconUpload = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 10.5V3.5M4.5 7 8 3.5 11.5 7" />
    <path d="M3 11.5v1A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-1" />
  </svg>
);

export const IconMenu = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 5h10M3 8h10M3 11h10" />
  </svg>
);

export const IconNote = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 12.5V4l6-1.5v8" />
    <circle cx="4.5" cy="12.5" r="1.8" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="10.5" r="1.8" fill="currentColor" stroke="none" />
  </svg>
);

export const IconWarn = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 2.5 14 13H2z" />
    <path d="M8 6.5v3M8 11.2v.1" />
  </svg>
);

export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.2A1 1 0 0 0 6.2 13.6h3.6a1 1 0 0 0 1-.9l.7-8.2" />
    <path d="M6.8 7v4M9.2 7v4" />
  </svg>
);

export const IconPencil = (p: P) => (
  <svg {...base(p)}>
    <path d="M10.5 2.8a1.6 1.6 0 0 1 2.3 2.3L5.3 12.6 2.5 13.5l.9-2.8z" />
    <path d="M9.4 3.9l2.3 2.3" />
  </svg>
);

export const IconKeys = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
    <path d="M5 3.5v5.5M8 3.5v5.5M11 3.5v5.5" />
  </svg>
);
