"""Fetch official Lotto results, validate, then replace a complete data snapshot.

No credentials are needed: run this inside the website repository.
"""
import argparse
import csv
import io
import json
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

BASE = 'https://www.dhlottery.co.kr'
ROOT = Path(__file__).resolve().parents[1]


def fetch(path, params):
    url = BASE + path + '?' + urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': BASE + '/'})
            with urllib.request.urlopen(req, timeout=30) as response:
                payload = json.load(response)
            rows = payload['data']['list']
            if not isinstance(rows, list):
                raise ValueError('Official response list changed')
            return rows
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def validate_draw(item, round_no):
    nums = [int(item[f'tm{i}WnNo']) for i in range(1, 7)]
    bonus = int(item['bnsWnNo'])
    if int(item['ltEpsd']) != round_no or len(set(nums + [bonus])) != 7:
        raise ValueError(f'Invalid draw {round_no}')
    if not all(1 <= n <= 45 for n in nums + [bonus]):
        raise ValueError('Number outside 1..45')
    draw_date = datetime.strptime(str(item['ltRflYmd']), '%Y%m%d').date()
    if draw_date != date(2002, 12, 7) + timedelta(weeks=round_no - 1):
        raise ValueError('Unexpected draw date')
    for rank in range(1, 6):
        if int(item[f'rnk{rank}WnNope']) < 0 or int(item[f'rnk{rank}SumWnAmt']) < 0:
            raise ValueError('Invalid prize data')
    return [round_no, draw_date.isoformat(), *nums, bonus]


def validate_stores(items, round_no, winner_count):
    # Preserve repeated shops: multiple winning tickets at one shop are valid.
    if len(items) != winner_count:
        raise ValueError(f'Store count {len(items)} != winning games {winner_count} at {round_no}')
    result = []
    for item in items:
        if int(item['draw']) != round_no or int(item['wnShpRnk']) != 1 or not item['shpNm']:
            raise ValueError('Invalid store response')
        address = (item.get('befAddr') or item.get('shpAddr') or '').strip()
        if not address:
            raise ValueError('Missing store address')
        result.append([round_no, item['shpNm'].strip(), item.get('atmtPsvYnTxt') or '미확인', address])
    return result


def encode_csv(rows):
    stream = io.StringIO(newline='')
    csv.writer(stream, lineterminator='\n').writerows(rows)
    return stream.getvalue()


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.reader(stream))


def location_key(name, address):
    return ' '.join(name.split()) + '\x1f' + ' '.join(address.split())


def official_locations(items):
    locations = {}
    for item in items:
        name = item.get('shpNm', '').strip()
        address = (item.get('befAddr') or item.get('shpAddr') or '').strip()
        if 'dhlottery.co.kr' in address:
            continue
        try:
            lat, lon = float(item['shpLat']), float(item['shpLot'])
        except (KeyError, ValueError, TypeError):
            continue
        if name and address and 30 < lat < 40 and 120 < lon < 140:
            locations[location_key(name, address)] = {
                'lat': lat, 'lon': lon, 'mapAddress': (item.get('shpAddr') or address).strip(),
                'locationSource': 'official',
            }
    return locations


def update(data_dir, end_round=None):
    now = datetime.now(timezone(timedelta(hours=9)))
    today = now.date()
    last_saturday = today - timedelta(days=(today.weekday() - 5) % 7)
    if today.weekday() == 5 and now.hour < 21:
        last_saturday -= timedelta(days=7)
    target = (last_saturday - date(2002, 12, 7)).days // 7 + 1
    if end_round is not None:
        target = min(target, end_round)
    draws = read_csv(data_dir / 'lottoRes.csv')
    shops = read_csv(data_dir / 'lottowinnerstores.csv')
    location_file = data_dir / 'store-locations.json'
    locations = json.loads(location_file.read_text(encoding='utf-8')) if location_file.exists() else {}
    existing = {int(row[0]): row for row in draws[1:]}
    if target < max(existing, default=0):
        raise ValueError('Refusing to replace newer data with an older target round')
    for round_no, row in existing.items():
        nums = list(map(int, row[2:9]))
        if len(nums) != 7 or len(set(nums)) != 7 or not all(1 <= n <= 45 for n in nums):
            raise ValueError(f'Invalid existing row {round_no}')
    shop_rounds = {int(row[0]) for row in shops[1:]}
    last_item = None
    current_store_items = []
    for round_no in range(1, target + 1):
        need_draw = round_no not in existing
        need_shops = round_no >= 262 and round_no not in shop_rounds
        if not (need_draw or need_shops or round_no == target):
            continue
        rows = fetch('/lt645/selectPstLt645Info.do', {'srchLtEpsd': round_no})
        matches = [row for row in rows if int(row.get('ltEpsd', 0)) == round_no]
        if len(matches) != 1:
            raise ValueError(f'Draw {round_no} not published; keeping previous snapshot')
        item = matches[0]
        normalized = validate_draw(item, round_no)
        if need_draw:
            existing[round_no] = normalized
        if need_shops or round_no == target:
            items = fetch('/wnprchsplcsrch/selectLtWnShp.do', {'srchLtEpsd': round_no, 'srchWnShpRnk': 1})
            normalized_shops = validate_stores(items, round_no, int(item['rnk1WnNope']))
            locations.update(official_locations(items))
            if need_shops:
                shops.extend(normalized_shops)
            if round_no == target:
                current_store_items = items
        if round_no == target:
            last_item = item
        print(f'Validated {round_no}', flush=True)
        time.sleep(.15)
    ordered = [existing[n] for n in sorted(existing)]
    prizes = [[f'{rank}등', int(last_item[f'rnk{rank}SumWnAmt']), int(last_item[f'rnk{rank}WnNope'])] for rank in range(1, 6)]
    frequency = [['번호', '출현 횟수 전체', '출현 횟수 100', '출현 횟수 020', '출현 횟수 005', '출현 횟수 001']]
    for n in range(1, 46):
        frequency.append([n, *[sum(n in list(map(int, row[2:8])) for row in (ordered if count == 0 else ordered[-count:])) for count in (0, 100, 20, 5, 1)]])
    snapshot = {
        'round': target, 'date': ordered[-1][1], 'source': BASE,
        'draws': [{'round': int(r[0]), 'date': r[1], 'numbers': list(map(int, r[2:8])), 'bonus': int(r[8])} for r in ordered],
        'prizes': [{'rank': i, 'total': int(last_item[f'rnk{i}SumWnAmt']), 'amount': int(last_item[f'rnk{i}WnAmt']), 'winners': int(last_item[f'rnk{i}WnNope'])} for i in range(1, 6)],
        'stores': [{'round': int(r[0]), 'name': r[1], 'category': r[2], 'address': r[3], **locations.get(location_key(r[1], r[3]), {})} for r in shops[1:]],
        'latestLocations': [{'name': s['shpNm'].strip(), 'address': s['shpAddr'].strip(), 'winningAddress': (s.get('befAddr') or s['shpAddr']).strip(), 'lat': s.get('shpLat'), 'lon': s.get('shpLot'), 'id': s.get('ltShpId')} for s in current_store_items],
    }
    files = {'lottoRes.csv': encode_csv([draws[0], *ordered]), 'lottowinnerstores.csv': encode_csv(shops), 'lastlotto_results.csv': encode_csv(prizes), 'lotto_number_frequency_combined.csv': encode_csv(frequency), 'store-locations.json': json.dumps(locations, ensure_ascii=False, separators=(',', ':')) + '\n', 'snapshot.json': json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + '\n'}
    # Do not touch original files until all requests and validation have succeeded.
    for filename, content in files.items():
        temporary = data_dir / (filename + '.tmp')
        temporary.write_text(content, encoding='utf-8')
    for filename in files:
        os.replace(data_dir / (filename + '.tmp'), data_dir / filename)
    print(f'Complete snapshot: round {target}, {len(ordered)} draws')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', type=Path, default=ROOT / 'CSV')
    parser.add_argument('--end-round', type=int)
    args = parser.parse_args()
    update(args.data_dir, args.end_round)
