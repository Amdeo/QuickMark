type RuntimeGetUrl = (path: string) => string;

export function getFaviconUrl(url: string, size = 32, getUrl?: RuntimeGetUrl): string {
  if (getUrl) {
    return getUrl(`/_favicon/?pageUrl=${encodeURIComponent(url)}&size=${size}`);
  }
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=${size}`;
}

export function getExtensionFaviconUrl(url: string, size = 32): string {
  const getUrl = typeof chrome !== "undefined" ? chrome.runtime?.getURL : undefined;
  return getFaviconUrl(url, size, getUrl);
}
