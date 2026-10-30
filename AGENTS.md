- Tag safety: ApiCow desktop releases use new `v*` tags. The inherited CLI/npm workflow is restricted to mountain-loop/yaak and must stay disabled in this fork. `@yaakapp/api` uses `yaak-api-*` tags. Never move an existing release tag.
- Do not commit, push, or tag without explicit approval

# ApiCow 当前范围

- 产品名 ApiCow；独立仓库，保留 Yaak MIT 版权声明与上游 Git 历史。
- 2026-10-29 用户要求一次完成第一阶段：接入 GitCub 所用 Tauri 3，简体中文和英文切换，macOS 优先。
- 仅做必要的名称、应用 ID、数据目录与更新渠道隔离；保留原版布局、功能、SQLite、协议引擎、插件和工具链，不添加造数或顺带全面升级依赖。
- 用户于 2026-10-29 明确授权持续提交、推送开发进展；远端为公开仓库 nyssance/apicow。阶段性提交说明实际验证状态。发布与打标签仍须单独授权。
- 来源基线：mountain-loop/yaak 4abc882e131e2fd29412cfbc701767bbed0f5c48。
- 验证区分实际执行结果与静态检查，不把未运行的测试报告为通过。

- 用户于 2026-10-29 指定使用 tauri-hasgard 调试；原生回归通过 `hasgard-testing` 功能和独立测试应用标识执行，默认产品构建不启用调试桥。

- 用户于 2026-10-29 授权按原版功能回归与中文全界面验收优先；原生测试仅使用独立测试标识、本机服务和虚构凭据。每次交付明确剩余未覆盖项，不以测试通过宣称最佳。

- 2026-10-29 用户明确纠正：HTTP 引擎沿用同一份上游代码，不把 Yaak 同机对比作为收尾任务或交付缺口。当前完成 Tauri 3 适配和中文界面，保持原版功能；只有具体性能问题或用户专项要求时才定向测量。

- 2026-10-30 用户明确要求依赖升级至最新版本（包含大版本），不因旧 API 兼容性保留旧直接依赖；需迁移代码并验证。此要求取代之前“不顺带全面升级依赖”的限制。`fab u` 直接使用 Bun/Cargo，不依赖 vp。

- 2026-10-30 用户授权本次发布，并要求 macOS 与 Windows 各一个安装包：macOS Apple Silicon DMG、Windows x64 NSIS EXE。若发布受阻，先修复 publish 流程；不得发布不完整的双平台更新清单。

- 发布品牌基线：黑白牛头，保持原有轮廓，不含左侧圆环/波浪。`scripts/branding-baseline.json` 固定已目视确认的图标指纹、名称、应用 ID 和更新源；不得为通过检查而自动更新基线。更改必须核对实际最终安装包。CI 同时验证 DMG、更新归档与 Windows 安装器内的应用图标，任何一项失败禁止公开版本及更新清单。

- 2026-10-30 用户要求产品发布隔离：ApiCow 正式 Release 与 Latest 仅在 nyssance/apicow；禁止在共用仓切换 Latest。nyssance/releases 的 apicow-latest 只保留旧客户端兼容清单，不再向该仓发布 ApiCow 新版本。

- 2026-10-30 用户要求检查全部产品跳转，不得引导至 Yaak：更新说明/下载/反馈使用 ApiCow 独立仓；没有对应文档的帮助入口隐藏。检查范围包括前端、原生菜单、插件 Markdown/元数据、OAuth 回调、通知、README 和 GitHub Issue 模板。保留 MIT 版权；API 请求目标和未发布的上游 CLI 服务代码不作为产品导航替换。发布前执行 `bun run check:branding`，不得只改菜单或为过检缩小扫描范围。
