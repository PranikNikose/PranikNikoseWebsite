"""
Serves the project root locally and opens index.html in the default
browser. Port is read from config.json's "server_port" (default 8000) --
see scripts/config.py -- rather than hardcoded here or in manage.bat.

Usage:
    python scripts/serve.py
    (Ctrl+C to stop)
"""

import http.server
import os
import socketserver
import webbrowser

import config as cfg

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    settings = cfg.load_config()
    port = settings['server_port']
    os.chdir(PROJECT_ROOT)

    url = 'http://localhost:' + str(port) + '/index.html'
    print('Starting local server at ' + url)
    print('Press Ctrl+C to stop and return to the menu.')
    print()

    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(('', port), handler) as httpd:
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServer stopped.')


if __name__ == '__main__':
    main()
