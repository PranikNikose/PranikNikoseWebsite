"""
Interactive editor for config.json (repo root) -- lets the user view and
change project settings (server_port, rows_per_sheet) without hand-editing
JSON. Blank input at any prompt keeps the current value unchanged.

Usage:
    python scripts/edit_config.py
"""

import json
import os

import config as cfg


def prompt_int(label, current, allow_none=False, none_words=('none', 'null', 'full', '')):
    extra = ' (blank = keep current, "full" = no cap)' if allow_none else ' (blank = keep current)'
    try:
        raw = input(label + ' [current: ' + str(current) + ']' + extra + ': ').strip()
    except EOFError:
        print()
        print('  No input available -- keeping current value.')
        return current, False
    except KeyboardInterrupt:
        print()
        print('Cancelled -- nothing saved.')
        raise SystemExit(0)
    if raw == '':
        return current, False
    if allow_none and raw.lower() in none_words:
        return None, True
    try:
        return int(raw), True
    except ValueError:
        print('  Not a whole number -- keeping current value.')
        return current, False


def main():
    settings = cfg.load_config()
    print('Current settings (config.json):')
    print('  server_port:    ' + str(settings['server_port']))
    print('  rows_per_sheet: ' + str(settings['rows_per_sheet']) + ('  (null = full dataset)' if settings['rows_per_sheet'] is None else ''))
    print()

    new_port, port_changed = prompt_int('New server_port', settings['server_port'])
    new_rows, rows_changed = prompt_int('New rows_per_sheet', settings['rows_per_sheet'], allow_none=True)

    if not (port_changed or rows_changed):
        print()
        print('Nothing changed.')
        return

    settings['server_port'] = new_port
    settings['rows_per_sheet'] = new_rows

    with open(cfg.CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(settings, f, indent=2)
        f.write('\n')

    print()
    print('Saved to ' + cfg.CONFIG_PATH + ':')
    print('  server_port:    ' + str(settings['server_port']))
    print('  rows_per_sheet: ' + str(settings['rows_per_sheet']))


if __name__ == '__main__':
    main()
