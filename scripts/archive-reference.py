#!/usr/bin/env python3
"""Retain the known owner reference ZIP and inventory it without extracting files."""
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath, PureWindowsPath
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen
import argparse
import hashlib
import io
import json
import os
import re
import stat
import tempfile
import zipfile

DRIVE_ID = '1zHtmCNCSggOgJXufD8U1UVEU7Txbfp2P'
DOWNLOAD_ENDPOINT = 'https://drive.usercontent.google.com/download'
SOURCE_URL = 'https://drive.google.com/file/d/' + DRIVE_ID + '/view'
ARCHIVE_NAME = 'belem-owner-reference-bundle.zip'
INVENTORY_NAME = 'reference-inventory.json'
MAX_DOWNLOAD = 400 * 1024 * 1024
MAX_HTML = 2 * 1024 * 1024
MAX_EXPANDED = 2 * 1024 * 1024 * 1024
MAX_ENTRIES = 10000
MAX_DEPTH = 3
CHUNK = 1024 * 1024


class DownloadForms(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.forms, self.current = [], None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'form':
            self.current = {'action': attrs.get('action', ''), 'method': attrs.get('method', 'get').lower(), 'fields': {}}
        elif tag == 'input' and self.current is not None and attrs.get('type', '').lower() == 'hidden' and attrs.get('name'):
            self.current['fields'][attrs['name']] = attrs.get('value', '')

    def handle_endtag(self, tag):
        if tag == 'form' and self.current is not None:
            self.forms.append(self.current)
            self.current = None


def confirmation_url(html, base):
    parser = DownloadForms()
    parser.feed(html.decode('utf-8', errors='replace'))
    for form in parser.forms:
        if urljoin(base, form['action']) != DOWNLOAD_ENDPOINT:
            continue
        fields = form['fields']
        if form['method'] != 'get' or fields.get('id') != DRIVE_ID or fields.get('export') != 'download':
            continue
        return DOWNLOAD_ENDPOINT + '?' + urlencode(fields)
    raise ValueError('No allowed Google Drive download confirmation form found')


def copy_stream(source, target, first=b''):
    digest, size = hashlib.sha256(), 0
    block = first or source.read(CHUNK)
    while block:
        size += len(block)
        if size > MAX_DOWNLOAD:
            raise ValueError('Reference download exceeds 400 MiB')
        digest.update(block)
        target.write(block)
        block = source.read(CHUNK)
    return digest.hexdigest(), size


def download(target):
    # urllib preserves inherited proxy settings and normal certificate validation.
    url = DOWNLOAD_ENDPOINT + '?' + urlencode({'id': DRIVE_ID, 'export': 'download'})
    response = urlopen(Request(url, headers={'User-Agent': 'Belem-reference-inventory/1.0'}), timeout=60)
    try:
        first = response.read(65536)
        if 'text/html' in response.headers.get('Content-Type', '') or first.lstrip().startswith(b'<'):
            html = first + response.read(MAX_HTML - len(first) + 1)
            if len(html) > MAX_HTML:
                raise ValueError('Drive confirmation page exceeds the HTML limit')
            url = confirmation_url(html, response.geturl())
            response.close()
            response = urlopen(Request(url, headers={'User-Agent': 'Belem-reference-inventory/1.0'}), timeout=60)
            first = response.read(65536)
        if 'text/html' in response.headers.get('Content-Type', '') or first.lstrip().startswith(b'<'):
            raise ValueError('Drive returned HTML instead of the archive')
        length = response.headers.get('Content-Length')
        if length and int(length) > MAX_DOWNLOAD:
            raise ValueError('Reference download exceeds 400 MiB')
        return copy_stream(response, target, first)
    finally:
        response.close()


def safe_name(info):
    name = info.orig_filename
    normalized = name.replace('\\', '/')
    path = PurePosixPath(normalized)
    mode = stat.S_IFMT(info.external_attr >> 16)
    if (not name or '\0' in name or normalized.startswith('/') or PureWindowsPath(name).drive
            or '..' in normalized.split('/') or mode not in (0, stat.S_IFREG, stat.S_IFDIR)):
        raise ValueError('Unsafe ZIP member path or type')
    if info.flag_bits & 1:
        raise ValueError('Encrypted ZIP members are not supported')
    return path.as_posix()


def inventory(path):
    entries, archives = [], []
    expanded = 0

    def visit(source, chain, depth):
        nonlocal expanded
        with zipfile.ZipFile(source) as archive:
            infos = sorted(archive.infolist(), key=lambda info: info.filename)
            archives.append({'path': '!/'.join(chain), 'depth': depth, 'entryCount': len(infos)})
            seen = set()
            for info in infos:
                name = safe_name(info)
                if name in seen or len(entries) >= MAX_ENTRIES:
                    raise ValueError('Duplicate ZIP path or inventory entry limit exceeded')
                seen.add(name)
                expanded += info.file_size
                if expanded > MAX_EXPANDED:
                    raise ValueError('Expanded archive budget exceeds 2 GiB')
                if info.is_dir() and info.file_size:
                    raise ValueError('ZIP directory has unexpected file content')
                digest, count, nested = hashlib.sha256(), 0, None
                with archive.open(info) as member:
                    block = member.read(CHUNK)
                    is_zip = not info.is_dir() and (name.lower().endswith('.zip') or block.startswith((b'PK\x03\x04', b'PK\x05\x06', b'PK\x07\x08')))
                    if is_zip:
                        if depth >= MAX_DEPTH or info.file_size > MAX_DOWNLOAD:
                            raise ValueError('Nested ZIP depth/size limit exceeded')
                        nested = io.BytesIO()
                    while block:
                        count += len(block)
                        if count > info.file_size:
                            raise ValueError('ZIP member exceeds its declared size')
                        digest.update(block)
                        if nested is not None:
                            nested.write(block)
                        block = member.read(CHUNK)
                # ZipExtFile verifies CRC while reading each member to EOF.
                if count != info.file_size:
                    raise ValueError('ZIP member length differs from its declared size')
                logical = chain + [name]
                entries.append({'path': '!/'.join(logical), 'name': name, 'depth': depth,
                                'directory': info.is_dir(), 'bytes': count,
                                'compressedBytes': info.compress_size, 'crc32': f'{info.CRC:08x}',
                                'sha256': digest.hexdigest(), 'nestedZip': nested is not None})
                if nested is not None:
                    nested.seek(0)
                    visit(nested, logical, depth + 1)
                    nested.close()

    visit(path, [ARCHIVE_NAME], 0)
    return {'zipCRC': 'passed for every inventoried member', 'archives': archives,
            'expandedBytesAcrossLevels': expanded, 'entryCount': len(entries), 'entries': entries}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-sha256', required=True)
    parser.add_argument('--input-file', type=Path, help='Use an existing archive instead of downloading it')
    parser.add_argument('--output-dir', type=Path, default=Path('artifacts/reference-archive'))
    args = parser.parse_args()
    expected = args.expected_sha256.strip().lower()
    if not re.fullmatch(r'[0-9a-f]{64}', expected):
        parser.error('Expected SHA-256 must contain exactly 64 hexadecimal characters')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(dir=args.output_dir, prefix='.reference-', suffix='.part', delete=False) as target:
            temp_path = Path(target.name)
            if args.input_file:
                if args.input_file.stat().st_size > MAX_DOWNLOAD:
                    raise ValueError('Input reference archive exceeds 400 MiB')
                with args.input_file.open('rb') as source:
                    actual, size = copy_stream(source, target)
            else:
                actual, size = download(target)
        if actual != expected:
            raise ValueError('Reference SHA-256 does not match the expected value')
        report = inventory(temp_path)
        report.update({'schemaVersion': 1, 'generatedAtUTC': datetime.now(timezone.utc).isoformat(),
                       'archive': ARCHIVE_NAME, 'sha256': actual, 'bytes': size,
                       'sourceURL': SOURCE_URL, 'driveFileId': DRIVE_ID,
                       'input': 'local_file' if args.input_file else 'public_google_drive',
                       'classification': 'Recovered owner-reference bundle; per-document applicability unreviewed',
                       'applicability': ['The GTT training PDF is general training material.',
                                         'H1843/fgsa contain filename-indicated candidate vessel references.',
                                         'Recovery alone does not establish Belem settings, approved limits, source-exact UI or model calibration.'],
                       'limits': {'downloadBytes': MAX_DOWNLOAD, 'expandedBytes': MAX_EXPANDED,
                                  'entries': MAX_ENTRIES, 'nestedZipDepth': MAX_DEPTH},
                       'processing': 'Inventory/hashes only; no filesystem extraction or execution of archive contents'})
        destination = args.output_dir / ARCHIVE_NAME
        os.replace(temp_path, destination)
        temp_path = None
        inventory_path = args.output_dir / INVENTORY_NAME
        inventory_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
        inventory_sha = hashlib.sha256(inventory_path.read_bytes()).hexdigest()
        (args.output_dir / 'SHA256SUMS.txt').write_text(f'{actual}  {ARCHIVE_NAME}\n{inventory_sha}  {INVENTORY_NAME}\n')
        print(json.dumps({'archive': str(destination), 'sha256': actual, 'bytes': size,
                          'entries': report['entryCount'], 'archives': len(report['archives'])}))
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


if __name__ == '__main__':
    main()
