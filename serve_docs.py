#!/usr/bin/env python3
"""Tiny HTTP server that supports Range requests, for previewing the
docs/ bundle locally before pushing to GitHub Pages.

GitHub Pages serves Range requests natively, but Python's built-in
http.server does not — and sql.js-httpvfs depends on Range to query the
SQLite file efficiently. Without Range, every query downloads the full
43 MB DB.

Usage:
  python3 serve_docs.py [port=8000]

Then visit http://127.0.0.1:8000/
"""
import http.server
import os
import sys


class RangeHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler with `Range:` support (just bytes=start-end)."""

    def send_head(self):
        # Reuse the parent to resolve the path and open the file handle.
        path = self.translate_path(self.path)
        # Strip the query string only; let parent handle directories.
        if os.path.isdir(path):
            return super().send_head()
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None
        try:
            fs = os.fstat(f.fileno())
            size = fs.st_size
            rng = self.headers.get("Range")
            if rng and rng.startswith("bytes="):
                try:
                    spec = rng[6:].split("-", 1)
                    start = int(spec[0]) if spec[0] else 0
                    end = int(spec[1]) if len(spec) > 1 and spec[1] else size - 1
                except ValueError:
                    self.send_error(400, "Bad Range")
                    f.close(); return None
                if start >= size or end >= size or start > end:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    f.close(); return None
                length = end - start + 1
                f.seek(start)
                self.send_response(206, "Partial Content")
                self.send_header("Content-Type",
                                 self.guess_type(path))
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Content-Range",
                                 f"bytes {start}-{end}/{size}")
                self.send_header("Content-Length", str(length))
                self.end_headers()
                # Write `length` bytes from the seeked position.
                self._send_n(f, length)
                f.close()
                return None
            # No range header — full file.
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(size))
            self.end_headers()
            return f
        except Exception:
            f.close()
            raise

    def _send_n(self, f, n):
        CHUNK = 64 * 1024
        while n > 0:
            buf = f.read(min(CHUNK, n))
            if not buf:
                break
            self.wfile.write(buf)
            n -= len(buf)

    def end_headers(self):
        # Useful when serving SQLite to a worker on a different origin during
        # dev, though our setup is same-origin.
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    docs = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")
    if not os.path.isdir(docs):
        print(f"docs/ not found at {docs} — run build_static.py first?",
              file=sys.stderr)
        sys.exit(1)
    os.chdir(docs)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), RangeHandler)
    print(f"Serving docs/ at http://127.0.0.1:{port}/  (Ctrl-C to stop)")
    print("Range requests supported (required by sql.js-httpvfs).")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")


if __name__ == "__main__":
    main()
