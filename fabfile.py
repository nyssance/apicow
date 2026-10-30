"""ApiCow local tasks, following ALwith Desktop's Bun/Cargo update workflow."""

import shlex
from pathlib import Path

from fabric import task

ROOT = Path(__file__).resolve().parent


@task(aliases=["u", "update"], help={
    "rust": "Upgrade Rust dependencies too (disable with --no-rust)",
    "dry-run": "Print commands without changing dependencies",
})
def upgrade(c, rust=True, dry_run=False):
    """Upgrade dependencies to latest releases, including major versions."""
    def run(command, **kwargs):
        if dry_run:
            print(f"[{ROOT}] {command}")
            return None
        return c.run(command, **kwargs)

    with c.cd(shlex.quote(str(ROOT))):
        if not any((ROOT / name).exists() for name in ("bun.lock", "bun.lockb")):
            run("bun install")
        run("bun outdated --recursive", warn=True)
        run("bun update --recursive --latest")
        if rust:
            installed = run("command -v cargo-upgrade", warn=True, hide=True)
            if dry_run:
                print("Install cargo-edit only if cargo-upgrade is missing.")
            elif not installed.ok:
                run("cargo install cargo-edit --locked")
            run("cargo upgrade --incompatible allow --pinned allow")
            run("cargo update")


@task(aliases=["p"], help={
    "version": "New app version, for example 0.1.1 (macOS ARM64 + Windows x64)",
    "wait": "Wait for builds and publish both installers plus updater metadata",
    "resume": "Resume an existing tag without moving it or pushing newer source",
    "dry-run": "Print the release steps without pushing or publishing",
})
def publish(c, version, wait=True, dry_run=False, resume=False):
    """Build and publish ApiCow desktop installers; never retag an existing release."""
    import json
    import re
    import time
    from invoke import Exit

    tag = version if version.startswith("v") else f"v{version}"
    if not re.fullmatch(r"v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", tag):
        raise Exit("Version must be v<semver>", code=1)
    repo = "nyssance/apicow"
    release_tag = f"apicow-{tag}"
    with c.cd(shlex.quote(str(ROOT))):
        if dry_run:
            print(f"Check clean main checkout; create new {tag}; push to {repo}")
            print("Build macOS ARM64 DMG + Windows x64 NSIS EXE via release-app.yml")
            if wait:
                print(f"Validate both signed updater assets; publish {release_tag}; update apicow-latest")
            return
        if c.run("git status --porcelain", hide=True).stdout.strip():
            raise Exit("Commit the reviewed changes before publishing", code=1)
        if c.run("git branch --show-current", hide=True).stdout.strip() != "main":
            raise Exit("Publish from main", code=1)
        head = c.run("git rev-parse HEAD", hide=True, pty=False).stdout.strip()
        existing = c.run(f"git rev-parse -q --verify refs/tags/{tag}^{{commit}}", hide=True, warn=True, pty=False)
        if resume:
            if not existing.ok:
                raise Exit(f"No local tag {tag}; fetch the release tag before resuming", code=1)
            head = existing.stdout.strip()
        else:
            if existing.ok and existing.stdout.strip() != head:
                raise Exit(f"{tag} already points to a different commit; use --resume or a new version", code=1)
            c.run("git push origin HEAD:main")
            if not existing.ok:
                c.run(f"git tag -a {tag} -m 'ApiCow {tag}'")
            c.run(f"git push origin refs/tags/{tag}")
        if not wait:
            print(f"Build started: https://github.com/{repo}/actions/workflows/release-app.yml")
            return
        run_id = None
        for _ in range(30):
            runs = json.loads(c.run(
                f"gh run list -R {repo} --workflow release-app.yml --event push "
                f"--commit {head} --json databaseId,headBranch", hide=True, pty=False).stdout)
            run_id = next((run["databaseId"] for run in runs if run["headBranch"] == tag), None)
            if run_id is not None:
                break
            time.sleep(2)
        if run_id is None:
            raise Exit("No release workflow was created; check GitHub Actions", code=1)
        c.run(f"gh run watch {run_id} -R {repo} --exit-status")
        c.run(f"bun scripts/publish-latest.mjs {tag} --check-only")
        c.run(f"gh release edit {release_tag} -R nyssance/releases --draft=false --latest=false")
        c.run(f"bun scripts/publish-latest.mjs {tag}")
        print(f"Published: https://github.com/nyssance/releases/releases/tag/{release_tag}")
