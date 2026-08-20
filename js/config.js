// ─────────────────────────────────────────────
// CONFIG — 상수 및 알고리즘 메타데이터
// 범위 변경: MIN/MAX만 수정하면 전체 반영
// ─────────────────────────────────────────────
const CONFIG = {
  MIN: 1,
  MAX: 100,
  DEFAULT_RUNS: 10000,
  STEP_DELAYS: [1400, 700, 300, 100, 30], // 1단계(느림)~5단계(빠름)
  CHART_COLORS: {
    sequential:      'rgba(99,102,241,0.8)',
    binary:          'rgba(139,92,246,0.8)',
    random_no_dup:   'rgba(14,165,233,0.8)',
    random_feedback: 'rgba(16,185,129,0.8)',
    random_pure:     'rgba(244,63,94,0.8)',
  },
};

const ALGO_META = [
  {
    id: 'sequential',
    label: '순차 탐색',
    icon: '',
    badge: 'Sequential',
    desc: '1부터 100까지 순서대로 1씩 증가하며 찾는 가장 단순하고 정직한 방법입니다.',
    worst: CONFIG.MAX,
    best: 1,
  },
  {
    id: 'binary',
    label: '이분 탐색',
    icon: '',
    badge: 'Binary Search',
    desc: '탐색 범위를 절반씩 좁혀 중간값을 추측하는 가장 효율적인 대표 알고리즘입니다.',
    worst: Math.ceil(Math.log2(CONFIG.MAX - CONFIG.MIN + 1)),
    best: 1,
    hasAnimation: true,
  },
  {
    id: 'random_no_dup',
    label: '무작위 탐색 (중복 제외)',
    icon: '',
    badge: 'Random (No Dup)',
    desc: '한 번 물어본 숫자는 목록에서 제외하고, 남은 후보 중에서 무작위로 선택합니다.',
    worst: CONFIG.MAX,
    best: 1,
  },
  {
    id: 'random_feedback',
    label: '무작위 탐색 (업/다운 반영)',
    icon: '',
    badge: 'Random + Feedback',
    desc: '업/다운 피드백으로 탐색 범위를 좁히되, 해당 범위 안에서 무작위로 숫자를 선택합니다.',
    worst: null,
    best: 1,
  },
  {
    id: 'random_pure',
    label: '무작위 탐색 (중복 포함)',
    icon: '',
    badge: 'Pure Random',
    desc: '아무런 힌트 반영 없이 1~100 사이 숫자를 무한히 뽑는 방법입니다.',
    worst: null,
    best: 1,
  },
];
