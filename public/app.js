(function() {
    const _f = document.getElementById('inputField');
    const _b = document.getElementById('submitBtn');
    const _l = document.getElementById('entryList');
    const _s = document.getElementById('status');
    const _w = document.getElementById('workspace');
    const _a = document.getElementById('archive');
    const _al = document.getElementById('archiveList');
    const _ld = document.getElementById('loader');
    const _nv = document.querySelectorAll('.nav-btn');

    let _h = [];
    let _p = false;

    const _k = 'fa_data_v1';

    function _init() {
        const d = localStorage.getItem(_k);
        if (d) {
            try {
                _h = JSON.parse(d);
                _render();
            } catch(e) {
                _h = [];
            }
        }
        _f.addEventListener('input', _resize);
        _f.addEventListener('keydown', _key);
        _b.addEventListener('click', _submit);
        _nv.forEach(n => n.addEventListener('click', _nav));
        _st('Ready');
    }

    function _resize() {
        _f.style.height = 'auto';
        _f.style.height = Math.min(_f.scrollHeight, 200) + 'px';
        _b.disabled = !_f.value.trim();
    }

    function _key(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (_f.value.trim()) _submit();
        }
    }

    function _nav(e) {
        const v = e.target.dataset.view;
        _nv.forEach(n => n.classList.remove('active'));
        e.target.classList.add('active');
        if (v === 'workspace') {
            _w.classList.remove('hidden');
            _a.classList.add('hidden');
        } else {
            _w.classList.add('hidden');
            _a.classList.remove('hidden');
        }
    }

    function _st(t, c) {
        _s.textContent = t;
        _s.className = 'status' + (c ? ' ' + c : '');
    }

    async function _submit() {
        if (_p) return;
        const q = _f.value.trim();
        if (!q) return;

        _p = true;
        _f.value = '';
        _resize();
        _b.disabled = true;

        _add(q, 'input');
        _st('Processing...', 'processing');

        const ti = _typing();

        try {
            const ctx = _h.slice(-10).map(e => ({
                r: e.type === 'input' ? 'u' : 's',
                c: e.content
            }));

            const r = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ q, ctx })
            });

            ti.remove();

            if (!r.ok) {
                throw new Error('Request failed');
            }

            const d = await r.json();
            if (d.r) {
                _add(d.r, 'output');
                _st('Ready');
            } else {
                throw new Error('Invalid response');
            }
        } catch(e) {
            ti.remove();
            _add('Unable to process your entry. Please try again.', 'output');
            _st('Error', 'error');
        }

        _p = false;
        _save();
        _scroll();
    }

    function _add(c, t) {
        const e = {
            id: Date.now(),
            content: c,
            type: t,
            time: new Date().toISOString()
        };
        _h.push(e);
        _render();
        _save();
    }

    function _render() {
        const emp = _l.querySelector('.empty-state');
        if (emp && _h.length > 0) emp.remove();

        _l.querySelectorAll('.entry').forEach(e => e.remove());

        _h.forEach(e => {
            const div = document.createElement('div');
            div.className = 'entry ' + (e.type === 'input' ? 'user-entry' : 'system-entry');

            const header = document.createElement('div');
            header.className = 'entry-header';

            const label = document.createElement('span');
            label.className = 'entry-label';
            label.textContent = e.type === 'input' ? 'You' : 'Flow';

            const time = document.createElement('span');
            time.className = 'entry-time';
            time.textContent = _time(e.time);

            header.appendChild(label);
            header.appendChild(time);

            const content = document.createElement('div');
            content.className = 'entry-content';
            _renderContent(content, e.content);

            div.appendChild(header);
            div.appendChild(content);
            _l.appendChild(div);
        });

        _scroll();
    }

    function _renderContent(container, text) {
        const lines = text.split('\n');
        let inCodeBlock = false;
        let codeContent = '';

        lines.forEach((line, idx) => {
            if (line.startsWith('```')) {
                if (inCodeBlock) {
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    code.textContent = codeContent.trim();
                    pre.appendChild(code);
                    container.appendChild(pre);
                    codeContent = '';
                    inCodeBlock = false;
                } else {
                    inCodeBlock = true;
                }
                return;
            }

            if (inCodeBlock) {
                codeContent += line + '\n';
                return;
            }

            if (line.trim() === '') {
                if (idx > 0 && idx < lines.length - 1) {
                    container.appendChild(document.createElement('br'));
                }
                return;
            }

            const p = document.createElement('p');
            _renderInline(p, line);
            container.appendChild(p);
        });
    }

    function _renderInline(parent, text) {
        const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

        parts.forEach(part => {
            if (!part) return;

            if (part.startsWith('`') && part.endsWith('`')) {
                const code = document.createElement('code');
                code.textContent = part.slice(1, -1);
                parent.appendChild(code);
            } else if (part.startsWith('**') && part.endsWith('**')) {
                const strong = document.createElement('strong');
                strong.textContent = part.slice(2, -2);
                parent.appendChild(strong);
            } else if (part.startsWith('*') && part.endsWith('*')) {
                const em = document.createElement('em');
                em.textContent = part.slice(1, -1);
                parent.appendChild(em);
            } else {
                parent.appendChild(document.createTextNode(part));
            }
        });
    }

    function _time(iso) {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function _typing() {
        const div = document.createElement('div');
        div.className = 'entry system-entry';

        const header = document.createElement('div');
        header.className = 'entry-header';
        const label = document.createElement('span');
        label.className = 'entry-label';
        label.textContent = 'Flow';
        header.appendChild(label);

        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        for (let i = 0; i < 3; i++) {
            indicator.appendChild(document.createElement('span'));
        }

        div.appendChild(header);
        div.appendChild(indicator);
        _l.appendChild(div);
        _scroll();
        return div;
    }

    function _scroll() {
        _l.scrollTop = _l.scrollHeight;
    }

    function _save() {
        try {
            localStorage.setItem(_k, JSON.stringify(_h));
        } catch(e) {}
    }

    _init();
})();
