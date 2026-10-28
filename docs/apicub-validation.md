# ApiCub 第一阶段验证

日期：2026-10-29。上游基线：`mountain-loop/yaak@4abc882e131e2fd29412cfbc701767bbed0f5c48`。

## 实现范围

- 使用 GitCub 同系列 Tauri 3 alpha 依赖；macOS Wry 构建。
- 简体中文 / English 界面切换，用户语言偏好持久化，原生菜单跟随语言。
- ApiCub 应用名称、应用标识、数据目录、深链接和更新配置隔离。
- 保留上游布局、SQLite、请求协议、插件接口及 MIT 版权声明。

## 已执行

- `npm run lint`：通过，保留 3 项现有 lint 警告。
- `npm run build`：全部 workspace 构建通过。
- `vp test`：80 个文件、1025 项测试通过，包括语言选择、插值数据保持和设置窗口内部标识回归。
- `cargo check --workspace --features yaak-app-client/wry`：通过。
- `cargo clippy --workspace --features yaak-app-client/wry`：通过，仍有警告；修复了上游更新 ACK 等待逻辑的 `never_loop` 错误，删除只执行一次的循环，保持 ACK / action / 超时行为。
- `cargo test --workspace --features yaak-app-client/wry`：单元 / 集成测试共 960 项通过；随后文档测试阶段发生 crate 读取错误。
- 单独串行重跑 `cargo test --workspace --doc --features yaak-app-client/wry`：通过；4 项上游文档测试为 ignored，不计入已执行用例。
- 更新等待逻辑修正后，`cargo test -p yaak-app-client --lib --features wry`：17 项通过。
- OpenAPI roundtrip：5 份上游规范、107 个请求通过 mock 校验；保留脚本自身对 httpbin redirect-to 的 known 标记。
- `npm run vendor`：成功生成插件和运行时资源。
- Tauri CLI 生成未签名的 `target/debug/bundle/macos/ApiCub Dev.app`；构建成功。
- 直接运行开发二进制：插件宿主启动并响应认证 / 模板函数 RPC。

## 未完成的验证与边界

- 原电脑控制工具拒绝访问 ApiCub Dev；按用户要求改用 Hasgard 0.6.2，已完成下述打包版原生回归。
- 未验证 CEF、Windows、Linux、发布签名、公证或自动更新分发。
- Tauri 3 仍为 alpha 版本。第三方插件自有文本及底层诊断可能仍显示英文；原版图标暂保留。
- 当前是开发阶段交付，不宣称已达到稳定发行版或完整替代 Apifox。

## 仓库

开发进展持续提交到私有仓库 `nyssance/apicub`，保留 `upstream` 溯源。不自动创建版本标签或发布产品。

## Hasgard 原生回归（2026-10-29）

- `tauri-plugin-hasgard = "0.6"`，锁定 0.6.2；通过 `hasgard-testing` feature 接入，独立应用标识 `com.nyssance.apicub.test`。默认构建不注册调试桥、不包含 Hasgard capability。
- 实测发现 Tauri 内容探测把包含 PDF magic 的 JS 分块误判为 `application/pdf`，导致进入工作区出现路由错误。现在对成功返回的内置 `/assets/*.js` 明确设置 `text/javascript`，工作区正常加载；协议响应和用户数据不受影响。
- `npm run test:hasgard` 在真实打包的 macOS Wry WebView 中通过：创建 HTTP 请求；设置控件英文→中文切换；主窗口和设置窗口的语言与 localStorage 同步；本机 GET/POST 返回 200；服务端逐字断言 query 与 JSON 原文。
- CodeMirror 输入由 Hasgard eval 调用真实编辑器 view.dispatch，经过原有 React 保存链路；普通按钮和选择器通过 Hasgard 操作。该回归不宣称验证物理键盘输入。
- 结束应用后重新启动，核对中文偏好、JSON 请求体及 200 响应记录均保留。
- 修复实测发现的“无环境”与认证页签英文回退、主窗口初始标题残留 Yaak。
- 最新前端构建、lint/类型检查通过；i18n / 设置窗口标识 5 项回归通过。
- Hasgard 默认原生截图的窗口选择返回错误，指定 native window id 可截图；本次不将截图结果作为像素级一致性验收。

- `cargo clippy --workspace --features yaak-app-client/hasgard-testing` 通过（保留上游警告）。`cargo check -p yaak-app-client --features wry` 通过，生成的默认 capabilities 不含 `hasgard-testing`。
