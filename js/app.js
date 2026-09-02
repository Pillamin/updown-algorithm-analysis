// ─────────────────────────────────────────────
// APP — 메인 컨트롤러 (이벤트 바인딩 & 모드 전환)
// ─────────────────────────────────────────────

// ── 상태 ─────────────────────────────────────
const state = {
  mode: 'user',
  algoId: null,
  userSecret: null,
  userAttempts: 0,
  userRange: { low: CONFIG.MIN, high: CONFIG.MAX },
  computerRunning: false,
  computerPaused: false,
  computerSteps: [],
  computerIdx: 0,
  computerTimer: null,
  computerTried: [],    // 시도한 숫자 목록
  rangeHistory: [],     // 스텝별 범위 크기 기록
  currentSpeed: 3,      // 1~5
  simWorker: null,
  simStats: null,
  simCharts: { min: null, avg: null, max: null },
};

// ── 초기화 ────────────────────────────────────
function init() {
  buildSidebar();
  bindSidebarEvents();
  bindIntroMode();
  bindUserMode();
  bindComputerMode();
  bindSimMode();
  bindModal();
  parseUrlHash();
  navigateTo('intro');
}

// ── URL Hash 파싱 ─────────────────────────────
function parseUrlHash() {
  const hash = location.hash.replace('#', '').split('?')[0];
  if (['intro', 'user', 'computer', 'sim'].includes(hash)) {
    navigateTo(hash);
  }
}

function updateUrlHash() {
  location.hash = state.mode;
}

// ── 사이드바 구성 ─────────────────────────────
function buildSidebar() {
  const nav = UI.el('sidebar-nav');
  if (!nav) return;

  const items = [
    { id: 'nav-intro', mode: 'intro', icon: '📖', label: '업다운 게임', sub: null },
    { id: 'nav-user', mode: 'user', icon: '🕹️', label: '사용자 모드', sub: null },
    { id: 'nav-computer', mode: 'computer', icon: '🤖', label: '컴퓨터 모드', sub: ALGO_META },
    { id: 'nav-sim', mode: 'sim', icon: '📊', label: '시뮬레이션 모드', sub: null },
  ];

  nav.innerHTML = items.map(item => `
    <div id="${item.id}" class="nav-item" data-mode="${item.mode}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </div>
    ${item.sub ? `${item.sub.map(a => `
        <div id="nav-algo-${a.id}" class="nav-item nav-subitem" data-algo="${a.id}">
          <span class="nav-label">${a.label}</span>
        </div>`).join('')}` : ''}
  `).join('');
}

// ── 사이드바 이벤트 ───────────────────────────
function bindSidebarEvents() {
  UI.el('sidebar-nav').addEventListener('click', e => {
    const item = e.target.closest('.nav-item');
    if (!item) return;

    if (item.dataset.algo) {
      const newId = item.dataset.algo;
      if (newId !== state.algoId) resetComputer();
      state.algoId = newId;
      document.querySelectorAll('.nav-subitem').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      navigateTo('computer');
    } else if (item.dataset.mode) {
      if (item.dataset.mode === 'computer') {
        state.algoId = null; // 컴퓨터 모드 메인 선택 시 알고리즘 소개 화면으로
      }
      navigateTo(item.dataset.mode);
    }
  });
}

// ── 모드 전환 ─────────────────────────────────
function navigateTo(mode) {
  state.mode = mode;

  // 패널 show/hide
  ['panel-intro', 'panel-user', 'panel-computer', 'panel-sim'].forEach(id => {
    const el = UI.el(id);
    if (el) el.classList.add('hidden');
  });
  const target = UI.el(`panel-${mode}`);
  if (target) target.classList.remove('hidden');

  // 사이드바 활성화
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = UI.el(`nav-${mode}`);
  if (navEl) navEl.classList.add('active');
  if (state.algoId && mode === 'computer') UI.el(`nav-algo-${state.algoId}`)?.classList.add('active');

  // Context Header
  switch (mode) {
    case 'intro': renderIntroHeader(); break;
    case 'user': renderUserHeader(); break;
    case 'computer': renderComputerHeader(); break;
    case 'sim': renderSimHeader(); break;
  }
  updateUrlHash();
}

// ─────────────────────────────────────────────
// ── 업다운 게임 소개 모드 ─────────────────────
function renderIntroHeader() {
  UI.setContextHeader({
    mode: '📖 업다운 게임 소개',
    algo: '',
    desc: '업다운 게임의 규칙과 컴퓨터 과학에서 탐색 알고리즘이 어떻게 활용되는지 알아봅니다.',
    controls: '',
  });
}

function bindIntroMode() {
  UI.el('intro-to-user')?.addEventListener('click', () => navigateTo('user'));
  UI.el('intro-to-comp')?.addEventListener('click', () => {
    state.algoId = null;
    navigateTo('computer');
  });
}

// ─────────────────────────────────────────────
// ── 사용자 모드 ───────────────────────────────
function renderUserHeader() {
  UI.setContextHeader({
    mode: '🕹️ 사용자 모드',
    algo: '',
    desc: `${CONFIG.MIN}~${CONFIG.MAX} 사이의 숫자를 맞춰보세요! 업/다운 힌트를 이용하면 더 빨리 찾을 수 있어요.`,
    controls: `<button id="hdr-user-new" class="btn-primary-sm">🎲 새 게임</button>`,
  });
  UI.el('hdr-user-new')?.addEventListener('click', startUserGame);
  // 첫 진입 시 자동 게임 시작
  if (state.userSecret === null) startUserGame();
}

function bindUserMode() {
  UI.el('user-submit')?.addEventListener('click', handleUserGuess);
  UI.el('user-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleUserGuess(); });
}

function startUserGame() {
  state.userSecret = Math.floor(Math.random() * (CONFIG.MAX - CONFIG.MIN + 1)) + CONFIG.MIN;
  state.userAttempts = 0;
  state.userRange = { low: CONFIG.MIN, high: CONFIG.MAX };
  UI.clearLog('user-log');
  UI.el('user-feedback').className = 'feedback-display';
  UI.el('user-feedback').innerHTML = '<span class="text-slate-400">여기에 결과가 표시됩니다</span>';
  UI.el('user-attempts').textContent = '0';
  UI.el('user-range').textContent = `${CONFIG.MIN} ~ ${CONFIG.MAX}`;
  UI.el('user-input').value = '';
  UI.el('user-input').disabled = false;
  UI.el('user-submit').disabled = false;
  UI.numberLine.draw('user-numberline', CONFIG.MIN, CONFIG.MAX, CONFIG.MIN, CONFIG.MAX);
}

function handleUserGuess() {
  const input = UI.el('user-input');
  const val = parseInt(input.value, 10);
  if (!val || val < CONFIG.MIN || val > CONFIG.MAX) {
    input.classList.add('input-error');
    setTimeout(() => input.classList.remove('input-error'), 600);
    return;
  }

  const secret = state.userSecret;
  if (secret === null) { startUserGame(); return; }

  state.userAttempts++;
  let result, { low, high } = state.userRange;

  if (val === secret) {
    result = 'correct';
    UI.el('user-input').disabled = true;
    UI.el('user-submit').disabled = true;
  } else if (val < secret) {
    result = 'up';
    state.userRange.low = Math.max(low, val + 1);
  } else {
    result = 'down';
    state.userRange.high = Math.min(high, val - 1);
  }

  UI.el('user-attempts').textContent = state.userAttempts;
  UI.el('user-range').textContent = `${state.userRange.low} ~ ${state.userRange.high}`;

  const { text, cls } = UI.feedbackBadge(result);
  const fb = UI.el('user-feedback');
  fb.className = `feedback-display ${cls}`;
  fb.innerHTML = `<span class="feedback-text">${text}</span>`;

  const entry = { step: state.userAttempts, guess: val, result, low: state.userRange.low, high: state.userRange.high };
  UI.appendLog('user-log', entry);
  UI.numberLine.draw('user-numberline', CONFIG.MIN, CONFIG.MAX, state.userRange.low, state.userRange.high, val);

  if (result === 'correct') {
    fb.innerHTML += `<span class="feedback-sub">${state.userAttempts}번 만에 정답!</span>`;
  }
  input.value = '';
  input.focus();
}

// ─────────────────────────────────────────────
// ── 컴퓨터 모드 ─────────────────────────────
function renderComputerHeader() {
  const introView = UI.el('comp-intro-view');
  const runnerView = UI.el('comp-runner-view');

  if (!state.algoId) {
    // 5가지 알고리즘 설명 뷰 표시
    if (introView) introView.classList.remove('hidden');
    if (runnerView) runnerView.classList.add('hidden');
    UI.setContextHeader({
      mode: '🤖 컴퓨터 모드',
      algo: '',
      desc: '업다운 게임을 해결하는 5가지 주요 탐색 알고리즘의 개념과 특징을 비교해 보세요.',
      controls: '',
    });
    return;
  }

  // 특정 알고리즘 실행 뷰 표시
  if (introView) introView.classList.add('hidden');
  if (runnerView) runnerView.classList.remove('hidden');

  const meta = ALGO_META.find(m => m.id === state.algoId);
  if (!meta) return;

  UI.setContextHeader({
    mode: meta.label,
    algo: '',
    desc: meta.desc,
    controls: '',
  });
}

function bindComputerMode() {
  UI.el('comp-run')?.addEventListener('click', runComputer);
  UI.el('comp-pause')?.addEventListener('click', togglePause);
  UI.el('comp-reset')?.addEventListener('click', resetComputer);

  // 5가지 설명 카드 클릭 시 해당 알고리즘 실행 뷰로 전환
  document.querySelectorAll('.comp-algo-card').forEach(card => {
    card.addEventListener('click', () => {
      const algo = card.dataset.algo;
      if (algo) {
        state.algoId = algo;
        resetComputer();
        document.querySelectorAll('.nav-subitem').forEach(el => el.classList.remove('active'));
        UI.el(`nav-algo-${algo}`)?.classList.add('active');
        renderComputerHeader();
      }
    });
  });

  // 속도 버튼 1~5 직접 바인딩
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('speed-btn')) {
      const btn = e.target;
      state.currentSpeed = parseInt(btn.dataset.speed, 10);
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  });
}

function runComputer() {
  if (!state.algoId) { showToast('사이드바에서 알고리즘을 먼저 선택하세요'); return; }
  const secretInput = UI.el('comp-secret-input');
  const secretVal = secretInput ? parseInt(secretInput.value, 10) : NaN;
  const secret = (!isNaN(secretVal) && secretVal >= CONFIG.MIN && secretVal <= CONFIG.MAX)
    ? secretVal
    : Math.floor(Math.random() * (CONFIG.MAX - CONFIG.MIN + 1)) + CONFIG.MIN;

  const { steps, log } = ALGORITHMS[state.algoId](secret, CONFIG.MIN, CONFIG.MAX, Date.now());
  state.computerSteps = log;
  state.computerIdx = 0;
  state.computerRunning = true;
  state.computerPaused = false;
  state.computerTried = [];
  state.rangeHistory = [];

  UI.clearLog('comp-log');
  const reveal = UI.el('comp-secret-reveal');
  if (reveal) {
    reveal.textContent = `🎯 목표 정답: ${secret}`;
    reveal.classList.remove('hidden');
  }
  UI.el('comp-run').disabled = true;
  UI.el('comp-pause').disabled = false;

  renderCompViz(null);
  playNextStep();
}

function playNextStep() {
  if (!state.computerRunning || state.computerPaused) return;
  if (state.computerIdx >= state.computerSteps.length) {
    finishComputer();
    return;
  }
  const entry = state.computerSteps[state.computerIdx++];
  UI.appendLog('comp-log', entry);

  // 환덕 추적
  state.computerTried.push(entry.guess);
  state.rangeHistory.push(entry.high - entry.low + 1);
  renderCompViz(entry);

  const delay = CONFIG.STEP_DELAYS[state.currentSpeed - 1];
  state.computerTimer = setTimeout(playNextStep, delay);
}

function togglePause() {
  state.computerPaused = !state.computerPaused;
  const btn = UI.el('comp-pause');
  if (btn) btn.textContent = state.computerPaused ? '▶ 재개' : '⏸ 일시정지';
  if (!state.computerPaused) playNextStep();
}

function finishComputer() {
  state.computerRunning = false;
  const runBtn = UI.el('comp-run');
  const pauseBtn = UI.el('comp-pause');
  if (runBtn) runBtn.disabled = false;
  if (pauseBtn) { pauseBtn.disabled = true; pauseBtn.textContent = '⏸ 일시정지'; }
}

function resetComputer() {
  clearTimeout(state.computerTimer);
  state.computerRunning = false;
  state.computerPaused = false;
  state.computerTried = [];
  state.rangeHistory = [];
  UI.clearLog('comp-log');
  const reveal = UI.el('comp-secret-reveal');
  if (reveal) {
    reveal.textContent = '';
    reveal.classList.add('hidden');
  }
  const runBtn = UI.el('comp-run');
  const pauseBtn = UI.el('comp-pause');
  if (runBtn) runBtn.disabled = false;
  if (pauseBtn) { pauseBtn.disabled = true; pauseBtn.textContent = '⏸ 일시정지'; }
  renderCompViz(null);
}

// ── 범위 시각화 SVG ─────────────────────────────
function renderCompViz(entry) {
  const cont = UI.el('comp-viz');
  if (!cont) return;

  const MIN = CONFIG.MIN, MAX = CONFIG.MAX;
  const totalRange = MAX - MIN + 1;
  const pad = 28, VW = 400, VH = 290;
  const lineY = 75;    // 수직선 Y위치 (위 여백 확보)
  const histTop = 158; // lineY+50(범위텍스트) 아래 여유
  const histH = VH - histTop - 22;

  const low   = entry ? entry.low   : MIN;
  const high  = entry ? entry.high  : MAX;
  const guess = entry ? entry.guess : null;
  const tried = state.computerTried;
  const history = state.rangeHistory;

  const toX = v => pad + ((v - MIN) / (MAX - MIN)) * (VW - pad * 2);

  let svg = `<svg viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid meet"
    style="width:100%;height:100%;display:block;">
    <defs>
      <linearGradient id="rangeG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#818cf8"/>
        <stop offset="100%" stop-color="#a78bfa"/>
      </linearGradient>
    </defs>`;

  // ═ 수직선 영역: 범위 강조 + 추측값 서브 ══════════════
  svg += `<text x="${VW/2}" y="16" text-anchor="middle"
    fill="#94a3b8" font-size="11" font-family="Outfit,sans-serif" font-weight="700"
    letter-spacing=".04em">현재 탐색 상태</text>`;

  // 전체 배경 라인
  svg += `<line x1="${pad}" y1="${lineY}" x2="${VW-pad}" y2="${lineY}"
    stroke="#e2e8f0" stroke-width="8" stroke-linecap="round"/>`;

  // 시도한 숫자 점 (tried) — 배경 바 먼저
  tried.forEach(v => {
    if (v !== guess) {
      svg += `<circle cx="${toX(v)}" cy="${lineY}" r="4"
        fill="#c7d2fe" opacity=".65"/>`;
    }
  });

  // 활성 범위 하이라이트 — 두껍고 선명하게 (범위 강조)
  const x1 = toX(low), x2 = toX(high);
  const rw = Math.max(x2 - x1, 10);
  svg += `<rect x="${x1}" y="${lineY - 14}" width="${rw}" height="28" rx="14"
    fill="url(#rangeG)" opacity=".93"
    style="filter:drop-shadow(0 3px 10px rgba(99,102,241,.38))"/>`;

  // LOW / HIGH 경계 대시선
  if (entry) {
    [[low, x1], [high, x2]].forEach(([v, vx]) => {
      svg += `<line x1="${vx}" y1="${lineY - 22}" x2="${vx}" y2="${lineY + 13}"
        stroke="#6366f1" stroke-width="2" opacity=".5" stroke-dasharray="3,2"/>`;
    });
  }

  // MIN / MAX 라벨 (위쪽)
  svg += `
    <text x="${pad}" y="${lineY - 22}" text-anchor="middle"
      fill="#cbd5e1" font-size="9" font-family="Outfit,sans-serif">${MIN}</text>
    <text x="${VW-pad}" y="${lineY - 22}" text-anchor="middle"
      fill="#cbd5e1" font-size="9" font-family="Outfit,sans-serif">${MAX}</text>`;

  // 범위 텍스트 라벨 — 수직선 아래 크게 강조
  const rangeSize = high - low + 1;
  const midX = (x1 + x2) / 2;
  if (entry) {
    svg += `<text x="${midX}" y="${lineY + 34}" text-anchor="middle"
      fill="#4f46e5" font-size="15" font-weight="800" font-family="Outfit,sans-serif">${low} ~ ${high}</text>
    <text x="${midX}" y="${lineY + 50}" text-anchor="middle"
      fill="#818cf8" font-size="10" font-weight="600" font-family="Outfit,sans-serif">범위 크기: ${rangeSize}개</text>`;
  } else {
    svg += `<text x="${VW/2}" y="${lineY + 36}" text-anchor="middle"
      fill="#94a3b8" font-size="13" font-weight="600" font-family="Outfit,sans-serif">${MIN} ~ ${MAX} (시작)</text>`;
  }

  // 현재 추측값 — 서브 마커 (작게, 범위를 가리지 않게)
  if (guess !== null) {
    const gx = toX(guess);
    svg += `<circle cx="${gx}" cy="${lineY}" r="9"
      fill="#1e1b4b" stroke="white" stroke-width="1.5" opacity=".9"/>
    <text x="${gx}" y="${lineY + 4}" text-anchor="middle"
      fill="white" font-size="8" font-weight="700"
      font-family="Outfit,sans-serif">${guess}</text>`;
  }


  // ═ 범위 화이러리 막대 차트 ═══════════════════
  svg += `<line x1="${pad}" y1="${histTop - 10}" x2="${VW - pad}" y2="${histTop - 10}"
    stroke="#f1f5f9" stroke-width="1"/>
  <text x="${VW/2}" y="${histTop + 2}" text-anchor="middle"
    fill="#94a3b8" font-size="11" font-family="Outfit,sans-serif" font-weight="700"
    letter-spacing=".04em">범위 변화 추이</text>`;

  if (history.length > 0) {
    const vis = history.slice(-50);
    const usableW = VW - pad * 2;
    const bw = Math.max(Math.floor(usableW / vis.length) - 1, 2);
    const chartTop = histTop + 14;
    const chartH = VH - chartTop - 22;

    vis.forEach((rangeSize, i) => {
      const bh = Math.max((rangeSize / totalRange) * chartH, 2);
      const bx = pad + i * (usableW / vis.length);
      const by = chartTop + chartH - bh;
      // hue: 239(indigo) for large, 160(emerald) for small
      const ratio = rangeSize / totalRange;
      const hue = Math.round(160 + ratio * 79);
      svg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}"
        width="${bw}" height="${bh.toFixed(1)}" rx="2"
        fill="hsl(${hue},65%,55%)" opacity=".85"/>`;
    });

    // Y축 레이블
    const chartTop2 = histTop + 14;
    const chartHH = VH - chartTop2 - 22;
    svg += `
      <text x="${pad - 4}" y="${chartTop2}" text-anchor="end"
        fill="#cbd5e1" font-size="8" font-family="Outfit,sans-serif">${totalRange}</text>
      <text x="${pad - 4}" y="${chartTop2 + chartHH}" text-anchor="end"
        fill="#cbd5e1" font-size="8" font-family="Outfit,sans-serif">1</text>
      <text x="${VW/2}" y="${VH - 4}" text-anchor="middle"
        fill="#94a3b8" font-size="9" font-family="Outfit,sans-serif">스텝 ${history.length}회 · 범위 ${high - low + 1}</text>`;
  } else {
    svg += `<text x="${VW/2}" y="${histTop + 55}" text-anchor="middle"
      fill="#cbd5e1" font-size="12" font-family="Outfit,sans-serif">실행 후 범위 변화가 표시됩니다</text>`;
  }

  svg += '</svg>';
  cont.innerHTML = svg;
}

// ─────────────────────────────────────────────
// ── 시뮬레이션 모드 ───────────────────────────
function renderSimHeader() {
  UI.setContextHeader({
    mode: '📊 시뮬레이션 모드',
    algo: '',
    desc: '5가지 알고리즘을 대량으로 실행하여 효율성 차이를 비교합니다. 실행 횟수가 많을수록 정확한 평균값이 나와요.',
    controls: '',
  });
}

function bindSimMode() {
  UI.el('sim-run-btn')?.addEventListener('click', runSimulation);
  UI.el('sim-export-csv2')?.addEventListener('click', () => {
    if (state.simStats) UI.downloadCSV(state.simStats, ALGO_META);
  });

  // 프리셋 버튼 클릭 이벤트
  UI.el('sim-preset-btns')?.addEventListener('click', e => {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
}

function runSimulation() {
  const activePreset = document.querySelector('.preset-btn.active');
  const runs = activePreset ? parseInt(activePreset.dataset.runs, 10) : CONFIG.DEFAULT_RUNS;
  
  const seed = Date.now();
  const algoIds = ALGO_META.map(m => m.id);

  if (state.simWorker) state.simWorker.terminate();
  state.simWorker = new Worker('./js/simulation.worker.js');

  UI.el('sim-result-area').classList.add('hidden');
  UI.el('sim-progress-wrap').classList.remove('hidden');
  UI.setProgress(0);
  const runBtn = UI.el('sim-run-btn');
  if (runBtn) runBtn.disabled = true;

  state.simWorker.postMessage({ runs, seed, algoIds, min: CONFIG.MIN, max: CONFIG.MAX });
  state.simWorker.onmessage = ({ data }) => {
    if (data.type === 'progress') UI.setProgress(data.payload.progress);
    if (data.type === 'done') {
      state.simStats = data.payload;
      UI.el('sim-progress-wrap').classList.add('hidden');
      UI.el('sim-result-area').classList.remove('hidden');
      if (runBtn) runBtn.disabled = false;
      
      // 통계 요약 팝업 버튼 표시
      const statsModalBtn = UI.el('btn-sim-stats-modal');
      if (statsModalBtn) statsModalBtn.classList.remove('hidden');

      renderSimCharts(data.payload, algoIds);
      
      // 팝업 모달 내부 테이블 렌더링
      const tableModalEl = UI.el('sim-stats-table-modal');
      if (tableModalEl) {
        tableModalEl.innerHTML = UI.renderStatsTable(data.payload, ALGO_META.filter(m => algoIds.includes(m.id)));
      }
    }
  };
}

function renderSimCharts(stats, algoIds) {
  const metas = ALGO_META.filter(m => algoIds.includes(m.id));
  const labels = metas.map(m => m.label);
  const colors = metas.map(m => CONFIG.CHART_COLORS[m.id]);

  const mins = metas.map(m => stats[m.id]?.min || 0);
  const avgs = metas.map(m => stats[m.id]?.avg || 0);
  const AVG_LIMIT = 120;
  
  // 5번 무작위(중복포함)의 실제 최대값 계산 및 축 분할(Break Axis) 계산
  const pureMax = stats['random_pure']?.max || 100;
  const needBreak = pureMax > 120;
  const floorVal = Math.floor(pureMax / 50) * 50;
  const ceilVal = Math.ceil(pureMax / 50) * 50;

  // 비선형 스케일 매핑 함수 (0~100은 0~100 위치, 100~floorVal은 100~115로 축소, floorVal~ceilVal은 115~145로 매핑)
  const mapMaxVal = (val) => {
    if (!needBreak || val <= 100) return val;
    if (floorVal === ceilVal) {
      return 130;
    }
    const ratio = Math.max(0, Math.min(1, (val - floorVal) / (ceilVal - floorVal)));
    return 115 + ratio * 30;
  };

  const chartMaxData = needBreak 
    ? metas.map(m => mapMaxVal(stats[m.id]?.max || 0))
    : maxs;

  const chartConfigs = [
    { key: 'min', canvasId: 'sim-chart-min', title: '최소', data: mins, maxAxis: Math.max(...mins, 5) * 1.25, stepSize: null },
    { key: 'avg', canvasId: 'sim-chart-avg', title: '평균', data: avgs, maxAxis: AVG_LIMIT, stepSize: 20 },
    { key: 'max', canvasId: 'sim-chart-max', title: '최대', data: chartMaxData, maxAxis: needBreak ? 150 : computedMaxAxis, stepSize: null },
  ];

  chartConfigs.forEach(({ key, canvasId, title, data, maxAxis, stepSize }) => {
    if (state.simCharts[key]) {
      state.simCharts[key].destroy();
    }
    const canvas = UI.el(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 막대 오른쪽에 실제 값을 표시하는 커스텀 플러그인
    const barValuePlugin = {
      id: `barValues_${key}`,
      afterDatasetsDraw(chart) {
        const { ctx: c } = chart;
        chart.getDatasetMeta(0).data.forEach((bar, index) => {
          const rawVal = (key === 'max') ? (stats[metas[index].id]?.max || 0) : data[index];
          const displayTxt = `${rawVal}`;
          
          c.save();
          c.font = 'bold 11px Outfit, sans-serif';
          c.fillStyle = '#475569';
          c.textAlign = 'left';
          c.textBaseline = 'middle';
          c.fillText(displayTxt, bar.x + 6, bar.y);
          c.restore();
        });

        // 최대 시도 차트에서 축 생략(물결선) 표시
        if (key === 'max' && needBreak) {
          const chartArea = chart.chartArea;
          const xScale = chart.scales.x;
          const breakX = xScale.getPixelForValue(107);
          
          c.save();
          c.strokeStyle = '#94a3b8';
          c.lineWidth = 1.5;
          c.setLineDash([3, 3]);
          c.beginPath();
          c.moveTo(breakX, chartArea.top);
          c.lineTo(breakX, chartArea.bottom);
          c.stroke();
          
          // 물결 모양 텍스트 표시
          c.fillStyle = '#64748b';
          c.font = 'bold 12px sans-serif';
          c.textAlign = 'center';
          c.fillText('≈', breakX, chartArea.bottom + 12);
          c.restore();
        }
      },
    };

    const xScaleConfig = {
      beginAtZero: true,
      max: maxAxis,
      grid: { color: '#f1f5f9' },
      ticks: {
        font: { family: 'Outfit, sans-serif', size: 10 },
      },
    };

    if (stepSize) {
      xScaleConfig.ticks.stepSize = stepSize;
    }

    if (key === 'max' && needBreak) {
      // 0, 50, 100, 내림값(115위치), 올림값(145위치)
      const tickVals = [0, 50, 100, 115, 145];
      xScaleConfig.afterBuildTicks = (axis) => {
        axis.ticks = tickVals.map(v => ({ value: v }));
      };
      xScaleConfig.ticks.callback = (val) => {
        if (val === 0) return '0';
        if (val === 50) return '50';
        if (val === 100) return '100';
        if (val === 115) return `${floorVal}`;
        if (val === 145) return `${ceilVal}`;
        return '';
      };
    }

    state.simCharts[key] = new Chart(ctx, {
      type: 'bar',
      plugins: [barValuePlugin],
      data: {
        labels,
        datasets: [{
          label: `${title} 시도`,
          data,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { right: 38 },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const meta = metas[ctx.dataIndex];
                const realVal = stats[meta.id]?.max || 0;
                if (key === 'max' && meta && meta.id === 'random_pure') {
                  return ` ${title} 시도: ${realVal}회 (이론상 무한대)`;
                }
                if (key === 'max' && meta && meta.id === 'random_feedback') {
                  return ` ${title} 시도: ${realVal}회 (이론상 100)`;
                }
                return ` ${title} 시도: ${realVal}회`;
              },
            },
          },
        },
        scales: {
          x: xScaleConfig,
          y: {
            grid: { display: false },
            ticks: { font: { family: 'Outfit, sans-serif', size: 11, weight: '600' } },
          },
        },
      },
    });
  });
}

// ── 개념 슬라이드 데이터 ──────────────────────
const CONCEPT_SLIDES = [
  {
    step: '1/5 단계',
    type: 'process',
    title: '💻 컴퓨터를 활용한 문제 해결 과정',
  },
  {
    step: '2/5 단계',
    type: 'features',
    title: '💬 알고리즘의 특징(조건)',
  },
  {
    step: '3/5 단계',
    type: 'express_lang',
    title: '3. 알고리즘 표현 방법 — 자연어 & 의사 코드',
  },
  {
    step: '4/5 단계',
    type: 'express_flowchart',
    title: '3. 알고리즘 표현 방법 — 순서도 (Flowchart)',
  },
  {
    step: '5/5 단계',
    type: 'design_analysis',
    title: '알고리즘 설계 & 성능 분석 방법',
  }
];

let currentConceptSlide = 0;

function renderConceptSlide(index) {
  currentConceptSlide = Math.max(0, Math.min(index, CONCEPT_SLIDES.length - 1));
  const data = CONCEPT_SLIDES[currentConceptSlide];

  // 1. 단계 배지
  const badgeEl = UI.el('concept-step-badge');
  if (badgeEl) badgeEl.textContent = data.step;

  // 2. 인디케이터 점
  const dotsEl = UI.el('concept-slide-dots');
  if (dotsEl) {
    dotsEl.innerHTML = CONCEPT_SLIDES.map((_, i) => 
      `<div class="slide-dot ${i === currentConceptSlide ? 'active' : ''}" data-index="${i}"></div>`
    ).join('');
  }

  // 3. 이전/다음 버튼 활성/비활성
  const prevBtn = UI.el('concept-prev-btn');
  const nextBtn = UI.el('concept-next-btn');
  if (prevBtn) prevBtn.disabled = (currentConceptSlide === 0);
  if (nextBtn) {
    nextBtn.textContent = (currentConceptSlide === CONCEPT_SLIDES.length - 1) ? '완료 ✕' : '다음 개념 ❯';
  }

  // 4. 슬라이드 본문 렌더링
  const bodyEl = UI.el('concept-slide-body');
  if (!bodyEl) return;

  if (data.type === 'process') {
    // 1페이지: 문제 해결 과정 (4번 알고리즘 설계 강조)
    bodyEl.innerHTML = `
      <div class="slide-title-wrap">
        <span style="font-size:1.5rem;">🖥️</span>
        <h3 class="slide-title">컴퓨터를 활용한 문제 해결 과정</h3>
      </div>
      <div class="process-layout-grid">
        <!-- 5단계 목록 (4번 항목에 화살표 직접 연계) -->
        <div class="process-list-col">
          <div class="process-item">
            <span class="process-num">1</span>
            <span>문제 이해 및 분석</span>
          </div>
          <div class="process-item">
            <span class="process-num">2</span>
            <span>핵심 요소 추출</span>
          </div>
          <div class="process-item">
            <span class="process-num">3</span>
            <span>문제 구조화</span>
          </div>
          <div class="process-item active-step" style="position:relative;">
            <span class="process-num">4</span>
            <span>알고리즘 설계</span>
            
            <!-- 4번 중앙에 정확히 결합된 화살표 -->
            <div class="step-direct-arrow">
              <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
                <path d="M2 10 H 22" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"/>
                <polygon points="20,5 29,10 20,15" fill="#6366f1"/>
              </svg>
            </div>
          </div>
          <div class="process-item">
            <span class="process-num">5</span>
            <span>프로그래밍 및 실행</span>
          </div>
        </div>

        <!-- 4번 알고리즘 설계 설명 카드 -->
        <div class="process-desc-col highlight-desc">
          <div class="process-desc-title">
            <span>💡</span>
            <span>알고리즘(Algorithm)이란?</span>
          </div>
          <div class="process-desc-text" style="display:flex;flex-direction:column;gap:.65rem;">
            <ul style="margin:0;padding-left:1.15rem;line-height:1.6;font-weight:600;color:#334155;">
              <li style="margin-bottom:.35rem;">문제 해결의 방법을 <strong>단계적인 절차</strong>로 표현한 것</li>
              <li>어떤 문제를 해결하기 위한 <strong>동작들의 모임</strong></li>
            </ul>
            <p style="font-size:.8rem;color:#64748b;line-height:1.45;margin-top:.2rem;border-top:1px dashed #e2e8f0;padding-top:.45rem;">
              👉 업다운 게임에서는 <em>"어떤 규칙과 절차로 비밀 숫자를 맞출 것인가?"</em>에 따라 순차 탐색, 이분 탐색 등의 알고리즘이 적용됩니다.
            </p>
          </div>
        </div>
      </div>
    `;
  } else if (data.type === 'features') {
    // 2페이지: 알고리즘의 특징(조건) — 한 줄에 하나씩 5행 배치
    bodyEl.innerHTML = `
      <div class="slide-title-wrap">
        <span style="font-size:1.5rem;">💬</span>
        <h3 class="slide-title">알고리즘의 특징 (조건)</h3>
      </div>
      <div class="features-list-rows">
        <div class="feature-row-item">
          <div class="feature-row-tag tag-input">입력</div>
          <div class="feature-row-body">입력 유무와 처리할 데이터가 정해져 있어야 함</div>
        </div>

        <div class="feature-row-item">
          <div class="feature-row-tag tag-output">출력</div>
          <div class="feature-row-body">1개 이상의 결과(변화)가 반드시 나와야 함</div>
        </div>

        <div class="feature-row-item">
          <div class="feature-row-tag tag-def">명확성</div>
          <div class="feature-row-body">각 단계에서 무엇을 하는지 명확하게 표현</div>
        </div>

        <div class="feature-row-item">
          <div class="feature-row-tag tag-eff">수행 가능성</div>
          <div class="feature-row-body">각 명령은 논리적으로 수행 가능해야 함</div>
        </div>

        <div class="feature-row-item">
          <div class="feature-row-tag tag-fin">유한성</div>
          <div class="feature-row-body">명령은 유한한 단계 내에 반드시 종료되어야 함</div>
        </div>
      </div>
    `;
  } else if (data.type === 'express_lang') {
    // 3페이지: 알고리즘 표현 방법 (자연어 & 의사 코드)
    bodyEl.innerHTML = `
      <div class="slide-title-wrap">
        <span style="font-size:1.5rem;">📝</span>
        <h3 class="slide-title">3. 알고리즘 표현 방법 (자연어 & 의사 코드)</h3>
      </div>
      <div class="express-lang-grid">
        <!-- 자연어 카드 -->
        <div class="express-card">
          <div class="express-card-header">
            <span class="express-badge badge-nat">💬 자연어</span>
          </div>
          <ul class="express-ul">
            <li>특별한 형식 없이 일상생활의 언어로 표현</li>
            <li>특별한 지식 필요 없음</li>
            <li>순서나 문법이 조금 틀려도 의미 전달 가능</li>
            <li>표현이 명확하지 않은 경우 다른 사람들은 이해하기 어려움</li>
          </ul>
        </div>

        <!-- 의사 코드 카드 -->
        <div class="express-card">
          <div class="express-card-header">
            <span class="express-badge badge-pseudo">💻 의사 코드 (흉내 코드)</span>
          </div>
          <ul class="express-ul">
            <li>특정 프로그래밍 언어의 문법을 따르지 않고, 프로그래밍 언어로 변환하기 쉬운 형태로 표현</li>
            <li>논리적이고 알아보기 흐름 파악이 쉬움</li>
            <li>실제 컴퓨터에서는 실행 불가능</li>
          </ul>
        </div>
      </div>
    `;
  } else if (data.type === 'express_flowchart') {
    // 4페이지: 좌측(순서도 설명) + 우측(기호와 의미 표)
    bodyEl.innerHTML = `
      <div class="slide-title-wrap" style="margin-bottom:.65rem;">
        <span style="font-size:1.5rem;">📊</span>
        <h3 class="slide-title">3. 알고리즘 표현 방법 — 순서도</h3>
      </div>
      
      <div class="flowchart-2col-layout">
        <!-- 좌측: 순서도 개념 설명 카드 -->
        <div class="express-card fc-intro-card">
          <div class="express-card-header">
            <span class="express-badge" style="background:#ede9fe;color:#6d28d9;">📐 순서도 (Flowchart)</span>
          </div>
          <ul class="express-ul">
            <li>정해진 기호를 이용하여 알고리즘을 표현</li>
            <li>흐름 파악 및 프로그램 작성이 쉬움</li>
            <li>순서도의 기호와 작성 방법을 알아야 함</li>
          </ul>
        </div>

        <!-- 우측: 순서도 기호 표 -->
        <div class="fc-table-wrap-side">
          <div class="fc-table-title-wide">
            <span>순서도의 기호와 의미</span>
          </div>
          <table class="fc-table-side">
            <thead>
              <tr>
                <th style="width: 76px;">기호</th>
                <th style="width: 60px;">명칭</th>
                <th>의미</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><div class="fc-shape shape-terminal"></div></td>
                <td><span class="fc-shape-name-badge">단말</span></td>
                <td>순서도의 시작과 끝</td>
              </tr>
              <tr>
                <td><div class="fc-shape shape-io"></div></td>
                <td><span class="fc-shape-name-badge">입출력</span></td>
                <td>데이터의 입력과 출력</td>
              </tr>
              <tr>
                <td><div class="fc-shape shape-process"></div></td>
                <td><span class="fc-shape-name-badge">처리</span></td>
                <td>데이터 연산과 같은 처리</td>
              </tr>
              <tr>
                <td><div class="fc-shape shape-decision"></div></td>
                <td><span class="fc-shape-name-badge">판단</span></td>
                <td>조건에 따른 비교·판단</td>
              </tr>
              <tr>
                <td><div class="fc-arrow-icon">➔</div></td>
                <td><span class="fc-shape-name-badge">흐름선</span></td>
                <td>실행의 흐름(방향)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (data.type === 'design_analysis') {
    // 5페이지: 알고리즘 설계 & 알고리즘 성능 분석 방법
    bodyEl.innerHTML = `
      <div class="slide-title-wrap">
        <span style="font-size:1.5rem;">🔍</span>
        <h3 class="slide-title">알고리즘 설계 및 성능 분석 방법</h3>
      </div>
      <div class="design-analysis-grid">
        <!-- 1. 알고리즘 설계 카드 -->
        <div class="express-card">
          <div class="express-card-header">
            <span class="express-badge" style="background:#e0f2fe;color:#0369a1;">💡 알고리즘 설계</span>
          </div>
          <ul class="express-ul">
            <li>똑같은 문제 상황에서도 문제의 <strong>효율성과 수행 시간을 고려</strong>해 다양한 알고리즘을 설계할 수 있음</li>
          </ul>
        </div>

        <!-- 2. 알고리즘 성능 분석 방법 카드 -->
        <div class="express-card">
          <div class="express-card-header">
            <span class="express-badge" style="background:#fef3c7;color:#b45309;">📊 알고리즘 성능 분석 방법</span>
          </div>
          <ul class="express-ul">
            <li>원하는 결과가 <strong>정확하게 출력</strong>되는지 확인한다.</li>
            <li>알고리즘 전체 <strong>구조가 단순</strong>하고 <strong>오류 수정이 쉬운지</strong> 확인한다.</li>
            <li><strong>작업량과 수행 시간</strong>을 확인하고 비교한다.</li>
            <li><strong>기억 장소의 사용량</strong>을 확인하고 비교한다.</li>
          </ul>
        </div>
      </div>
    `;
  }
}

// ── 모달 바인딩 ──────────────────────────────
function bindModal() {
  const openModal = id => {
    UI.el(id)?.classList.remove('hidden');
    if (id === 'modal-concept') renderConceptSlide(0);
  };
  const closeModal = id => UI.el(id)?.classList.add('hidden');

  UI.el('btn-concept')?.addEventListener('click', () => openModal('modal-concept'));
  UI.el('btn-privacy')?.addEventListener('click', () => openModal('modal-privacy'));
  UI.el('btn-terms')?.addEventListener('click', () => openModal('modal-terms'));
  UI.el('btn-sim-stats-modal')?.addEventListener('click', () => openModal('modal-sim-stats'));

  // CSV 다운로드 (모달 내부)
  UI.el('sim-export-csv')?.addEventListener('click', () => {
    if (state.simStats) {
      UI.downloadCSV(state.simStats, ALGO_META);
    }
  });

  // 개념 슬라이드 이전 / 다음 버튼
  UI.el('concept-prev-btn')?.addEventListener('click', () => {
    if (currentConceptSlide > 0) renderConceptSlide(currentConceptSlide - 1);
  });
  UI.el('concept-next-btn')?.addEventListener('click', () => {
    if (currentConceptSlide < CONCEPT_SLIDES.length - 1) {
      renderConceptSlide(currentConceptSlide + 1);
    } else {
      closeModal('modal-concept');
    }
  });

  // 인디케이터 점 클릭
  UI.el('concept-slide-dots')?.addEventListener('click', e => {
    const dot = e.target.closest('.slide-dot');
    if (dot && dot.dataset.index !== undefined) {
      renderConceptSlide(parseInt(dot.dataset.index, 10));
    }
  });

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      if (targetId) closeModal(targetId);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });
}

// ── 토스트 알림 ───────────────────────────────
function showToast(msg) {
  const t = UI.make('div', 'toast', msg);
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('toast-show'), 10);
  setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 400); }, 3000);
}

// ── 앱 시작 ───────────────────────────────────
window.addEventListener('DOMContentLoaded', init);
