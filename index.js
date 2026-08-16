/**
 * dsh-liya-archives — host half.
 *
 * 抄改自 chou109/dsh-archives（MIT，https://github.com/chou109/dsh-archives）。
 * 改动：包名 dsh-liya-archives；路由 POST /liya-archives/unarchive。
 *
 * DSH 没有取消归档 RPC，也没有查看归档会话的 UI。本插件补上缺失的原语：
 * 把会话从 registry 全局归档集合移除，暴露为一个小 HTTP 端点。
 *
 * 取消归档走 workspace registry 自身的写路径（enqueueOperation -> setState），所以：
 *   - 持久化域写入发出 `domain/changed`（workspace, table ""），
 *     api-proxy 观察到后推回 `host/archived-sessions-changed` ——
 *     侧边栏列表与本面板实时更新，无需刷新；
 *   - registry 内存状态保持一致，后续归档与重连基线（workspace.list）保持正确集合。
 */
const name = "dsh-liya-archives";
const inject = ["webServer", "workspaceRegistry"];

const MAX_BODY_BYTES = 64 * 1024;

/** 收集一个小 JSON 请求体。 */
async function readJsonBody(req) {
	let body = "";
	for await (const chunk of req) {
		body += chunk;
		if (body.length > MAX_BODY_BYTES) throw new Error("request body too large");
	}
	return JSON.parse(body);
}

function json(res, status, value) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(value));
}

function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/liya-archives/unarchive",
		handler: async (req, res) => {
			if (req.method !== "POST") {
				json(res, 405, { ok: false, error: "method not allowed" });
				return;
			}
			let sessionId;
			try {
				const payload = await readJsonBody(req);
				sessionId = payload.sessionId;
			} catch (error) {
				json(res, 400, { ok: false, error: "invalid JSON body: " + String(error && error.message || error) });
				return;
			}
			if (typeof sessionId !== "string" || !sessionId.startsWith("session-")) {
				json(res, 400, { ok: false, error: "sessionId must be a session id string" });
				return;
			}
			try {
				const registry = ctx.workspaceRegistry;
				// TS-private 但运行时公开的 registry 写路径；串行在 registry 自己的
				// operation tail 上，不会与进行中的归档/排序变更交错。
				const changed = await registry.enqueueOperation(async () => {
					const state = registry.requireState();
					if (!state.archivedSessionIds.includes(sessionId)) return false;
					await registry.setState({
						...state,
						archivedSessionIds: state.archivedSessionIds.filter((id) => id !== sessionId)
					});
					return true;
				});
				json(res, 200, { ok: true, changed });
			} catch (error) {
				ctx.logger.error("[dsh-liya-archives] unarchive failed:", error);
				json(res, 500, { ok: false, error: String(error && error.message || error) });
			}
		}
	}), "dsh-liya-archives: unarchive route");
}

export { apply, inject, name };
