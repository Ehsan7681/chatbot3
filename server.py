from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

port = 8000
print(f"سرور در حال اجرا در پورت {port}...")
print(f"برای مشاهده برنامه، مرورگر خود را باز کنید و به آدرس http://localhost:{port} بروید")
httpd = HTTPServer(('localhost', port), CORSRequestHandler)
httpd.serve_forever() 