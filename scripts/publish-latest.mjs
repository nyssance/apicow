import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { validateRelease } from "./lib/release-manifest.mjs";

const versionTag = process.argv[2];
assert.match(versionTag ?? "", /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "Expected v<semver>");
const checkOnly = process.argv.includes("--check-only");
const repo = "nyssance/releases";
const tag = `apicow-${versionTag}`;
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
// GitHub's by-tag endpoint omits drafts; list releases to find both states.
const releases = JSON.parse(gh("api", "--paginate", "--slurp", `repos/${repo}/releases`)).flat();
const matches = releases.filter((release) => release.tag_name === tag);
assert.equal(matches.length, 1, `Expected one release for ${tag}`);
const release = matches[0];
const temp = mkdtempSync(join(tmpdir(), "apicow-publish-"));
try {
  gh(
    "release",
    "download",
    tag,
    "--repo",
    repo,
    "--pattern",
    "latest.json",
    "--pattern",
    "*.sig",
    "--dir",
    temp,
  );
  const signatures = Object.fromEntries(
    readdirSync(temp)
      .filter((name) => name.endsWith(".sig"))
      .map((name) => [name, readFileSync(join(temp, name), "utf8")]),
  );
  const manifest = validateRelease(
    release,
    JSON.parse(readFileSync(join(temp, "latest.json"), "utf8")),
    signatures,
    versionTag,
    checkOnly,
  );
  if (checkOnly) {
    console.log(`Validated ${tag}: macOS ARM64 + Windows x64 installers and signed updater assets`);
  } else {
    writeFileSync(join(temp, "latest.json"), JSON.stringify(manifest, null, 2) + "\n");
    gh("release", "upload", tag, join(temp, "latest.json"), "--repo", repo, "--clobber");
    try {
      gh("release", "view", "apicow-latest", "--repo", repo);
    } catch {
      gh(
        "release",
        "create",
        "apicow-latest",
        "--repo",
        repo,
        "--title",
        "ApiCow 更新清单",
        "--notes",
        "ApiCow 自动更新清单",
        "--latest=false",
      );
    }
    gh(
      "release",
      "upload",
      "apicow-latest",
      join(temp, "latest.json"),
      "--repo",
      repo,
      "--clobber",
    );
    console.log(`Published updater manifest for ${tag}`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
