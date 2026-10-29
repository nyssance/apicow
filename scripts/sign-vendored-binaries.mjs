// 打包前给随包分发的 vendored 资源里的每个 Mach-O 签名（hardened runtime + 时间戳）。
// yaaknode / yaakprotoc 下载下来只有 ad-hoc 签名，Tauri 只签主程序和框架，不签资源目录，
// 公证会因此拒绝整个包。yaaknode 需要 JIT 和加载第三方库的 entitlements，yaakprotoc 用空
// entitlements，都沿用上游 macos/*.plist。
// 由 tauri.conf.json 的 beforeBundleCommand 调用；没有 APPLE_SIGNING_IDENTITY（本地未签名
// 构建、CI 测试包）或不在 macOS 上时什么都不做。
import { spawnSync } from "node:child_process";
import { closeSync, existsSync, lstatSync, openSync, readdirSync, readSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const identity = process.env.APPLE_SIGNING_IDENTITY;
if (!identity || process.platform !== "darwin") process.exit(0);

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "../crates-tauri/yaak-app-client");
const root = join(appDir, "vendored");
const entitlements = {
  yaaknode: join(appDir, "macos/entitlements.yaaknode.plist"),
  yaakprotoc: join(appDir, "macos/entitlements.yaakprotoc.plist"),
};

const magics = new Set([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe]);
function isMachO(path) {
  const fd = openSync(path, "r");
  try {
    const header = Buffer.alloc(4);
    return readSync(fd, header, 0, 4, 0) === 4 && magics.has(header.readUInt32BE(0));
  } finally {
    closeSync(fd);
  }
}

const files = [];
function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const info = lstatSync(path);
    if (info.isDirectory()) walk(path);
    else if (info.isFile() && isMachO(path)) files.push(path);
  }
}
if (!existsSync(root)) throw new Error(`vendored 目录不存在，先运行 npm run bootstrap：${root}`);
walk(root);

for (const file of files) {
  const args = ["--force", "--options", "runtime", "--timestamp"];
  const plist = entitlements[basename(file)];
  if (plist) args.push("--entitlements", plist);
  args.push("--sign", identity, file);
  const result = spawnSync("codesign", args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`签名失败：${file}`);
}
console.log(`已用 ${identity} 签名 ${files.length} 个随包 vendored 二进制`);
