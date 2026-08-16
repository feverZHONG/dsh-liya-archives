/**
 * dsh-liya-archives — browser half (client bundle).
 *
 * 抄改自 chou109/dsh-archives（MIT，https://github.com/chou109/dsh-archives）。
 * 改动：bundle id / 槽位 id / locale NS → dsh-liya-archives；host 路由 → POST
 * /liya-archives/unarchive；列表渲染补 key（消除 React 警告）。
 *
 * 在侧边栏 `sidebar.footer.action` 列表槽位注册一个「已归档」席位（左侧栏底部，
 * 设置按钮旁）。席位是带计数徽标的触发器，打开面板按工作区分组列出归档会话，
 * 每组默认折叠。
 *
 * 每个会话：
 *   - 点行 → 恢复并打开（先取消归档、等集合同步、再 open —— 直接 open 会被
 *     运行时清除选中：投影清扫会清掉落入归档集合的当前选中）；
 *   - 点 ↻ 按钮 → 仅取消归档（POST /liya-archives/unarchive）；
 *     宿主的域写入以 `host/archived-sessions-changed` 帧回来，
 *     侧边栏列表与本面板实时更新。
 *
 * bundle 遵循官方 client-bundle 契约：
 * `window.__ModuleLoader__.load({ id, factory })`，factory 是接收 shell `require`
 * 的 CJS factory（react、react/jsx-runtime 与 @deepseek-ai/dsh-client-ui-primitives
 * 由 shell 静态模块表提供）。
 */
window.__ModuleLoader__.load({
	id: "dsh-liya-archives",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		var react = require("react");
		var jsxRuntime = require("react/jsx-runtime");
		var primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region styles
		var css = [
			".dsh-arch-layer{flex:none;align-items:center;width:100%;height:49px;margin:8px 0 0;display:flex;position:relative}",
			".dsh-arch-footerButtons{align-items:center;width:100%;display:flex}",
			".dsh-arch-badge{width:100%;height:49px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:12px;align-items:center;gap:8px;padding:0 8px 0 6px;font-family:inherit;font-size:14px;display:inline-flex;overflow:hidden}",
			".dsh-arch-badge:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}",
			".dsh-arch-badge[data-active]{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-arch-badgeLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}",
			".dsh-arch-badgeCount{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex:none;margin-left:auto;font-size:12px;line-height:16px}",
			".dsh-arch-layer.dsh-arch-rail{width:36px;height:36px;margin:0}",
			".dsh-arch-rail .dsh-arch-badge{border-radius:50%;justify-content:center;gap:0;width:36px;height:36px;padding:0}",
			".dsh-arch-rail .dsh-arch-footerButtons{flex-direction:column;gap:2px}",
			".dsh-arch-panel{z-index:30;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);width:420px;max-width:calc(100vw - 24px);max-height:60vh;box-shadow:var(--dsw-shadow-lv2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;flex-direction:column;display:flex;position:fixed;bottom:128px;left:12px;overflow:hidden}",
			".dsh-arch-header{box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);flex:none;justify-content:space-between;align-items:center;min-height:44px;padding:10px 12px;display:flex}",
			".dsh-arch-title{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:20px}",
			".dsh-arch-count{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:16px}",
			".dsh-arch-body{flex:1;min-height:0;padding:4px 8px 12px;overflow-y:auto}",
			".dsh-arch-error{color:var(--dsw-alias-state-error-primary);margin:4px 12px;font-size:12px;line-height:18px}",
			".dsh-arch-group{border-top:1px solid var(--dsw-alias-border-l2)}",
			".dsh-arch-group:first-child{border-top:none}",
			".dsh-arch-groupHeader{width:100%;min-height:36px;display:flex;align-items:center;gap:6px;padding:0 8px;border:none;background:0 0;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;cursor:pointer;border-radius:8px}",
			".dsh-arch-groupHeader:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}",
			".dsh-arch-chevron{color:var(--dsw-alias-label-tertiary);flex:none;display:inline-flex}",
			".dsh-arch-groupTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}",
			".dsh-arch-groupCount{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:16px;margin-left:auto}",
			".dsh-arch-rows{list-style:none;margin:0;padding:0 0 4px}",
			".dsh-arch-row{display:flex;align-items:center;gap:4px;padding:0 4px 0 24px;border-radius:8px}",
			".dsh-arch-row:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}",
			".dsh-arch-rowMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;padding:6px 4px;border:none;background:0 0;color:var(--dsw-alias-label-primary);font-family:inherit;text-align:left;cursor:pointer}",
			".dsh-arch-rowTitle{text-overflow:ellipsis;white-space:nowrap;overflow:hidden;font-size:13px;line-height:18px}",
			".dsh-arch-rowTime{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px}",
			".dsh-arch-rowActions{flex:none;display:flex;gap:2px}",
			".dsh-arch-rowAction{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:6px;background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer}",
			".dsh-arch-rowAction:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsh-arch-rowAction:disabled{opacity:.4;cursor:default}"
		].join("");
		var tagId = "dsh-liya-archives/archived.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			var tag = document.createElement("style");
			tag.dataset.plugin = "dsh-liya-archives";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var C = {
			layer: "dsh-arch-layer",
			rail: "dsh-arch-rail",
			footerButtons: "dsh-arch-footerButtons",
			badge: "dsh-arch-badge",
			badgeLabel: "dsh-arch-badgeLabel",
			badgeCount: "dsh-arch-badgeCount",
			panel: "dsh-arch-panel",
			header: "dsh-arch-header",
			title: "dsh-arch-title",
			count: "dsh-arch-count",
			body: "dsh-arch-body",
			error: "dsh-arch-error",
			group: "dsh-arch-group",
			groupHeader: "dsh-arch-groupHeader",
			chevron: "dsh-arch-chevron",
			groupTitle: "dsh-arch-groupTitle",
			groupCount: "dsh-arch-groupCount",
			rows: "dsh-arch-rows",
			row: "dsh-arch-row",
			rowMain: "dsh-arch-rowMain",
			rowTitle: "dsh-arch-rowTitle",
			rowTime: "dsh-arch-rowTime",
			rowActions: "dsh-arch-rowActions",
			rowAction: "dsh-arch-rowAction"
		};
		//#endregion

		//#region locales
		var NS = "dsh-liya-archives";
		var EXPANDED_KEY = "dsh.archived.panel.expanded.v1";
		var zh = {
			"panel.title": "已归档会话",
			"panel.count": "共 {count} 个",
			"panel.trigger": "已归档",
			"panel.trigger.aria": "已归档会话（{count} 个）",
			"panel.empty": "暂无已归档会话",
			"group.ungrouped": "未分组",
			"action.restore": "恢复 {title}（移回侧边栏并打开）",
			"action.restore.tip": "移回侧边栏并打开",
			"action.fork": "复制 {title} 为新会话并打开",
			"action.fork.tip": "复制为新会话并打开（原会话保留在已归档）",
			"action.unarchive": "仅移回侧边栏（{title}）",
			"action.unarchive.tip": "仅移回侧边栏，不打开",
			"action.restoreFailed": "恢复会话失败：{message}",
			"action.forkFailed": "复制会话失败：{message}",
			"action.unarchiveFailed": "取消归档失败：{message}",
			"time.justNow": "刚刚",
			"time.minutesAgo": "{n} 分钟前",
			"time.hoursAgo": "{n} 小时前",
			"time.daysAgo": "{n} 天前"
		};
		var en = {
			"panel.title": "Archived Sessions",
			"panel.count": "{count} total",
			"panel.trigger": "Archived",
			"panel.trigger.aria": "Archived sessions ({count})",
			"panel.empty": "No archived sessions",
			"group.ungrouped": "Ungrouped",
			"action.restore": "Restore {title} (unarchive and open)",
			"action.restore.tip": "Unarchive and open",
			"action.fork": "Fork {title} as a new session and open it",
			"action.fork.tip": "Fork and open (the original stays archived)",
			"action.unarchive": "Only unarchive {title}",
			"action.unarchive.tip": "Unarchive without opening",
			"action.restoreFailed": "Restore failed: {message}",
			"action.forkFailed": "Fork failed: {message}",
			"action.unarchiveFailed": "Unarchive failed: {message}",
			"time.justNow": "just now",
			"time.minutesAgo": "{n}m ago",
			"time.hoursAgo": "{n}h ago",
			"time.daysAgo": "{n}d ago"
		};
		//#endregion

		//#region component
		var jsx = jsxRuntime.jsx;
		var jsxs = jsxRuntime.jsxs;
		var Fragment = jsxRuntime.Fragment;

		function relativeTime(ts, now, t) {
			var diff = now - ts;
			if (diff < 60 * 1000) return t("time.justNow");
			var minutes = Math.floor(diff / (60 * 1000));
			if (minutes < 60) return t("time.minutesAgo", { n: minutes });
			var hours = Math.floor(minutes / 60);
			if (hours < 24) return t("time.hoursAgo", { n: hours });
			var days = Math.floor(hours / 24);
			if (days < 30) return t("time.daysAgo", { n: days });
			var date = new Date(ts);
			return date.toLocaleDateString();
		}

		function loadExpanded() {
			try {
				var raw = window.localStorage.getItem(EXPANDED_KEY);
				return raw ? JSON.parse(raw) : {};
			} catch (error) {
				return {};
			}
		}

		function saveExpanded(value) {
			try {
				window.localStorage.setItem(EXPANDED_KEY, JSON.stringify(value));
			} catch (error) {
				/* storage unavailable: expansion state is per-session only */
			}
		}

		/**
		 * 侧边栏底部席位：「已归档 (n)」触发器 + 按工作区分组的归档会话面板，每组默认折叠。
		 * @param {object} props - 组合槽位 props：owner 共享 `wide`、全局标准 hooks
		 * `useSessions`/`useWorkspaces`、locale `t` 席位，以及注入的
		 * `onFork`/`onUnarchive`/`onRestore` 动作。
		 */
		function ArchivedSessionsPanel(props) {
			var wide = props.wide;
			var useSessions = props.useSessions;
			var useWorkspaces = props.useWorkspaces;
			var onFork = props.onFork;
			var onUnarchive = props.onUnarchive;
			var onRestore = props.onRestore;
			var t = props.t;

			var sessions = useSessions(function (s) { return s; });
			var archived = useWorkspaces(function (s) { return s.archivedSessionIds; });
			var workspaceItems = useWorkspaces(function (s) { return s.items; });

			var openState = react.useState(false);
			var open = openState[0];
			var setOpen = openState[1];
			var expandedState = react.useState(loadExpanded);
			var expandedByWorkspace = expandedState[0];
			var setExpandedByWorkspace = expandedState[1];
			var busyState = react.useState(null);
			var busyId = busyState[0];
			var setBusyId = busyState[1];
			var errorState = react.useState(null);
			var errorText = errorState[0];
			var setErrorText = errorState[1];
			var layerRef = react.useRef(null);

			// 点击面板外部关闭。
			react.useEffect(function () {
				if (!open) return;
				var onPointerDown = function (event) {
					var node = layerRef.current;
					if (node !== null && node.contains(event.target)) return;
					setOpen(false);
				};
				document.addEventListener("pointerdown", onPointerDown);
				return function () {
					document.removeEventListener("pointerdown", onPointerDown);
				};
			}, [open]);

			// 在归档集合上推导工作区分组。
			var groups = react.useMemo(function () {
				var set = new Set(archived);
				var byId = sessions.byId || {};
				var out = [];
				var seen = new Set();
				for (var i = 0; i < workspaceItems.length; i++) {
					var ws = workspaceItems[i];
					var members = [];
					for (var j = 0; j < ws.sessionIds.length; j++) {
						var id = ws.sessionIds[j];
						var summary = byId[id];
						if (set.has(id) && summary !== void 0) members.push(summary);
					}
					if (members.length > 0) {
						members.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
						for (var m = 0; m < members.length; m++) seen.add(members[m].id);
						out.push({ key: "ws:" + ws.workspaceId, title: ws.title, path: ws.path, sessions: members });
					}
				}
				var ungrouped = [];
				for (var k = 0; k < archived.length; k++) {
					var id2 = archived[k];
					var s2 = byId[id2];
					if (!seen.has(id2) && s2 !== void 0) ungrouped.push(s2);
				}
				if (ungrouped.length > 0) {
					ungrouped.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
					out.push({ key: "ungrouped", title: t("group.ungrouped"), path: void 0, sessions: ungrouped });
				}
				return out;
			}, [archived, sessions.byId, workspaceItems, t]);

			var count = archived.length;
			// 没有归档会话：什么都不渲染（席位整体消失）。
			if (count === 0) return null;

			var toggleWorkspace = function (key) {
				setExpandedByWorkspace(function (prev) {
					var next = {};
					for (var k in prev) next[k] = prev[k];
					next[key] = !prev[key];
					saveExpanded(next);
					return next;
				});
			};

			var runAction = function (sessionId, action, errorKey) {
				if (busyId !== null) return;
				setBusyId(sessionId);
				setErrorText(null);
				action(sessionId).catch(function (error) {
					setErrorText(t(errorKey, {
						message: String(error && error.message || error)
					}));
				}).finally(function () {
					setBusyId(null);
				});
			};

			var handleRestore = function (sessionId) {
				runAction(sessionId, onRestore, "action.restoreFailed");
			};
			var handleFork = function (sessionId) {
				runAction(sessionId, onFork, "action.forkFailed");
			};
			var handleUnarchive = function (sessionId) {
				runAction(sessionId, onUnarchive, "action.unarchiveFailed");
			};

			return jsxs("div", {
				ref: layerRef,
				className: wide ? C.layer : C.layer + " " + C.rail,
				children: [
					open && jsxs("section", {
						key: "panel",
						className: C.panel,
						"data-archived-panel": true,
						"aria-label": t("panel.title"),
						children: [
							jsxs("header", {
								key: "header",
								className: C.header,
								children: [
									jsx("span", { key: "title", className: C.title, children: t("panel.title") }),
									jsx("span", { key: "count", className: C.count, children: t("panel.count", { count: count }) })
								]
							}),
							errorText !== null && jsx("p", { key: "error", className: C.error, role: "alert", children: errorText }),
							jsx("div", {
								key: "body",
								className: C.body,
								children: groups.map(function (group) {
									var isOpen = expandedByWorkspace[group.key] === true;
									return jsxs("section", {
										key: group.key,
										className: C.group,
										children: [
											jsx("button", {
												key: "groupHeader",
												type: "button",
												className: C.groupHeader,
												"aria-expanded": isOpen,
												onClick: function () { toggleWorkspace(group.key); },
												children: [
													jsx(isOpen ? primitives.IconChevronDownOutline14 : primitives.IconChevronRightOutline14, {
														key: "chevron",
														className: C.chevron,
														size: 14
													}),
													jsx("span", { key: "title", className: C.groupTitle, title: group.path, children: group.title }),
													jsx("span", { key: "count", className: C.groupCount, children: String(group.sessions.length) })
												]
											}),
											isOpen && jsx("ul", {
												key: "rows",
												className: C.rows,
												children: group.sessions.map(function (summary) {
													return jsxs("li", {
														key: summary.id,
														className: C.row,
														"data-session": summary.id,
														children: [
															jsx("button", {
																key: "main",
																type: "button",
																className: C.rowMain,
																title: t("action.restore.tip"),
																onClick: function () { handleRestore(summary.id); },
																children: [
																	jsx("span", { key: "title", className: C.rowTitle, children: summary.displayTitle }),
																	jsx("span", { key: "time", className: C.rowTime, children: relativeTime(summary.updatedAt, Date.now(), t) })
																]
															}),
															jsx("div", {
																key: "actions",
																className: C.rowActions,
																children: [
																	jsx("button", {
																		key: "fork",
																		type: "button",
																		className: C.rowAction,
																		"aria-label": t("action.fork", { title: summary.displayTitle }),
																		title: t("action.fork.tip"),
																		onClick: function () { handleFork(summary.id); },
																		disabled: busyId !== null,
																		children: jsx(primitives.IconBranchOutline16, { size: 14 })
																	}),
																	jsx("button", {
																		key: "unarchive",
																		type: "button",
																		className: C.rowAction,
																		"aria-label": t("action.unarchive", { title: summary.displayTitle }),
																		title: t("action.unarchive.tip"),
																		onClick: function () { handleUnarchive(summary.id); },
																		disabled: busyId !== null,
																		children: jsx(primitives.IconRefreshOutline14, { size: 14 })
																	})
																]
															})
														]
													});
												})
											})
										]
									});
								})
							})
						]
					}),
					jsx("div", {
						key: "trigger",
						className: C.footerButtons,
						children: jsxs("button", {
							type: "button",
							className: C.badge,
							"data-archived-count": count,
							"aria-label": t("panel.trigger.aria", { count: count }),
							"aria-expanded": open,
							onClick: function () { setOpen(!open); },
							children: [
								jsx(primitives.IconArchiveOutline20, { key: "icon", size: 18 }),
								wide && jsxs(Fragment, {
									key: "label",
									children: [
										jsx("span", { key: "label", className: C.badgeLabel, children: t("panel.trigger") }),
										jsx("span", { key: "count", className: C.badgeCount, children: String(count) })
									]
								})
							]
						})
					})
				]
			});
		}
		//#endregion

		//#region entry
		var inject = ["slots", "sessions", "workspaces", "locale"];

		/**
		 * 设置 → 插件 只读信息卡（settings.plugin.item）：
		 * 让第三方插件在「插件配置」页可见（官方只写死三张卡，第三方要自带卡片）。
		 * 照 dsh-liya-ui / dsh-liya-skin 的卡模式。
		 */
		function ArchivesInfoCard() {
			var openState = react.useState(false);
			var open = openState[0];
			var setOpen = openState[1];
			var titleRow = react.createElement(
				'button',
				{
					type: 'button',
					'aria-expanded': open,
					onClick: function () { setOpen(!open); },
					style: {
						display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
						gap: 10, padding: '10px 12px', border: 0, background: 'transparent',
						color: 'var(--dsw-alias-label-primary)', font: 'inherit', cursor: 'pointer', textAlign: 'left'
					}
				},
				react.createElement(
					'span',
					{ style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
					react.createElement('strong', { style: { fontSize: 13, fontWeight: 600 } }, 'dsh-liya-archives'),
					react.createElement('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, '归档会话抽屉（抄改自 chou109/dsh-archives，MIT）')
				),
				react.createElement(
					'span',
					{ 'aria-hidden': 'true', style: { transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none', fontSize: 10, color: 'var(--dsw-alias-label-tertiary)' } },
					'▾'
				)
			);
			var body = open
				? react.createElement(
						'div',
						{ style: { borderTop: '1px solid var(--dsw-alias-border-l2)', padding: '10px 12px' } },
						react.createElement('p', { style: { margin: '0 0 8px', fontSize: 13, color: 'var(--dsw-alias-label-secondary)', lineHeight: '20px' } },
							'把被归档后「消失」的会话找回来：侧边栏底部「已归档 (n)」按钮 → 按工作区分组列出归档会话，点击恢复并打开 / 复制为新会话 / 仅移回侧边栏。'),
						react.createElement('p', { style: { margin: '0 0 8px', fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', lineHeight: '18px' } },
							'入口在侧边栏底部（不是设置页）；没有任何归档会话时按钮自动隐藏。'),
						react.createElement('p', { style: { margin: 0, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', lineHeight: '16px', fontFamily: 'monospace' } },
							'host 路由 POST /liya-archives/unarchive · 数据 $DSH_HOME/storages/workspace.json → global.archivedSessionIds')
					)
				: null;
			return react.createElement(
				'li',
				{ style: { listStyle: 'none' } },
				react.createElement(
					'div',
					{ style: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 10, overflow: 'hidden', minWidth: 0 } },
					titleRow,
					body
				)
			);
		}

		/**
		 * 侧边栏 footer-action 槽位声明后注册「已归档」席位。动作闭包持有 client
		 * 根 ctx：fork 走 sessions 服务；unarchive/restore 调本包 node 半挂载的端点。
		 * @param {object} ctx - client 根上下文。
		 */
		function apply(ctx) {
			ctx.effect(function () {
				return ctx.locale.register(NS, { zh: zh, en: en });
			}, "dsh-liya-archives: dictionaries");
			ctx.slots.inject("sidebar.footer.action", function () {
				return ctx.slots.register({
					name: "sidebar.footer.action",
					id: "dsh-liya-archives",
					locale: NS,
					inject: function () {
						/** POST 取消归档请求；非 ok 负载抛错。 */
						var requestUnarchive = function (sessionId) {
							return fetch("/liya-archives/unarchive", {
								method: "POST",
								headers: { "content-type": "application/json" },
								body: JSON.stringify({ sessionId: sessionId })
							}).then(function (response) {
								return response.json();
							}).then(function (payload) {
								if (!payload.ok) throw new Error(payload.error || "unarchive failed");
								return payload;
							});
						};
						/**
						 * 等 client 归档集合真正丢掉该 id（宿主帧往返），
						 * 避免后续 open() 被基于旧集合的投影清扫清掉。
						 */
						var waitArchivedDropped = function (sessionId, timeoutMs) {
							return new Promise(function (resolve) {
								var current = ctx.workspaces.list.getSnapshot().archivedSessionIds;
								if (!current.includes(sessionId)) {
									resolve();
									return;
								}
								var unsub = ctx.workspaces.list.subscribe(function () {
									if (!ctx.workspaces.list.getSnapshot().archivedSessionIds.includes(sessionId)) {
										unsub();
										resolve();
									}
								});
								setTimeout(function () {
									unsub();
									resolve();
								}, timeoutMs);
							});
						};
						return {
							onFork: function (sessionId) {
								return ctx.sessions.fork({ sessionId: sessionId, increaseTitle: true }).then(function (childId) {
									ctx.sessions.open(childId);
								});
							},
							onUnarchive: function (sessionId) {
								return requestUnarchive(sessionId);
							},
							onRestore: async function (sessionId) {
								await requestUnarchive(sessionId);
								await waitArchivedDropped(sessionId, 5000);
								ctx.sessions.open(sessionId);
							}
						};
					}
				}, ArchivedSessionsPanel);
			});
			// 设置 → 插件 信息卡（只读，第三方插件可见性）
			ctx.slots.inject("settings.plugin.item", function () {
				return ctx.slots.register(
					{
						name: "settings.plugin.item",
						id: "dsh-liya-archives",
						order: 30,
						label: function () { return "dsh-liya-archives"; }
					},
					function () { return react.createElement(ArchivesInfoCard, {}); }
				);
			});
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
