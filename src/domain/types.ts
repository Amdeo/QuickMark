export type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  domain: string;
  favicon?: string;
  createdAt?: number;
  lastVisitedAt?: number;
  visitCount: number;
  source?: "bookmark" | "history";
};

export type HistoryItem = {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
  visitCount: number;
  typedCount?: number;
};
