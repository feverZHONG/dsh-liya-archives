// Smoke test for the dsh-liya-archives client bundle:
// 1) execute the bundle in a fake __ModuleLoader__/document environment;
// 2) run apply() against a stub ctx;
// 3) renderToString the component with fixture data (real React from a dsh
//    profile's node_modules).
//
// The bundle under test is this repo's own client.js. React / react-dom
// come from a DSH profile's node_modules, resolved via $DSH_HOME (default
// ~/.dsh); override with DSH_PROFILE_NODE_MODULES to point elsewhere.
// 抄改自 chou109/dsh-archives 的 tests/smoke-test.cjs（MIT）。
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dshHome =
  process.env.DSH_HOME ||
  (process.platform === "win32"
    ? path.join(process.env.USERPROFILE || process.env.HOME || "", ".dsh")
    : path.join(process.env.HOME || "", ".dsh"));
const profileModules =
  process.env.DSH_PROFILE_NODE_MODULES || path.join(dshHome, "profiles", "node_modules");
const bundlePath = path.join(__dirname, "..", "client.js");
const bundle = fs.readFileSync(bundlePath, "utf8");

let captured = null;
const fakeWindow = {
  __ModuleLoader__: {
    load: (entry) => {
      captured = entry;
    }
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  }
};
const fakeDocument = {
  querySelector: () => null,
  createElement: () => ({ dataset: {}, set textContent(v) {}, }),
  head: { appendChild: () => {} }
};
const primitives = {};
for (const name of [
  "IconArchiveOutline20", "IconChevronDownOutline14", "IconChevronRightOutline14",
  "IconRefreshOutline14", "IconBranchOutline16"
]) {
  primitives[name] = (props) => null;
}
// Use a wrapped react whose useState forces: open=true, expanded=proxy
// (answers `expandedByWorkspace[group.key] === true` for any key), and
// busy/error stay null — so the panel body AND every workspace group render
// expanded during SSR.
const realReact = require(path.join(profileModules, "react"));
const expandedProxy = new Proxy({}, { get: () => true });
const wrappedReact = Object.assign({}, realReact, {
  useState: (initial) => {
    if (typeof initial === "function") return [expandedProxy, () => {}];
    if (initial === false) return [true, () => {}];
    return [initial, () => {}];
  }
});
const stubRequire = (spec) => {
  if (spec === "react") return wrappedReact;
  if (spec === "react/jsx-runtime") return require(path.join(profileModules, "react/jsx-runtime"));
  if (spec === "@deepseek-ai/dsh-client-ui-primitives") return primitives;
  throw new Error("unexpected require: " + spec);
};

const sandbox = {
  window: fakeWindow,
  document: fakeDocument,
  localStorage: fakeWindow.localStorage,
  require: stubRequire,
  console
};
vm.createContext(sandbox);
vm.runInContext(bundle, sandbox, { filename: "client.js" });

if (!captured) throw new Error("bundle did not register with __ModuleLoader__");
if (captured.id !== "dsh-liya-archives") throw new Error("bundle id mismatch: " + captured.id);

const moduleExports = captured.factory(stubRequire);
if (!moduleExports || typeof moduleExports.apply !== "function" || !Array.isArray(moduleExports.inject)) {
  throw new Error("factory did not export apply/inject");
}
console.log("bundle factory OK: id=" + captured.id, "inject=" + JSON.stringify(moduleExports.inject));

// --- stub ctx ---
const registrations = [];
const ctx = {
  effect: (fn) => fn(),
  locale: { register: () => () => {} },
  slots: {
    inject: (name, factory) => factory(),
    register: (options, component) => {
      registrations.push({ options, component });
      return () => {};
    }
  },
  sessions: {
    fork: async ({ sessionId }) => sessionId + "-child",
    open: () => {}
  }
};
moduleExports.apply(ctx);
const footerReg = registrations.find((r) => r.options.name === "sidebar.footer.action");
const itemReg = registrations.find((r) => r.options.name === "settings.plugin.item");
if (!footerReg || footerReg.options.id !== "dsh-liya-archives") {
  throw new Error("footer registration mismatch: " + JSON.stringify(registrations.map((r) => r.options)));
}
if (!itemReg || itemReg.options.id !== "dsh-liya-archives") {
  throw new Error("settings.plugin.item registration missing: " + JSON.stringify(registrations.map((r) => r.options)));
}
console.log("apply() registered into", footerReg.options.name, "id=" + footerReg.options.id, "+ settings.plugin.item info card");

// --- renderToString with fixtures ---
const React = require(path.join(profileModules, "react"));
const { renderToString } = require(path.join(profileModules, "react-dom/server"));
const { jsx: _jsx } = require(path.join(profileModules, "react/jsx-runtime"));

const sessionsFixture = {
  ids: ["s1", "s2", "s3", "s4"],
  byId: {
    s1: { id: "s1", displayTitle: "归档会话甲", updatedAt: Date.now() - 5 * 60 * 1000, blank: false, running: false },
    s2: { id: "s2", displayTitle: "归档会话乙", updatedAt: Date.now() - 2 * 3600 * 1000, blank: false, running: false },
    s3: { id: "s3", displayTitle: "当前会话", updatedAt: Date.now() - 1000, blank: false, running: true },
    s4: { id: "s4", displayTitle: "无主归档", updatedAt: Date.now() - 3 * 24 * 3600 * 1000, blank: false, running: false }
  },
  current: "s3",
  phase: "ready"
};
const workspacesFixture = {
  items: [
    { workspaceId: "w1", path: "D:\\proj-a", title: "proj-a", sessionIds: ["s1", "s2", "s3"], createdAt: "", updatedAt: "" },
    { workspaceId: "w2", path: "D:\\proj-b", title: "proj-b", sessionIds: [], createdAt: "", updatedAt: "" }
  ],
  archivedSessionIds: ["s1", "s2", "s4"],
  phase: "ready",
  baselinesReady: true
};

const zhDict = {
  "panel.title": "已归档会话",
  "panel.count": "共 {count} 个",
  "panel.trigger": "已归档",
  "group.ungrouped": "未分组"
};
const props = {
  wide: true,
  // Strict selectors mirroring the real bindSnapshotSelector: a missing
  // selector must throw (regression guard — useSessions() without a selector
  // crashed the real engine with "w is not a function").
  useSessions: (sel) => {
    if (typeof sel !== "function") throw new Error("useSessions requires a selector");
    return sel(sessionsFixture);
  },
  useWorkspaces: (sel) => {
    if (typeof sel !== "function") throw new Error("useWorkspaces requires a selector");
    return sel(workspacesFixture);
  },
  onFork: async (id) => console.log("  [onFork]", id),
  onUnarchive: async (id) => console.log("  [onUnarchive]", id),
  onRestore: async (id) => console.log("  [onRestore]", id),
  t: (key, params) => {
    let text = zhDict[key] || key;
    if (params) for (const name of Object.keys(params)) text = text.replace("{" + name + "}", String(params[name]));
    return text;
  }
};

const Component = footerReg.component;
const html = renderToString(React.createElement(Component, props));
const infoHtml = renderToString(React.createElement(itemReg.component, {}));
if (!infoHtml.includes("dsh-liya-archives") || !infoHtml.includes("已归档")) {
  throw new Error("settings info card render failed");
}
console.log("settings info card rendered OK");
const checks = [
  ["layer", html.includes("dsh-arch-layer")],
  ["badge", html.includes("dsh-arch-badge")],
  ["panel", html.includes("dsh-arch-panel")],
  ["group header", html.includes("dsh-arch-groupHeader")],
  ["workspace group title", html.includes("proj-a")],
  ["archived session row", html.includes("归档会话甲")],
  ["ungrouped bucket", html.includes("未分组")],
  ["empty workspace omitted", !html.includes("proj-b")],
  ["count badge", html.includes("data-archived-count=\"3\"")]
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length > 0) {
  throw new Error("render checks failed: " + failed.map(([name]) => name).join(", ") + "\n--- html ---\n" + html.slice(0, 1200));
}
console.log("render checks passed:", checks.map(([name]) => name).join(", "));
console.log("--- snippet ---");
console.log(html.replace(/\s+/g, " ").slice(0, 700));
