// ─────────────────────────────────────────────
// UI — DOM 렌더링 유틸리티
// ─────────────────────────────────────────────

const UI = {
  // ── 공통 유틸 ───────────────────────────────
  el: id => document.getElementById(id),
  make: (tag, cls, html = '') => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  },

  // ── 피드백 뱃지 ─────────────────────────────
  feedbackBadge(result) {
    const map = {
      up:      { text: '⬆️ 업!',  cls: 'badge-up' },
      down:    { text: '⬇️ 다운!', cls: 'badge-down' },
      correct: { text: '🎉 정답!', cls: 'badge-correct' },
    };
    return map[result] || map.up;
  },

  // ── 로그 카드 한 줄 ──────────────────────────
  logCard({ step, guess, result, low, high }) {
    const { text, cls } = UI.feedbackBadge(result);
    const rangeText = (result !== 'correct') ? `범위: ${low} ~ ${high}` : '정답 발견!';
    return UI.make('div', `log-card ${cls}`,
      `<span class="log-step">${step}번째</span>
       <span class="log-guess">${guess}</span>
       <span class="log-badge">${text}</span>
       <span class="log-range">${rangeText}</span>`);
  },

  // ── 로그 컨테이너에 카드 추가 ───────────────
  appendLog(containerId, entry, scroll = true) {
    const c = UI.el(containerId);
    if (!c) return;
    c.appendChild(UI.logCard(entry));
    if (scroll) c.scrollTop = c.scrollHeight;
  },

  clearLog(containerId) {
    const c = UI.el(containerId);
    if (c) c.innerHTML = '';
  },

  // ── Number Line (SVG) ────────────────────────
  numberLine: {
    draw(containerId, min, max, low, high, guess = null) {
      const cont = UI.el(containerId);
      if (!cont) return;
      const W = 500, H = 72;
      const pad = 24;
      const range = max - min;
      const toX = v => pad + ((v - min) / range) * (W - pad * 2);

      let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;">
        <line x1="${pad}" y1="36" x2="${W - pad}" y2="36" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round"/>`;

      // Active range
      const x1 = toX(low), x2 = toX(high);
      svg += `<rect x="${x1}" y="28" width="${Math.max(x2 - x1, 4)}" height="16" rx="8"
        fill="url(#rangeGrad)" opacity="0.85" class="nl-range"/>`;

      // Ticks at min/max/low/high
      [[min,'#94a3b8'],[max,'#94a3b8'],[low,'#6366f1'],[high,'#6366f1']].forEach(([v, col]) => {
        const x = toX(v);
        svg += `<line x1="${x}" y1="24" x2="${x}" y2="48" stroke="${col}" stroke-width="2"/>
          <text x="${x}" y="64" text-anchor="middle" fill="${col}" font-size="11" font-family="Outfit,sans-serif">${v}</text>`;
      });

      // Guess marker
      if (guess !== null) {
        const gx = toX(guess);
        svg += `<circle cx="${gx}" cy="36" r="10" fill="#7c3aed" class="nl-guess"/>
          <text x="${gx}" y="40" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="Outfit,sans-serif">${guess}</text>`;
      }

      svg += `<defs>
        <linearGradient id="rangeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#818cf8"/>
          <stop offset="100%" stop-color="#a78bfa"/>
        </linearGradient>
      </defs></svg>`;
      cont.innerHTML = svg;
    },

    reset(containerId, min, max) {
      UI.numberLine.draw(containerId, min, max, min, max);
    },
  },

  // ── 사이드바 활성 상태 ───────────────────────
  setSidebarActive(navId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const el = UI.el(navId);
    if (el) el.classList.add('active');
  },

  // ── Context Header 업데이트 ──────────────────
  setContextHeader({ mode, algo, desc, controls }) {
    const modeEl = UI.el('ctx-mode');
    const algoEl = UI.el('ctx-algo');
    const descEl = UI.el('ctx-desc');
    const ctrlEl = UI.el('ctx-controls');
    if (modeEl) modeEl.textContent = mode;
    if (algoEl) { algoEl.textContent = algo; algoEl.style.display = algo ? '' : 'none'; }
    if (descEl) descEl.textContent = desc;
    if (ctrlEl) ctrlEl.innerHTML = controls || '';
  },

  // ── 통계 테이블 ──────────────────────────────
  renderStatsTable(stats, algoMeta) {
    const tbody = algoMeta.map(m => {
      const s = stats[m.id];
      if (!s) return '';
      let maxDisplay = `${s.max}`;
      if (m.id === 'random_pure') {
        maxDisplay = `${s.max} (이론상 무한대)`;
      } else if (m.id === 'random_feedback') {
        maxDisplay = `${s.max} (이론상 100)`;
      }
      return `<tr>
        <td class="stat-label">${m.icon} ${m.label}</td>
        <td class="stat-val stat-center">${s.min}</td>
        <td class="stat-val stat-center">${s.avg}</td>
        <td class="stat-val stat-max-td">${maxDisplay}</td>
      </tr>`;
    }).join('');
    return `<table class="stats-table">
      <thead>
        <tr>
          <th style="width:40%;">알고리즘</th>
          <th class="th-center" style="width:16%;">최소</th>
          <th class="th-center" style="width:16%;">평균</th>
          <th class="th-left" style="width:28%;padding-left:.75rem;">최대</th>
        </tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>`;
  },

  // ── 프로그레스 바 ─────────────────────────────
  setProgress(pct) {
    const bar = UI.el('sim-progress-bar');
    const txt = UI.el('sim-progress-txt');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = pct + '%';
  },

  // ── CSV 다운로드 ──────────────────────────────
  downloadCSV(stats, algoMeta) {
    const rows = ['알고리즘,최소,평균,최대'];
    algoMeta.forEach(m => {
      const s = stats[m.id];
      if (s) rows.push(`${m.label},${s.min},${s.avg},${s.max}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'updown_simulation.csv'; a.click();
    URL.revokeObjectURL(url);
  },
};
