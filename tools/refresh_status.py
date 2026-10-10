"""Decide whether the official collector is due without making network requests."""
import argparse
import json
import os
from pathlib import Path
from update_data import ROOT, expected_latest_round


def refresh_status(snapshot, event, now=None):
    published = int(snapshot['round'])
    expected = expected_latest_round(now)
    stale = published < expected
    return {'published': published, 'expected': expected, 'stale': stale,
            'collect': stale or event == 'workflow_dispatch'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot', type=Path, default=ROOT / 'CSV' / 'snapshot.json')
    parser.add_argument('--event', default=os.environ.get('GITHUB_EVENT_NAME', 'schedule'))
    parser.add_argument('--require-current', action='store_true')
    args = parser.parse_args()
    status = refresh_status(json.loads(args.snapshot.read_text(encoding='utf-8')), args.event)
    message = (f"Published round {status['published']}; expected round {status['expected']}; "
               f"collection {'needed' if status['collect'] else 'skipped (already current)'}")
    print(message)
    if args.require_current:
        if status['stale']:
            raise SystemExit(f"Snapshot is stale: expected {status['expected']}, found {status['published']}")
        return
    output = os.environ.get('GITHUB_OUTPUT')
    if output:
        with Path(output).open('a', encoding='utf-8') as stream:
            stream.write(f"collect={str(status['collect']).lower()}\n")
            stream.write(f"expected={status['expected']}\n")
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with Path(summary).open('a', encoding='utf-8') as stream:
            stream.write('## Lotto freshness\n\n' + message + '\n')


if __name__ == '__main__':
    main()
