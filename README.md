# ApiCow

ApiCow is an independent development fork of Yaak. The first milestone is macOS support with Tauri 3 and a Simplified Chinese / English interface, preserving upstream API workflows, layout, SQLite storage and plugins.

- Upstream baseline: `mountain-loop/yaak` at `4abc882e131e2fd29412cfbc701767bbed0f5c48`.
- The source copyright and MIT license remain in [LICENSE](LICENSE).
- Local development identity: `day.dreamer.apicow.dev`; production identity: `day.dreamer.apicow`.
- Language: Settings → General → Language. Defaults to the system language; changing it flushes pending model writes and reloads the window.
- Release builds enable the standard Tauri updater against the public [nyssance/apicow](https://github.com/nyssance/apicow) repo (`releases/latest/download/latest.json`, signed updates only); Yaak's update server and commercial-license feature are not used. See [Release](#release) below.
- Existing internal `yaak-*` crate names, plugin APIs, CLI and serialized formats are retained for compatibility. This is not a complete rebranding or a public release.

See [DEVELOPMENT.md](DEVELOPMENT.md) for the inherited build workflow. Node.js 24+, Rust and the workspace Vite+ CLI are required. Run `bun install --frozen-lockfile`, `bun run bootstrap`, then `bun start`.

## Release

运行 `fab publish 0.1.1`（别名 `fab p`）发布桌面应用。命令要求已提交的 `main`，创建新 `v<版本>`
标签并等待 GitHub Actions 构建成功。不会移动已有标签，也不会发布上游 CLI/npm 包。

每版提供两个安装包：macOS Apple Silicon `.dmg`（Developer ID 签名、公证）和 Windows x64
NSIS `.exe`。Windows 未配置 Authenticode 证书；两平台更新包均使用 Tauri 更新密钥签名。
源码仓已公开，安装包发布到公开仓 [nyssance/apicow](https://github.com/nyssance/apicow)
的 `v<版本>` Release。

构建完成后，GitHub Actions 自动校验两个平台的安装包、更新包和签名，再发布草稿并更新
独立仓库的 Latest。旧版本仍读取的共用仓 `apicow-latest/latest.json` 仅作为兼容入口，指向独立仓库资源，不修改共用仓 Latest。清单使用各自资源的公开下载地址，不会把 Windows 指向 Mac 文件。
`fab publish 0.1.1 --dry-run` 预览流程，`--no-wait` 推标签后立即返回，Actions 仍会在构建成功后自动发布。
失败任务修复后先在 Actions 重跑，再执行 `fab publish 0.1.1 --resume` 等待并完成发布；不会移动标签。

工作流手动运行且留空 `publish_latest` 时构建两个未签名测试安装包；填入已发布标签时，仅验证并更新
自动更新清单。运行器必须有可用 GitHub Actions 额度。

发布需要：`APPLE_CERTIFICATE`、`APPLE_CERTIFICATE_PASSWORD`、`APPLE_SIGNING_IDENTITY`、
`APPLE_ID`、`APPLE_PASSWORD`、`APPLE_TEAM_ID`、`TAURI_PRIVATE_KEY`、`TAURI_KEY_PASSWORD` 和
能写入公开发布仓的 `RELEASE_TOKEN`。更新器公钥在 `tauri.release.conf.json` 中，升级时不得随意更换。

---

## Upstream README (retained for attribution and reference)

<p align="center">
  <a href="https://github.com/JamesIves/github-sponsors-readme-action">
    <img width="200px" src="https://github.com/mountain-loop/yaak/raw/main/crates-tauri/yaak-app-client/icons/icon.png">
  </a>
</p>

<h1 align="center">
  💫 Yaak ➟ Desktop API Client 💫
</h1>

<p align="center">
    A fast, privacy-first API client for REST, GraphQL, SSE, WebSocket, and gRPC – built with Tauri, Rust, and React.
</p>
<p align="center">
 Development is funded by community-purchased <a href="https://yaak.app/pricing">licenses</a>. You can also <a href="https://github.com/sponsors/gschier">become a sponsor</a> to have your logo appear below. 💖
</p>
<br>

<p align="center">
  <!-- sponsors-premium --><a href="https://github.com/MVST-Solutions"><img src="https:&#x2F;&#x2F;github.com&#x2F;MVST-Solutions.png" width="80px" alt="User avatar: MVST-Solutions" /></a>&nbsp;&nbsp;<a href="https://github.com/dharsanb"><img src="https:&#x2F;&#x2F;github.com&#x2F;dharsanb.png" width="80px" alt="User avatar: dharsanb" /></a>&nbsp;&nbsp;<a href="https://github.com/railwayapp"><img src="https:&#x2F;&#x2F;github.com&#x2F;railwayapp.png" width="80px" alt="User avatar: railwayapp" /></a>&nbsp;&nbsp;<a href="https://github.com/caseyamcl"><img src="https:&#x2F;&#x2F;github.com&#x2F;caseyamcl.png" width="80px" alt="User avatar: caseyamcl" /></a>&nbsp;&nbsp;<a href="https://github.com/bytebase"><img src="https:&#x2F;&#x2F;github.com&#x2F;bytebase.png" width="80px" alt="User avatar: bytebase" /></a>&nbsp;&nbsp;<a href="https://github.com/rauchg"><img src="https:&#x2F;&#x2F;github.com&#x2F;rauchg.png" width="80px" alt="User avatar: rauchg" /></a>&nbsp;&nbsp;<a href="https://github.com/"><img src="https:&#x2F;&#x2F;raw.githubusercontent.com&#x2F;JamesIves&#x2F;github-sponsors-readme-action&#x2F;dev&#x2F;.github&#x2F;assets&#x2F;placeholder.png" width="80px" alt="User avatar: " /></a>&nbsp;&nbsp;<!-- sponsors-premium -->
</p>
<p align="center">
  <!-- sponsors-base --><a href="https://github.com/seanwash"><img src="https:&#x2F;&#x2F;github.com&#x2F;seanwash.png" width="50px" alt="User avatar: seanwash" /></a>&nbsp;&nbsp;<a href="https://github.com/jerath"><img src="https:&#x2F;&#x2F;github.com&#x2F;jerath.png" width="50px" alt="User avatar: jerath" /></a>&nbsp;&nbsp;<a href="https://github.com/itsa-sh"><img src="https:&#x2F;&#x2F;github.com&#x2F;itsa-sh.png" width="50px" alt="User avatar: itsa-sh" /></a>&nbsp;&nbsp;<a href="https://github.com/dmmulroy"><img src="https:&#x2F;&#x2F;github.com&#x2F;dmmulroy.png" width="50px" alt="User avatar: dmmulroy" /></a>&nbsp;&nbsp;<a href="https://github.com/timcole"><img src="https:&#x2F;&#x2F;github.com&#x2F;timcole.png" width="50px" alt="User avatar: timcole" /></a>&nbsp;&nbsp;<a href="https://github.com/VLZH"><img src="https:&#x2F;&#x2F;github.com&#x2F;VLZH.png" width="50px" alt="User avatar: VLZH" /></a>&nbsp;&nbsp;<a href="https://github.com/terasaka2k"><img src="https:&#x2F;&#x2F;github.com&#x2F;terasaka2k.png" width="50px" alt="User avatar: terasaka2k" /></a>&nbsp;&nbsp;<a href="https://github.com/andriyor"><img src="https:&#x2F;&#x2F;github.com&#x2F;andriyor.png" width="50px" alt="User avatar: andriyor" /></a>&nbsp;&nbsp;<a href="https://github.com/majudhu"><img src="https:&#x2F;&#x2F;github.com&#x2F;majudhu.png" width="50px" alt="User avatar: majudhu" /></a>&nbsp;&nbsp;<a href="https://github.com/axelrindle"><img src="https:&#x2F;&#x2F;github.com&#x2F;axelrindle.png" width="50px" alt="User avatar: axelrindle" /></a>&nbsp;&nbsp;<a href="https://github.com/jirizverina"><img src="https:&#x2F;&#x2F;github.com&#x2F;jirizverina.png" width="50px" alt="User avatar: jirizverina" /></a>&nbsp;&nbsp;<a href="https://github.com/chip-well"><img src="https:&#x2F;&#x2F;github.com&#x2F;chip-well.png" width="50px" alt="User avatar: chip-well" /></a>&nbsp;&nbsp;<a href="https://github.com/GRAYAH"><img src="https:&#x2F;&#x2F;github.com&#x2F;GRAYAH.png" width="50px" alt="User avatar: GRAYAH" /></a>&nbsp;&nbsp;<a href="https://github.com/flashblaze"><img src="https:&#x2F;&#x2F;github.com&#x2F;flashblaze.png" width="50px" alt="User avatar: flashblaze" /></a>&nbsp;&nbsp;<a href="https://github.com/Frostist"><img src="https:&#x2F;&#x2F;github.com&#x2F;Frostist.png" width="50px" alt="User avatar: Frostist" /></a>&nbsp;&nbsp;<a href="https://github.com/PurplProto"><img src="https:&#x2F;&#x2F;github.com&#x2F;PurplProto.png" width="50px" alt="User avatar: PurplProto" /></a>&nbsp;&nbsp;<!-- sponsors-base -->
</p>

![Yaak API Client](https://yaak.app/static/screenshot.png)

## Install

Download Yaak for macOS, Windows, or Linux from [yaak.app/download](https://yaak.app/download). Package managers and other install methods are in the [installation docs](https://yaak.app/docs/getting-started/installation).

## Features

Yaak is an offline-first API client designed to stay out of your way while giving you everything you need when you need it.
Built with [Tauri](https://tauri.app), Rust, and React, it’s fast, lightweight, and private. No telemetry, no VC funding, and no cloud lock-in.

### 🌐 Work with any API

- Import collections from Postman, Insomnia, OpenAPI, Swagger, or Curl.
- Send requests via REST, GraphQL, gRPC, WebSocket, or Server-Sent Events.
- Filter and inspect responses with JSONPath or XPath.

### 🔐 Stay secure

- Use OAuth 2.0, JWT, Basic Auth, or custom plugins for authentication.
- Secure sensitive values with encrypted secrets.
- Store secrets in your OS keychain.

### ☁️ Organize & collaborate

- Group requests into workspaces and nested folders.
- Use environment variables to switch between dev, staging, and prod.
- Mirror workspaces to your filesystem for versioning in Git or syncing with Dropbox.

### 🧩 Extend & customize

- Insert dynamic values like UUIDs or timestamps with template tags.
- Pick from built-in themes or build your own.
- Create plugins to extend authentication, template tags, or the UI.

## Contribution Policy

> [!IMPORTANT]
> Community PRs are currently limited to bug fixes.
> If your PR is not a bug fix, link the [feedback item](https://yaak.app/feedback) where @gschier explicitly gave you permission to work on it.
> See [`CONTRIBUTING.md`](CONTRIBUTING.md) for policy details and [`DEVELOPMENT.md`](DEVELOPMENT.md) for local setup.

## Useful Resources

- [Feedback and Bug Reports](https://feedback.yaak.app)
- [Documentation](https://yaak.app/docs)
- [Yaak vs Postman](https://yaak.app/alternatives/postman)
- [Yaak vs Bruno](https://yaak.app/alternatives/bruno)
- [Yaak vs Insomnia](https://yaak.app/alternatives/insomnia)

## License

The source is [MIT licensed](LICENSE) and can be built and run for free, for both personal and commercial use.

The prebuilt binaries follow Yaak's [pricing terms](https://yaak.app/pricing): free for personal use, license required for commercial use.

### ApiCow Hasgard 调试

使用 `cargo install tauri-hasgard-cli --version '^0.6' --locked` 安装 CLI。
`npm run client:debug` 启动带 Hasgard 的开发模式；`npm run client:debug:build`
生成 `target/debug/bundle/macos/ApiCow Test.app`。首次构建会执行原版 bootstrap。

测试版使用 `day.dreamer.apicow.test` 独立数据目录。通过 `TAURI_HASGARD_SOCKET`
指定 socket，随后运行 `tauri-hasgard --socket <路径> ping`、`windows`、
`--window <窗口标签> snapshot` 或 `eval` 检查实际 WebView。
Hasgard 仅随 `hasgard-testing` feature 注册，且仅在 debug 构建运行；默认产品构建不启用。

启动打包测试版后，运行 `TAURI_HASGARD_SOCKET=<路径> npm run test:hasgard`，
验证语言切换、跨窗口同步以及本机 GET/POST 的原始请求内容。脚本仅接受
`day.dreamer.apicow.test`，会在测试工作区创建请求，不连接真实账号。

扩展原生回归：`TAURI_HASGARD_SOCKET=<路径> npm run test:native-workflows`。
高风险原生回归：`TAURI_HASGARD_SOCKET=<路径> npm run test:native-advanced`（本机 Git、OAuth、双向 TLS、gRPC 流与取消）。
浏览器授权和 SOCKS：`TAURI_HASGARD_SOCKET=<路径> npm run test:native-oauth-socks`。
系统外部浏览器 OAuth：`TAURI_HASGARD_SOCKET=<路径> npm run test:native-oauth-external`；会打开默认浏览器的本机测试页面，结束后可关闭这些页面。
OAuth 回调安全回归：`TAURI_HASGARD_SOCKET=<路径> npm run test:native-oauth-security`。
强退恢复：`TAURI_HASGARD_SOCKET=<路径> npm run test:native-recovery`；会对独立 Test 应用执行三次 SIGKILL 并重启，使用临时同步目录与 Git 仓库。
文件同步与 Git 界面：`TAURI_HASGARD_SOCKET=<路径> npm run test:native-sync`。
本机 HTTP 性能采样：`TAURI_HASGARD_SOCKET=<路径> npm run bench:native -- /tmp/apicow-benchmark.json`；需在构建、测试等后台工作结束后运行。
覆盖导入导出、认证、HTTP/SSE/WebSocket、gRPC、TLS 和 HTTP 代理；具体执行层与边界见
[验证记录](docs/apicow-validation.md)。gRPC 测试服务依赖仅加入 devDependencies。
