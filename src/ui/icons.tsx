import type { JSX } from 'preact';

type P = JSX.SVGAttributes<SVGSVGElement>;
const base = (children: JSX.Element | JSX.Element[], props: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...props}>
    {children}
  </svg>
);

export const IconMenu = (p: P) => base([<path d="M4 6h16" />, <path d="M4 12h16" />, <path d="M4 18h16" />], p);
export const IconToday = (p: P) => base([<circle cx="12" cy="12" r="4" />, <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />], p);
export const IconAll = (p: P) => base([<rect x="4" y="4" width="16" height="16" rx="3" />, <path d="M8 9h8M8 13h8M8 17h5" />], p);
export const IconBookmark = (p: P) => base(<path d="M6 4h12v16l-6-4-6 4z" />, p);
export const IconChevron = (p: P) => base(<path d="M9 6l6 6-6 6" />, p);
export const IconCheck = (p: P) => base(<path d="M5 12.5l4.5 4.5L19 7.5" />, p);
export const IconCheckAll = (p: P) => base([<path d="M2.5 12.5l4.5 4.5L16.5 7.5" />, <path d="M12 16l1 1L22.5 7.5" />], p);
export const IconRefresh = (p: P) => base([<path d="M20 11a8 8 0 1 0-2.3 5.7" />, <path d="M20 4v7h-7" />], p);
export const IconSettings = (p: P) => base([<circle cx="12" cy="12" r="3" />, <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />], p);
export const IconAlert = (p: P) => base([<path d="M12 3l10 18H2z" />, <path d="M12 10v4M12 17.5v.5" />], p);
export const IconClose = (p: P) => base(<path d="M6 6l12 12M18 6L6 18" />, p);
export const IconSearch = (p: P) => base([<circle cx="11" cy="11" r="6.5" />, <path d="M20 20l-4.2-4.2" />], p);
export const IconView = (p: P) => base([<rect x="4" y="4" width="16" height="5" rx="1.5" />, <rect x="4" y="12" width="7" height="8" rx="1.5" />, <rect x="13" y="12" width="7" height="8" rx="1.5" />], p);
export const IconMore = (p: P) => base([<circle cx="5" cy="12" r="1.2" fill="currentColor" />, <circle cx="12" cy="12" r="1.2" fill="currentColor" />, <circle cx="19" cy="12" r="1.2" fill="currentColor" />], p);
export const IconBookmarkFilled = (p: P) => base(<path d="M6 4h12v16l-6-4-6 4z" fill="currentColor" />, p);
export const IconDot =(p: P) => base(<circle cx="12" cy="12" r="4" fill="currentColor" />, p);

export const Logo = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden="true">
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2BB673" />
        <stop offset="1" stop-color="#16884F" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="112" fill="url(#lg)" />
    <g fill="none" stroke="#fff" stroke-linecap="round" transform="translate(30 4)">
      <path d="M62 236 C 112 236 118 352 178 348" stroke-width="22" />
      <path d="M178 236 A112 112 0 0 1 290 348" stroke-width="38" />
      <path d="M178 150 A198 198 0 0 1 376 348" stroke-width="38" />
    </g>
    <circle cx="208" cy="352" r="34" fill="#fff" />
  </svg>
);
