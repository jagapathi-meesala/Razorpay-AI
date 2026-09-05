import os
import http.server
import socketserver
import sys

PORT = 5173
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
DIRECTORY = os.path.join(PROJECT_DIR, "frontend", "dist")

class SPAServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.proxy_request()
            return
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path):
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self.proxy_request()
            return
        return super().do_POST()

    def do_PUT(self):
        if self.path.startswith("/api/"):
            self.proxy_request()
            return
        return super().do_PUT()

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            self.proxy_request()
            return
        return super().do_DELETE()

    def proxy_request(self):
        import urllib.request
        import urllib.error
        backend_url = os.getenv("BACKEND_URL", "http://127.0.0.1:8081")
        url = f"{backend_url}{self.path}"
        headers = {k: v for k, v in self.headers.items() if k.lower() not in ['host', 'content-length']}
        body = None
        content_len = int(self.headers.get('Content-Length', 0))
        if content_len > 0:
            body = self.rfile.read(content_len)

        req = urllib.request.Request(url, data=body, headers=headers, method=self.command)
        try:
            with urllib.request.urlopen(req) as resp:
                self.send_response(resp.status)
                for k, v in resp.getheaders():
                    if k.lower() not in ['transfer-encoding', 'content-length']:
                        self.send_header(k, v)
                resp_body = resp.read()
                self.send_header('Content-Length', str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for k, v in e.headers.items():
                if k.lower() not in ['transfer-encoding', 'content-length']:
                    self.send_header(k, v)
            resp_body = e.read()
            self.send_header('Content-Length', str(len(resp_body)))
            self.end_headers()
            self.wfile.write(resp_body)
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(f'{{"detail":"Proxy error: {str(e)}"}}'.encode('utf-8'))

if __name__ == '__main__':
    if not os.path.exists(DIRECTORY):
        print(f"Error: Frontend build directory '{DIRECTORY}' not found.")
        print("Please build the frontend first.")
        sys.exit(1)
        
    print(f"Serving RiskShield AI Frontend at http://localhost:{PORT}")
    try:
        # Prevent 'address already in use' errors on restart
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(("", PORT), SPAServer) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nFrontend server stopped.")
