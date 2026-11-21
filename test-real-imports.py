"""Actual document parsing tests using fictional data and an isolated local page.

Requires Python Playwright, python-docx, ReportLab, Pillow and Chromium.
Auth is omitted in the test fixture; the application import code, Mammoth and
PDF.js are otherwise unchanged. This does not test staging authentication.
"""
import io
import os
import re
import threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from docx import Document
from PIL import Image
from reportlab.pdfgen import canvas
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
fixtures = root / 'tmp' / 'fictional-documents'
fixtures.mkdir(parents=True, exist_ok=True)

doc = Document()
doc.add_heading('Fictional Assignment', 0)
doc.add_paragraph('DOCX fictional marker: purple otter research.')
doc.add_paragraph('Second fictional paragraph: synthetic text only.')
doc.save(fixtures / 'fictional.docx')

c = canvas.Canvas(str(fixtures / 'fictional.pdf'))
c.drawString(72, 760, 'PDF fictional marker: blue heron research.')
c.showPage()
c.drawString(72, 760, 'Second page marker: silver willow notes.')
c.save()

image = Image.new('RGB', (250, 120), 'white')
img_path = fixtures / 'blank-image.png'
image.save(img_path)
c = canvas.Canvas(str(fixtures / 'image-only.pdf'))
c.drawImage(str(img_path), 72, 500, 250, 120)
c.save()
(fixtures / 'broken.pdf').write_bytes(b'%PDF-1.7\nfictional corrupted content')
(fixtures / 'broken.docx').write_bytes(b'Not a DOCX: fictional corrupted content')
(fixtures / 'unsupported.txt').write_text('Fictional text file')
(fixtures / 'large.pdf').write_bytes(b'0' * (10 * 1024 * 1024 + 1))

html = (root / 'dashboard.html').read_text(encoding='utf8')
# Prevent authentication, styles and other requests in the local test fixture;
# preserve the actual document-reading libraries and application script.
html = re.sub(r'<script defer src="[^\"]+"[^>]*>\s*</script>', '', html, flags=re.I)
html = re.sub(r'<link\b[^>]*>', '', html, flags=re.I)
html = html.replace('<body>', '<body><script>document.documentElement.classList.add("auth-ready")</script>', 1)

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != '/':
            self.send_error(404)
            return
        body = html.encode('utf8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
errors = []
requests = []
passed = []
def check(name, condition):
    if not condition:
        raise AssertionError('FAILED: ' + name)
    passed.append(name)
    print('PASS:', name, flush=True)

try:
  with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    context = browser.new_context()
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('requestfailed', lambda request: requests.append((request.url, request.failure)))
    choice = {'accept': True}
    def dialog(d):
        if d.type == 'confirm' and not choice['accept']:
            d.dismiss()
        else:
            d.accept()
    page.on('dialog', dialog)
    local_origin = 'http://127.0.0.1:' + str(server.server_port)
    def route(r):
        u = r.request.url
        if u.startswith(local_origin + '/') or u.startswith('https://unpkg.com/mammoth@1.12.3/') or u.startswith('https://unpkg.com/pdfjs-dist@6.4.299/'):
            r.continue_()
        else:
            r.abort()
    page.route('**/*', route)
    page.goto(local_origin + '/', wait_until='load', timeout=30000)
    page.wait_for_function('!!window.mammoth && !!window.extractPdfText', timeout=30000)
    check('actual Mammoth and PDF.js loaded', True)
    def upload(name):
        page.locator('#documentFile').set_input_files(str(fixtures / name), timeout=15000)
        page.wait_for_function("!document.querySelector('#form button[type=submit]').disabled", timeout=30000)
    def value():
        return page.locator('#text').input_value()
    def status():
        return page.locator('#fileStatus').inner_text()
    def submit():
        page.locator('#title').fill('Fictional assignment')
        page.locator('#form').evaluate("el => el.dispatchEvent(new Event('submit', {cancelable:true,bubbles:true}))")
    def report_hidden():
        return page.locator('#report').evaluate("el => el.classList.contains('hidden')")
    def set_text(txt):
        page.locator('#text').fill(txt)
    def reset():
        page.locator('#form').evaluate('el => el.reset()')

    upload('fictional.docx')
    check('real DOCX extracts both paragraphs', 'purple otter research' in value() and 'synthetic text only' in value())
    submit()
    check('DOCX generates a report', not report_hidden())
    page.locator('#notes').fill('Fictional lecturer notes')
    choice['accept'] = False
    upload('fictional.pdf')
    check('declined replacement preserves DOCX report, text and notes', not report_hidden() and 'purple otter research' in value() and page.locator('#notes').input_value() == 'Fictional lecturer notes')
    choice['accept'] = True
    upload('fictional.pdf')
    check('real two-page PDF extracts both pages', 'blue heron research' in value() and 'silver willow notes' in value())
    check('accepted replacement clears the previous report and notes', report_hidden() and not page.locator('#notes').input_value())
    submit()
    check('PDF generates a report', not report_hidden())
    for filename, expectation in [('image-only.pdf', 'No readable text'), ('broken.pdf', 'No text was imported'), ('broken.docx', 'No text was imported'), ('unsupported.txt', 'No text was imported'), ('large.pdf', '10 MB')]:
        set_text('Previous fictional private text')
        submit()
        check(filename + ' precondition report exists', not report_hidden())
        upload(filename)
        check(filename + ' fails closed', not value() and report_hidden() and expectation in status())
        submit()
        check(filename + ' cannot generate stale report', report_hidden())
    # Delay a successful real PDF extraction *after* the actual parser completes,
    # then reset while its result is pending to exercise the race protection.
    reset()
    page.evaluate('''() => {const real=window.extractPdfText; window.extractPdfText=async f=>{const v=await real(f); await new Promise(r=>window.releaseExtraction=r); return v;}}''')
    page.locator('#documentFile').set_input_files(str(fixtures / 'fictional.pdf'))
    page.wait_for_function('typeof window.releaseExtraction === "function"', timeout=30000)
    check('actual PDF extraction pending locks submit', page.locator('#form button[type=submit]').is_disabled() and not value())
    reset()
    page.evaluate('window.releaseExtraction()')
    page.wait_for_timeout(300)
    check('reset blocks delayed real PDF result', not value() and report_hidden() and not page.locator('#form button[type=submit]').is_disabled())
    check('no unhandled page errors', not errors)
    print(f'{len(passed)} checks passed with real fictional files.', flush=True)
    browser.close()
finally:
    server.shutdown()
    server.server_close()
    if errors:
        print('PAGE ERRORS:', errors, flush=True)
    if requests:
        print('FAILED REQUESTS:', requests, flush=True)
