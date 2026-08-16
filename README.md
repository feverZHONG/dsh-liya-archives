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

> `dsh` 请替换为阁下 DSH 安装对应的 CLI 调用方式。

装完**重启 WebUI**（client 半生效需要），侧边栏底部出现「已归档 (n)」；
没有任何归档会话时按钮自动隐藏——先归档一个会话再验证。

## 数据契约

- 归档集合：`$DSH_HOME/storages/workspace.json` → `global.archivedSessionIds`
- 取消归档走 workspace registry 自身写路径（`enqueueOperation → setState`），
  经 `domain/changed` → `host/archived-sessions-changed` 帧实时同步所有标签页
- 直接 `open()` 归档会话会被运行时清除选中（框架设计）——所以「恢复」必须先取消归档、等集合同步再打开

## 已知限制

- 面板是固定定位浮层，与 Cordis 插件面板同时打开会重叠
- 针对 dsh 0.1.0-rc.5/rc.6 开发验证；升级 DSH 后若槽位/服务名变更需适配
