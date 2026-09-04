import manifest from "../public/manifest.json";

test("manifest declares permissions needed for extension favicons and script injection", () => {
  expect(manifest.permissions).toContain("favicon");
  expect(manifest.permissions).toContain("scripting");
  expect(manifest.permissions).toContain("storage");
});

test("manifest exposes Chrome extension favicon resources to content scripts", () => {
  expect(manifest.web_accessible_resources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        resources: expect.arrayContaining(["_favicon/*"]),
      }),
    ])
  );
});

test("manifest declares extension and toolbar icons", () => {
  expect(manifest.icons).toEqual({
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  });
  expect(manifest.action.default_icon).toEqual(manifest.icons);
});

test("manifest declares the tab switcher command and lazy-loaded resource", () => {
  expect(manifest.commands["open-tabs"]).toEqual({
    suggested_key: {
      default: "Ctrl+Shift+O",
      mac: "Command+Shift+O",
    },
    description: "Open QuickMark tab switcher",
  });
  expect(manifest.web_accessible_resources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        resources: expect.arrayContaining(["assets/content-tabs.js"]),
      }),
    ])
  );
});
