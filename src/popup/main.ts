document.body.style.minWidth = "0px";

void chrome.runtime
  .sendMessage({ type: "QUICKMARK_TRIGGER_SEARCH" })
  .catch(() => undefined)
  .finally(() => window.close());
