"""Offline integrity check for the published snapshot and compatibility CSVs."""
import csv
import json
from pathlib import Path
from datetime import date, timedelta

folder = Path(__file__).resolve().parents[1] / 'CSV'
snapshot = json.loads((folder / 'snapshot.json').read_text(encoding='utf-8'))
draws = snapshot['draws']
assert snapshot['round'] == draws[-1]['round']
assert snapshot['date'] == draws[-1]['date']
assert [d['round'] for d in draws] == list(range(1, snapshot['round'] + 1))
for draw in draws:
    nums = draw['numbers'] + [draw['bonus']]
    assert len(nums) == 7 and len(set(nums)) == 7 and all(1 <= n <= 45 for n in nums)
    assert date.fromisoformat(draw['date']) == date(2002, 12, 7) + timedelta(weeks=draw['round'] - 1)
shops = [s for s in snapshot['stores'] if s['round'] == snapshot['round']]
for store in snapshot['stores']:
    if 'lat' in store:
        assert 30 < store['lat'] < 40 and 120 < store['lon'] < 140
        assert store.get('mapAddress') and store.get('locationSource') in ('official', 'archive')
assert len(shops) == snapshot['prizes'][0]['winners']
with (folder / 'lotto_number_frequency_combined.csv').open(encoding='utf-8-sig') as stream:
    counts = list(csv.reader(stream))[1:]
for column, count in enumerate((len(draws), 100, 20, 5, 1), 1):
    assert sum(int(row[column]) for row in counts) == min(count, len(draws)) * 6
print(f'Validated {len(draws)} contiguous draws, five statistics periods and latest stores')
