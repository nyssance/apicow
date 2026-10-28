- Tag safety: app AND CLI releases both ship from `v*` tags (the CLI is version-locked to the app and publishes to npm on every app tag); `@yaakapp/api` uses `yaak-api-*` tags. Always confirm which is requested before retagging.
- Do not commit, push, or tag without explicit approval

# ApiCub 当前范围

- 产品名 ApiCub；独立仓库，保留 Yaak MIT 版权声明与上游 Git 历史。
- 2026-10-29 用户要求一次完成第一阶段：接入 GitCub 所用 Tauri 3，简体中文和英文切换，macOS 优先。
- 仅做必要的名称、应用 ID、数据目录与更新渠道隔离；保留原版布局、功能、SQLite、协议引擎、插件和工具链，不添加造数或顺带全面升级依赖。
- 用户于 2026-10-29 明确授权持续提交、推送开发进展；远端为私有仓库 nyssance/apicub。阶段性提交说明实际验证状态。发布与打标签仍须单独授权。
- 来源基线：mountain-loop/yaak 4abc882e131e2fd29412cfbc701767bbed0f5c48。
- 验证区分实际执行结果与静态检查，不把未运行的测试报告为通过。
