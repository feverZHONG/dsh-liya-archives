// Smoke test for the dsh-liya-archives host half (index.js):
// load the ESM module, run apply() with a stub ctx, then drive the registered
// unarchive route with a fake POST request and a fake registry.
// Tests this repo's own index.js (no DSH profile needed).
// 抄改自 chou109/dsh-archives 的 tests/host-test.mjs（MIT）。
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const path = require("node:path");

const pkgDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mod = await import(pathToFileURL(path.join(pkgDir, "index.js")).href);
console.log("host module: name=" + mod.name, "inject=" + JSON.stringify(mod.inject), "apply=" + typeof mod.apply);

let route = null;
const ctx = {
  effect: (fn) => { const r = fn(); return typeof r === "function" ? r : () => {}; },
  webServer: {
    register: (r) => { route = r; return () => {}; }
  },
  logger: { error: (...args) => console.error("[host logger]", ...args) }
};
mod.apply(ctx);
if (!route || route.kind !== "exact" || route.path !== "/liya-archives/unarchive") {
  throw new Error("route registration mismatch: " + JSON.stringify(route));
}
console.log("route registered:", route.kind, route.path);

// --- fake registry ---
let archived = ["session-a", "session-b"];
const registry = {
  enqueueOperation: async (op) => op(),
  requireState: () => ({ archivedSessionIds: archived }),
  setState: async (next) => { archived = next.archivedSessionIds; }
};
ctx.workspaceRegistry = registry;

// --- fake req/res helpers ---
function makeReq(method, body) {
  const chunks = body === null ? [] : [Buffer.from(JSON.stringify(body))];
  return {
    method,
    [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; }
  };
}
function makeRes() {
  const calls = [];
  return {
    calls,
    writeHead: (status, headers) => calls.push(["writeHead", status, headers]),
    end: (body) => calls.push(["end", body])
  };
}

// 1) unarchive an archived session
let res = makeRes();
await route.handler(makeReq("POST", { sessionId: "session-a" }), res);
const [w1, e1] = [res.calls[0], res.calls[1]];
if (w1[1] !== 200) throw new Error("expected 200, got " + w1[1]);
const body1 = JSON.parse(e1[1]);
if (!body1.ok || body1.changed !== true) throw new Error("unexpected response: " + JSON.stringify(body1));
if (archived.includes("session-a") || archived.length !== 1) throw new Error("registry not updated: " + JSON.stringify(archived));
console.log("unarchive ok:", JSON.stringify(body1), "remaining:", JSON.stringify(archived));

// 2) unarchive an id that is NOT archived -> ok, changed=false, registry untouched
res = makeRes();
await route.handler(makeReq("POST", { sessionId: "session-zzz" }), res);
const body2 = JSON.parse(res.calls[1][1]);
if (!body2.ok || body2.changed !== false) throw new Error("unexpected no-op response: " + JSON.stringify(body2));
if (archived.length !== 1) throw new Error("registry should be unchanged");
console.log("no-op ok:", JSON.stringify(body2));

// 3) bad payload -> 400
res = makeRes();
await route.handler(makeReq("POST", { sessionId: 42 }), res);
if (res.calls[0][1] !== 400) throw new Error("expected 400 for bad sessionId, got " + res.calls[0][1]);
console.log("validation ok: 400 for non-string sessionId");

// 4) wrong method -> 405
res = makeRes();
await route.handler(makeReq("GET", null), res);
if (res.calls[0][1] !== 405) throw new Error("expected 405 for GET, got " + res.calls[0][1]);
console.log("method gate ok: 405 for GET");

// 5) invalid JSON -> 400
const badReq = { method: "POST", [Symbol.asyncIterator]: async function* () { yield Buffer.from("{not json"); } };
res = makeRes();
await route.handler(badReq, res);
if (res.calls[0][1] !== 400) throw new Error("expected 400 for bad JSON, got " + res.calls[0][1]);
console.log("bad JSON ok: 400");

console.log("ALL HOST CHECKS PASSED");
