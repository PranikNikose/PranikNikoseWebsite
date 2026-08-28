"""
Loads project-wide settings from config.json (repo root) -- the one place
to change things like the local server port or the sync row cap, instead
of editing constants inside a script's source. Missing file / missing
keys / a malformed file all fall back to DEFAULTS silently (this is
convenience config, not something that should ever block a script from
running).

Usage:
    import config as cfg
    settings = cfg.load_config()
    port = settings['server_port']
"""

import json
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(PROJECT_ROOT, 'config.json')

DEFAULTS = {
    'server_port': 8000,
    'rows_per_sheet': None,  # None = full dataset, an int = sampled/testing cap
}


def load_config():
    settings = dict(DEFAULTS)
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, encoding='utf-8') as f:
                user_settings = json.load(f)
            for key in DEFAULTS:
                if key in user_settings:
                    settings[key] = user_settings[key]
        except Exception as e:
            print('Warning: could not read config.json (' + str(e) + ') -- using defaults.')
    return settings
