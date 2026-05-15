#!/usr/bin/env python3
"""Minimal http server with correct MIME types for ESM dev."""
import http.server, socketserver, sys, os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
DIR = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), 'website')

class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        '': 'application/octet-stream',
        '.html': 'text/html; charset=utf-8',
        '.css':  'text/css; charset=utf-8',
        '.js':   'application/javascript; charset=utf-8',
        '.mjs':  'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.geojson': 'application/json; charset=utf-8',
        '.glb':  'model/gltf-binary',
        '.gltf': 'model/gltf+json',
        '.svg':  'image/svg+xml',
        '.png':  'image/png',
        '.jpg':  'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.ico':  'image/x-icon',
        '.woff': 'font/woff',
        '.woff2':'font/woff2',
    }
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

os.chdir(DIR)
print(f'Serving {DIR} on http://localhost:{PORT}/')
with socketserver.TCPServer(('', PORT), H) as httpd:
    try: httpd.serve_forever()
    except KeyboardInterrupt: pass
