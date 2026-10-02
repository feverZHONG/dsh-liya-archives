# dsh-liya-archives · 归档会话抽屉（莉娅版）

> 抄改自 [chou109/dsh-archives](https://github.com/chou109/dsh-archives)（MIT）。
> 社区礼仪：保留原作者版权声明与本改造说明，任何分发请保留 LICENSE 全文。

DSH Web 侧边栏底部的**归档会话抽屉**：把被归档后「消失」的会话找回来。

DSH 会话归档后只从侧边栏隐藏，日志和数据都还在磁盘上，但界面没有任何恢复入口。
本插件在侧边栏**底部**加一个「**已归档 (n)**」按钮，列出全部归档会话、按工作区分组，一键操作：

| 操作 | 效果 |
|:-----|:-----|
| 点击会话行 | 恢复并打开（取消归档 → 等集合同步 → 打开，实时生效） |
| ⿻ 按钮 | 复制为新会话并打开（原会话保留在已归档） |
| ↻ 按钮 | 仅移回侧边栏，不打开 |

## 与原版（chou109/dsh-archives）的差异

| 项 | 原版 | 莉娅版 |
|:---|:-----|:-------|
| 包名 / bundle id / 槽位 id / locale NS | `dsh-archives` | `dsh-liya-archives` |
| host 路由 | `POST /archives/unarchive` | `POST /liya-archives/unarchive` |
| 列表 key | 渲染有 React key 警告 | 已补 key 修复 |

功能与 UI 语义（按工作区分组折叠、展开状态记忆、中英双语文案、点面板外关闭、rail 收起模式、无归档自动隐藏）与原版一致。

## 结构

```
dsh-liya-archives/
  package.json        # name 必须等于 bundle id 和加载器 name
  cordis.patch.yml    # 挂载条目（insert → web profile）
  index.js            # host 半：POST /liya-archives/unarchive
  client.js           # browser 半：sidebar.footer.action 槽位 UI
  LICENSE             # MIT（含原版与改造版权声明）
  tests/              # 冒烟测试（host + client，无外部依赖）
```

## 自检与打包

```powershell
# 冒烟测试（host + client，无外部依赖，用 DSH profile 的真实依赖跑）
$env:DSH_PROFILE_NODE_MODULES = "<你的 DSH profile node_modules 路径>"
node tests/host-test.mjs
node tests/smoke-test.cjs

# 打包（产物为可分发 tgz）
pnpm pack
```

## 安装到 DSH

```powershell
dsh plugin --profile web add <插件目录>
```

> `dsh` 请替换为你自己 DSH 安装对应的 CLI 调用方式。

装完**重启 WebUI**（client 半生效需要），侧边栏底部出现「已归档 (n)」；
没有任何归档会话时按钮自动隐藏——先归档一个会话再验证。

## 数据契约

- 归档集合：`$DSH_HOME/storages/workspace.json` → `global.archivedSessionIds`
- 取消归档走 workspace registry 自身写路径（`enqueueOperation → setState`），
  经 `domain/changed` → `host/archived-sessions-changed` 帧实时同步所有标签页
- 直接 `open()` 归档会话会被运行时清除选中（框架设计）——所以「恢复」必须先取消归档、等集合同步再打开

## 已知限制

- 面板是固定定位浮层，与 Cordis 插件面板同时打开会重叠
- 针对 dsh 0.2.0-rc.2 验证（配置已迁到 `Config`(.volatile) + `configForms`）；升级 DSH 后若槽位/服务名变更需适配

## 姊妹仓库

同族的其它 DSH 插件（各一个独立仓库）：

- [dsh-liya-skin](https://github.com/feverZHONG/dsh-liya-skin) —— 皮肤：壁纸（缩略图选择 + 透明度滑条）+ 星月皮肤层（星带 / 星轨 / 标题栏徽标），素材自备
- [dsh-liya-ui](https://github.com/feverZHONG/dsh-liya-ui) —— UI 润色：统一加大圆角，radius 可在原生设置页调（4–48）
- [dsh-character-emote](https://github.com/feverZHONG/dsh-character-emote) —— 角色立绘表情：多角色 + 流式情绪自动判定 + 拖拽缩放，素材自备
- [dsh-liya-workspace](https://github.com/feverZHONG/dsh-liya-workspace) —— 工作区档案速览：FILE-MAP 摘要 / memory·records·diary 统计 / 最近日记
- [dsh-puzzle](https://github.com/feverZHONG/dsh-puzzle) —— 莉娅拼图：滑块拼图小游戏，agent 可发话 / 换图 / 看进度
- [dsh-chess-xq](https://github.com/feverZHONG/dsh-chess-xq) —— 天界象棋：中国象棋人机对战，可悔棋 / 存档 / 调难度
- [dsh-dist-manager](https://github.com/feverZHONG/dsh-dist-manager) —— 插件分发目录（dist/）管理：自动归档旧版本 + WebUI 管理页

## 许可

**双许可**——文档与代码分开：

- **代码**（`index.js`、`client.js` 与其它源文件；`LICENSE` 保留上游版权声明）：**MIT** —— 拿去用、改、再发，保留版权声明即可。
- **文档**（本 README 的正文）：**[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)** —— 可以自由使用、改编、连商用都行，**但要署名**（莉娅 / [@feverZHONG](https://github.com/feverZHONG)）并注明来源。

两份许可的全文：`LICENSE`（MIT）／`LICENSE-DOCS`（CC BY 4.0）。

> 本插件抄改自 [chou109/dsh-archives](https://github.com/chou109/dsh-archives)（MIT）：`LICENSE` 保留了上游版权行与改造说明，改造内容一并登记在该文件里。

---

*莉娅（[@feverZHONG](https://github.com/feverZHONG)）· 宇宙美好记录官*
