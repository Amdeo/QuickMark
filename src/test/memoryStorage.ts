type StorageState = Record<string, unknown>;

export function createMemoryStorageArea(initial: StorageState = {}): chrome.storage.StorageArea {
  const state: StorageState = { ...initial };

  const storage = {
    get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>> {
      if (keys == null) {
        return Promise.resolve({ ...state });
      }

      if (typeof keys === "string") {
        return Promise.resolve({ [keys]: state[keys] });
      }

      if (Array.isArray(keys)) {
        return Promise.resolve(Object.fromEntries(keys.map((key) => [key, state[key]])));
      }

      return Promise.resolve(
        Object.fromEntries(Object.entries(keys).map(([key, fallback]) => [key, state[key] ?? fallback]))
      );
    },
    set(items: StorageState): Promise<void> {
      Object.assign(state, items);
      return Promise.resolve();
    },
    remove(keys: string | string[]): Promise<void> {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete state[key];
      }
      return Promise.resolve();
    },
    clear(): Promise<void> {
      for (const key of Object.keys(state)) {
        delete state[key];
      }
      return Promise.resolve();
    },
    getBytesInUse(): Promise<number> {
      return Promise.resolve(JSON.stringify(state).length);
    },
    setAccessLevel(): Promise<void> {
      return Promise.resolve();
    },
    onChanged: {
      addListener: () => undefined,
      removeListener: () => undefined,
      hasListener: () => false,
      hasListeners: () => false,
      addRules: () => Promise.resolve([]),
      getRules: () => Promise.resolve([]),
      removeRules: () => Promise.resolve()
    }
  };

  return storage as unknown as chrome.storage.StorageArea;
}
