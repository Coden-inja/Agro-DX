import http.server
import socketserver
import os

PORT = 8000

# Change to the directory containing this script
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.bin': 'application/octet-stream',
})

print(f"Serving HTTP on 0.0.0.0 port {PORT}")
print(f"Current directory: {os.getcwd()}")
print("Open http://localhost:8000/model_test_browser.html in your browser")
print("Press Ctrl+C to stop the server")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped by user.") 