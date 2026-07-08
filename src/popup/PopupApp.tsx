import { useEffect } from "react";

export function PopupApp() {
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      return;
    }
    void chrome.runtime.sendMessage({ type: "QUICKMARK_TRIGGER_SEARCH" });
    window.close();
  }, []);

  return null;
}
