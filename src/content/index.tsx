import React from "react";
import { createRoot, type Root } from "react-dom/client";
import type { BookmarkItem, TabSnapshot } from "../domain/types";
import { SavePanel } from "../save/SavePanel";
import { SearchApp } from "../search/SearchApp";

const HOST_ID = "quickmark-overlay-root";
const STYLE_ID = "quickmark-overlay-style";
const SAVE_PANEL_HOST_ID = "quickmark-save-panel-root";

let root: Root | undefined;
let savePanelRoot: Root | undefined;

const state = window as Window & { __quickmarkContentLoaded?: boolean };

if (!state.__quickmarkContentLoaded) {
  state.__quickmarkContentLoaded = true;
  chrome.runtime.onMessage.addListener((message: { type?: string; tab?: TabSnapshot }) => {
    if (message.type === "QUICKMARK_TOGGLE") {
      toggleOverlay();
    }
    if (message.type === "QUICKMARK_OPEN_SAVE_PANEL" && message.tab) {
      openSavePanel(message.tab);
    }
  });
}

function toggleOverlay(): void {
  const existing = document.getElementById(HOST_ID);

  if (existing) {
    closeOverlay();
    return;
  }

  openOverlay();
}

function openOverlay(): void {
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483647";
  host.style.display = "flex";
  host.style.alignItems = "flex-start";
  host.style.justifyContent = "center";
  host.style.padding = "8vh 16px 16px";
  host.style.background = "rgba(12, 14, 17, 0.28)";
  host.style.backdropFilter = "blur(6px)";

  const shadow = host.attachShadow({ mode: "open" });
  const styleLink = document.createElement("link");
  styleLink.id = STYLE_ID;
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("assets/search.css");

  const app = document.createElement("div");
  app.style.width = "min(768px, 100%)";

  shadow.append(styleLink, app);
  document.documentElement.appendChild(host);
  document.addEventListener("keydown", handleOverlayKeyDown, true);

  root = createRoot(app);
  root.render(
    <React.StrictMode>
      <SearchApp mode="modal" onClose={closeOverlay} openBookmark={openBookmarkFromContentScript} />
    </React.StrictMode>
  );
}

function closeOverlay(): void {
  document.removeEventListener("keydown", handleOverlayKeyDown, true);
  root?.unmount();
  root = undefined;
  document.getElementById(HOST_ID)?.remove();
}

function handleOverlayKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Escape") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  closeOverlay();
}

function openSavePanel(tab: TabSnapshot): void {
  closeOverlay();
  closeSavePanel();

  const host = document.createElement("div");
  host.id = SAVE_PANEL_HOST_ID;
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483647";
  host.style.display = "flex";
  host.style.alignItems = "center";
  host.style.justifyContent = "center";
  host.style.padding = "16px";
  host.style.background = "rgba(12, 14, 17, 0.28)";
  host.style.backdropFilter = "blur(6px)";

  const shadow = host.attachShadow({ mode: "open" });
  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("assets/search.css");

  const app = document.createElement("div");
  app.style.width = "min(448px, 100%)";

  shadow.append(styleLink, app);
  document.documentElement.appendChild(host);
  document.addEventListener("keydown", handleSavePanelKeyDown, true);

  savePanelRoot = createRoot(app);
  savePanelRoot.render(
    <React.StrictMode>
      <SavePanel tab={tab} onSaved={closeSavePanel} onCancel={closeSavePanel} />
    </React.StrictMode>
  );
}

function closeSavePanel(): void {
  document.removeEventListener("keydown", handleSavePanelKeyDown, true);
  savePanelRoot?.unmount();
  savePanelRoot = undefined;
  document.getElementById(SAVE_PANEL_HOST_ID)?.remove();
}

function handleSavePanelKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Escape") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  closeSavePanel();
}

async function openBookmarkFromContentScript(item: BookmarkItem, newTab: boolean): Promise<void> {
  if (newTab) {
    await chrome.runtime.sendMessage({ type: "QUICKMARK_OPEN_NEW_TAB", url: item.url });
    return;
  }

  window.location.assign(item.url);
}
