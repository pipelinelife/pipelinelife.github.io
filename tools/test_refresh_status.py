import unittest
from datetime import datetime, timezone
from refresh_status import refresh_status
from update_data import expected_latest_round, KST


class FreshnessTests(unittest.TestCase):
    def test_saturday_before_publication_uses_last_week(self):
        self.assertEqual(expected_latest_round(datetime(2026, 10, 10, 20, 59, tzinfo=KST)), 1244)

    def test_saturday_publication_window_requires_this_week(self):
        self.assertEqual(expected_latest_round(datetime(2026, 10, 10, 21, 0, tzinfo=KST)), 1245)

    def test_utc_and_korean_clock_agree_after_midnight(self):
        self.assertEqual(expected_latest_round(datetime(2026, 10, 10, 16, 0, tzinfo=timezone.utc)), 1245)

    def test_weekday_catches_up_missing_weekend(self):
        status = refresh_status({'round': 1244}, 'schedule', datetime(2026, 10, 12, 13, tzinfo=KST))
        self.assertTrue(status['collect'])
        self.assertTrue(status['stale'])
        self.assertEqual(status['expected'], 1245)

    def test_current_schedule_does_not_fetch_again(self):
        status = refresh_status({'round': 1245}, 'schedule', datetime(2026, 10, 11, 10, tzinfo=KST))
        self.assertFalse(status['collect'])
        self.assertFalse(status['stale'])

    def test_manual_run_can_refresh_complete_current_snapshot(self):
        status = refresh_status({'round': 1245}, 'workflow_dispatch', datetime(2026, 10, 11, 10, tzinfo=KST))
        self.assertTrue(status['collect'])

    def test_push_can_recover_stale_data(self):
        status = refresh_status({'round': 1244}, 'push', datetime(2026, 10, 10, 23, tzinfo=KST))
        self.assertTrue(status['collect'])


if __name__ == '__main__':
    unittest.main()
