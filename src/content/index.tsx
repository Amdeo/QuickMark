import React from "react";
import { createRoot, type Root } from "react-dom/client";
import type { BookmarkItem } from "../domain/types";
import { SearchApp } from "../search/SearchApp";

const HOST_ID = "quickmark-overlay-root";
const STYLE_ID = "quickmark-overlay-style";

let root: Root | undefined;

chrome.runtime.onMessage.addListener((message: { type?: string }) => {
  if (message.type === "QUICKMARK_TOGGLE") {
    toggleOverlay();
  }
});

function toggleOverlay(): void {
  if (document.getElementById(HOST_ID)) {
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
  host.style.background = "rgba(0, 0, 0, 0.15)";
  host.style.backdropFilter = "blur(6px)";

  const shadow = host.attachShadow({ mode: "open" });
  const styleLink = document.createElement("link");
  styleLink.id = STYLE_ID;
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("assets/styles.css");

  const app = document.createElement("div");
  app.style.width = "min(768px, 100%)";
  app.addEventListener("click", (event) => event.stopPropagation());

  shadow.append(styleLink, app);
  document.documentElement.appendChild(host);
  host.addEventListener("click", closeOverlay);

  root = createRoot(app);
  root.render(
    <React.StrictMode>
      <SearchApp mode="modal" onClose={closeOverlay} openBookmark={openBookmarkFromContentScript} />
    </React.StrictMode>
  );
}

function closeOverlay(): void {
  const host = document.getElementById(HOST_ID);
  if (host) {
    host.removeEventListener("click", closeOverlay);
  }
  root?.unmount();
  root = undefined;
  host?.remove();
}

async function openBookmarkFromContentScript(item: BookmarkItem, _newTab: boolean): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    await chrome.runtime.sendMessage({ type: "QUICKMARK_OPEN_NEW_TAB", url: item.url });
  } else {
    window.open(item.url, "_blank");
  }
}
