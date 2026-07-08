import { getFaviconUrl } from "./favicon";

test("getFaviconUrl uses the Chrome extension favicon endpoint", () => {
  expect(
    getFaviconUrl("https://example.com/docs", 32, (path) => `chrome-extension://abc${path}`)
  ).toBe("chrome-extension://abc/_favicon/?pageUrl=https%3A%2F%2Fexample.com%2Fdocs&size=32");
});

test("getFaviconUrl falls back to Google favicon service outside an extension", () => {
  expect(getFaviconUrl("https://example.com/docs", 16)).toBe(
    "https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fexample.com%2Fdocs&sz=16"
  );
});
