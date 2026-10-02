"""One-off maintenance: safely match historical store coordinates by name + address."""
import argparse
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from update_data import ROOT, fetch, read_csv, location_key, official_locations, validate_stores


def backfill(folder):
    cache_file = folder / 'store-locations.json'
    cache = json.loads(cache_file.read_text(encoding='utf-8')) if cache_file.exists() else {}
    legacy = folder / 'lottowinnerstores_addr.csv'
    if legacy.exists():
        ambiguous = set()
        candidates = {}
        for row in read_csv(legacy)[1:]:
            try:
                lat, lon = float(row[4]), float(row[3])
            except (ValueError, IndexError):
                continue
            if not (30 < lat < 40 and 120 < lon < 140):
                continue
            key = location_key(row[0], row[1])
            point = {'lat': lat, 'lon': lon, 'mapAddress': row[1].strip(), 'locationSource': 'archive'}
            if key in candidates and (abs(candidates[key]['lat'] - lat) > .0001 or abs(candidates[key]['lon'] - lon) > .0001):
                ambiguous.add(key)
            candidates[key] = point
        for key, point in candidates.items():
            if key not in ambiguous:
                cache.setdefault(key, point)
    rows = read_csv(folder / 'lottowinnerstores.csv')[1:]
    needed = sorted({int(row[0]) for row in rows if 'dhlottery.co.kr' not in row[3] and location_key(row[1], row[3]) not in cache}, reverse=True)
    print(f'Checking official coordinates for {len(needed)} historical rounds', flush=True)

    def collect(round_no):
        items = fetch('/wnprchsplcsrch/selectLtWnShp.do', {'srchLtEpsd': round_no, 'srchWnShpRnk': 1})
        validate_stores(items, round_no, len(items))
        time.sleep(.2)
        return official_locations(items)

    errors = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(collect, round_no): round_no for round_no in needed}
        for index, future in enumerate(as_completed(futures), 1):
            try:
                cache.update(future.result())
            except Exception as error:
                errors.append(futures[future])
                print(f'No verified coordinates for {futures[future]}: {type(error).__name__}', flush=True)
            if index % 30 == 0 or index == len(needed):
                print(f'Checked {index}/{len(needed)} rounds', flush=True)
    temporary = cache_file.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(cache, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    temporary.replace(cache_file)
    matched = sum(location_key(row[1], row[3]) in cache for row in rows if 'dhlottery.co.kr' not in row[3])
    offline = sum('dhlottery.co.kr' not in row[3] for row in rows)
    print(f'Historical location coverage: {matched}/{offline} winning store records; errors: {len(errors)}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', type=Path, default=ROOT / 'CSV')
    backfill(parser.parse_args().data_dir)
