# Developer Setup

Yaak is a combined Node.js and Rust monorepo. It is a [Tauri](https://tauri.app) project, so
uses Rust and HTML/CSS/JS for the main application but there is also a plugin system powered
by a Node.js sidecar that communicates to the app over gRPC.

Because of the moving parts, there are a few setup steps required before development can
begin.

## Prerequisites

Make sure you have the following tools installed:

- [Node.js](https://nodejs.org/en/download/package-manager) (v24+)
- [Rust](https://www.rust-lang.org/tools/install)
- [Vite+](https://vite.dev/guide/vite-plus) (`vp` CLI)

Check the installations with the following commands:

```shell
node -v
npm -v
vp --version
rustc --version
```

Install the NPM dependencies:

```shell
npm install
```

Run the `bootstrap` command to do some initial setup:

```shell
npm run bootstrap
```

## Run the App

After bootstrapping, start the app in development mode:

```shell
npm start
```

## Run the App in a Browser

The client can also run as a plain web page, with no Tauri and no local process
behind it. Set `YAAK_TARGET=web` and start the frontend on its own:

```shell
YAAK_TARGET=web npm run dev --workspace @yaakapp/yaak-client
```

That flag picks the browser host in `packages/platform/src/web/`, which answers
commands from an IndexedDB database the page owns instead of from the Rust
engine. Data persists across reloads and is shared between tabs on the same
origin. Sending HTTP is not available yet — the Send button reports that and
everything else about the request is still saved. `packages/platform/src/web/README.md`
lists which commands the browser host implements and which it declines.

Desktop builds are unaffected: without the flag the platform package installs
the Tauri host exactly as before.

## SQLite Migrations

New migrations can be created from the `src-tauri/` directory:

```shell
npm run migration
```

Rerun the app to apply the migrations.

_Note: For safety, development builds use a separate database location from production builds._

## Lezer Grammar Generation

```sh
# Example
lezer-generator components/core/Editor/<LANG>/<LANG>.grammar > components/core/Editor/<LANG>/<LANG>.ts
```

## Linting and Formatting

This repo uses [Vite+](https://vite.dev/guide/vite-plus) for linting (oxlint) and formatting (oxfmt).

- Lint the entire repo:

```sh
npm run lint
```

- Format code:

```sh
npm run format
```

Notes:

- A pre-commit hook runs `vp lint` automatically on commit.
- Some workspace packages also run `tsc --noEmit` for type-checking.
- VS Code users should install the recommended extensions for format-on-save support.

## Updating dependencies

`fab u` (aliases `fab upgrade`, `fab update`) runs at the repository root and
upgrades to the latest releases, including major versions:

1. `bun outdated --recursive`
2. `bun update --recursive --latest`
3. `cargo upgrade --incompatible allow --pinned allow`
4. `cargo update`

It installs cargo-edit if needed. `fab u --no-rust` updates only JavaScript;
`fab u --dry-run` previews commands. The task invokes no vp or npm and performs
no Git pull, commit, push, publication or tagging. Bun owns the JavaScript lockfile; the obsolete npm package-lock.json is removed.

The 2026-10-30 upgrade migrates the browser database to sqlite-wasm-vfs 0.3 OPFS.
Web Locks elect one dedicated worker as the OPFS owner; other tabs forward
requests over BroadcastChannel. Existing IndexedDB SQLite
files are imported into OPFS without loading an older VFS. ID generation uses
rand 0.10 with the existing alphabet and lengths. The old VFS bridge and
getrandom03 aliases have been removed.

Two source-unchanged SQLite adapters are patched in `vendor/` only to use
rusqlite 0.41: sea-query-rusqlite 0.8 and r2d2_sqlite 0.35, both their latest
published releases. See their source/license notes. Rolldown 1 enables JSON
arbitrary precision; sync serialization handles numeric fields in both JSON
and YAML, covered by a round-trip regression test.

Validation for the final dependency set (2026-10-30):

- `bun outdated --recursive`: no outdated workspace dependencies.
- `cargo upgrade --incompatible allow --pinned allow` followed by `cargo update`:
  all direct registry requirements updated, including wasm-bindgen 0.2.130.
  Transitive versions remain controlled by upstream requirements.
- `cargo test --workspace --features yaak-app-client/wry`: 961 passed;
  four documentation examples are ignored.
- `vp test run --maxWorkers=4`: 1,042 passed under Node 24; limiting concurrent
  workers avoids timeouts observed while native compilation and builds compete
  for resources. The two affected files also passed independently (12 tests).
- Full workspace lint/type checking passed with three existing warnings.
- Both desktop frontend and Web production builds passed, plus both WASM builds.
- Isolated Chromium checked IndexedDB-to-OPFS migration, persistence across
  worker restart, cross-tab writes/events and takeover after closing the owner.
- This run did not produce a new macOS installer or run the full native GUI suite.

## 2026-10-30 — v0.1.5 图标恢复与发布验收

- 从本机此前安装的 ApiCow 0.0.0 提取原有黑白、无左侧圆环牛头，恢复到正式版及开发版源图，重新生成平台资源；未重新绘制轮廓。
- `scripts/branding-baseline.json` 固定图标指纹、应用名称、ID、deep-link 和自有签名更新源；`scripts/check-branding.py` 在 CI 和正式打包时检查，禁止自动刷新基线以绕过失败。
- 实际执行：正确 Mac 图标被接受；v0.1.3 彩色图标被拒绝；Windows 风格 Git 检出检查通过；错误 Windows 产品版本被拒绝。
- v0.1.5 Mac CI：实际挂载 DMG、解开自动更新归档，核验应用名称、ID、版本和 ICNS，全部通过。
- v0.1.5 Windows 原 CI 的整文件哈希匹配失败。检查脚本修正为直接核验 NSIS 安装内容中的应用名称、版本和全部内嵌图标；本机使用官方 7-Zip 解包该发布 EXE，修正后的检查通过。未将原失败的 CI 报告为通过。
- 本机再次挂载最终 DMG，并分别从 Mac 应用与 Windows 安装内容提取图标目视确认：均为黑白牛头，无左侧圆环。两份安装包保存至 Downloads。
- 本次未重新运行原生 UI 功能回归；改动为图标资源和发布验收脚本。
