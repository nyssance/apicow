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

## 中文界面收尾

- 快捷键名称和作用域中文化，筛选同时匹配中文显示名和原版英文 ID；保存的快捷键 ID 与按键组合保持不变。
- 补齐继承标头、原生下拉默认值标记、横向 / 纵向布局提示；英文应用菜单版本及界面说明使用 ApiCub 名称。
- 全量前端测试再次通过：80 个文件、1025 项；lint / 类型检查与前端生产构建通过。
- 扩展并通过 `npm run test:hasgard`：中文“发送当前请求”能定位动作，英文 `request send` 仍能筛选同一动作；原有语言切换、GET/POST 校验继续通过。
- 修正回归脚本首次进入工作区分支的选择器引号。保留原版布局及组件库，未引入 shadcn。

## 扩展原生功能回归（2026-10-29）

入口：先启动 `ApiCub Test.app` 并设置 `TAURI_HASGARD_SOCKET`，依次运行
`npm run test:hasgard` 与 `npm run test:native-workflows`。
后者使用本机 HTTP、WebSocket、gRPC 和 HTTPS 服务、虚构凭据及临时夹具。
测试使用的证书和夹具在结束时移除；测试工作区保留在隔离的 Test 应用中便于检查。
代理测试在 finally 中恢复 Test 应用原来的设置。没有真实账号或远端写操作。

| 范围                     | 执行层与断言                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Postman 导入             | 真实对话框：文件路径、格式识别、预览、应用、完成摘要；核对请求数量                                                                                     |
| Basic / Bearer / API Key | 导入后从请求界面发送；本机服务器核对实际 Authorization 或自定义标头，Basic 密码含中文                                                                  |
| JSON                     | 本机服务器逐字核对 UTF-8 请求体，保留 `Name`、`Send 中文` 和 `Settings`                                                                                |
| 重定向与 Cookie          | 302 跳转后核对最终路径及服务端收到的 Cookie                                                                                                            |
| SSE                      | 实际 HTTP 请求后核对界面渲染的两条事件，包含中文                                                                                                       |
| 导出再导入               | 通过应用真实 `cmd_export_data` 导出，然后用导入对话框重新导入；比较请求名、方法、URL、请求体、类型、标头、查询参数与认证配置；不包含系统保存对话框验收 |
| WebSocket                | 界面创建、连接、发送、显示回显与关闭；服务器核对原始中文消息和连接关闭                                                                                 |
| OpenAPI                  | 界面导入；显式选择 `Server 1` 环境后发送，验证 baseUrl 模板及示例 JSON 请求体；仅选择 Global Variables 时不会自动获得服务器变量                        |
| gRPC 单次 / 服务端流     | 界面导入请求，Hasgard 调用实际 Rust RPC，使用临时 proto 和本机 grpc-js 服务；核对服务描述、消息原文及正常结束状态。未计为发送按钮或原生文件选择器验收  |
| TLS                      | 真实 Rust 请求引擎拒绝不可信自签名证书；仅该次临时请求显式关闭校验后可读取回显，未关闭全局校验                                                         |
| HTTP 代理                | 实际配置和请求引擎，核对代理收到 absolute-form URL 和 Proxy-Authorization；命中绕过规则后核对 origin-form URL 且不泄露代理认证标头                     |

这些是 ApiCub 独有的端到端回归，基于保留的上游功能，并非宣称一比一移植全部上游测试。
来源调用链包括 `ImportDataDialog → cmd_import_data/cmd_commit_import`、
`ExportDataDialog → cmd_export_data → yaak-models/export.rs`、
`plugins/auth-{basic,bearer,apikey}`、`WebsocketRequestPane`、
`cmd_grpc_reflect/cmd_grpc_go → yaak-grpc`。
上游 `GrpcEvent::order_by` 为 CreatedAt 倒序；测试按事件时间顺序核对流中的消息。

本轮修正导入来源提示、预览动作、变更说明、完成计数及 WebSocket 连接/消息状态的中文。
测试脚本另断言中文预览、完成摘要和连接状态，避免仅有翻译字典而实际界面仍显示英文。

仍不是最佳：未完成 OAuth 交互、Digest/NTLM/AWS 的原生端到端、gRPC 客户端/双向流与取消、
双向 TLS/系统证书、HTTPS CONNECT/SOCKS 代理、导入冲突全分支、Git 同步及全界面逐项验收；
没有与 Yaak 的同机性能对比。已有插件/引擎单元测试通过不替代这些原生验证。
下一顺序：补齐上述高影响异常路径和 Git 工作流，再建立同机性能基准。

本轮最终结果：更新后的打包 Test 应用上，两套 Hasgard 脚本均通过；全量前端 80 文件 / 1025 项通过，lint 与类型检查通过（3 项原有警告）。Rust 未改动，Tauri 原生打包编译通过。中文摘要回归额外发现并修复单数 Environment 漏译。
