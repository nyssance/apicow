"""Fail releases when source or packaged branding differs from the reviewed baseline.

Uses only Python's standard library. Never rewrites the baseline automatically.
"""
import argparse
import hashlib
import json
import plistlib
import re
from pathlib import Path
import struct
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'crates-tauri/yaak-app-client'
BASELINE = ROOT / 'scripts/branding-baseline.json'


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def check_source():
    baseline = json.loads(BASELINE.read_text())
    for name, expected in baseline['icons'].items():
        require(digest(ROOT / name) == expected, f'Icon changed from reviewed baseline: {name}')
    config = json.loads((APP / 'tauri.conf.json').read_text())
    release = json.loads((APP / 'tauri.release.conf.json').read_text())
    require(config['productName'] == 'ApiCow', 'Product name changed')
    require(config['identifier'] == 'day.dreamer.apicow', 'Bundle identifier changed')
    require(config['bundle']['icon'] == baseline['bundleIcons'], 'Bundled icon paths changed')
    require(config['plugins']['deep-link']['desktop']['schemes'] == ['apicow'], 'Deep link changed')
    require(release['plugins']['updater'] == baseline['updater'], 'Updater identity/channel changed')
    require('updater' in release['build']['features'], 'Updater disabled')
    require(release['bundle']['createUpdaterArtifacts'], 'Signed update artifacts disabled')
    require('license' not in release['build']['features'], 'Upstream commercial license service enabled')
    require('license' not in config.get('build', {}).get('features', []), 'Upstream license service enabled')
    # Scan all shipped UI/native/plugin sources, not just the known menu strings.
    # User request fixtures, copyright, and protocol service integrations are separate.
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
    roots = ('apps/', 'packages/ui/', 'packages/platform/',
             'crates-tauri/yaak-app-client/src/', 'crates-tauri/yaak-app-proxy/src/', 'plugins/')
    retired = re.compile(r'https?://(?:[a-z0-9.-]+\.)?yaak\.app(?:[/:?\#"\s]|$)', re.I)
    for name in tracked:
        path = ROOT / name
        if not name.startswith(roots) or not path.is_file():
            continue
        if path.suffix not in ('.ts', '.tsx', '.rs', '.html', '.json'):
            continue
        if any(part in ('tests', 'fixtures', 'bindings') for part in path.parts):
            continue
        if '.test.' in name or '.spec.' in name:
            continue
        require(not retired.search(path.read_text()), f'Retired product URL in {name}')
    for name in ('README.md', 'CONTRIBUTING.md', '.github/ISSUE_TEMPLATE/config.yml',
                 '.github/pull_request_template.md', 'packages/plugin-runtime-types/package.json'):
        require(not retired.search((ROOT / name).read_text()), f'Retired public product link in {name}')
    native_templates = ROOT / 'crates/yaak-plugins/src/native_template_functions.rs'
    require(not retired.search(native_templates.read_text()), 'Retired native template help URL')
    return baseline


def check_mac(bundle, version):
    info = plistlib.loads((bundle / 'Contents/Info.plist').read_bytes())
    require(info['CFBundleIdentifier'] == 'day.dreamer.apicow', 'Packaged bundle ID changed')
    require(info['CFBundleName'] == 'ApiCow', 'Packaged product name changed')
    require(info['CFBundleShortVersionString'] == version, 'Packaged version mismatch')
    icon = info['CFBundleIconFile']
    if not icon.endswith('.icns'):
        icon += '.icns'
    packaged = bundle / 'Contents/Resources' / icon
    require(digest(packaged) == digest(APP / 'icons/release/icon.icns'), 'Packaged Mac icon mismatch')
    print(f'PASS packaged Mac name, ID, version, icon: {bundle}')


def ico_frames(path):
    data = path.read_bytes()
    reserved, kind, count = struct.unpack_from('<HHH', data)
    require(reserved == 0 and kind == 1 and count > 0, 'Invalid ICO baseline')
    frames = []
    for i in range(count):
        size, offset = struct.unpack_from('<II', data, 6 + i * 16 + 8)
        frames.append(data[offset:offset + size])
    return frames


def pe_resources(path, resource_type=3):
    """Read payloads of a resource type from a PE32/PE32+ resource directory."""
    data = path.read_bytes()
    require(data[:2] == b'MZ', 'Not a Windows executable')
    pe = struct.unpack_from('<I', data, 0x3c)[0]
    require(data[pe:pe + 4] == b'PE\0\0', 'Invalid PE header')
    section_count = struct.unpack_from('<H', data, pe + 6)[0]
    optional_size = struct.unpack_from('<H', data, pe + 20)[0]
    optional = pe + 24
    magic = struct.unpack_from('<H', data, optional)[0]
    require(magic in (0x10b, 0x20b), 'Unsupported PE format')
    directory = optional + (112 if magic == 0x20b else 96)
    resource_rva = struct.unpack_from('<I', data, directory + 16)[0]
    sections = []
    for i in range(section_count):
        offset = optional + optional_size + i * 40
        virtual_size, rva, size, raw = struct.unpack_from('<IIII', data, offset + 8)
        sections.append((rva, max(size, virtual_size), raw))

    def file_offset(rva):
        for start, size, raw in sections:
            if start <= rva < start + size:
                return raw + rva - start
        raise RuntimeError(f'Unmapped resource RVA: {rva}')

    base = file_offset(resource_rva)
    images = []

    def walk(relative, depth=0):
        require(depth < 4, 'Invalid resource directory nesting')
        offset = base + relative
        named, ids = struct.unpack_from('<HH', data, offset + 12)
        for i in range(named + ids):
            name, child = struct.unpack_from('<II', data, offset + 16 + i * 8)
            if depth == 0 and name != resource_type:
                continue
            if child & 0x80000000:
                walk(child & 0x7fffffff, depth + 1)
            else:
                rva, size = struct.unpack_from('<II', data, base + child)
                start = file_offset(rva)
                images.append(data[start:start + size])

    walk(0)
    return images


def pe_icons(path):
    return pe_resources(path, 3)


def check_windows(executable, installer, version):
    expected = ico_frames(APP / 'icons/release/icon.ico')

    def verify(path):
        actual = pe_icons(path)
        require(all(frame in actual for frame in expected), 'Packaged Windows icon mismatch')
        versions = pe_resources(path, 16)  # RT_VERSION
        require(len(versions) == 1, 'Missing Windows version resource')
        info = versions[0]
        require('ApiCow'.encode('utf-16le') in info, 'Packaged Windows product name mismatch')
        signature = struct.pack('<I', 0xFEEF04BD)
        fixed = info.find(signature)
        require(fixed >= 0, 'Missing Windows fixed version info')
        ms, ls = struct.unpack_from('<II', info, fixed + 8)
        actual_version = (ms >> 16, ms & 0xffff, ls >> 16)
        expected_version = tuple(int(x) for x in version.removeprefix('v').split('-')[0].split('.'))
        require(actual_version == expected_version, f'Windows version mismatch: {actual_version}')
        print(f'PASS Windows product, version and all embedded icon frames: {path}')

    if executable:
        verify(executable)
    if installer:
        with tempfile.TemporaryDirectory(prefix='apicow-installer-check-') as temp:
            subprocess.run(['7z', 'x', str(installer.resolve()), '-o' + temp, '-y'],
                           check=True, stdout=subprocess.DEVNULL)
            installed = list(Path(temp).rglob('yaak-app-client.exe'))
            require(len(installed) == 1, 'Installer must contain exactly one ApiCow application')
            verify(installed[0])
        print(f'PASS actual NSIS installation payload: {installer}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mac-bundle', type=Path)
    parser.add_argument('--windows-exe', type=Path)
    parser.add_argument('--windows-installer', type=Path)
    parser.add_argument('--version')
    args = parser.parse_args()
    check_source()
    print('PASS reviewed icon hashes, product name, ID, deep link and signed update channel')
    if args.mac_bundle:
        require(bool(args.version), '--version is required for package verification')
        check_mac(args.mac_bundle, args.version.removeprefix('v'))
    if args.windows_exe or args.windows_installer:
        require(bool(args.version), "--version is required for package verification")
        check_windows(args.windows_exe, args.windows_installer, args.version)


if __name__ == '__main__':
    main()
