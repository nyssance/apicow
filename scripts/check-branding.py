"""Fail releases when source or packaged branding differs from the reviewed baseline.

Uses only Python's standard library. Never rewrites the baseline automatically.
"""
import argparse
import hashlib
import json
import plistlib
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


def pe_icons(path):
    """Read RT_ICON image bytes from the PE resource directory (PE32/PE32+)."""
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
            if depth == 0 and name != 3:  # RT_ICON
                continue
            if child & 0x80000000:
                walk(child & 0x7fffffff, depth + 1)
            else:
                rva, size = struct.unpack_from('<II', data, base + child)
                start = file_offset(rva)
                images.append(data[start:start + size])

    walk(0)
    return images


def check_windows(executable, installer):
    expected = ico_frames(APP / 'icons/release/icon.ico')
    actual = pe_icons(executable)
    require(all(frame in actual for frame in expected), 'Packaged Windows icon mismatch')
    if installer:
        with tempfile.TemporaryDirectory(prefix='apicow-installer-check-') as temp:
            subprocess.run(['7z', 'x', str(installer.resolve()), '-o' + temp, '-y'],
                           check=True, stdout=subprocess.DEVNULL)
            installed = [p for p in Path(temp).rglob('*.exe') if digest(p) == digest(executable)]
            require(len(installed) == 1, 'Installer must contain the verified application executable')
            require(all(frame in pe_icons(installed[0]) for frame in expected), 'Installed icon mismatch')
    print(f'PASS Windows embedded icon and installer application: {executable}')


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
    if args.windows_exe:
        check_windows(args.windows_exe, args.windows_installer)


if __name__ == '__main__':
    main()
