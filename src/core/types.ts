// Modèle de données partagé par l'appli et le collecteur (voir SPECIFICATIONS.md § 3.2)

export interface Category {
  id: string;
  name: string;
  order: number;
}

export type FeedStatus = 'active' | 'pending' | 'error';

export interface Feed {
  id: string;
  url: string;
  siteUrl?: string;
  title: string;
  categories: string[];
  addedAt: string;
  status: FeedStatus;
}

export interface Subscriptions {
  version: 1;
  updatedAt: string;
  categories: Category[];
  feeds: Feed[];
}

export interface Item {
  id: string;
  feedId: string;
  title: string;
  link: string;
  author?: string;
  published: string;
  fetched: string;
  summary: string;
  image?: string;
}

export interface DayFile {
  date: string;
  items: Item[];
}

export interface SavedEntry {
  at: string;
  removed: boolean;
  item: Item;
}

export interface ReadingState {
  version: 1;
  read: Record<string, string>;
  unread: Record<string, string>;
  markedBefore: Record<string, string>;
  saved: Record<string, SavedEntry>;
  prefs: Record<string, unknown> & { updatedAt?: string };
}

export interface FeedRunStatus {
  lastSuccess?: string;
  lastError?: string;
  lastErrorAt?: string;
  failures: number;
  etag?: string;
  lastModified?: string;
  resolvedUrl?: string;
  title?: string;
  siteUrl?: string;
  favicon?: string;
}

export interface FeedsStatus {
  lastRun?: string;
  feeds: Record<string, FeedRunStatus>;
}

export const RETENTION_DAYS = 30;
export const SUMMARY_MAX = 400;

export function emptySubscriptions(now = new Date()): Subscriptions {
  return { version: 1, updatedAt: now.toISOString(), categories: [], feeds: [] };
}

export function emptyReading(): ReadingState {
  return { version: 1, read: {}, unread: {}, markedBefore: {}, saved: {}, prefs: {} };
}
