import { createBookmarkRepository } from "../repositories/bookmarkRepository";

const repository = createBookmarkRepository();

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-search") {
    void toggleSearchOverlay();
  }

  if (command === "save-current-page") {
    void saveActiveTab();
  }
});

chrome.runtime.onMessage.addListener((message: { type?: string; url?: string }) => {
  if (message.type === "QUICKMARK_OPEN_NEW_TAB" && message.url) {
    void chrome.tabs.create({ url: message.url, active: true });
  }

  if (message.type === "QUICKMARK_TRIGGER_SEARCH") {
    void toggleSearchOverlay();
  }
});

async function toggleSearchOverlay(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url || isUnsupportedUrl(tab.url)) {
    await showBadge("ERR", "#93000a");
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "QUICKMARK_TOGGLE" });
  } catch {
    try {
      await injectContentScript(tab.id);
      await chrome.tabs.sendMessage(tab.id, { type: "QUICKMARK_TOGGLE" });
    } catch {
      await showBadge("ERR", "#93000a");
    }
  }
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["assets/content.js"]
  });
}

async function saveActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab?.url || isUnsupportedUrl(tab.url)) {
    await showBadge("ERR", "#93000a");
    return;
  }

  const settingsResult = await chrome.storage.local.get({
    "quickmark.settings": { showSavePanel: true }
  });
  const settings = settingsResult["quickmark.settings"] as { showSavePanel: boolean };

  if (!settings.showSavePanel) {
    await repository.saveCurrentTab({
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl
    }, {});
    await showBadge("OK", "#00bd85");
    return;
  }

  const tabSnapshot = { title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl };

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "QUICKMARK_OPEN_SAVE_PANEL",
      tab: tabSnapshot
    });
  } catch {
    try {
      await injectContentScript(tab.id);
      await chrome.tabs.sendMessage(tab.id, {
        type: "QUICKMARK_OPEN_SAVE_PANEL",
        tab: tabSnapshot
      });
    } catch {
      await showBadge("ERR", "#93000a");
    }
  }
}

function isUnsupportedUrl(url: string): boolean {
  return /^(chrome|edge|about|devtools):/i.test(url);
}

async function showBadge(text: string, color: string): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => {
    void chrome.action.setBadgeText({ text: "" });
  }, 1200);
}
