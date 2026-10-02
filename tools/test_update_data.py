import unittest
from unittest.mock import patch
import tempfile
from pathlib import Path
from update_data import update
from update_data import validate_draw, validate_stores, encode_csv, location_key, official_locations


class ValidationTests(unittest.TestCase):
    def fixture(self):
        item = {'ltEpsd': 1205, 'ltRflYmd': '20260103', 'bnsWnNo': 2}
        item.update({f'tm{i}WnNo': n for i, n in enumerate([1, 4, 16, 23, 31, 41], 1)})
        for i in range(1, 6):
            item[f'rnk{i}WnNope'] = 10
            item[f'rnk{i}SumWnAmt'] = 100
        return item

    def test_duplicate_bonus_rejected(self):
        item = self.fixture()
        item['bnsWnNo'] = 1
        with self.assertRaises(ValueError):
            validate_draw(item, 1205)

    def test_wrong_round_rejected(self):
        with self.assertRaises(ValueError):
            validate_draw(self.fixture(), 1206)

    def test_valid_draw(self):
        self.assertEqual(validate_draw(self.fixture(), 1205)[1], '2026-01-03')

    def test_incomplete_store_response_rejected(self):
        with self.assertRaises(ValueError):
            validate_stores([], 1205, 10)

    def test_same_shop_multiple_wins_preserved(self):
        shop = {'draw': 1205, 'wnShpRnk': 1, 'shpNm': '복권방', 'shpAddr': '서울', 'atmtPsvYnTxt': '자동'}
        self.assertEqual(len(validate_stores([shop, shop], 1205, 2)), 2)

    def test_csv_quotes(self):
        self.assertIn('"상호,이름"', encode_csv([[1205, '상호,이름']]))

    def test_same_shop_name_different_addresses_never_match(self):
        self.assertNotEqual(location_key('행운복권', '서울 강남구'), location_key('행운복권', '부산 동구'))

    def test_location_whitespace_is_normalized(self):
        self.assertEqual(location_key('행운복권', '서울  강남구 '), location_key('행운복권', '서울 강남구'))

    def test_official_moved_store_uses_winning_address_key(self):
        point = {'shpNm': '행운복권', 'befAddr': '서울 옛주소', 'shpAddr': '서울 새주소', 'shpLat': 37.5, 'shpLot': 127.1}
        self.assertEqual(official_locations([point])[location_key('행운복권', '서울 옛주소')]['mapAddress'], '서울 새주소')

    def test_online_coordinates_are_not_map_markers(self):
        point = {'shpNm': '온라인', 'shpAddr': '동행복권(dhlottery.co.kr)', 'shpLat': 37.5, 'shpLot': 127.1}
        self.assertEqual(official_locations([point]), {})

    def test_failed_fetch_keeps_previous_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'lottoRes.csv').write_text('회차,날짜,1,2,3,4,5,6,보너스\n1,2002-12-07,10,23,29,33,37,40,16\n', encoding='utf-8')
            (root / 'lottowinnerstores.csv').write_text('회차,상호명,구분,소재지\n', encoding='utf-8')
            before = {file.name: file.read_bytes() for file in root.iterdir()}
            with patch('update_data.fetch', side_effect=ValueError('Changed upstream format')):
                with self.assertRaises(ValueError):
                    update(root, 2)
            self.assertEqual(before, {file.name: file.read_bytes() for file in root.iterdir()})


if __name__ == '__main__':
    unittest.main()
