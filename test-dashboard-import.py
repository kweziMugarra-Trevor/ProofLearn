"""Synthetic import regression tests. Requires Python Playwright and a local Chromium.

Run: python test-dashboard-import.py [path-to-dashboard.html]
The test strips remote/auth scripts and stubs extraction: it tests the inline UI
logic in isolation, not real document extraction or authentication.
"""
import os
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

source = Path(sys.argv[1] if len(sys.argv) > 1 else 'dashboard.html').read_text(encoding='utf-8')
# Keep the application inline script exactly as committed, but exclude external
# libraries, auth and the network-loaded PDF module from this isolated test.
html = re.sub(r'<script\b[^>]*\bsrc=[^>]*>\s*</script>', '', source, flags=re.I)
html = re.sub(r'<script\s+type="module">.*?</script>', '', html, flags=re.S | re.I)
html = html.replace('<body>', '<body><script>document.documentElement.classList.add("auth-ready")</script>', 1)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(html, wait_until='domcontentloaded')
    result = page.evaluate(r'''async () => {
      const $ = id => document.getElementById(id);
      const passed = [];
      const check = (name, value) => { if (!value) throw Error('FAILED: ' + name); passed.push(name); };
      const tick = () => new Promise(r => setTimeout(r, 10));
      let accept = true;
      window.confirm = () => accept;
      let pending = {};
      window.extractPdfText = file => new Promise((resolve,reject) => { pending[file.name] = {resolve,reject}; });
      const file = (name, size = 5) => ({name, size});
      const drop = f => { const ev = new Event('drop',{bubbles:true,cancelable:true}); Object.defineProperty(ev,'dataTransfer',{value:{files:f ? [f] : []}}); $('fileDropZone').dispatchEvent(ev); };
      const text = s => { $('text').value = s; $('text').dispatchEvent(new Event('input',{bubbles:true})); };
      const submit = () => $('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      const button = () => $('form').querySelector('button[type=submit]');
      const reset = () => $('form').reset();
      $('title').value='Fictional title'; text('Old fictional assignment'); submit();
      check('baseline report', !$('report').classList.contains('hidden'));
      $('notes').value = 'Fictional lecturer notes';
      $('notes').dispatchEvent(new Event('input',{bubbles:true}));
      let prompt = ''; window.confirm = message => { prompt = message; return accept; };
      accept=false; drop(file('decline.pdf')); await tick();
      check('declined replacement preserves text, report and notes', $('text').value==='Old fictional assignment' && !$('report').classList.contains('hidden') && $('notes').value === 'Fictional lecturer notes' && !pending['decline.pdf']);
      check('replacement warning mentions clearing notes', prompt.includes('notes'));
      accept=true; drop(file('big.pdf', 11*1024*1024)); await tick();
      check('oversized import clears old text, report and notes', !$('text').value && !$('notes').value && $('report').classList.contains('hidden') && $('fileStatus').textContent.includes('10 MB') && !button().disabled);
      submit(); check('cannot report old text after oversized import', $('report').classList.contains('hidden'));
      text('Old fictional assignment'); drop(file('wrong.txt')); await tick();
      check('unsupported import clears old text', !$('text').value && $('fileStatus').textContent.includes('No text was imported') && !button().disabled);
      text('Old fictional assignment'); drop(file('bad.pdf')); pending['bad.pdf'].reject(Error('Unreadable')); await tick();
      check('failed import clears old text', !$('text').value && $('fileStatus').textContent.includes('Unreadable') && !button().disabled);
      text('Old fictional assignment'); drop(file('empty.pdf')); pending['empty.pdf'].resolve('  '); await tick();
      check('empty import clears old text', !$('text').value && $('fileStatus').textContent.includes('No readable text') && !button().disabled);
      text('Old fictional assignment'); drop(file('pending.pdf'));
      check('pending clears text and disables submit', !$('text').value && button().disabled);
      $('text').value='Programmatically filled'; submit();
      check('submit handler blocks while pending', $('report').classList.contains('hidden') && button().disabled);
      pending['pending.pdf'].resolve('Fictional extracted text'); await tick();
      check('successful import completes', $('text').value==='Fictional extracted text' && !button().disabled);
      drop(file('manual.pdf')); text('Manually typed fictional text');
      check('manual input cancels import', !button().disabled && $('fileStatus').textContent.includes('cancelled'));
      pending['manual.pdf'].resolve('STALE'); await tick();
      check('late import cannot overwrite typing', $('text').value==='Manually typed fictional text');
      drop(file('old.pdf')); drop(file('new.pdf')); pending['new.pdf'].resolve('NEW'); await tick(); pending['old.pdf'].resolve('OLD'); await tick();
      check('newer import wins', $('text').value==='NEW' && !button().disabled && $('fileStatus').textContent.includes('new.pdf'));
      drop(file('older.pdf')); drop(file('newer.pdf')); pending['older.pdf'].resolve('OLD'); await tick();
      check('stale completion cannot finish newer pending import', button().disabled && !$('text').value);
      pending['newer.pdf'].resolve('NEWER'); await tick(); check('newer pending import completes', $('text').value==='NEWER' && !button().disabled);
      drop(file('reset.pdf')); reset(); pending['reset.pdf'].resolve('STALE'); await tick();
      check('reset invalidates late import', !$('text').value && !button().disabled && $('report').classList.contains('hidden'));
      drop(file('sample.pdf')); $('sample').click(); const sample=$('text').value; pending['sample.pdf'].resolve('STALE'); await tick();
      check('sample invalidates late import', $('text').value===sample && !button().disabled);
      drop(file('no-file.pdf')); drop(null); check('empty drop does not cancel pending import', button().disabled); pending['no-file.pdf'].resolve('AFTER EMPTY'); await tick();
      check('empty drop preserves in-flight import', $('text').value==='AFTER EMPTY');
      reset(); $('title').value='Manual test'; text('Manual fictional text'); submit();
      check('manual text can generate report', !$('report').classList.contains('hidden') && $('reportTitle').textContent==='Manual test');
      reset();
      return passed;
    }''')
    browser.close()
    if errors:
        raise RuntimeError('Browser errors: ' + '; '.join(errors))
    for item in result:
        print('PASS:', item)
    print(f'{len(result)} import regression checks passed; mocked extraction, synthetic data only.')
