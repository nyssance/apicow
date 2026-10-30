import assert from "node:assert/strict";
import { validateRelease } from "./lib/release-manifest.mjs";

const names = [
  "apicow_0.1.1_macos_aarch64.dmg",
  "apicow_0.1.1_windows_x64-setup.exe",
  "apicow_0.1.1_darwin_aarch64.app.tar.gz",
];
const release = {
  tag_name: "v0.1.1",
  draft: false,
  assets: names.map((name, id) => ({
    name,
    id,
    browser_download_url: `https://github.com/nyssance/apicow/releases/download/v0.1.1/${name}`,
  })),
};
const source = {
  version: "0.1.1",
  platforms: {
    "darwin-aarch64": {
      signature: "mac-signature",
      url: "https://api.github.com/repos/nyssance/apicow/releases/assets/2",
    },
    "windows-x86_64": {
      signature: "windows-signature",
      url: "https://api.github.com/repos/nyssance/apicow/releases/assets/1",
    },
  },
};
const signatures = {
  [`${names[2]}.sig`]: "mac-signature\n",
  [`${names[1]}.sig`]: "windows-signature\n",
};
const result = validateRelease(release, source, signatures, "v0.1.1");
assert.equal(result.platforms["windows-x86_64"].url, release.assets[1].browser_download_url);
assert.equal(result.platforms["darwin-aarch64"].url, release.assets[2].browser_download_url);
assert.ok(source.platforms["windows-x86_64"].url.startsWith("https://api.github.com/"));
assert.throws(() => validateRelease({ ...release, draft: true }, source, signatures, "v0.1.1"));
assert.throws(() =>
  validateRelease({ ...release, assets: release.assets.slice(1) }, source, signatures, "v0.1.1"),
);
assert.throws(() => validateRelease(release, source, {}, "v0.1.1"));
const wrong = structuredClone(source);
wrong.platforms["windows-x86_64"].url = wrong.platforms["darwin-aarch64"].url;
assert.throws(() => validateRelease(release, wrong, signatures, "v0.1.1"));
const incomplete = structuredClone(source);
delete incomplete.platforms["windows-x86_64"];
assert.throws(() => validateRelease(release, incomplete, signatures, "v0.1.1"));
assert.throws(() => validateRelease(release, source, signatures, "v0.1.2"));
console.log(
  "PASS: dual-platform public URLs, exact installers, draft guard, signatures, platform separation and version checks",
);

const draft = structuredClone(release);
draft.draft = true;
for (const asset of draft.assets) {
  asset.browser_download_url = asset.browser_download_url.replace("v0.1.1/", "untagged-test/");
}
const draftResult = validateRelease(draft, source, signatures, "v0.1.1", true);
assert.equal(draftResult.platforms["darwin-aarch64"].url, release.assets[2].browser_download_url);
assert.throws(() => validateRelease(draft, source, signatures, "v0.1.1"));
console.log("PASS: draft placeholder URLs are normalized only during preflight");

const foreign = structuredClone(release);
foreign.assets[0].browser_download_url = foreign.assets[0].browser_download_url.replace(
  "nyssance/apicow",
  "nyssance/releases",
);
foreign.assets[2].browser_download_url = foreign.assets[2].browser_download_url.replace(
  "nyssance/apicow",
  "nyssance/releases",
);
assert.throws(() => validateRelease(foreign, source, signatures, "v0.1.1"));
console.log("PASS: release assets must belong to the dedicated ApiCow repository");
