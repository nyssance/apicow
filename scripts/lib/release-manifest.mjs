import assert from "node:assert/strict";

export function validateRelease(release, source, signatures, versionTag, allowDraft = false) {
  assert.match(versionTag ?? "", /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  assert.equal(release.tag_name, `apicow-${versionTag}`);
  if (!allowDraft)
    assert.equal(release.draft, false, "Publish the version release before updating latest");
  const { assets } = release;
  for (const suffix of [".dmg", ".exe"]) {
    assert.equal(
      assets.filter((asset) => asset.name.endsWith(suffix)).length,
      1,
      `Expected exactly one ${suffix} installer`,
    );
  }
  const manifest = structuredClone(source);
  assert.equal(manifest.version, versionTag.slice(1));
  for (const required of ["darwin-aarch64", "windows-x86_64"]) {
    assert.ok(manifest.platforms[required], `Missing updater platform ${required}`);
  }
  for (const [platform, entry] of Object.entries(manifest.platforms)) {
    const name = decodeURIComponent(new URL(entry.url).pathname.split("/").pop());
    const asset = assets.find((asset) => asset.name === name || String(asset.id) === name);
    assert.ok(asset, `Updater asset missing for ${platform}: ${entry.url}`);
    assert.ok(
      platform.startsWith("darwin-")
        ? asset.name.endsWith(".app.tar.gz")
        : platform.startsWith("windows-") && asset.name.endsWith(".exe"),
      `Wrong bundle for ${platform}`,
    );
    assert.equal(
      signatures[`${asset.name}.sig`]?.trim(),
      entry.signature.trim(),
      `Signature mismatch for ${platform}`,
    );
    assert.ok(
      asset.browser_download_url.startsWith(
        `https://github.com/nyssance/releases/releases/download/apicow-${versionTag}/`,
      ),
    );
    entry.url = asset.browser_download_url;
  }
  return manifest;
}
