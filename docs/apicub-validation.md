# ApiCub 第一阶段验证

日期：2026-10-29。上游基线：`mountain-loop/yaak@4abc882e131e2fd29412cfbc701767bbed0f5c48`。

当前收尾范围以 Tauri 3 适配、中文界面和原版功能保持为准。以下各轮记录保留当时结果；历史记录中的性能对比建议已由用户取消，不再作为当前交付缺口。

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

- `tauri-plugin-hasgard = "0.6"`，锁定 0.6.2；通过 `hasgard-testing` feature 接入，独立应用标识 `day.dreamer.apicow.test`。默认构建不注册调试桥、不包含 Hasgard capability。
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

## 高风险原生回归与取消修复（2026-10-29）

入口：`TAURI_HASGARD_SOCKET=<路径> npm run test:native-advanced`。
通过 Hasgard 调用打包 Test 应用的实际 Rust RPC / Tauri 事件，连接本机服务；
不是完整 UI 按钮、证书选择器或 Git 同步设置界面的验收。

- Git：临时 bare 远端和两个克隆，实际克隆、暂存、提交、推送、抓取、拉取、建分支与切换；独立 git 命令核对远端提交 ID、分支及中文文件原文。只写临时仓库，不连接托管平台。
- OAuth：实际 OAuth 插件的 client_credentials，核对表单字段、Bearer 标头、过期重新获取和缓存复用；错误凭据不发送受保护请求，修正后恢复。仅虚构令牌，不包含浏览器授权码 / PKCE。
- 双向 TLS：服务器验证客户端证书身份；缺失、禁用和错误端口均拒绝，正确证书成功。仅单次请求关闭自签服务器证书校验，全局设置在 finally 恢复，临时私钥删除。
- gRPC：客户端流汇总、双向流逐条回显、客户端半关闭后取消，核对中文消息原文、结束状态和服务端取消事件。
- 真实复现 `cmd_grpc_go` 的取消缺陷：Commit 丢弃发送端后，Cancel 被发送端存在性检查提前返回。修复为先解析并处理 Cancel，再检查发送端。旧构建稳定超时 `HalfClose finishes`；新构建同一用例通过，状态为 1（Cancelled）。
- `until` 支持等待异步断言，避免 Promise 被误判为条件已满足。

这些是 ApiCub 新增的原生集成回归，不代表官方没有相应测试，也不是上游覆盖率审计。
此前列出的 Git、OAuth 和 gRPC 缺口按上述实际执行层收窄；浏览器 OAuth、Git 文件同步 UI、
系统证书、HTTPS CONNECT/SOCKS、其他认证和导入冲突全分支仍未覆盖。

验证结果：更新后的 macOS Test 打包完成，三套 Hasgard 原生脚本通过；全量前端 80 文件 / 1025 项通过；npm workspace 测试、lint/类型检查及客户端 Clippy 通过（保留上游警告）。全量测试发现 JSONPath 测试用不完整 View 调用 forceParsing 的时序问题，改用 ensureSyntaxTree 和真实 State transaction，断言不变；语言测试等待重载后的控件与中文内容，避免 DOM lang 已更新但组件尚未就绪的竞态。

### 失败路径进一步验证

- Git：带未提交修改的拉取返回 `uncommitted_changes`，文件和 HEAD 不变；本地 / 远端各有新提交时，推送被拒绝且远端 HEAD 不变，拉取返回 `diverged` 且保留本地文件与提交。
- gRPC：增加发送端仍开放时取消及四种调用形态的权限拒绝。复现单次调用把服务端 `PERMISSION_DENIED`（7）错误记录为 `UNKNOWN`（2）；原因是 unary / streaming / server_streaming 使用 TonicError，而应用只从 GrpcStreamError 提取原始状态。统一这些请求路径的错误封装，保留状态码、消息和元数据；客户端流原本已使用该封装。
- 中文设置检查覆盖通用、主题、界面、快捷键、插件、智能体、证书和代理的当前默认页面。补齐快捷键列表 `Sidebar` 与 `Duplicate Request` 两项漏译并增加原生断言；主题名称、示例代码、第三方插件名称及既有 CLI 命令保留原文。此检查不等于所有弹窗、隐藏分支或像素一致性验收。

补充实测：带认证的 HTTPS CONNECT 代理通过本机隧道访问双向 TLS 服务，核对 CONNECT 目标、代理认证标头、服务端客户端证书身份和响应原文；目标服务器没有收到 Proxy-Authorization。原先 HTTPS CONNECT 未覆盖项已补齐，SOCKS 仍未测。
四种 gRPC 权限拒绝均返回状态 7 与原始 `fixture denied`；普通取消和半关闭取消均返回状态 1。新版 Test 应用中文快捷键断言通过。Rust gRPC 库 4 项测试与 Clippy 通过，前端全量仍为 80 文件 / 1025 项通过。

当前仍不是最佳：尚无与原版 Yaak 的同机性能对比；浏览器 OAuth/PKCE、其余认证、SOCKS、Git 文件同步 UI 和全界面隐藏分支未完成原生验证。优先继续这些兼容性验证，再做性能基准；不以本轮测试通过声称所有官方功能已完全验收。

最终 Test / Dev 两种 macOS 包均重建成功，三套原生脚本全部通过；lint/类型检查通过（3 项原有警告）。Dev 的 Cargo features 为 default/wry，对应 OUT_DIR capabilities 只有 default，不包含 Hasgard。注意源码目录 gen/schemas 是多构建共享的编辑器产物，可能留有 Test 记录；实际 Tauri context 读取对应构建的 OUT_DIR/capabilities.json，不能用共享 schema 判断产品权限。

## 浏览器 OAuth、SOCKS 与窗口生命周期（2026-10-29）

`node scripts/test-native-oauth-socks.mjs` 在打包 Test 应用通过：
本机授权页面在真正的内嵌 WebView 中加载并导航到回调；服务端核对 PKCE S256 challenge/verifier、授权码交换、redirect_uri 和 Bearer 标头；再次请求复用令牌；拒绝授权不换取令牌、不发送受保护请求。这里不模拟平台账户登录，也未验收系统外部浏览器和真实身份提供商。

连续授权复现了应用崩溃：授权窗口销毁后收到延迟 Focused 事件，插件更新器用 `get_webview_window(...).unwrap()` 解引用不存在的窗口。改为忽略已经销毁的窗口，同步修正应用更新器同类入口。相同授权成功 / 拒绝序列复测不再退出。

SOCKS5h 使用本机协议服务器，验证用户名密码握手、成功响应的中文原文、错误密码拒绝，以及目标 HTTP 服务收不到代理凭据；不将此扩大为所有 SOCKS/DNS/IPv6 场景兼容。

## 文件同步与 Git 原生界面验收（2026-10-29）

`npm run test:native-sync`：通过工作区设置界面的实际目录拖放处理器保存 Test 数据目录内的临时路径，验证请求 YAML 写出；外部修改 YAML 后出现变更确认对话框，点击应用后侧栏更新；用界面初始化 Git、勾选暂存并提交，独立 Git 命令验证提交说明及树中的中文文件内容。提交说明经真实 CodeMirror view.dispatch 输入。没有模拟系统目录选择器或物理拖动；定向 Tauri 事件权限仅加入 hasgard-testing capability，普通 Dev 构建 OUT_DIR 中仍只有 default。结束后解除同步并删除自建临时目录。

实测复现旧模型覆盖问题：窗口写入的新 workspace_meta（含同步目录）先到，后台轮询稍后发送更早的创建快照（同步目录为空），前端把新值覆盖并停止监听。现在对 upsert 忽略比当前模型 updatedAt 更旧的快照。新增两个模型层回归覆盖同批和跨批乱序，并验证后续较新的后台更新仍能生效；不是对全部并发删除 / 冲突语义的全面证明。

自定义 capability glob 原先不触发目录变更监听，增量构建可能继续使用旧权限文件。build.rs 显式监听 capabilities 目录，已用 Test 定向事件权限重新构建及实际调用验证。

补齐目录选择控件、Git 状态和同步变更摘要的中文。原生断言核对中文目录按钮、变更摘要、状态与应用后的原文；协议、文件内容和 Git 提交说明中的 `Settings` 保持原样。

本轮五套 Hasgard 脚本连续通过；前端 81 个文件 / 1027 项通过；lint、类型检查及客户端 Clippy 通过（保留既有警告）。Test / 无 Hasgard 的 Dev 两种包均重建成功。浏览器授权、SOCKS 与 Git 同步界面的旧未覆盖项，按上述明确的执行层和场景更新，不扩大为所有身份提供商、代理变体和 Git 冲突场景的认证。

## 本机性能采样

已在本轮构建和测试结束后建立 [HTTP 基线](benchmarks.md)，保留逐次原始 JSON：1 KiB / 64 KiB 响应各预热 4 次、测量 20 次。内部耗时中位数分别为 1 ms / 2 ms，p95 为 1 ms / 2 ms；这是 Debug Wry 自身基线，不是与 Yaak 的性能比较，也不代表 UI 渲染、启动或并发性能。

## OAuth 回调校验与进程强退恢复（2026-10-29）

`npm run test:native-oauth-security` 在修复前实际复现：授权码回调携带错误 state，仍交换令牌并发送受保护请求。现在授权码和隐式授权都要求回调携带唯一、正确的 state；未配置时生成密码学随机值，显式配置值保留。state 与实际消费的 code/token/error 必须来自同一组查询或片段参数，禁止跨两组参数借用校验值。隐式授权同时校验回调来源与路径。窗口打开失败正常拒绝，提前到达的回调不再引用尚未初始化的关闭句柄。

打包 Test 应用的真实内嵌 WebView 验证两种授权各 7 项：错误、缺失、重复 state，错误路径、错误来源、关闭窗口和成功回调，共 14 项。错误路径与来源被忽略后关闭窗口；失败场景均验证不交换令牌、不访问受保护端点，随后同一个请求重新授权成功。使用本机服务和虚构凭据；外部浏览器使用共享校验代码，但本轮没有实际运行系统浏览器或真实身份提供商。

`npm run test:native-recovery` 对独立 Test 应用进行三次 SIGKILL：

- SQLite：已确认保存的 8 个请求在重启后 ID、名称和较大中文请求体完全一致，没有重复项；未证明尚未确认的写入必然落盘。
- 文件同步：首次发布出现文件事件、同步调用尚未完成时终止应用。两次运行分别只发布 5 / 3 个 YAML 文件，所有已发布文件可完整解析；重启后数据库原文保留，重新计算和应用剩余操作，没有删除数据库模型，最终同步全部 8 个请求。
- Git：本地 pre-commit 钩子暂停期间终止应用，再释放钩子。Git 子进程继续完成一次提交，重启后工作区和暂存区干净、中文文件原文正确，没有启动重放或重复提交。这不是“退出应用就取消 Git”的保证。

以上仅验证应用进程崩溃，不涵盖断电、磁盘写满或同时杀死 Git 进程。测试清理前等待已启动的钩子完成，避免提前删除释放标记。

本轮全量前端 82 文件 / 1036 项通过，lint/类型检查通过（3 项既有警告）；OAuth/SOCKS、高风险原生回归及上述安全与恢复脚本通过。Test 与 Dev 包重建成功，内置 OAuth 插件与最新构建一致。本轮未改 Rust 源码，未重复运行 Clippy；原生打包编译通过。

仍不是最佳：本轮确认并修复了具体回调校验缺陷，不能扩大为全面安全审计；真实身份提供商、系统浏览器、断电恢复和与原版 Yaak 的同机性能对比仍没有验证依据。

## 外部浏览器回调时序（2026-10-29）

发现本地回调服务器在 `waitForCallback()` 调用时才登记结果接收器。如果浏览器在 `openExternalUrl()` 返回前完成导航，回调 POST 虽收到 200，授权结果却被丢弃，随后等待失败。新增本机 HTTP 测试在修复前 6 项中失败 5 项；其中直接让浏览器打开接口在返回前完成回调，稳定复现此时序。

现在服务器启动时即创建并保留唯一结果 Promise，重复等待共享结果，停止监听后仍可取得此前成功的结果。超时从监听开始计算；提前停止或超时的拒绝被保留，不产生尚未挂接消费者时的未处理拒绝。6 项定向测试覆盖早到回调、打开浏览器返回前回调、多等待者、提前超时、替换服务器，以及错误路径 / 无效 JSON 后正常回调。

原生入口 `npm run test:native-oauth-external` 通过应用的系统浏览器打开接口访问本机授权服务，使用动态 loopback 端口；授权码查询参数与隐式授权片段由真实浏览器页面转交本地回调服务器，服务端核对 redirect_uri、令牌交换及 Bearer 标头。错误 state 不交换令牌或发送受保护请求。此入口会打开默认浏览器测试页；不连接真实账号，也不测试上游托管中转页。

实测结果：系统默认浏览器的授权码 / 隐式授权分别成功与拒绝错误 state，共 4 项通过；原有 14 项内嵌 OAuth 安全场景、PKCE / 授权拒绝 / 缓存及 SOCKS 回归通过。全量前端 83 文件 / 1042 项通过，lint/类型检查通过（3 项既有警告）。Test / Dev macOS 包重建成功，两个包内的 OAuth 插件与本次构建 SHA-256 一致。本轮没有 Rust 源码变更，未重复运行 Clippy。

当前不能称为最佳：系统浏览器的本机 loopback 链路已有实测，但真实身份提供商、托管中转页、断电恢复和原版 Yaak 同机性能对比仍未验证；没有以本轮回调修复作全面安全保证。

## 外部授权页的品牌、中文与结果提示（2026-10-29）

本地回调页标题改为 ApiCub，添加 UTF-8 声明；发送中、已收到回调和发送失败提示按外部浏览器的主要语言显示简体中文或英文。此页面不共享应用 localStorage，因而跟随浏览器语言，而不是应用内显式语言选择；没有新增插件 API 或访问应用设置。

修正误导提示：本地服务器收到 POST 只表示回调已交给应用，不代表 state 校验、令牌交换或请求成功。原来的 “Authorization Complete” 改为 “Authorization callback received” / “已收到授权回调”，并引导返回 ApiCub 查看结果。HTTP 失败和网络异常都明确表示回调发送失败。

一次性 Node VM 页面脚本检查通过 18 个组合：中英文 × 回调接收 / HTTP 失败 / 网络异常 × 查询参数 / URL 片段 / 托管片段转换；核对中文、加号及转义内容不被翻译或改写。这里使用模拟 DOM，不是浏览器视觉测试，也没有访问真实托管中转服务。浏览器控制工具不可用，原生 Chrome 访问另被工具以未授权拒绝，因此未做截图和视觉验收。

打包 Test 应用实际系统浏览器 4 项授权回归通过；前端 83 文件 / 1042 项及 lint/类型检查通过（3 项既有警告）。本轮无 Rust 源码变更，未重复 Clippy。当前仍不能称为最佳：外部页面视觉验收、真实身份提供商、断电恢复和原版 Yaak 同机性能对比尚无实测结论。

Test / Dev macOS 包均重建完成，两个包内的 OAuth 插件 SHA-256 与本次源码构建一致。

## 中文动态文案收尾（2026-10-29）

对 JSX 文本、界面属性及条件回退文案核对实际调用链，补齐参数 / 表单 / 通用键值编辑器占位符、工作区默认请求头标题、Proto 文件添加提示与文件过滤器名称、迁移说明、gRPC 结构和元数据、通用确认 / 输入弹窗按钮、Git 空提交说明与作者回退、GraphQL 空描述、拖放提示、复选树提示、页签回退、智能体设置完成状态和密钥显示提示。工作区设置页的无障碍标签从误用的文件夹设置改为工作区设置。

仅在缺失值的界面回退或界面标签处调用翻译；协议名、示例参数名、已有工作区名称、提交消息、GraphQL 描述和请求数据保留原文。未安装智能体、未显示真实密钥、未进行远端 Git 操作。

用户明确取消同源 HTTP 代码的性能对比收尾要求，已同步 AGENTS.md；不添加新功能或依赖升级。

最终验证：前端 83 文件 / 1042 项测试通过，lint/类型检查通过（3 项既有警告），前端构建及 Test / Dev macOS 原生打包成功。最新 Test 应用的 Hasgard 中英文跨窗口切换、GET/POST 原文回归通过；额外实际点击验证 URL 参数占位符“值”、gRPC“无结构 / 元数据”和配置弹窗“添加 Proto 文件或导入目录”。其他补齐项完成源码调用链核对与类型检查，未逐个声称原生视觉验收。启动时曾在 Hasgard 握手完成前进入检查，等待握手后重跑通过；gRPC 下拉菜单检查等待反射加载和菜单渲染后通过。本轮没有 Rust 源码改动，未重复 Clippy。
