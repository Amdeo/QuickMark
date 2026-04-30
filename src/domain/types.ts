export type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  domain: string;
  favicon?: string;
  createdAt: number;
  updatedAt: number;
  lastVisitedAt?: number;
  visitCount: number;
  tags: string[];
  workspaceId: string | null;
  notes: string;
  isFavorite: boolean;
  isUnread: boolean;
};

export type Workspace = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
};

export type TabSnapshot = {
  title?: string;
  url?: string;
  favIconUrl?: string;
};
