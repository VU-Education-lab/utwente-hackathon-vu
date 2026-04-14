#!/usr/bin/env python3
"""
server.py — Lokale HTTP server voor Bel-oefening
Gebruik: python3 server.py
Opent: http://localhost:8080
"""

import http.server
import socketserver
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Vereist voor ES modules (type="module") in de browser
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()

    def log_message(self, format, *args):
        # Nettere log-output
        print(f"  {self.address_string()}  {format % args}")


def main():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"\n  🟢  Bel-oefening draait op http://localhost:{PORT}\n")
        print(f"  Bestanden worden geserveerd vanuit: {DIRECTORY}")
        print(f"  Stop met Ctrl+C\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server gestopt.")
            sys.exit(0)


if __name__ == "__main__":
    main()
