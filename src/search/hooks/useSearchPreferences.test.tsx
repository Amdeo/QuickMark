// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useSearchPreferences, type PinnedSite } from "./useSearchPreferences";

type ChangeListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void;
type SortMode = "smart" | "recent" | "frequent" | "title" | "created" | "relevance";
type HookValue = {
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  pinnedSites: PinnedSite[];
  togglePinnedSite: (site: PinnedSite) => void;
  movePinnedSite: (from: number, to: number) => void;
  isLoaded: boolean;
  error: string | undefined;
};

function createStorage(initial: Record<string, unknown> = {}) {
  const values = { ...initial };
  const listeners = new Set<ChangeListener>();
  let deferredGet: (() => void) | undefined;
  let deferredRead: Promise<void> | undefined;
  let failSet = false;
  const set = vi.fn(async (items: Record<string, unknown>) => {
    if (failSet) throw new Error("set failed");
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const [key, newValue] of Object.entries(items)) {
      changes[key] = { oldValue: values[key], newValue };
      values[key] = newValue;
    }
    for (const listener of listeners) listener(changes, "local");
  });
  const storage = {
    local: {
      get: vi.fn(async (keys: string[]) => {
        if (deferredRead) await deferredRead;
        return Object.fromEntries(keys.map((key) => [key, values[key]]));
      }),
      set,
    },
    onChanged: {
      addListener: vi.fn((listener: ChangeListener) => listeners.add(listener)),
      removeListener: vi.fn((listener: ChangeListener) => listeners.delete(listener)),
    },
  };

  return {
    storage,
    values,
    setDeferredRead() {
      deferredRead = new Promise((resolve) => {
        deferredGet = resolve;
      });
    },
    resolveRead() {
      deferredGet?.();
    },
    emit(changes: Record<string, chrome.storage.StorageChange>) {
      for (const listener of listeners) listener(changes, "local");
    },
    failNextSave() {
      failSet = true;
    },
  };
}

function HookProbe({ onValue }: { onValue: (value: HookValue) => void }) {
  onValue(useSearchPreferences());
  return null;
}

function mountHook(onValue: (value: HookValue) => void) {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<HookProbe onValue={onValue} />));
  return () => act(() => root.unmount());
}

async function flushStorage() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("restores sort mode after remount and accepts cross-tab updates", async () => {
  const fake = createStorage({ "quickmark-sort-mode": "recent" });
  vi.stubGlobal("chrome", { storage: fake.storage });
  let value: HookValue | undefined;
  const unmount = mountHook((next) => {
    value = next;
  });
  await flushStorage();

  expect(value?.sortMode).toBe("recent");
  act(() => value?.setSortMode("frequent"));
  await flushStorage();
  expect(fake.values["quickmark-sort-mode"]).toBe("frequent");
  act(() => fake.emit({ "quickmark-sort-mode": { oldValue: "frequent", newValue: "title" } }));
  expect(value?.sortMode).toBe("title");
  unmount();

  const remount = mountHook((next) => {
    value = next;
  });
  await flushStorage();
  expect(value?.sortMode).toBe("frequent");
  remount();
});

test("reorders pinned sites and persists the new order", async () => {
  const saved = [
    { url: "https://a.example/", title: "A" },
    { url: "https://b.example/", title: "B" },
    { url: "https://c.example/", title: "C" },
  ];
  const fake = createStorage({ "quickmark-pinned-sites": saved });
  vi.stubGlobal("chrome", { storage: fake.storage });
  let value: HookValue | undefined;
  const unmount = mountHook((next) => {
    value = next;
  });
  await flushStorage();

  act(() => value?.movePinnedSite(2, 0));
  await flushStorage();

  expect(value?.pinnedSites.map((site) => site.title)).toEqual(["C", "A", "B"]);
  expect(fake.values["quickmark-pinned-sites"]).toEqual([
    { url: "https://c.example/", title: "C" },
    { url: "https://a.example/", title: "A" },
    { url: "https://b.example/", title: "B" },
  ]);
  act(() => value?.movePinnedSite(0, 7));
  expect(value?.pinnedSites.map((site) => site.title)).toEqual(["C", "A", "B"]);
  unmount();
});

test("keeps exact URLs from the same domain, removes pins, and caps at eight", async () => {
  const fake = createStorage();
  vi.stubGlobal("chrome", { storage: fake.storage });
  let value: HookValue | undefined;
  const unmount = mountHook((next) => {
    value = next;
  });
  await flushStorage();

  const sites: PinnedSite[] = Array.from({ length: 9 }, (_, index) => ({
    url: `https://example.com/path-${index}`,
    title: `Site ${index}`,
  }));
  for (const site of sites) act(() => value?.togglePinnedSite(site));
  await flushStorage();

  expect(value?.pinnedSites.map((site) => site.url)).toEqual(sites.slice(0, 8).map((site) => site.url));
  expect(fake.values["quickmark-pinned-sites"]).toEqual(sites.slice(0, 8));
  act(() => value?.togglePinnedSite(sites[1]));
  await flushStorage();
  expect(value?.pinnedSites.map((site) => site.url)).toEqual(
    sites.slice(0, 8).filter((_, index) => index !== 1).map((site) => site.url),
  );
  unmount();
});

test("does not let a delayed initial read overwrite a newer storage event or rapid edits", async () => {
  const fake = createStorage({
    "quickmark-sort-mode": "recent",
    "quickmark-pinned-sites": [{ url: "https://saved.example/", title: "Saved" }],
  });
  fake.setDeferredRead();
  vi.stubGlobal("chrome", { storage: fake.storage });
  let value: HookValue | undefined;
  const unmount = mountHook((next) => {
    value = next;
  });

  act(() => fake.emit({ "quickmark-sort-mode": { oldValue: "recent", newValue: "title" } }));
  act(() => value?.setSortMode("frequent"));
  expect(value?.isLoaded).toBe(false);
  expect(value?.pinnedSites).toEqual([]);
  fake.resolveRead();
  await flushStorage();

  expect(value?.sortMode).toBe("frequent");
  expect(value?.pinnedSites).toEqual([{ url: "https://saved.example/", title: "Saved" }]);
  expect(fake.values["quickmark-sort-mode"]).toBe("frequent");
  unmount();
});

test("keeps invalid saved data safe and exposes save failures", async () => {
  const fake = createStorage({
    "quickmark-sort-mode": "unknown",
    "quickmark-pinned-sites": [
      { url: "javascript:alert(1)", title: "Bad" },
      { url: "https://valid.example/", title: "Valid" },
      { url: "https://valid.example/", title: "Duplicate" },
      { url: "https://missing-title.example/" },
    ],
  });
  vi.stubGlobal("chrome", { storage: fake.storage });
  let value: HookValue | undefined;
  const unmount = mountHook((next) => {
    value = next;
  });
  await flushStorage();

  expect(value?.sortMode).toBe("smart");
  expect(value?.pinnedSites).toEqual([{ url: "https://valid.example/", title: "Valid" }]);
  fake.failNextSave();
  act(() => value?.setSortMode("recent"));
  await flushStorage();
  expect(value?.error).toBe("无法保存搜索偏好设置。");
  unmount();
});

test("ignores prototype names as persisted sort modes", async () => {
  const fake = createStorage({ "quickmark-sort-mode": "toString" });
  vi.stubGlobal("chrome", { storage: fake.storage });
  let value: HookValue | undefined;
  const unmount = mountHook((next) => { value = next; });
  await flushStorage();
  try {
    expect(value?.sortMode).toBe("smart");
  } finally {
    unmount();
  }
});

test("failed initial load cannot overwrite unseen saved pins", async () => {
  const saved = { url: "https://saved.example/", title: "Saved" };
  const fake = createStorage({ "quickmark-pinned-sites": [saved] });
  fake.storage.local.get.mockRejectedValueOnce(new Error("unavailable"));
  vi.stubGlobal("chrome", { storage: fake.storage });
  let value: HookValue | undefined;
  const unmount = mountHook((next) => { value = next; });
  await flushStorage();
  act(() => value?.togglePinnedSite({ url: "https://new.example/", title: "New" }));
  await flushStorage();
  try {
    expect(fake.values["quickmark-pinned-sites"]).toEqual([saved]);
    expect(value?.error).toBeTruthy();
  } finally {
    unmount();
  }
});
