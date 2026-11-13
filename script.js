

        import * as pdfjsLib from
            'https://unpkg.com/pdfjs-dist@6.4.299/build/pdf.mjs';

        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://unpkg.com/pdfjs-dist@6.4.299/build/pdf.worker.mjs';

        window.extractPdfText = async file => {
            const data = new Uint8Array(await file.arrayBuffer());
            const pdf = await pdfjsLib.getDocument({ data }).promise;
            const pages = [];

            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                const page = await pdf.getPage(pageNumber);
                const content = await page.getTextContent();

                pages.push(
                    content.items.map(item => item.str).join(' ')
                );
            }

            return pages.join('\n\n');
        };


(() => {
            const $ = id => document.getElementById(id);

            const fileInput = $('documentFile');
            const dropZone = $('fileDropZone');
            const fileStatus = $('fileStatus');

            async function loadDocument(file) {
                if (!file) return;

                if (file.size > 10 * 1024 * 1024) {
                    fileStatus.textContent = 'Please choose a file smaller than 10 MB.';
                    return;
                }

                const extension = file.name.split('.').pop().toLowerCase();

                try {
                    let extractedText = '';

                    if (extension === 'docx') {
                        const result = await window.mammoth.extractRawText({
                            arrayBuffer: await file.arrayBuffer()
                        });

                        extractedText = result.value;
                    } else if (extension === 'pdf') {
                        if (!window.extractPdfText) {
                            throw new Error('The PDF reader has not finished loading.');
                        }

                        extractedText = await window.extractPdfText(file);
                    } else {
                        throw new Error('Choose a .docx or .pdf file.');
                    }

                    if (!extractedText.trim()) {
                        throw new Error(
                            'No readable text was found. The PDF may be scanned or image-only.'
                        );
                    }

                    $('text').value = extractedText;
                    fileStatus.textContent =
                        `${file.name} loaded. Check the text, then generate the report.`;
                } catch (error) {
                    fileStatus.textContent = error.message;
                }
            }

            fileInput.addEventListener('change', event => {
                loadDocument(event.target.files[0]);
            });

            dropZone.addEventListener('dragover', event => {
                event.preventDefault();
            });

            dropZone.addEventListener('drop', event => {
                event.preventDefault();
                loadDocument(event.dataTransfer.files[0]);
            });

            let reviews = 0;
            let qCount = 0;
            let current = null;

            const names = {
                dashboard: 'Lecturer dashboard',
                review: 'Review assignment',
                guide: 'Responsible AI guide'
            };

            function go(p) {
                Object.keys(names).forEach(k => {
                    $('page-' + k).classList.toggle('hidden', k !== p);
                });

                const crumb = $('crumb');
                if (crumb) crumb.textContent = names[p];

                document.querySelectorAll('[data-page]').forEach(b => {
                    b.classList.toggle('active', b.dataset.page === p);
                });

                $('sidebar').classList.remove('open');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            document.querySelectorAll('[data-page]').forEach(b => {
                b.onclick = () => go(b.dataset.page);
            });

            document.querySelectorAll('[data-go]').forEach(b => {
                b.onclick = () => go(b.dataset.go);
            });

            $('menu').onclick = () => $('sidebar').classList.toggle('open');

            function toast(t) {
                $('toast').textContent = t;
                $('toast').classList.remove('hidden');
                setTimeout(() => $('toast').classList.add('hidden'), 2500);
            }

            $('sample').onclick = () => {
                $('student').value = 'DEMO-004';
                $('title').value = 'Explain two learning theories';
                $('instructions').value =
                    'Explain two psychological theories of learning, compare their strengths, and support your discussion with reliable academic sources.';
                $('text').value =
                    'Learning is an important process in psychology. Behaviorism explains learning through observable behavior and reinforcement. For example, a student may repeat a behavior when it is rewarded. Social learning theory explains that people can learn by observing other people and the consequences of their actions. Both theories help explain learning, but they focus on different processes. According to Smith (2021), all students learn in exactly the same way. Research clearly proves that social learning is always better than behaviorism. In conclusion, lecturers should use both theories to support students.';
                toast('Sample assignment loaded.');
            };

            function analyze(t) {
                let a = [];

                const pats = [
                    /\([A-Z][A-Za-z-]+,\s*\d{4}\)/,
                    /\b[A-Z][A-Za-z-]+\s*\(\d{4}\)/,
                    /\[[0-9]{1,3}\]/,
                    /https?:\/\/\S+/i,
                    /\bdoi:|\bdoi\.org\//i
                ];

                let cite = pats.some(p => p.test(t));
                let refs =
                    /\b(references|bibliography|works cited|sources)\b/i.test(t);

                if (
                    /\b(according to|research (shows|proves|suggests)|studies (show|prove|suggest)|evidence (shows|proves))\b/i.test(
                        t
                    )
                ) {
                    a.push([
                        'Claims referring to research or evidence',
                        'Ask the student to identify the specific source and explain how it supports each claim.'
                    ]);
                }

                a.push([
                    cite
                        ? 'Possible citation pattern found'
                        : 'No common in-text citation pattern found',
                    cite
                        ? 'This resembles a citation or link, but does not verify the source.'
                        : 'Manually check the original submission and reference list. Citation formats vary.'
                ]);

                a.push([
                    refs
                        ? 'Reference-list heading found'
                        : 'Reference list not obvious in pasted text',
                    refs
                        ? 'A likely heading appears; verify entries and relevance manually.'
                        : 'The list may be in another file or use another format; check the original.'
                ]);

                let abs = (
                    t.match(
                        /\b(always|never|everyone|no one|all students|clearly proves|undoubtedly|obviously)\b/gi
                    ) || []
                ).length;

                if (abs) {
                    a.push([
                        'Broad or absolute wording',
                        `Found ${abs} broad expression(s). Ask whether there are exceptions and what evidence supports the claim.`
                    ]);
                }

                let words = t.trim().split(/\s+/).filter(Boolean).length;

                a.push([
                    words < 80 ? 'Short submission' : 'Submission text received',
                    words < 80
                        ? `About ${words} words were entered. If the task requires more, ask the student to expand their reasoning.`
                        : `Approximately ${words} words were reviewed using local rules only.`
                ]);

                a.push([
                    'AI authorship cannot be determined',
                    'This prototype does not estimate whether text was written by AI. These observations are not proof of misconduct.'
                ]);

                return a;
            }

            function makeQs(title, t, ins) {
                let first = (t.match(/[^.!?]+[.!?]?/) || ['the main idea'])[0]
                    .trim()
                    .slice(0, 125);

                return [
                    `What is the main argument of “${title}”, and how would you explain it without reading your submission?`,
                    `You wrote “${first}”. What evidence or example supports this point?`,
                    'Which source was most useful to you, and how did you verify that it supports your claim?',
                    'Can you explain one important concept from your submission and give a new example of it?',
                    ins
                        ? 'How did your response address the instructions, and what would you improve?'
                        : 'What part of your work was most difficult, and how did you work through it?'
                ];
            }

            $('form').onsubmit = e => {
                e.preventDefault();

                let title = $('title').value.trim();
                let t = $('text').value.trim();
                let ins = $('instructions').value.trim();

                if (!title || !t) return;

                let fs = analyze(t);
                let qs = makeQs(title, t, ins);

                current = {
                    title,
                    text: t,
                    student: $('student').value.trim() || 'Not provided',
                    instructions: ins,
                    date: new Date().toLocaleString(),
                    findings: fs,
                    questions: qs,
                    notes: ''
                };

                $('reportTitle').textContent = title;
                $('meta').textContent =
                    `Student: ${current.student} · Generated ${current.date}`;
                $('findings').replaceChildren();

                fs.forEach((f, i) => {
                    let d = document.createElement('div');
                    d.className =
                        'finding ' +
                        (f[0].includes('Possible') ||
                            f[0].includes('heading found') ||
                            f[0].includes('received')
                            ? 'good'
                            : '');

                    let b = document.createElement('b');
                    let dot = document.createElement('span');
                    dot.className = 'dot';
                    b.textContent = f[0];

                    let p = document.createElement('p');
                    p.textContent = f[1];

                    d.append(dot, b, p);
                    $('findings').append(d);
                });

                $('questions').replaceChildren();

                qs.forEach(q => {
                    let li = document.createElement('li');
                    li.textContent = q;
                    $('questions').append(li);
                });

                $('notes').value = '';
                $('report').classList.remove('hidden');

                reviews++;
                qCount += 5;
                $('reviewCount').textContent = String(reviews).padStart(2, '0');
                $('questionCount').textContent = String(qCount).padStart(2, '0');

                let row = document.createElement('div');
                row.className = 'review-row';
                row.innerHTML =
                    '<div class="doc">DOC</div><div class="review-info"><b></b><small></small></div><span class="status">Review generated</span>';

                row.querySelector('b').textContent = title;
                row.querySelector('small').textContent =
                    'Student: ' + current.student + ' · Just now';

                $('recent').prepend(row);

                go('review');
                $('report').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            };

            $('notes').oninput = () => {
                if (current) current.notes = $('notes').value;
            };

            $('clear').onclick = () =>
                setTimeout(() => $('report').classList.add('hidden'), 0);

            $('print').onclick = () => window.print();

            $('copy').onclick = async () => {
                if (!current) return;

                let s = current.questions
                    .map((q, i) => `${i + 1}. ${q}`)
                    .join('\n');

                try {
                    await navigator.clipboard.writeText(s);
                    toast('Questions copied.');
                } catch (e) {
                    prompt('Copy questions:', s);
                }
            };

            $('download').onclick = () => {
                if (!current) return;

                let r = current;
                let s = [
                    'PROOFLEARN REVIEW REPORT',
                    `Title: ${r.title}`,
                    `Student: ${r.student}`,
                    `Generated: ${r.date}`,
                    '',
                    'These observations are not proof of AI use or misconduct.',
                    '',
                    'REVIEW INDICATORS',
                    ...r.findings.map(f => '- ' + f[0] + '\n  ' + f[1]),
                    '',
                    'QUESTIONS',
                    ...r.questions.map((q, i) => `${i + 1}. ${q}`),
                    '',
                    'LECTURER NOTES',
                    r.notes || '(No notes)',
                    '',
                    'SUBMITTED TEXT',
                    r.text,
                    '',
                    'Developed by Mugarra Trevor'
                ].join('\n');

                let u = URL.createObjectURL(
                    new Blob([s], { type: 'text/plain;charset=utf-8' })
                );

                let a = document.createElement('a');
                a.href = u;
                a.download = 'ProofLearn-report.txt';
                a.click();

                URL.revokeObjectURL(u);
            };
        })();