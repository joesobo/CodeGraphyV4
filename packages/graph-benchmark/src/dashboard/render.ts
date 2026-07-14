import type {
  DashboardFixtureModel,
  DashboardMetricPoint,
  DashboardModel,
} from './model';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function number(value: number | null, digits = 2): string {
  return value !== null && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function metricRows(point: DashboardMetricPoint): string {
  const rows: Array<[string, string]> = [
    ['Frame time', `${number(point.frameTimeMs)} ms avg`],
    ['Frame p95', `${number(point.frameP95Ms)} ms`],
    ['Frame 1%-high', `${number(point.onePercentHighMs)} ms`],
    ['Frame max', `${number(point.frameMaxMs)} ms`],
    ['Simulation', `${number(point.simulationMs)} ms`],
    ['Simulation substeps', `${number(point.simulationStepsPerFrame)} / frame`],
    ['Simulation rate', `${number(point.simulationStepsPerSecond, 1)} steps/s`],
    ['Render', `${number(point.renderMs)} ms`],
    ['Potential FPS', number(point.potentialFps, 1)],
    ['Displayed FPS', number(point.displayedFps, 1)],
    ['Target latency', `${number(point.targetLatencyFrames, 1)} frames`],
    ['Neighbor latency', `${number(point.neighborLatencyFrames, 1)} frames`],
    ['Frozen frames', number(point.frozenFrameCount, 1)],
    ['Teleport frames', number(point.teleportFrameCount, 1)],
    ['Settle violations', number(point.settleEnvelopeViolationCount, 1)],
    ['HUD max difference', `${number(point.hudDifferenceMaxPct)}%`],
  ];
  return rows.map(([label, value]) =>
    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
  ).join('');
}

function potentialFpsTrendSvg(fixture: DashboardFixtureModel): string {
  const width = 420;
  const height = 120;
  const values = fixture.trend.map(point => point.potentialFps);
  const maximum = Math.max(1, ...values) * 1.1;
  const points = fixture.trend.map((point, index) => {
    const x = fixture.trend.length === 1
      ? width / 2
      : 12 + index * ((width - 24) / (fixture.trend.length - 1));
    const y = height - 12 - (point.potentialFps / maximum) * (height - 24);
    return `${x},${y}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(fixture.fixture)} potential FPS trend">
    <polyline points="${points}" class="trend" />
  </svg>`;
}

function fixtureSection(fixture: DashboardFixtureModel): string {
  const comparison = fixture.potentialFpsIncreasePct === null
    ? '<p class="pending">Baseline established; potential-FPS improvement begins at the next checkpoint.</p>'
    : `<p class="improvement">${number(fixture.baseline.potentialFps, 1)} → ${number(fixture.current.potentialFps, 1)} potential FPS · <strong>${fixture.potentialFpsIncreasePct >= 0 ? '+' : ''}${number(fixture.potentialFpsIncreasePct, 1)}%</strong></p>`;
  return `<section>
    <h2>${escapeHtml(fixture.fixture)} nodes</h2>
    ${comparison}
    <div class="comparison">
      <article><h3>Baseline · ${escapeHtml(fixture.baseline.milestone)}</h3><table>${metricRows(fixture.baseline)}</table></article>
      <article><h3>Current · ${escapeHtml(fixture.current.milestone)}</h3><table>${metricRows(fixture.current)}</table></article>
    </div>
    <h3>Potential FPS improvement by commit</h3>
    ${potentialFpsTrendSvg(fixture)}
    <ol class="trend-labels">${fixture.trend.map(point => `<li>${escapeHtml(point.milestone)} · <code>${escapeHtml(point.revision.slice(0, 9))}</code> · ${number(point.potentialFps, 1)} FPS</li>`).join('')}</ol>
  </section>`;
}

function attributionSection(model: DashboardModel): string {
  if (model.attribution.length === 0) {
    return '<section><h2>Cost attribution</h2><p class="pending">M2 attribution pending.</p></section>';
  }
  const rows = model.attribution.flatMap(entry => Object.entries(entry.stages).map(
    ([stage, milliseconds]) => `<tr><td>${escapeHtml(entry.milestone)}</td><td>${escapeHtml(entry.fixture)}</td><th>${escapeHtml(stage)}</th><td>${number(milliseconds)} ms</td><td>${number(milliseconds / 6.9 * 100, 1)}%</td></tr>`,
  )).join('');
  return `<section><h2>Cost attribution</h2><table><thead><tr><th>Milestone</th><th>Fixture</th><th>Stage</th><th>Cost</th><th>6.9 ms budget</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function visualsSection(model: DashboardModel): string {
  if (model.visuals.length === 0) {
    return '<section><h2>Visual evidence</h2><p class="pending">Screenshots and scripted-drag GIFs pending.</p></section>';
  }
  return `<section><h2>Visual evidence</h2><div class="visuals">${model.visuals.map(visual => `<figure><img src="${escapeHtml(visual.path)}" alt="${escapeHtml(visual.caption)}" loading="lazy" /><figcaption>${escapeHtml(visual.caption)}</figcaption></figure>`).join('')}</div></section>`;
}

export function renderDashboard(model: DashboardModel): string {
  const updates = model.updates.map(update => `<article class="update"><h3>${escapeHtml(update.milestone)} · ${escapeHtml(update.title)}</h3><time>${escapeHtml(update.timestamp)}</time><p>${escapeHtml(update.summary)}</p></article>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta http-equiv="refresh" content="20" />
<title>${escapeHtml(model.title)}</title><style>
:root{color-scheme:dark;font-family:ui-sans-serif,system-ui,sans-serif;background:#0d1117;color:#e6edf3}body{max-width:1180px;margin:auto;padding:24px}header,section{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin-bottom:16px}h1,h2,h3{margin-top:0}.comparison{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px}article{background:#0d1117;border:1px solid #30363d;border-radius:9px;padding:14px}.improvement{font-size:1.3rem;color:#3fb950}.pending,time{color:#d29922}table{width:100%;border-collapse:collapse}th{text-align:left}th,td{border-bottom:1px solid #30363d;padding:6px}.trend{fill:none;stroke:#58a6ff;stroke-width:3}.trend-labels{font-size:.85rem;color:#8b949e}.visuals{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}img{width:100%;border-radius:8px}code{background:#21262d;padding:2px 5px;border-radius:4px}
</style></head><body>
<header><h1>${escapeHtml(model.title)}</h1><p>Generated ${escapeHtml(model.generatedAt)} · refreshes every 20 seconds</p></header>
<section><h2>Latest updates</h2>${updates || '<p class="pending">No milestone updates yet.</p>'}</section>
${model.fixtures.map(fixtureSection).join('')}
${attributionSection(model)}
${visualsSection(model)}
</body></html>`;
}
