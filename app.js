'use strict'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]

const state = { data: null, side: 'ALL', period: 'all', risk: 0.1, expanded: new Set() }

// ---------- formatting ----------
function fmtPrice(n) {
  if (n == null) return '—'
  const a = Math.abs(n)
  const d = a >= 1000 ? 1 : a >= 1 ? 3 : a >= 0.01 ? 5 : 7
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d })
}
function fmtPct(n, withSign = true) {
  if (n == null) return '—'
  const s = withSign && n > 0 ? '+' : ''
  return `${s}${n.toFixed(2)}%`
}
function cls(n) { return n > 0.0001 ? 'pos' : n < -0.0001 ? 'neg' : 'flat' }

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч назад`
  const d = Math.floor(h / 24)
  return `${d} дн назад`
}
function duration(a, b) {
  if (!a || !b) return '—'
  let s = Math.max(0, (new Date(b) - new Date(a)) / 1000)
  const d = Math.floor(s / 86400); s -= d * 86400
  const h = Math.floor(s / 3600); s -= h * 3600
  const m = Math.floor(s / 60)
  return [d && `${d}д`, h && `${h}ч`, (!d && m) && `${m}м`].filter(Boolean).join(' ') || '<1м'
}
function shortTime(iso) {
  if (!iso) return '—'
  const dt = new Date(iso)
  return dt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ---------- render: topbar ----------
function renderTop() {
  const d = state.data
  const all = d.stats.all
  $('#updated').textContent = `обновлено ${timeAgo(d.generated_at)} · ${shortTime(d.generated_at)}`
  $('#cntActive').textContent = d.active.length
  $('#topStats').innerHTML = `
    <div class="tstat"><div class="k">Открыто</div><div class="v">${d.active.length}</div></div>
    <div class="tstat"><div class="k">Винрейт</div><div class="v">${all.winrate}%</div></div>
    <div class="tstat"><div class="k">Сделок</div><div class="v">${all.total}</div></div>`
}

// ---------- render: active ----------
function avatarStyle(sym) {
  let h = 0
  for (const c of sym) h = (h * 31 + c.charCodeAt(0)) % 360
  return `background:linear-gradient(135deg,hsl(${h} 70% 52%),hsl(${(h + 40) % 360} 65% 42%))`
}

function priceTrack(t) {
  if (t.sl == null || t.tp3 == null || t.entry == null) return ''
  const span = t.tp3 - t.sl
  if (!span) return ''
  // Directional mapping: SL → left edge, TP3 → right edge (works for long & short).
  // Kept inside [4%, 96%] so edge ticks stay visible.
  const P = x => 4 + Math.max(0, Math.min(1, (x - t.sl) / span)) * 92
  const pe = P(t.entry)
  const hasNow = t.current_price != null
  const pn = hasNow ? P(t.current_price) : pe
  const inProfit = (t.pnl_percent || 0) >= 0
  const fillL = Math.min(pe, pn), fillW = Math.abs(pn - pe)
  const tpTicks = [t.tp1, t.tp2, t.tp3].filter(v => v != null)
    .map(v => `<span class="tick tp" style="left:${P(v)}%"></span>`).join('')
  const peLabel = Math.max(17, Math.min(83, pe)) // keep entry label on-screen
  return `
    <div class="track-wrap">
      <div class="track-top"><span class="lg entry" style="left:${peLabel}%">вход ${fmtPrice(t.entry)}</span></div>
      <div class="track">
        <div class="track-bar">
          <span class="zone loss" style="left:0;width:${pe}%"></span>
          <span class="zone profit" style="left:${pe}%;right:0"></span>
          ${hasNow ? `<span class="fill ${inProfit ? 'pos' : 'neg'}" style="left:${fillL}%;width:${fillW}%"></span>` : ''}
        </div>
        <span class="tick sl" style="left:${P(t.sl)}%"></span>
        ${tpTicks}
        <span class="tick entry" style="left:${pe}%"></span>
        ${hasNow ? `<span class="now" style="left:${pn}%"></span>` : ''}
      </div>
      <div class="track-legend">
        <span class="lg" style="left:0;color:var(--red)">◀ SL ${fmtPrice(t.sl)}</span>
        <span class="lg" style="right:0;color:var(--green)">TP3 ${fmtPrice(t.tp3)} ▶</span>
      </div>
    </div>`
}

function ladder(t) {
  const lv = [['TP1', t.tp1, 1], ['TP2', t.tp2, 2], ['TP3', t.tp3, 3]]
  return `<div class="steps">${lv.map(([l, px, n]) => {
    const hit = t.max_tp_hit >= n
    return `<div class="step ${hit ? 'hit' : ''}"><div class="lvl">${l}</div><div class="px">${fmtPrice(px)}</div><div class="check">${hit ? '✓' : ''}</div></div>`
  }).join('')}</div>`
}

function activeCard(t) {
  const open = state.expanded.has(t.symbol)
  const beTaken = t.max_tp_hit >= 1
  const c = cls(t.pnl_percent)
  const protect = beTaken
    ? `<span class="protect be">🛡 Безубыток · TP${t.max_tp_hit}</span>`
    : `<span class="protect risk">⚠ Под исходным стопом</span>`
  const reasons = (t.reasons || []).length
    ? `<div class="reasons"><div class="section-label">Почему вошли</div><ul>${t.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul></div>`
    : ''
  return `
  <div class="card ${open ? 'open' : ''}" data-sym="${t.symbol}">
    <div class="card-head" data-toggle="${t.symbol}">
      <div class="avatar" style="${avatarStyle(t.symbol)}">${t.symbol.slice(0, 4)}</div>
      <div class="coin-info">
        <div class="coin-name">${t.symbol}</div>
        <div class="coin-meta">
          <span class="badge ${t.side.toLowerCase()}">${t.side === 'LONG' ? 'Лонг' : 'Шорт'}</span>
          <span class="badge tf">${t.tf}</span>
          <span>${timeAgo(t.open_time)}</span>
        </div>
      </div>
      <div class="spacer"></div>
      <div class="pnl-pill ${c}">
        <div class="p">${fmtPct(t.pnl_percent)}</div>
        <div class="px">${fmtPrice(t.current_price)}</div>
      </div>
      <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    ${priceTrack(t)}
    <div class="card-body">
      <div class="prices">
        <div class="prow entry"><div class="k">Вход</div><div class="v">${fmtPrice(t.entry)}</div></div>
        <div class="prow now"><div class="k">Сейчас</div><div class="v">${fmtPrice(t.current_price)}</div></div>
        <div class="prow stop"><div class="k">Исходный SL</div><div class="v">${fmtPrice(t.sl)}</div></div>
        <div class="prow stop"><div class="k">Рабочий стоп</div><div class="v">${fmtPrice(t.effective_stop)}</div></div>
      </div>
      <div class="ladder"><div class="section-label">Цели · R:R ${t.rr ?? '—'} · скор ${t.probability ?? '—'}%${protect}</div>${ladder(t)}</div>
      ${reasons}
    </div>
  </div>`
}

function renderActive() {
  const list = state.data.active.filter(t => state.side === 'ALL' || t.side === state.side)
  $$('#sideFilter .chip').forEach(c => c.classList.toggle('is-active', c.dataset.side === state.side))
  const el = $('#activeList')
  if (!list.length) {
    el.innerHTML = `<div class="empty"><div class="em-ic">📭</div>Нет открытых сделок${state.side !== 'ALL' ? ' в этом фильтре' : ''}</div>`
    return
  }
  el.innerHTML = list.map(activeCard).join('')
}

// ---------- render: history ----------
function renderHistory() {
  const rows = state.data.history
  const body = $('#historyBody')
  if (!rows.length) { body.innerHTML = `<tr><td colspan="8"><div class="empty"><div class="em-ic">🗂</div>История пуста</div></td></tr>`; return }
  body.innerHTML = rows.map(t => {
    const r = t.result.toLowerCase()
    const ic = { tp: '✓', be: '=', sl: '✕', exp: '·' }[r] || ''
    return `<tr>
      <td class="sym">${t.symbol}</td>
      <td><span class="side-tag ${t.side.toLowerCase()}">${t.side === 'LONG' ? 'Лонг' : 'Шорт'}</span></td>
      <td><span class="res ${r}">${ic} ${t.result}</span></td>
      <td class="num ${cls(t.pnl_percent)}">${fmtPct(t.pnl_percent)}</td>
      <td class="num ${cls(t.r_multiple)}">${t.r_multiple > 0 ? '+' : ''}${t.r_multiple}R</td>
      <td class="hide-sm" style="color:var(--muted);font-size:13px">${escapeHtml(t.setup_type || '')}</td>
      <td class="hide-sm num" style="color:var(--muted)">${duration(t.open_time, t.close_time)}</td>
      <td class="hide-sm num" style="color:var(--muted)">${shortTime(t.close_time)}</td>
    </tr>`
  }).join('')
}

// ---------- render: stats ----------
function donut(winrate) {
  const r = 54, c = 2 * Math.PI * r, on = c * (winrate / 100)
  return `<svg width="140" height="140" viewBox="0 0 140 140">
    <defs>
      <linearGradient id="wg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#34d39a"/><stop offset="1" stop-color="#38d6e6"/>
      </linearGradient>
    </defs>
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="13"/>
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="url(#wg)" stroke-width="13" stroke-linecap="round"
      stroke-dasharray="${on} ${c}" transform="rotate(-90 70 70)" style="transition:stroke-dasharray .6s cubic-bezier(.2,.7,.3,1)"/>
    <text x="70" y="66" text-anchor="middle" fill="var(--text)" font-size="28" font-weight="800" font-family="var(--mono)">${winrate}%</text>
    <text x="70" y="86" text-anchor="middle" fill="var(--muted)" font-size="11" font-weight="600">винрейт</text>
  </svg>`
}

function renderStats() {
  const s = state.data.stats[state.period]
  $$('#period .chip').forEach(c => c.classList.toggle('is-active', c.dataset.period === state.period))
  const deposit = +(s.r_result * state.risk).toFixed(2)
  $('#statsView').innerHTML = `
    <div class="stat-grid">
      <div class="stat-hero">
        <div class="hero-main">
          <span class="hero-label">Эффективный винрейт</span>
          <span class="hero-val ${cls(s.effective_winrate - 50)}">${s.effective_winrate}%</span>
          <span class="hero-sub">${s.total} закрытых сделок · чистый винрейт (TP3) ${s.winrate}%</span>
          <span class="hero-sub" style="color:${s.sum_pnl >= 0 ? 'var(--green)' : 'var(--red)'}">Сумма PnL: ${fmtPct(s.sum_pnl)}</span>
        </div>
        <div class="donut-wrap">${donut(s.winrate)}</div>
      </div>

      <div class="scard">
        <div class="k">Исходы сделок</div>
        <div class="breakdown">
          <div class="bd tp"><div class="n">${s.tp}</div><div class="l">TP3</div></div>
          <div class="bd be"><div class="n">${s.be}</div><div class="l">БУ</div></div>
          <div class="bd sl"><div class="n">${s.sl}</div><div class="l">SL</div></div>
        </div>
      </div>

      <div class="scard">
        <div class="k">Результат в R</div>
        <div class="v ${cls(s.r_result)}">${s.r_result > 0 ? '+' : ''}${s.r_result}R</div>
        <div class="sub">сумма R-мультипликаторов по закрытым</div>
      </div>

      <div class="risk-card">
        <div class="risk-top">
          <div>
            <div class="k" style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;font-weight:600">Результат по депозиту</div>
            <div class="risk-res ${cls(deposit)}">${deposit > 0 ? '+' : ''}${deposit}%</div>
          </div>
          <div class="risk-ctl">
            <span style="font-size:12px;color:var(--muted)">Риск/сделку</span>
            <input type="range" id="riskRange" min="0.1" max="2" step="0.1" value="${state.risk}">
            <span class="risk-val">${state.risk}%</span>
          </div>
        </div>
        <div class="risk-hint">При риске ${state.risk}% от депозита на сделку. Двигай ползунок — пересчёт мгновенный.</div>
      </div>
    </div>`

  const range = $('#riskRange')
  if (range) range.addEventListener('input', e => { state.risk = +e.target.value; renderStats() })
}

// ---------- helpers ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function renderAll() { renderTop(); renderActive(); renderHistory(); renderStats() }

// ---------- events ----------
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('.tab'); if (!b) return
  $$('#tabs .tab').forEach(t => t.classList.toggle('is-active', t === b))
  $$('.panel').forEach(p => p.classList.toggle('is-active', p.dataset.panel === b.dataset.tab))
})
$('#sideFilter').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return
  state.side = b.dataset.side; renderActive()
})
$('#period').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return
  state.period = b.dataset.period; renderStats()
})
$('#activeList').addEventListener('click', e => {
  const h = e.target.closest('[data-toggle]'); if (!h) return
  const sym = h.dataset.toggle
  state.expanded.has(sym) ? state.expanded.delete(sym) : state.expanded.add(sym)
  renderActive()
})

// ---------- load ----------
const CFG = window.DASH_CONFIG || { DATA_URL: './data.json', REFRESH_MS: 60000 }

async function load() {
  try {
    const sep = CFG.DATA_URL.includes('?') ? '&' : '?'
    const res = await fetch(`${CFG.DATA_URL}${sep}t=${Date.now()}`)
    if (!res.ok) throw new Error(res.status)
    state.data = await res.json()
    renderAll()
  } catch (err) {
    $('#updated').textContent = 'не удалось загрузить data.json'
    $('#activeList').innerHTML = `<div class="empty"><div class="em-ic">⚠️</div>Нет данных. Запустите экспорт на боте.</div>`
    console.error(err)
  }
}
load()
setInterval(load, CFG.REFRESH_MS || 60000) // авто-обновление страницы
