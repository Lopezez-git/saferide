"""Refresh official snapshots atomically; preserve last valid data on any failure."""
import argparse
import calendar
import csv
import datetime as dt
import hashlib
import json
import re
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import import_sp156_pavement as pavement
import import_ssp_vehicles as police

ROOT = Path(__file__).resolve().parents[1]
CATALOG = 'https://dados.prefeitura.sp.gov.br/api/3/action/package_show?id=dados-do-sp156'
HOSTS = {'dados.prefeitura.sp.gov.br', 'www.ssp.sp.gov.br'}

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def read(path):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}

def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    temporary.replace(path)

def download(url, path):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname not in HOSTS:
        raise ValueError('Fonte fora dos dominios oficiais permitidos')
    with urllib.request.urlopen(url, timeout=60) as response, path.open('wb') as output:
        if urllib.parse.urlsplit(response.url).hostname not in HOSTS:
            raise ValueError('Redirecionamento fora da fonte oficial')
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
    return hashlib.sha256(path.read_bytes()).hexdigest()

def latest_resource(resources, today):
    candidates = []
    for resource in resources:
        match = re.search(r'([1-4])\D*TRI\w*\s+(20\d{2})', resource.get('name', ''), re.I)
        if resource.get('format', '').strip().lstrip('.').upper() != 'CSV' or not match:
            continue
        quarter, year = map(int, match.groups())
        start = dt.date(year, quarter * 3 - 2, 1)
        end = dt.date(year, quarter * 3, calendar.monthrange(year, quarter * 3)[1])
        if start <= today:
            candidates.append((end, resource.get('last_modified') or '', start, resource))
    if not candidates:
        raise ValueError('Catalogo sem publicacao trimestral CSV reconhecida')
    end, _, start, resource = max(candidates, key=lambda item: item[:2])
    return resource, start, end

def refresh(kind, directory, temporary):
    name = 'ssp-vehicles.json' if kind == 'safety' else 'sp156-pavement.json'
    target = directory / name
    old = read(target) or read(ROOT / 'services/api/src/main/resources/data' / name)
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=-3))).date()
    if kind == 'safety':
        year = today.year
        url = police.SOURCE.format(year=year)
        raw = temporary / 'police.xlsx'
        try:
            digest = download(url, raw)
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
            year -= 1
            url = police.SOURCE.format(year=year)
            digest = download(url, raw)
        if old.get('sha256') == digest:
            data = old
        else:
            data = police.aggregate(raw, year)
    else:
        catalog = temporary / 'catalog.json'
        download(CATALOG, catalog)
        payload = read(catalog)
        if not payload.get('success'):
            raise ValueError('Catalogo SP156 indisponivel')
        resource, start, end = latest_resource(payload['result']['resources'], today)
        updated = resource.get('last_modified')
        if not updated:
            raise ValueError('Publicacao sem data de atualizacao')
        raw = temporary / 'pavement.csv'
        digest = download(resource['url'], raw)
        if old.get('sha256') == digest and old.get('sourceUpdatedAt') == updated[:10]:
            data = old
        else:
            encoding = 'utf-8-sig'
            try:
                with raw.open(encoding=encoding) as probe:
                    while probe.read(1024 * 1024):
                        pass
            except UnicodeDecodeError:
                encoding = 'cp1252'
            with raw.open(encoding=encoding, newline='') as source:
                sample = source.read(8192)
                source.seek(0)
                dialect = csv.Sniffer().sniff(sample, delimiters=',;')
                data = pavement.aggregate(csv.DictReader(source, dialect=dialect), updated[:10], today, start, end)
            data.update(sha256=digest, resourceUrl=resource['url'], sourceUrl=f"{pavement.DATASET_URL}/resource/{resource['id']}")
    if data['periodEnd'] < old.get('periodEnd', ''):
        raise ValueError('Publicacao regrediu de periodo; base anterior preservada')
    data['lastCheckedAt'] = now()
    write(target, data)
    return {'status': 'OK', 'lastCheckedAt': data['lastCheckedAt'], 'periodEnd': data['periodEnd'], 'sourceUrl': data['sourceUrl']}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'data/private/public-data')
    args = parser.parse_args()
    status_path = args.output_dir / 'refresh-status.json'
    status = read(status_path)
    with tempfile.TemporaryDirectory() as temp:
        for kind in ('safety', 'pavement'):
            try:
                status[kind] = refresh(kind, args.output_dir, Path(temp))
            except Exception as error:
                status[kind] = {**status.get(kind, {}), 'status': 'ERROR', 'lastAttemptAt': now(), 'error': str(error)}
            write(status_path, status)
            print(json.dumps({kind: status[kind]}, ensure_ascii=True), flush=True)
    return 1 if any(item['status'] == 'ERROR' for item in status.values()) else 0

if __name__ == '__main__':
    raise SystemExit(main())
