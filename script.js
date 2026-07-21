// Variável limpa que vai receber os dados da API/JSON
let DATA = {};
const STATIC = {};

// ─── UTILITIES ────────────────────────────────────────────────
const fmt = {
  brl: v => v == null ? '—' : 'R$ ' + (v >= 1e6
    ? (v/1e6).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}) + ' MM'
    : v.toLocaleString('pt-BR', {minimumFractionDigits:0,maximumFractionDigits:0})),
  brlFull: v => v == null ? '—' : 'R$ ' + v.toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}),
  pct: (v, dec=1) => v == null ? '—' : v.toLocaleString('pt-BR', {minimumFractionDigits:dec,maximumFractionDigits:dec}) + '%',
  deltaSign: v => v > 0 ? '+' : '',
  deltaClass: v => v > 0 ? 'td-pos' : 'td-neg',
  num: v => v == null ? '—' : v.toLocaleString('pt-BR')
};

function makeLegend(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map(i => `
    <div class="legend-item">
      ${ i.type === 'line'
        ? `<div class="legend-line" style="background:${i.color};${i.dashed?'border-top:2px dashed '+i.color+';background:none;height:0':''}"></div>`
        : `<div class="legend-dot" style="background:${i.color}"></div>` }
      <span>${i.label}</span>
    </div>`).join('');
}

// ─── CHART.JS DEFAULTS ────────────────────────────────────────
Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', sans-serif";
Chart.defaults.font.size   = 11;
Chart.defaults.color       = '#898781';
Chart.defaults.plugins.legend.display = false;

const COLORS = {
  blue:   '#2a78d6',
  green:  '#008300',
  gold:   '#eda100',
  navy:   '#0F2461',
  red:    '#e34948',
  aqua:   '#1baf7a',
  orange: '#eb6834',
  gridline: '#e1e0d9'
};

function baseOptions(yLabel = '') {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15,36,97,.92)',
        titleFont: { weight: '700', size: 12 },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 6
      }
    },
    scales: {
      x: {
        grid: { color: COLORS.gridline, lineWidth: 0.5 },
        ticks: { color: '#898781', font: { size: 10 } },
        border: { color: '#c3c2b7' }
      },
      y: {
        grid: { color: COLORS.gridline, lineWidth: 0.5 },
        ticks: { color: '#898781', font: { size: 10 } },
        border: { dash: [3,3], color: 'transparent' },
        title: yLabel ? { display: true, text: yLabel, font: { size: 10 }, color: '#898781' } : { display: false }
      }
    }
  };
}

// ─── Variáveis de escopo externo ─────
const initialized = {};
let _rgMes = null; 

// ─── CARREGAR DADOS E INICIALIZAR ─────────────────────────────
fetch('./data.json?v=' + Date.now(), { cache: 'no-store' })
  .then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ao carregar data.json');
    return r.json();
  })
  .then(function(json) {
    DATA = json;

    // ─── INIT HEADER ──────────────────────────────────────────────
    document.getElementById('lastUpdatedLabel').textContent = DATA.meta.lastUpdated;
    document.getElementById('mesReferenciaLabel').textContent = DATA.meta.mesReferencia;

    // ─── TAB SWITCHING ────────────────────────────────────────────
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const id = 'tab-' + btn.dataset.tab;
        document.getElementById(id).classList.add('active');
        
        // Lazy Loading: Renderiza a aba apenas no primeiro clique nela
        if (!initialized[id]) { initialized[id] = true; initTab(id); }
      });
    });

    // ─── INIT FIRST TAB ───────────────────────────────────────────
    initialized['tab-resultado-geral'] = true;
    initTab('tab-resultado-geral');
  })
  .catch(function(e) {
    console.error('Erro ao carregar data.json:', e);
    document.body.innerHTML =
      '<div style="padding:40px;text-align:center;font-family:sans-serif;color:#e74c3c">' +
      '<h2>Erro ao carregar dados</h2><p>' + e.message + '</p>' +
      '<p>Verifique se <code>data.json</code> está na mesma pasta que o HTML.</p></div>';
  });

function _tabError(id, err) {
  console.error('[ZON] Erro na aba ' + id + ':', err);
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:300px;">' +
        '<div style="text-align:center;color:#ef4444;">' +
          '<div style="font-size:2rem;margin-bottom:8px;">&#9888;&#65039;</div>' +
          '<div style="font-weight:600;margin-bottom:4px;">Erro ao carregar esta aba</div>' +
          '<div style="font-size:0.85rem;opacity:0.7;">' + (err && err.message ? err.message : String(err)) + '</div>' +
        '</div>' +
      '</div>';
  }
}

function initTab(id) {
  try {
    switch(id) {
      case 'tab-resultado-geral':   initResultadoGeral();   break;
      case 'tab-producao-du':       initProducaoDU();       break;
      case 'tab-recuperacao-du':    initRecupDU();          break;
      case 'tab-carteira-fases':    initCarteiraFases();    break;
      case 'tab-segmento-faixa':    initSegmentoFaixa();    break;
      case 'tab-performance-venc':  initPerfVenc();         break;
      case 'tab-matriz-efic':       initMatrizEficiencia(); break;
    }
  } catch (err) {
    _tabError(id, err);
  }
}

// ══════════════════════════════════════════════════════════════
// TAB 1 — RESULTADO GERAL
// ══════════════════════════════════════════════════════════════
function rgSetMes(mes) {
  _rgMes = mes;
  document.querySelectorAll('[data-rgm]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.rgm === mes)
  );
  _rgUpdateKPIs();
}

function _rgUpdateKPIs() {
  const d     = DATA.resultadoGeral;
  const hist  = d.historico;
  const eficH = d.eficienciaHistorico;
  const h     = hist.find(x => x.mes === _rgMes);
  if (!h) return;

  const parcial   = h.mes.includes('*');
  const eficEntry = eficH.find(e => e.mes === _rgMes);
  const mesLabel  = h.mes.replace('*', '');
  const icmColor  = v => v >= 100 ? 'var(--delta-pos)' : v >= 85 ? 'var(--brand-gold)' : 'var(--delta-neg)';
  const fmtEfic   = v => v != null ? v.toFixed(2).replace('.',',') + '%' : '—';

  document.getElementById('rg-subtitle').textContent = parcial
    ? `${DATA.meta.mesReferencia} (parcial — ${d.diasUteisDecorridos} de ${d.diasUteisTotais} DUs decorridos) vs. Meta Mensal`
    : `Resultado encerrado — ${mesLabel} vs. Meta Mensal`;

  if (parcial) {
    const pctMeta    = d.recuperacaoAtual / d.metaMensal * 100;
    const projPct    = d.projecaoMes / d.metaMensal * 100;
    const ritmo      = d.recuperacaoAtual / d.diasUteisDecorridos;
    const varEfic    = ((d.eficienciaAtual - d.eficienciaAnterior) / d.eficienciaAnterior * 100);
    document.getElementById('rg-kpis').innerHTML = `
      <div class="kpi-card blue">
        <div class="kpi-label">Meta Mensal</div>
        <div class="kpi-value">${fmt.brl(d.metaMensal)}</div>
        <div class="kpi-sub">Projeção: ${fmt.brl(d.projecaoMes)} (${fmt.pct(projPct)})</div>
      </div>
      <div class="kpi-card navy">
        <div class="kpi-label">Recuperação Acumulada</div>
        <div class="kpi-value">${fmt.brl(d.recuperacaoAtual)}</div>
        <div class="kpi-sub">${fmt.pct(pctMeta)} da meta mensal</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(pctMeta,100)}%"></div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Ritmo Diário Médio</div>
        <div class="kpi-value">${fmt.brl(ritmo)}</div>
        <div class="kpi-sub">Necessário: ${fmt.brl(d.metaMensal/d.diasUteisTotais)}/DU para bater meta</div>
      </div>
      <div class="kpi-card gold">
        <div class="kpi-label">ICM Atual (% da Meta)</div>
        <div class="kpi-value">${fmt.pct(d.eficienciaAtual)}</div>
        <div class="kpi-sub">
          <span class="kpi-delta ${varEfic>0?'pos':'neg'}">${fmt.deltaSign(varEfic)}${varEfic.toFixed(1).replace('.',',')}%</span>
          vs. ICM junho (${fmt.pct(d.eficienciaAnterior)})
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Eficiência Projetada</div>
        <div class="kpi-value">${fmt.pct(d.taxaRecuperacao)}</div>
        <div class="kpi-sub">% recuperado / carteira ativa (proj.)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Dias Úteis Decorridos</div>
        <div class="kpi-value">${d.diasUteisDecorridos}/${d.diasUteisTotais}</div>
        <div class="kpi-sub">${fmt.pct(d.diasUteisDecorridos/d.diasUteisTotais*100)} do mês concluído</div>
      </div>
    `;
  } else {
    const icm   = h.meta > 0 ? h.recuperado / h.meta * 100 : 0;
    const idx   = hist.findIndex(x => x.mes === _rgMes);
    const prev  = idx > 0 ? hist[idx - 1] : null;
    const varM  = prev && prev.recuperado > 0 ? (h.recuperado - prev.recuperado) / prev.recuperado * 100 : null;
    const icmCl = icm >= 100 ? 'green' : icm >= 85 ? 'gold' : '';
    document.getElementById('rg-kpis').innerHTML = `
      <div class="kpi-card blue">
        <div class="kpi-label">Meta Mensal</div>
        <div class="kpi-value">${fmt.brl(h.meta)}</div>
        <div class="kpi-sub">${icm >= 100 ? '✓ Meta atingida' : 'Meta não atingida no mês'}</div>
      </div>
      <div class="kpi-card navy">
        <div class="kpi-label">Recuperação · ${mesLabel}</div>
        <div class="kpi-value">${fmt.brl(h.recuperado)}</div>
        <div class="kpi-sub">${fmt.pct(icm)} da meta</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(icm,100)}%"></div></div>
      </div>
      <div class="kpi-card ${icmCl}" style="border-left:3px solid ${icmColor(icm)}">
        <div class="kpi-label">ICM s/ Meta</div>
        <div class="kpi-value" style="color:${icmColor(icm)}">${icm.toFixed(1)}%</div>
        <div class="kpi-sub">Recuperado ÷ Meta × 100</div>
      </div>
      ${varM != null ? `
      <div class="kpi-card">
        <div class="kpi-label">Var. vs ${prev.mes.replace('*','')}</div>
        <div class="kpi-value"><span style="font-size:1.4rem; color:${varM>=0?'var(--delta-pos)':'var(--delta-neg)'}">${varM>=0?'+':''}${varM.toFixed(1)}%</span></div>
        <div class="kpi-sub">${varM>=0?'Crescimento':'Queda'} vs. mês anterior</div>
      </div>` : ''}
      <div class="kpi-card gold">
        <div class="kpi-label">Situação</div>
        <div class="kpi-value" style="font-size:1rem; color:#78350F; padding-top:4px">✓ Mês Encerrado</div>
        <div class="kpi-sub">Resultado final confirmado</div>
      </div>
    `;
  }

  if (parcial) {
    const icmEficProjCls = d.icmEficProj >= 100 ? 'green' : 'gold';
    document.getElementById('efic-kpis').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-label">Meta Eficiência ${mesLabel}</div>
        <div class="kpi-value">${d.metaEficMes.toFixed(2).replace('.',',')}%</div>
        <div class="kpi-sub">% recuperado sobre carteira</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Eficiência Atual (parcial)</div>
        <div class="kpi-value">${d.eficAtualMes.toFixed(2).replace('.',',')}%</div>
        <div class="kpi-sub">Acumulado até ${d.diasUteisDecorridos} DUs</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Eficiência Projetada</div>
        <div class="kpi-value">${d.eficProjMes.toFixed(2).replace('.',',')}%</div>
        <div class="kpi-sub">Estimativa para o mês fechado</div>
      </div>
      <div class="kpi-card ${icmEficProjCls}">
        <div class="kpi-label">ICM Efic. Atual</div>
        <div class="kpi-value" style="color:${d.icmEficAtual>=100?'var(--delta-pos)':'var(--delta-neg)'}">${d.icmEficAtual.toFixed(1)}%</div>
        <div class="kpi-sub">Efic. atual vs. meta</div>
      </div>
      <div class="kpi-card ${d.icmEficProj >= 100 ? 'green' : 'navy'}">
        <div class="kpi-label">ICM Efic. Projetado</div>
        <div class="kpi-value">${d.icmEficProj.toFixed(1)}%</div>
        <div class="kpi-sub">Projeção do mês vs. meta</div>
      </div>
    `;
  } else if (eficEntry) {
    const hasData = eficEntry.eficAtual != null;
    const icmCl   = eficEntry.icmEficAtual != null
      ? (eficEntry.icmEficAtual >= 100 ? 'green' : eficEntry.icmEficAtual >= 85 ? 'gold' : '')
      : '';
    document.getElementById('efic-kpis').innerHTML = `
      ${eficEntry.metaEfic != null ? `
      <div class="kpi-card">
        <div class="kpi-label">Meta Eficiência ${mesLabel}</div>
        <div class="kpi-value">${fmtEfic(eficEntry.metaEfic)}</div>
        <div class="kpi-sub">% recuperado sobre carteira</div>
      </div>` : ''}
      <div class="kpi-card">
        <div class="kpi-label">Eficiência do Mês</div>
        <div class="kpi-value">${fmtEfic(eficEntry.eficAtual)}</div>
        <div class="kpi-sub">Resultado final · ${mesLabel}</div>
      </div>
      ${eficEntry.icmEficAtual != null ? `
      <div class="kpi-card ${icmCl}" style="border-left:3px solid ${icmColor(eficEntry.icmEficAtual)}">
        <div class="kpi-label">ICM Efic. do Mês</div>
        <div class="kpi-value" style="color:${icmColor(eficEntry.icmEficAtual)}">${eficEntry.icmEficAtual.toFixed(1)}%</div>
        <div class="kpi-sub">Eficiência realizada vs. meta</div>
      </div>` : ''}
      <div class="kpi-card gold">
        <div class="kpi-label">Situação</div>
        <div class="kpi-value" style="font-size:1rem; color:#78350F; padding-top:4px">✓ Mês Encerrado</div>
        <div class="kpi-sub">Efic. final: ${fmtEfic(eficEntry.eficAtual)}</div>
      </div>
    `;
  } else {
    document.getElementById('efic-kpis').innerHTML =
      `<div class="kpi-card"><div class="kpi-label">Eficiência ${mesLabel}</div><div class="kpi-value">—</div><div class="kpi-sub">Dados não disponíveis</div></div>`;
  }

  document.querySelectorAll('#tableEficDedicadaBody tr').forEach(tr => {
    tr.classList.toggle('row-selected', tr.dataset.mes === _rgMes);
  });
}

function initResultadoGeral() {
  const d = DATA.resultadoGeral;
  const hist = d.historico;
  _rgMes = hist[hist.length - 1].mes; 
  document.getElementById('rg-mes-filtros').innerHTML =
    '<span class="filter-label">Mês:</span>' +
    hist.map(h => {
      const label  = h.mes.replace('*','');
      const active = h.mes === _rgMes ? ' active' : '';
      return `<button class="filter-btn${active}" data-rgm="${h.mes}" onclick="rgSetMes('${h.mes}')">${label}</button>`;
    }).join('');

  _rgUpdateKPIs();

  new Chart(document.getElementById('chartHistorico'), {
    type: 'bar',
    data: {
      labels: hist.map(h => h.mes),
      datasets: [
        {
          label: 'Realizado',
          data: hist.map(h => h.recuperado),
          backgroundColor: COLORS.blue,
          borderRadius: [0, 0, 4, 4],
          borderSkipped: 'bottom',
          barPercentage: 0.6,
          stack: 'hist'
        },
        {
          label: 'Projeção (complemento)',
          data: hist.map(h => h.mes.includes('*') ? Math.max(0, d.projecaoMes - h.recuperado) : 0),
          backgroundColor: COLORS.blue + '38',
          borderColor: COLORS.blue + '70',
          borderWidth: { top: 1.5, right: 0, bottom: 0, left: 0 },
          borderDash: [4, 3],
          borderRadius: [4, 4, 0, 0],
          borderSkipped: 'bottom',
          barPercentage: 0.6,
          stack: 'hist'
        },
        {
          type: 'line',
          label: 'Meta',
          data: hist.map(h => h.meta),
          borderColor: COLORS.gold,
          borderWidth: 2,
          borderDash: [5,4],
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: COLORS.gold,
          pointBorderWidth: 2,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      ...baseOptions('R$'),
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === 'Projeção (complemento)' && ctx.parsed.y === 0) return null;
              return `${ctx.dataset.label}: ${fmt.brl(ctx.parsed.y)}`;
            },
            footer: items => {
              const comp = items.find(i => i.dataset.label === 'Projeção (complemento)');
              if (!comp || comp.parsed.y === 0) return;
              const real  = items.find(i => i.dataset.label === 'Realizado');
              const total = (real ? real.parsed.y : 0) + comp.parsed.y;
              return `Total projetado: ${fmt.brl(total)}`;
            }
          }
        }
      },
      scales: {
        ...baseOptions().scales,
        y: {
          ...baseOptions().scales.y,
          stacked: true,
          ticks: {
            callback: v => 'R$ ' + (v/1e6).toFixed(1) + 'MM',
            color: '#898781', font: { size: 10 }
          }
        }
      }
    }
  });
  makeLegend('legendHistorico', [
    { type:'bar',  color: COLORS.blue,        label: 'Realizado' },
    { type:'bar',  color: COLORS.blue + '55', label: 'Projeção (mês atual)' },
    { type:'line', color: COLORS.gold,        label: 'Meta', dashed: true }
  ]);

  function fmtEfic(v) { return v != null ? v.toFixed(2).replace('.',',') + '%' : '—'; }
  function fmtIcmEfic(v) {
    if (v == null) return '<td class="td-muted">—</td>';
    const cls = v >= 100 ? 'td-pos' : v >= 85 ? '' : 'td-neg';
    return `<td class="${cls}">${v.toFixed(1)}%</td>`;
  }
  const eficRows = d.eficienciaHistorico;
  document.getElementById('tableEficDedicadaBody').innerHTML = eficRows.map((e, i) => {
    const parcial = e.mes.includes('*');
    const isLast  = i === eficRows.length - 1;
    return `<tr data-mes="${e.mes}" style="${parcial ? 'opacity:.85' : ''}${isLast ? '; font-weight:600' : ''}">
      <td>${e.mes}${parcial ? ' <span style="font-size:.7rem; color:var(--ink-muted); font-weight:400">(parcial)</span>' : ''}</td>
      <td class="td-muted">${fmtEfic(e.metaEfic)}</td>
      <td class="${e.metaEfic != null && e.eficAtual < e.metaEfic ? 'td-neg' : e.metaEfic != null ? 'td-pos' : ''}">${fmtEfic(e.eficAtual)}</td>
      <td class="td-blue">${fmtEfic(e.eficProj)}</td>
      ${fmtIcmEfic(e.icmEficAtual)}
      ${fmtIcmEfic(e.icmEficProj)}
    </tr>`;
  }).join('');

  const eficH = d.eficienciaHistorico;
  new Chart(document.getElementById('chartEficiencia'), {
    type: 'line',
    data: {
      labels: eficH.map(e => e.mes),
      datasets: [
        {
          label: 'Meta Efic.',
          data: eficH.map(e => e.metaEfic),
          borderColor: COLORS.gold,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5,4],
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: COLORS.gold,
          pointBorderWidth: 2,
          tension: 0.3,
          fill: false,
          spanGaps: true
        },
        {
          label: 'Efic. Atual (%)',
          data: eficH.map(e => e.eficAtual),
          borderColor: COLORS.aqua,
          backgroundColor: COLORS.aqua + '18',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: COLORS.aqua,
          pointBorderWidth: 2,
          tension: 0.35,
          fill: true
        },
        {
          label: 'Efic. Projetada',
          data: eficH.map(e => (e.mes.includes('*') ? e.eficProj : null)),
          borderColor: COLORS.blue,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [3,3],
          pointRadius: 5,
          pointStyle: 'circle',
          pointBackgroundColor: COLORS.blue,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0,
          fill: false,
          spanGaps: false
        }
      ]
    },
    options: {
      ...baseOptions('%'),
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2).replace('.',',')}%` }
        }
      },
      scales: {
        ...baseOptions().scales,
        y: {
          ...baseOptions().scales.y,
          ticks: { callback: v => v.toFixed(1) + '%', color: '#898781', font: { size: 10 } }
        }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════
// TAB 2 — PRODUÇÃO POR DU
// ══════════════════════════════════════════════════════════════
const _PDU_MESES = {
  'Janeiro':1,'Fevereiro':2,'Março':3,'Abril':4,'Maio':5,'Junho':6,
  'Julho':7,'Agosto':8,'Setembro':9,'Outubro':10,'Novembro':11,'Dezembro':12
};
function _pduDiaSemana(mesNome, dia) {
  const parts = mesNome.trim().split(/\s+/);
  const mes   = _PDU_MESES[parts[0]] || 1;
  const ano   = parseInt(parts[1]) || new Date().getFullYear();
  return new Date(ano, mes - 1, dia).getDay();
}
function _pduIsWeekday(mesNome, dia) {
  const d = _pduDiaSemana(mesNome, dia);
  return d >= 1 && d <= 5;
}

let _pduMes     = null;
let _pduCompMes = null;
let _pduChartMes = null;
let _pduChartCmp = null;
let _pduChart1   = null;
let _pduChart2   = null;

function pduSetMes(mes) {
  _pduMes = mes;
  document.querySelectorAll('[data-pdum]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.pdum === mes)
  );
  _pduUpdateMes();
}

function pduSetComp(mes) {
  _pduCompMes = (mes === 'none') ? null : mes;
  document.querySelectorAll('[data-pduc]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.pduc === mes)
  );
  const entry = DATA.producaoPorDU.meses[_pduMes];
  if (!entry) return;
  const compEntry = _pduCompMes ? DATA.producaoPorDU.meses[_pduCompMes] : null;
  _pduRenderTabela(entry.dados, compEntry ? compEntry.dados : null, entry.totalDUs, entry.nome, compEntry ? compEntry.nome : null, !!entry.emAndamento);
}

function _pduBuildCompFilter() {
  const container = document.getElementById('pdu-comp-filtros');
  if (!container) return;
  const available = Object.keys(DATA.producaoPorDU.meses).filter(m => m !== _pduMes);
  if (available.length === 0) { container.style.display = 'none'; _pduCompMes = null; return; }
  container.style.display = '';
  if (!_pduCompMes || !available.includes(_pduCompMes)) _pduCompMes = null;
  const opts = ['none', ...available];
  container.innerHTML = '<span class="filter-label">Comparar com:</span>' +
    opts.map(m => {
      const isActive = (m === 'none' && !_pduCompMes) || (m !== 'none' && m === _pduCompMes);
      const label = m === 'none' ? 'Nenhum' : m.replace('*', '');
      return `<button class="filter-btn${isActive ? ' active' : ''}" data-pduc="${m}" onclick="pduSetComp('${m}')">${label}</button>`;
    }).join('');
}

function pduChartSetMes(mes) {
  _pduChartMes = mes;
  document.querySelectorAll('[data-pducm]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.pducm === mes)
  );
  _pduBuildChartCompFilter();
  _pduUpdateChart();
}

function pduChartSetComp(mes) {
  _pduChartCmp = (mes === 'none') ? null : mes;
  document.querySelectorAll('[data-pducc]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.pducc === mes)
  );
  _pduUpdateChart();
}

function _pduBuildChartCompFilter() {
  const container = document.getElementById('pdu-chart-comp-filtros');
  if (!container) return;
  const available = Object.keys(DATA.producaoPorDU.meses).filter(m => m !== _pduChartMes);
  if (available.length === 0) { container.style.display = 'none'; _pduChartCmp = null; return; }
  container.style.display = '';
  if (!_pduChartCmp || !available.includes(_pduChartCmp)) {
    _pduChartCmp = available[available.length - 1];
  }
  const opts = ['none', ...available];
  container.innerHTML = '<span class="filter-label">Comparar com:</span>' +
    opts.map(m => {
      const isActive = (m === 'none' && !_pduChartCmp) || (m !== 'none' && m === _pduChartCmp);
      const label = m === 'none' ? 'Nenhum' : m.replace('*', '');
      return `<button class="filter-btn${isActive ? ' active' : ''}" data-pducc="${m}" onclick="pduChartSetComp('${m}')">${label}</button>`;
    }).join('');
}

function _pduUpdateChart() {
  const meses    = DATA.producaoPorDU.meses;
  const entry    = meses[_pduChartMes];
  if (!entry) return;
  const compEntry = _pduChartCmp ? meses[_pduChartCmp] : null;
  _pduRenderCharts(entry.dados, compEntry ? compEntry.dados : null, entry.nome, compEntry ? compEntry.nome : null);
}

function _pduUpdateMes() {
  const meses  = DATA.producaoPorDU.meses;
  const detail = document.getElementById('pdu-detail-wrap');
  const note   = document.getElementById('pdu-hist-note');
  const entry  = meses[_pduMes];

  if (entry) {
    note.style.display   = 'none';
    detail.style.display = '';

    const serie    = entry.dados;
    const mesNome  = entry.nome;
    const totalDUs = entry.totalDUs;
    const aberta   = !!entry.emAndamento;

    _pduBuildCompFilter();

    const compEntry = _pduCompMes ? meses[_pduCompMes] : null;
    const serieRef  = compEntry ? compEntry.dados : null;
    const mesRef    = compEntry ? compEntry.nome  : null;

    const totSerie  = serie.reduce((s,x) => s+x.val, 0);

    const serieUtil = serie.filter(item => _pduIsWeekday(mesNome, item.du));
    const media     = serieUtil.length > 0 ? serieUtil.reduce((s,x)=>s+x.val,0)/serieUtil.length : 0;
    const proj      = Math.round(media * totalDUs);
    const totRef    = serieRef ? serieRef.slice(0, serie.length).reduce((s,x) => s+x.val, 0) : null;
    const varAcum   = totRef && totRef > 0 ? (totSerie / totRef - 1) * 100 : null;

    document.getElementById('pdu-subtitle').textContent =
      aberta
        ? `${mesNome} · ${serie.length} de ${totalDUs} DUs — produção diária (R$)${mesRef ? ' vs. ' + mesRef : ''}`
        : `${mesNome} · ${serie.length} DUs — mês encerrado`;

    document.getElementById('pdu-kpis').innerHTML = `
      <div class="kpi-card navy">
        <div class="kpi-label">Média por DU</div>
        <div class="kpi-value">${fmt.brl(Math.round(media))}</div>
        <div class="kpi-sub">${serieUtil.length} dias úteis de ${serie.length} dias</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Produzido Acum. (${serie.length} DUs)</div>
        <div class="kpi-value">${fmt.brl(totSerie)}</div>
        <div class="kpi-sub">${mesNome}</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">${aberta ? 'Projeção Linear do Mês' : 'Total do Mês'}</div>
        <div class="kpi-value">${fmt.brl(aberta ? proj : totSerie)}</div>
        <div class="kpi-sub">${aberta ? `${totalDUs} DUs × média atual` : 'Mês encerrado'}</div>
      </div>
      ${varAcum != null ? `
      <div class="kpi-card gold">
        <div class="kpi-label">Comp. Acum. vs. ${mesRef}</div>
        <div class="kpi-value">
          <span style="color:${varAcum>=0?'var(--delta-pos)':'var(--delta-neg)'}">${varAcum>=0?'+':''}${Math.abs(varAcum).toFixed(1)}%</span>
        </div>
        <div class="kpi-sub">mesmos ${serie.length} DUs comparados</div>
      </div>` : ''}
    `;

    const thRef = document.getElementById('pdu-th-ref');
    if (thRef) thRef.textContent = mesRef ? `Acum. ${mesRef} (R$)` : 'Ref. (R$)';

    _pduRenderTabela(serie, serieRef, totalDUs, mesNome, mesRef, aberta);

  } else {
    detail.style.display = 'none';
    note.style.display   = '';
    document.getElementById('pdu-comp-filtros').style.display = 'none';
    document.getElementById('pdu-chart-comp-filtros').style.display = 'none';
    const mesesComDU = Object.keys(DATA.producaoPorDU.meses).map(m => m.replace('*','')).join(' e ');
    note.innerHTML = `<strong>ℹ️ Detalhamento por DU disponível apenas para: ${mesesComDU}.</strong><br>
      Selecione um desses meses para ver a tabela de produção por DU.`;
    document.getElementById('pdu-subtitle').textContent =
      `${(_pduMes||'').replace('*','')} — sem dados de produção por DU disponíveis`;
    document.getElementById('pdu-kpis').innerHTML = '';
  }
}

function _pduRenderTabela(serie, serieRef, totalDUs, mesNome, mesRefNome, aberta) {
  document.getElementById('pdu-table-title').textContent = 'Detalhe por DU — ' + mesNome;
  let acum = 0, acumRef = 0, rows = '';
  serie.forEach((item, idx) => {
    acum += item.val;
    const ref = serieRef ? serieRef[idx] : null;
    if (ref) acumRef += ref.val;
    const refAcum = ref ? acumRef : null;
    const varVal  = refAcum != null ? acum - refAcum : null;
    const varPct  = refAcum != null && refAcum > 0 ? (acum / refAcum - 1) * 100 : null;
    rows += `<tr>
      <td>Dia ${item.du}</td>
      <td>${fmt.brl(item.val)}</td>
      <td style="font-weight:600">${fmt.brl(acum)}</td>
      <td class="td-muted">${refAcum != null ? fmt.brl(refAcum) : '—'}</td>
      <td class="${varVal == null ? '' : varVal >= 0 ? 'td-pos' : 'td-neg'}">${varVal == null ? '—' : (varVal >= 0 ? '+' : '') + fmt.brl(Math.round(Math.abs(varVal)))}</td>
      <td class="${varPct == null ? '' : varPct >= 0 ? 'td-pos' : 'td-neg'}">${varPct == null ? '—' : (varPct >= 0 ? '+' : '') + Math.abs(varPct).toFixed(1) + '%'}</td>
    </tr>`;
  });
  document.getElementById('tablePDUBody').innerHTML = rows;

  const totSerie   = serie.reduce((s,x) => s+x.val, 0);
  const diasDec    = serie.length;
  const utilDec    = serie.filter(item => _pduIsWeekday(mesNome, item.du));
  const media      = utilDec.length > 0 ? utilDec.reduce((s,x)=>s+x.val,0)/utilDec.length : 0;
  const proj       = Math.round(media * totalDUs);
  const melhorDU   = serie.reduce((a,b) => b.val > a.val ? b : a);
  const piorDU     = serie.reduce((a,b) => b.val < a.val ? b : a);
  const totRef     = serieRef ? serieRef.slice(0, diasDec).reduce((s,x) => s+x.val, 0) : null;
  const varComp    = totRef && totRef > 0 ? (totSerie / totRef - 1) * 100 : null;
  document.getElementById('pdu-insight').innerHTML = `
    <div>
      <div class="insight-title">Análise do Período</div>
      <p class="insight-text">
        Em <strong>${diasDec} dias</strong> de <strong>${mesNome}</strong> (${utilDec.length} DUs), foram produzidos
        <strong>${fmt.brl(totSerie)}</strong>${varComp != null
          ? ` — <span style="color:${varComp>=0?'var(--delta-pos)':'var(--delta-neg)'}; font-weight:600">${varComp>=0?'+':''}${Math.abs(varComp).toFixed(1)}%</span>
          vs. mesmos ${diasDec} dias de ${mesRefNome} (${fmt.brl(totRef)}).`
          : `.`}
      </p>
      <p class="insight-text" style="margin-top:8px">
        Melhor dia: <strong>Dia ${melhorDU.du}</strong> com ${fmt.brl(melhorDU.val)}.
        Dia mais fraco: <strong>Dia ${piorDU.du}</strong> com ${fmt.brl(piorDU.val)}.
      </p>
    </div>
    <div class="insight-ref">
      <div class="insight-ref-label">Média por DU</div>
      <div class="insight-ref-val">${fmt.brl(Math.round(media))}</div>
      <div class="insight-ref-sub">${utilDec.length} DUs no período</div>
    </div>
    <div class="insight-ref">
      <div class="insight-ref-label">${aberta ? 'Projeção Linear' : 'Total do Mês'}</div>
      <div class="insight-ref-val">${fmt.brl(aberta ? proj : totSerie)}</div>
      <div class="insight-ref-sub">${aberta ? `${totalDUs} DUs × média` : 'Mês encerrado'}</div>
    </div>
  `;
}

function _pduRenderCharts(serie, serieRef, mesNome, mesRefNome) {
  if (_pduChart1) { _pduChart1.destroy(); _pduChart1 = null; }
  if (_pduChart2) { _pduChart2.destroy(); _pduChart2 = null; }

  const allDUs = Array.from({length: Math.max(serie.length, serieRef ? serieRef.length : 0)}, (_,i) => i+1);
  const brlTick = { callback: v => fmt.brl(v), color:'#898781', font:{size:10} };

  const ds1 = [
    { label: mesNome, data: allDUs.map(du => { const f=serie.find(x=>x.du===du); return f?f.val:null; }),
      backgroundColor: COLORS.blue, borderRadius:3, borderSkipped:'bottom', barPercentage:0.75, categoryPercentage:0.8 }
  ];
  if (serieRef && mesRefNome) ds1.push({
    label: mesRefNome, data: allDUs.map(du => { const f=serieRef.find(x=>x.du===du); return f?f.val:null; }),
    backgroundColor: COLORS.blue+'45', borderRadius:3, borderSkipped:'bottom', barPercentage:0.75, categoryPercentage:0.8
  });

  document.getElementById('pdu-chart-bar-title').textContent = 'Produção Diária — Comparativo Mensal';

  _pduChart1 = new Chart(document.getElementById('chartProducao'), {
    type: 'bar',
    data: { labels: allDUs.map(du=>'Dia '+du), datasets: ds1 },
    options: { ...baseOptions(), scales: { ...baseOptions().scales, y: { ...baseOptions().scales.y, ticks: brlTick } } }
  });
  const legendItems = [{ type:'bar', color:COLORS.blue, label:mesNome }];
  if (serieRef && mesRefNome) legendItems.push({ type:'bar', color:COLORS.blue+'45', label:mesRefNome });
  makeLegend('legendProducao', legendItems);

  document.getElementById('pdu-chart-acum-title').textContent = 'Produção Acumulada — Comparativo Mensal';

  const acumSerie = [], acumRef2 = [];
  let sa = 0, sb = 0;
  for (const du of allDUs) {
    const fa = serie.find(x=>x.du===du);             if(fa) sa+=fa.val;
    const fb = serieRef ? serieRef.find(x=>x.du===du) : null; if(fb) sb+=fb.val;
    acumSerie.push(fa?sa:null);
    acumRef2.push(fb?sb:null);
  }
  const ds2 = [
    { label:mesNome, data:acumSerie, borderColor:COLORS.blue, borderWidth:2, pointRadius:3, fill:false, tension:0.3, spanGaps:false }
  ];
  if (serieRef && mesRefNome) ds2.push({
    label:mesRefNome, data:acumRef2, borderColor:COLORS.green, borderWidth:2, pointRadius:3, fill:false, tension:0.3, borderDash:[5,4], spanGaps:false
  });
  _pduChart2 = new Chart(document.getElementById('chartProducaoAcum'), {
    type:'line',
    data:{ labels:allDUs.map(du=>'Dia '+du), datasets:ds2 },
    options:{ ...baseOptions(), scales:{ ...baseOptions().scales, y:{ ...baseOptions().scales.y, ticks:brlTick } } }
  });
}

function initProducaoDU() {
  const hist = DATA.resultadoGeral.historico;
  const mesesComDU = new Set(Object.keys(DATA.producaoPorDU.meses));
  const ultComDU   = [...mesesComDU].pop();

  _pduMes      = ultComDU;
  _pduCompMes  = null;
  _pduChartMes = ultComDU;
  _pduChartCmp = null;

  document.getElementById('pdu-mes-filtros').innerHTML =
    '<span class="filter-label">Mês:</span>' +
    hist.map(h => {
      const label  = h.mes.replace('*','');
      const active = h.mes === _pduMes ? ' active' : '';
      return `<button class="filter-btn${active}" data-pdum="${h.mes}" onclick="pduSetMes('${h.mes}')">${label}</button>`;
    }).join('');

  const mesesDU = Object.keys(DATA.producaoPorDU.meses);
  document.getElementById('pdu-chart-mes-filtros').innerHTML =
    '<span class="filter-label">Mês:</span>' +
    mesesDU.map(m => {
      const label  = m.replace('*','');
      const active = m === _pduChartMes ? ' active' : '';
      return `<button class="filter-btn${active}" data-pducm="${m}" onclick="pduChartSetMes('${m}')">${label}</button>`;
    }).join('');

  _pduUpdateMes();
  _pduBuildChartCompFilter();
  _pduUpdateChart();
}

// ══════════════════════════════════════════════════════════════
// TAB 3 — RECUPERAÇÃO POR DU
// ══════════════════════════════════════════════════════════════
let _rduMes     = null;
let _rduCompMes = null;
let _rduDuData  = {};
let _rduChart1  = null;
let _rduChart2  = null;

function rduSetMes(mes) {
  _rduMes = mes;
  document.querySelectorAll('[data-rdum]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.rdum === mes)
  );
  _rduUpdateMes();
}

function rduSetComp(mes) {
  _rduCompMes = (mes === 'none') ? null : mes;
  document.querySelectorAll('[data-rduc]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.rduc === mes)
  );
  const d = DATA.recuperacaoPorDU;
  const isJul   = _rduMes && _rduMes.includes('Jul');
  const serie   = isJul ? d.mesAtual : d.mesAnterior;
  const mesNome = isJul ? DATA.meta.mesReferencia : DATA.meta.mesAnterior;
  _rduRenderCharts(serie, mesNome);
}

function _rduBuildCompFilter() {
  const container = document.getElementById('rdu-comp-filter');
  if (!container) return;
  const available = Object.keys(_rduDuData).filter(m => m !== _rduMes);
  if (available.length === 0) {
    container.style.display = 'none';
    _rduCompMes = null;
    return;
  }
  container.style.display = '';
  if (!_rduCompMes || !available.includes(_rduCompMes)) {
    _rduCompMes = available[0];
  }
  const opts = ['none', ...available];
  container.innerHTML = '<span class="filter-label">Comparar com:</span>' +
    opts.map(m => {
      const isActive = (m === 'none' && !_rduCompMes) || (m !== 'none' && m === _rduCompMes);
      const label = m === 'none' ? 'Nenhum' : m.replace('*', '');
      return `<button class="filter-btn${isActive ? ' active' : ''}" data-rduc="${m}" onclick="rduSetComp('${m}')">${label}</button>`;
    }).join('');
}

function _rduUpdateMes() {
  const d       = DATA.recuperacaoPorDU;
  const hist    = DATA.resultadoGeral.historico;
  const detail  = document.getElementById('rdu-detail-wrap');
  const note    = document.getElementById('rdu-hist-note');
  const isJul   = _rduMes && _rduMes.includes('Jul');
  const isJun   = _rduMes && _rduMes.includes('Jun');
  const hasDU   = isJul || isJun;

  if (hasDU) {
    note.style.display   = 'none';
    detail.style.display = '';
    const serie    = isJul ? d.mesAtual    : d.mesAnterior;
    const serieRef = isJul ? d.mesAnterior : null;
    const mesNome  = isJul ? DATA.meta.mesReferencia : DATA.meta.mesAnterior;
    const mesRef   = isJul ? DATA.meta.mesAnterior   : null;
    const metaMes  = isJul
      ? d.metaMensal
      : (hist.find(h => h.mes === 'Jun/26')?.meta || d.metaMensal);
    const totalDUs = isJul ? d.totalDUs : serie.length;

    document.getElementById('rdu-subtitle').textContent =
      isJul
        ? `${mesNome} (${serie.length} de ${totalDUs} DUs) · Meta: ${fmt.brl(metaMes)}`
        : `${mesNome} · ${serie.length} DUs · Meta: ${fmt.brl(metaMes)}`;

    const totSerie = serie.reduce((s,x) => s+x.val, 0);
    const media    = totSerie / serie.length;
    const proj     = Math.round(media * totalDUs);
    const icmProj  = metaMes > 0 ? proj / metaMes * 100 : 0;
    const totRef   = serieRef ? serieRef.slice(0, serie.length).reduce((s,x) => s+x.val, 0) : null;
    document.getElementById('rdu-kpis').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-label">Meta do Mês</div>
        <div class="kpi-value">${fmt.brl(metaMes)}</div>
        <div class="kpi-sub">Meta/DU: ${fmt.brl(metaMes / totalDUs)}</div>
      </div>
      <div class="kpi-card navy">
        <div class="kpi-label">Realizado Acum. (${serie.length} DUs)</div>
        <div class="kpi-value">${fmt.brl(totSerie)}</div>
        <div class="kpi-sub">${fmt.pct(totSerie / metaMes * 100)} da meta mensal</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(totSerie/metaMes*100,100)}%"></div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Média por DU</div>
        <div class="kpi-value">${fmt.brl(media)}</div>
        <div class="kpi-sub">Meta/DU necessária: ${fmt.brl(metaMes / totalDUs)}</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">${isJul ? 'Recuperação Projetada' : 'Recuperado no Mês'}</div>
        <div class="kpi-value">${fmt.brl(isJul ? proj : totSerie)}</div>
        <div class="kpi-sub">${isJul ? `base: ritmo atual × ${totalDUs} DUs` : 'Mês encerrado'}</div>
      </div>
      <div class="kpi-card ${icmProj>=100?'green':'gold'}">
        <div class="kpi-label">${isJul ? 'ICM Projetado' : 'ICM Realizado'}</div>
        <div class="kpi-value">${fmt.pct(isJul ? icmProj : totSerie/metaMes*100)}</div>
        <div class="kpi-sub">${totRef != null
          ? `vs. ${mesRef} (${serie.length} DUs): ${totRef>0?(totSerie/totRef-1)*100>=0?'+':''+(((totSerie/totRef-1)*100).toFixed(1))+'%':'—'}`
          : 'Sem comparativo por DU disponível'}</div>
      </div>
    `;

    _rduRenderTabela(serie, serieRef, metaMes, totalDUs, mesNome, mesRef);
    _rduBuildCompFilter();
    _rduRenderCharts(serie, mesNome);

  } else {
    detail.style.display = 'none';
    note.style.display   = '';
    const h = hist.find(x => x.mes === _rduMes);
    if (!h) return;
    const mesLabel = h.mes.replace('*','');
    note.innerHTML = `<strong>ℹ️ Detalhamento por DU disponível apenas para ${DATA.meta.mesReferencia} e ${DATA.meta.mesAnterior}.</strong><br>
      Selecione <strong>Jun/26</strong> ou <strong>Jul/26</strong> para ver a tabela de DUs.`;
    document.getElementById('rdu-subtitle').textContent =
      `${mesLabel} — resultado total do mês encerrado`;
    const icm    = h.recuperado / h.meta * 100;
    const delta  = h.recuperado - h.meta;
    document.getElementById('rdu-kpis').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-label">Meta do Mês</div>
        <div class="kpi-value">${fmt.brl(h.meta)}</div>
        <div class="kpi-sub">Mês encerrado</div>
      </div>
      <div class="kpi-card navy">
        <div class="kpi-label">Recuperado — ${mesLabel}</div>
        <div class="kpi-value">${fmt.brl(h.recuperado)}</div>
        <div class="kpi-sub">${fmt.pct(icm)} da meta mensal</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(icm,100)}%"></div></div>
      </div>
      <div class="kpi-card ${icm>=100?'green':'gold'}">
        <div class="kpi-label">ICM Realizado</div>
        <div class="kpi-value">${fmt.pct(icm)}</div>
        <div class="kpi-sub">${icm >= 100 ? 'Acima da meta' : 'Abaixo da meta'}</div>
      </div>
      <div class="kpi-card ${delta>=0?'blue':''}">
        <div class="kpi-label">Δ s/ Meta</div>
        <div class="kpi-value" style="color:${delta>=0?'var(--delta-pos)':'var(--delta-neg)'}">${delta>=0?'+':''}${fmt.brl(delta)}</div>
        <div class="kpi-sub">Mês encerrado</div>
      </div>
    `;
  }
}

function _rduRenderTabela(serie, serieRef, meta, totalDUs, mesNome, mesRefNome) {
  document.getElementById('rdu-table-title').textContent = 'Detalhe por DU — ' + mesNome;
  let acum = 0, acumRef = 0, rows = '';
  serie.forEach((item, idx) => {
    acum += item.val;
    const ref = serieRef ? serieRef[idx] : null;
    if (ref) acumRef += ref.val;
    const refAcum = ref ? acumRef : null;
    const compPct = refAcum && refAcum > 0 ? (acum / refAcum - 1) * 100 : null;
    const proj    = Math.round((acum / (idx + 1)) * totalDUs);
    const icm     = meta > 0 ? proj / meta * 100 : 0;
    const dotCls  = icm >= 100 ? 'dot-g' : icm >= 90 ? 'dot-y' : 'dot-r';
    const dotColor= icm >= 100 ? 'var(--delta-pos)' : icm >= 90 ? '#eda100' : 'var(--delta-neg)';
    const compCell= compPct == null
      ? '<span class="td-muted">—</span>'
      : `<span class="${compPct >= 0 ? 'td-pos' : 'td-neg'}">${compPct >= 0 ? '+' : ''}${Math.abs(compPct).toFixed(1)}%</span>`;
    rows += `<tr>
      <td>DU ${item.du}</td>
      <td>${fmt.brl(item.val)}</td>
      <td style="font-weight:600">${fmt.brl(acum)}</td>
      <td>${compCell}</td>
      <td class="td-muted">${fmt.brl(proj)}</td>
      <td class="${dotCls}" style="color:${dotColor}">${icm.toFixed(1)}%</td>
    </tr>`;
  });
  document.getElementById('tableRDUBody').innerHTML = rows;

  const totSerie = serie.reduce((s,x) => s+x.val, 0);
  const dusDec   = serie.length;
  const media    = totSerie / dusDec;
  const proj     = Math.round(media * totalDUs);
  const icmProj  = meta > 0 ? proj / meta * 100 : 0;
  const melhorDU = serie.reduce((a,b) => b.val > a.val ? b : a);
  const piorDU   = serie.reduce((a,b) => b.val < a.val ? b : a);
  const icmCor   = icmProj >= 100 ? 'var(--delta-pos)' : icmProj >= 90 ? '#eda100' : 'var(--delta-neg)';
  const totRef   = serieRef ? serieRef.slice(0, dusDec).reduce((s,x) => s+x.val, 0) : null;
  const varComp  = totRef && totRef > 0 ? (totSerie / totRef - 1) * 100 : null;

  document.getElementById('rdu-insight').innerHTML = `
    <div>
      <div class="insight-title">Análise do Período</div>
      <p class="insight-text">
        Em <strong>${dusDec} DUs</strong> de <strong>${mesNome}</strong>, foram recuperados
        <strong>${fmt.brl(totSerie)}</strong>${varComp != null
          ? ` — <span style="color:${varComp>=0?'var(--delta-pos)':'var(--delta-neg)'}; font-weight:600">${varComp>=0?'+':''}${Math.abs(varComp).toFixed(1)}%</span>
        vs. mesmos ${dusDec} DUs de ${mesRefNome} (${fmt.brl(totRef)}).`
          : `.`}
      </p>
      <p class="insight-text" style="margin-top:8px">
        Melhor dia: <strong>DU ${melhorDU.du}</strong> com ${fmt.brl(melhorDU.val)}.
        Dia mais fraco: <strong>DU ${piorDU.du}</strong> com ${fmt.brl(piorDU.val)}.
      </p>
    </div>
    <div class="insight-ref">
      <div class="insight-ref-label">Média por DU</div>
      <div class="insight-ref-val">${fmt.brl(media)}</div>
      <div class="insight-ref-sub">vs. meta/DU: ${fmt.brl(meta / totalDUs)}</div>
    </div>
    <div class="insight-ref">
      <div class="insight-ref-label">${_rduMes && _rduMes.includes('Jul') ? 'Rec. Projetada' : 'Rec. Realizada'}</div>
      <div class="insight-ref-val">${fmt.brl(_rduMes && _rduMes.includes('Jul') ? proj : totSerie)}</div>
      <div class="insight-ref-sub">
        ICM: <span style="color:${icmCor}; font-weight:700">${(_rduMes && _rduMes.includes('Jul') ? icmProj : totSerie/meta*100).toFixed(1)}%</span>
      </div>
    </div>
  `;
}

function _rduRenderCharts(serie, mesNome) {
  if (_rduChart1) { _rduChart1.destroy(); _rduChart1 = null; }
  if (_rduChart2) { _rduChart2.destroy(); _rduChart2 = null; }

  const d = DATA.recuperacaoPorDU;
  const allDUs = Array.from({length: d.totalDUs}, (_, i) => i + 1);
  const serieRef   = _rduCompMes ? _rduDuData[_rduCompMes] : null;
  const mesRefNome = _rduCompMes ? _rduCompMes.replace('*', '') : null;

  const mesNomeShort = mesNome.replace(' 2026','').replace(' 2025','');
  const datasets1 = [
    { label: mesNomeShort, data: allDUs.map(du => { const f=serie.find(x=>x.du===du); return f?f.val:null; }),
      backgroundColor: COLORS.blue, borderRadius:3, borderSkipped:'bottom', barPercentage:0.75, categoryPercentage:0.8 }
  ];
  if (serieRef && mesRefNome) {
    datasets1.push({
      label: mesRefNome,
      data: allDUs.map(du => { const f=serieRef.find(x=>x.du===du); return f?f.val:null; }),
      backgroundColor: COLORS.blue+'45', borderRadius:3, borderSkipped:'bottom', barPercentage:0.75, categoryPercentage:0.8
    });
  }

  const barTitle = serieRef
    ? `Recuperação por DU — ${mesNomeShort} vs. ${mesRefNome}`
    : `Recuperação por DU — ${mesNomeShort}`;
  const barTitleEl = document.getElementById('rdu-chart-bar-title');
  if (barTitleEl) barTitleEl.textContent = barTitle;

  _rduChart1 = new Chart(document.getElementById('chartRecupDU'), {
    type: 'bar',
    data: { labels: allDUs.map(du => 'DU '+du), datasets: datasets1 },
    options: {
      ...baseOptions(),
      plugins: { ...baseOptions().plugins, tooltip: { ...baseOptions().plugins.tooltip, callbacks: { label: ctx => ctx.parsed.y != null ? `${ctx.dataset.label}: ${fmt.brl(ctx.parsed.y)}` : null } } },
      scales: { ...baseOptions().scales, y: { ...baseOptions().scales.y, ticks:{ callback: v=>fmt.brl(v), color:'#898781', font:{size:10} } } }
    }
  });

  const legendItems = [{ type:'bar', color:COLORS.blue, label: mesNomeShort }];
  if (serieRef && mesRefNome) legendItems.push({ type:'bar', color:COLORS.blue+'45', label: mesRefNome });
  makeLegend('legendRecupDU', legendItems);

  document.getElementById('rdu-chart-acum-title').textContent =
    serieRef ? `Recuperação Acumulada — ${mesNomeShort} vs. ${mesRefNome}` : `Recuperação Acumulada — ${mesNomeShort}`;

  const acumSerie = [], acumRef = [];
  let sa = 0, sb = 0;
  for (const du of allDUs) {
    const fa = serie.find(x=>x.du===du);
    const fb = serieRef ? serieRef.find(x=>x.du===du) : null;
    if (fa) sa += fa.val;
    if (fb) sb += fb.val;
    acumSerie.push(fa ? sa : null);
    acumRef.push(fb ? sb : null);
  }
  const datasets2 = [
    { label: mesNomeShort, data: acumSerie, borderColor: COLORS.blue, borderWidth:2, pointRadius:3, fill:false, tension:0.3, spanGaps:false }
  ];
  if (serieRef && mesRefNome) {
    datasets2.push({ label: mesRefNome, data: acumRef, borderColor: COLORS.green, borderWidth:2, pointRadius:3, fill:false, tension:0.3, borderDash:[5,4], spanGaps:false });
  }
  _rduChart2 = new Chart(document.getElementById('chartRecupAcum'), {
    type: 'line',
    data: { labels: allDUs.map(du=>'DU '+du), datasets: datasets2 },
    options: {
      ...baseOptions(),
      plugins: { ...baseOptions().plugins, tooltip: { ...baseOptions().plugins.tooltip, callbacks: { label: ctx => ctx.parsed.y != null ? `${ctx.dataset.label}: ${fmt.brl(ctx.parsed.y)}` : null } } },
      scales: { ...baseOptions().scales, y: { ...baseOptions().scales.y, ticks:{ callback: v=>fmt.brl(v), color:'#898781', font:{size:10} } } }
    }
  });
}

function initRecupDU() {
  const d    = DATA.recuperacaoPorDU;
  const hist = DATA.resultadoGeral.historico;

  _rduDuData = {};
  const parcialH   = hist.find(h => h.mes.includes('*'));
  const anteriorH  = hist.length >= 2 ? hist[hist.length - 2] : null;
  if (parcialH  && d.mesAtual)    _rduDuData[parcialH.mes]   = d.mesAtual;
  if (anteriorH && d.mesAnterior) _rduDuData[anteriorH.mes]  = d.mesAnterior;

  const mesesRDU = hist.slice(-5);
  _rduMes = mesesRDU[mesesRDU.length - 1].mes; 
  document.getElementById('rdu-mes-filtros').innerHTML =
    '<span class="filter-label">Mês:</span>' +
    mesesRDU.map(h => {
      const label  = h.mes.replace('*','');
      const active = h.mes === _rduMes ? ' active' : '';
      return `<button class="filter-btn${active}" data-rdum="${h.mes}" onclick="rduSetMes('${h.mes}')">${label}</button>`;
    }).join('');

  _rduUpdateMes();
}

// ══════════════════════════════════════════════════════════════
// TAB 4 — CARTEIRA & FASES
// ══════════════════════════════════════════════════════════════
let _cfVista = 'ambos';
let _cfDonutChart  = null;
let _cfEvolChart   = null;
let _cfResMes = null;

function cfSetMes(mes) {
  _cfResMes = mes;
  document.querySelectorAll('[data-cfm]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cfm === mes);
  });
  _cfUpdateCarteiraMes();
  _cfUpdateTabela();
  _cfRenderResultado();
}

function _cfUpdateCarteiraMes() {
  const d   = DATA.carteiraFases;
  const rg  = DATA.resultadoGeral;

  const mesRaw = _cfResMes || '';
  const mesKey = mesRaw.replace(/\/26\*?/, '').trim() || 'Jul';
  const isJul  = mesKey === 'Jul';

  const subtitleEl = document.getElementById('cf-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = isJul
      ? `Carteira ativa total e distribuição pré/pós prejuízo — ${DATA.meta.mesReferencia}`
      : `Carteira e resultado referentes a ${mesKey}/26 — faixas refletem posição atual`;
  }

  const resTit = document.getElementById('cf-res-titulo');
  const resSub = document.getElementById('cf-res-subtitulo');
  if (resTit) resTit.textContent = `Resultado de Recuperação — ${mesRaw.replace('*','')}`;
  if (resSub) resSub.textContent = isJul
    ? 'Mês em andamento: parcial atual + projeção do mês completo'
    : 'Resultado final do mês encerrado';

  if (isJul) {
    const varPre = d.preJuizo.variacao, varPos = d.posJuizo.variacao;
    document.getElementById('cf-kpis').innerHTML = `
      <div class="kpi-card navy">
        <div class="kpi-label">Carteira Total</div>
        <div class="kpi-value">${fmt.brl(d.totalCarteira)}</div>
        <div class="kpi-sub">Base para recuperação</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">Pré-Prejuízo (≤ 180 dias)</div>
        <div class="kpi-value">${fmt.brl(d.preJuizo.valor)}</div>
        <div class="kpi-sub">
          ${fmt.pct(d.preJuizo.percentual)} da carteira · Taxa: ${fmt.pct(d.preJuizo.taxaRec)}
          &nbsp;<span class="kpi-delta ${varPre>0?'pos':'neg'}">${fmt.deltaSign(varPre)}${Math.abs(varPre).toFixed(1)}%</span>
        </div>
      </div>
      <div class="kpi-card gold">
        <div class="kpi-label">Pós-Prejuízo (&gt; 180 dias)</div>
        <div class="kpi-value">${fmt.brl(d.posJuizo.valor)}</div>
        <div class="kpi-sub">
          ${fmt.pct(d.posJuizo.percentual)} da carteira · Taxa: ${fmt.pct(d.posJuizo.taxaRec)}
          &nbsp;<span class="kpi-delta ${varPos>0?'pos':'neg'}">${fmt.deltaSign(varPos)}${Math.abs(varPos).toFixed(1)}%</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Projeção Recuperação Mês</div>
        <div class="kpi-value">${fmt.brl(d.projecaoRecuperacao)}</div>
        <div class="kpi-sub">${fmt.pct(d.projecaoRecuperacao/d.totalCarteira*100)} da carteira</div>
      </div>
    `;
  } else {
    const evEntry  = d.evolucao.find(e => e.mes === mesKey);
    const hEntry   = rg.historico.find(h => h.mes === _cfResMes);
    const total    = evEntry ? evEntry.pre + evEntry.pos : null;
    const recup    = hEntry  ? hEntry.recuperado : null;
    const meta     = hEntry  ? hEntry.meta       : null;
    const icmRec   = (recup != null && meta != null && meta > 0) ? recup / meta * 100 : null;
    const icmCls   = icmRec != null ? (icmRec >= 100 ? 'green' : icmRec >= 85 ? 'gold' : '') : '';

    document.getElementById('cf-kpis').innerHTML = `
      <div class="kpi-card navy">
        <div class="kpi-label">Carteira Total · ${mesKey}/26</div>
        <div class="kpi-value">${total != null ? fmt.brl(total) : '—'}</div>
        <div class="kpi-sub">Posição ao final do mês</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">Pré-Prejuízo (≤ 180 dias)</div>
        <div class="kpi-value">${evEntry ? fmt.brl(evEntry.pre) : '—'}</div>
        <div class="kpi-sub">${(evEntry && total) ? fmt.pct(evEntry.pre / total * 100) + ' da carteira' : '—'}</div>
      </div>
      <div class="kpi-card gold">
        <div class="kpi-label">Pós-Prejuízo (&gt; 180 dias)</div>
        <div class="kpi-value">${evEntry ? fmt.brl(evEntry.pos) : '—'}</div>
        <div class="kpi-sub">${(evEntry && total) ? fmt.pct(evEntry.pos / total * 100) + ' da carteira' : '—'}</div>
      </div>
      <div class="kpi-card ${icmCls}">
        <div class="kpi-label">Recuperado · ${mesKey}/26</div>
        <div class="kpi-value">${recup != null ? fmt.brl(recup) : '—'}</div>
        <div class="kpi-sub">${meta != null ? 'Meta: ' + fmt.brl(meta) + (icmRec != null ? ' · ICM: ' + icmRec.toFixed(1) + '%' : '') : '—'}</div>
      </div>
    `;
  }
}

function _cfRenderResultado() {
  const hist  = DATA.resultadoGeral.historico;
  const eficH = DATA.resultadoGeral.eficienciaHistorico;
  const rg    = DATA.resultadoGeral;
  const sf    = DATA.segmentoFaixa;
  const h     = hist.find(x => x.mes === _cfResMes);
  if (!h) return;

  const parcial    = h.mes.includes('*');
  const eficEntry  = eficH.find(e => e.mes === _cfResMes);
  const vistaLabel = _cfVista === 'pre' ? 'Pré Prejuízo (B–G)' : _cfVista === 'pos' ? 'Pós Prejuízo (H–J)' : 'Total';

  let recuperado, meta, projecao, eficAtual, eficProj, splitNote = '';
  let eficMetaSplit = null, icmEficAtualSplit = null, icmEficProjSplit = null;

  if (_cfVista === 'ambos') {
    recuperado = h.recuperado;
    meta       = h.meta;
    projecao   = parcial ? rg.projecaoMes : h.recuperado;
    eficAtual  = eficEntry ? eficEntry.eficAtual : null;
    eficProj   = (parcial && eficEntry) ? eficEntry.eficProj : eficAtual;
  } else {
    const isPre = _cfVista === 'pre';

    // 1. Mês Atual (ex: Julho): Puxa dinamicamente das faixas de atraso
    if (parcial && sf.segmentos && sf.segmentos.length >= 4) {
      const idx = isPre ? [0, 1, 2] : [3];
      recuperado = idx.reduce((s, i) => s + (sf.recuperado[i] || 0), 0);
      meta       = idx.reduce((s, i) => s + (sf.meta[i]      || 0), 0);
      projecao   = idx.reduce((s, i) => s + (sf.projecao[i]  || 0), 0);

      const em       = DATA.matrizEficiencia;
      const faseIdx  = isPre ? [0,1,2,3,4,5] : [6,7,8];
      const fases    = DATA.carteiraFases.fases;
      const cartTot  = faseIdx.reduce((s, i) => s + (fases[i]?.valor || 0), 0);
      if (cartTot > 0) {
        eficAtual     = faseIdx.reduce((s, i) => s + (fases[i]?.taxaRec || 0) * (fases[i]?.valor || 0) / 100, 0) / cartTot * 100;
        eficProj      = faseIdx.reduce((s, i) => s + (em.julProj[i]    || 0) * (fases[i]?.valor || 0) / 100, 0) / cartTot * 100;
        eficMetaSplit = faseIdx.reduce((s, i) => s + (em.meta[i]       || 0) * (fases[i]?.valor || 0) / 100, 0) / cartTot * 100;
        icmEficAtualSplit = eficMetaSplit > 0 ? eficAtual / eficMetaSplit * 100 : null;
        icmEficProjSplit  = eficMetaSplit > 0 ? eficProj  / eficMetaSplit * 100 : null;
      }
    }
    // 2. Meses Anteriores: Lê o detalhamento inserido no JSON (se existir)
    else if (isPre && h.recupPre != null) {
      recuperado = h.recupPre;
      meta       = h.metaPre;
      projecao   = h.recupPre; // Mês fechado, projeção é o próprio realizado
    }
    else if (!isPre && h.recupPos != null) {
      recuperado = h.recupPos;
      meta       = h.metaPos;
      projecao   = h.recupPos;
    }
    // 3. Segurança: Se você não preencheu o dado histórico no JSON, exibe total e avisa
    else {
      recuperado = h.recuperado;
      meta       = h.meta;
      projecao   = h.recuperado;
      eficAtual  = eficEntry ? eficEntry.eficAtual : null;
      eficProj   = eficAtual;
      splitNote = `<p class="footnote" style="margin-top:10px">* Detalhamento Pré/Pós não preenchido no JSON para este mês. Exibindo os valores totais.</p>`;
    }
  }

  const icm     = meta > 0 ? recuperado / meta * 100 : 0;
  const icmProj = meta > 0 ? projecao   / meta * 100 : icm;

  function icmColor(v) { return v >= 100 ? 'var(--delta-pos)' : v >= 85 ? 'var(--brand-gold)' : 'var(--delta-neg)'; }

  const temSplit = _cfVista !== 'ambos' && parcial && sf.segmentos && sf.segmentos.length >= 4;

  const _eficAtualCard = eficAtual;
  const _eficProjCard  = eficProj;
  const _eficMetaCard  = temSplit ? eficMetaSplit : (eficEntry ? eficEntry.metaEfic : null);
  const _icmAtualCard  = temSplit ? icmEficAtualSplit : (rg.icmEficAtual || null);
  const _icmProjCard   = temSplit ? icmEficProjSplit  : (rg.icmEficProj  || null);

  const projecaoCard = parcial ? `
    <div class="kpi-card blue">
      <div class="kpi-label">Projeção do Mês</div>
      <div class="kpi-value">${fmt.brl(projecao)}</div>
      <div class="kpi-sub">ICM Proj.: <strong style="color:#bfdbfe">${icmProj.toFixed(1)}%</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Eficiência Atual</div>
      <div class="kpi-value">${_eficAtualCard != null ? _eficAtualCard.toFixed(2).replace('.',',') + '%' : '—'}</div>
      <div class="kpi-sub">ICM Efic.: ${_icmAtualCard != null ? '<strong style="color:'+icmColor(_icmAtualCard)+'">'+_icmAtualCard.toFixed(1)+'%</strong>' : '—'}${_eficMetaCard != null ? ' · meta '+_eficMetaCard.toFixed(2).replace('.',',')+'%' : ''}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Eficiência Projetada</div>
      <div class="kpi-value">${_eficProjCard != null ? _eficProjCard.toFixed(2).replace('.',',') + '%' : '—'}</div>
      <div class="kpi-sub">ICM Efic. Proj.: ${_icmProjCard != null ? '<strong style="color:'+icmColor(_icmProjCard)+'">'+_icmProjCard.toFixed(1)+'%</strong>' : '—'}</div>
    </div>` : `
    <div class="kpi-card gold">
      <div class="kpi-label">Situação</div>
      <div class="kpi-value" style="font-size:1rem; color:#78350F; padding-top:4px">✓ Mês Encerrado</div>
      <div class="kpi-sub">Resultado final: ${fmt.brl(recuperado)}</div>
    </div>
    ${_eficAtualCard != null ? `
    <div class="kpi-card">
      <div class="kpi-label">Eficiência do Mês</div>
      <div class="kpi-value">${_eficAtualCard.toFixed(2).replace('.',',')}%</div>
      <div class="kpi-sub">${_icmAtualCard != null ? 'ICM: <strong style="color:'+icmColor(_icmAtualCard)+'">'+_icmAtualCard.toFixed(1)+'%</strong>' : '% recuperado sobre carteira'}</div>
    </div>` : ''}`;

  document.getElementById('cf-res-kpis').innerHTML = `
    <div class="kpi-card navy">
      <div class="kpi-label">Recuperado${parcial ? ' (parcial)' : ''} · ${vistaLabel}</div>
      <div class="kpi-value">${fmt.brl(recuperado)}</div>
      <div class="kpi-sub">Meta: ${fmt.brl(meta)}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${Math.min(icm,100)}%; background:${icm <= 50 ? '#EF4444' : icm <= 90 ? '#F59E0B' : '#10B981'}"></div>
      </div>
    </div>
    <div class="kpi-card" style="border-left:3px solid ${icmColor(icm)}">
      <div class="kpi-label">ICM s/ Meta${parcial ? ' (atual)' : ''}</div>
      <div class="kpi-value" style="color:${icmColor(icm)}">${icm.toFixed(1)}%</div>
      <div class="kpi-sub">Recuperado ÷ Meta × 100</div>
    </div>
    ${projecaoCard}
  ` + splitNote;
}

const _CF_PRE_COLORS = ['#1e3a8a','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd'];
const _CF_POS_COLORS = ['#78350f','#b45309','#d97706'];

function cfSetVista(v) {
  _cfVista = v;
  document.querySelectorAll('[data-cf]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.cf === v)
  );
  _cfUpdateDonut();
  _cfUpdateTabela();
  _cfUpdateEvolucao();
  if (_cfResMes) _cfRenderResultado();
}

function _cfEvolYRange(values) {
  const mn  = Math.min(...values);
  const mx  = Math.max(...values);
  const pad = (mx - mn) * 0.4 || mx * 0.1;
  const min = Math.floor((mn - pad) / 5) * 5;
  return { min: Math.max(0, min) };
}

function _cfEvolPct(vals) {
  return vals.map((v, i) => i === 0 ? null : parseFloat(((v - vals[i-1]) / vals[i-1] * 100).toFixed(2)));
}

function _cfY2Range(pcts) {
  const valid = pcts.filter(v => v !== null);
  if (!valid.length) return { min: -5, max: 2 };
  const maxPct    = Math.max(...valid);
  const minPct    = Math.min(...valid);
  const dataRange = Math.max(maxPct - minPct, 1);
  const total     = dataRange / 0.25;
  const y2max     = parseFloat((maxPct + 0.10 * total).toFixed(2));
  const y2min     = parseFloat((y2max - total).toFixed(2));
  return { min: y2min, max: y2max };
}

function _cfPctDataset(pcts, color) {
  const c = color || '#64748b';
  return {
    type: 'line',
    label: 'Var. % mensal',
    data: pcts,
    yAxisID: 'y2',
    borderColor: c,
    borderWidth: 2,
    borderDash: [5, 4],
    pointRadius: 5,
    pointHoverRadius: 7,
    pointBackgroundColor: ctx => (ctx.parsed && ctx.parsed.y >= 0) ? COLORS.green : COLORS.red,
    pointBorderColor: '#fff',
    pointBorderWidth: 1.5,
    fill: false,
    tension: 0.35,
    order: 0
  };
}

const _cfVarLabelPlugin = {
  id: 'cfVarLabels',
  afterDatasetsDraw(chart) {
    const varDs = chart.data.datasets
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.yAxisID === 'y2');
    if (!varDs.length) return;
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = 'bold 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    varDs.forEach(({ d, i }) => {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((pt, j) => {
        const v = d.data[j];
        if (v === null || v === undefined) return;
        const sign  = v >= 0 ? '+' : '';
        const label = sign + v.toFixed(2).replace('.', ',') + '%';
        ctx.fillStyle = v >= 0 ? COLORS.green : COLORS.red;
        ctx.fillText(label, pt.x, pt.y - 7);
      });
    });
    ctx.restore();
  }
};

function _cfUpdateEvolucao() {
  const chart = _cfEvolChart;
  if (!chart) return;
  const ev = DATA.carteiraFases.evolucao;
  let barDatasets, yMin, pcts;

  if (_cfVista === 'ambos') {
    const vals = ev.map(e => (e.pre + e.pos) / 1e6);
    barDatasets = [
      { label:'Pré-Prejuízo', data:ev.map(e=>e.pre/1e6), backgroundColor:COLORS.blue, borderRadius:3, borderSkipped:'bottom', stack:'c' },
      { label:'Pós-Prejuízo', data:ev.map(e=>e.pos/1e6), backgroundColor:COLORS.gold, borderRadius:0,  borderSkipped:'bottom', stack:'c' }
    ];
    pcts = _cfEvolPct(vals);
    yMin = 0;
  } else if (_cfVista === 'pre') {
    const vals = ev.map(e => e.pre / 1e6);
    barDatasets = [{ label:'Pré-Prejuízo', data:vals, backgroundColor:COLORS.blue, borderRadius:3, borderSkipped:'bottom', stack:'c' }];
    pcts = _cfEvolPct(vals);
    yMin = _cfEvolYRange(vals).min;
  } else {
    const vals = ev.map(e => e.pos / 1e6);
    barDatasets = [{ label:'Pós-Prejuízo', data:vals, backgroundColor:COLORS.gold, borderRadius:3, borderSkipped:'bottom', stack:'c' }];
    pcts = _cfEvolPct(vals);
    yMin = _cfEvolYRange(vals).min;
  }

  const { min: y2Min, max: y2Max } = _cfY2Range(pcts);
  chart.data.datasets = [...barDatasets, _cfPctDataset(pcts)];
  chart.options.scales.y.min  = yMin;
  chart.options.scales.y2.min = y2Min;
  chart.options.scales.y2.max = y2Max;
  chart.update();
}

function _cfUpdateDonut() {
  const d = DATA.carteiraFases;
  const chart = _cfDonutChart;
  if (!chart) return;

  if (_cfVista === 'ambos') {
    chart.data.labels = ['Pré-Prejuízo', 'Pós-Prejuízo'];
    chart.data.datasets[0].data = [d.preJuizo.valor, d.posJuizo.valor];
    chart.data.datasets[0].backgroundColor = [COLORS.blue, COLORS.gold];
    document.getElementById('donutCenter').innerHTML =
      `<div class="donut-val">${fmt.brl(d.totalCarteira)}</div><div class="donut-lbl">Total</div>`;
    document.getElementById('cf-donut-title').textContent = 'Distribuição Pré / Pós Prejuízo';
    makeLegend('legendDonut', [
      { type:'dot', color: COLORS.blue, label: `Pré-Prejuízo (${fmt.pct(d.preJuizo.percentual)})` },
      { type:'dot', color: COLORS.gold, label: `Pós-Prejuízo (${fmt.pct(d.posJuizo.percentual)})` }
    ]);
  } else if (_cfVista === 'pre') {
    const fases = d.fases.slice(0, 6);
    chart.data.labels = fases.map(f => f.faixa);
    chart.data.datasets[0].data = fases.map(f => f.valor);
    chart.data.datasets[0].backgroundColor = _CF_PRE_COLORS;
    document.getElementById('donutCenter').innerHTML =
      `<div class="donut-val">${fmt.brl(d.preJuizo.valor)}</div><div class="donut-lbl">Pré-Prej.</div>`;
    document.getElementById('cf-donut-title').textContent = 'Pré-Prejuízo por Faixa (B–G)';
    makeLegend('legendDonut', fases.map((f, i) => ({
      type:'dot', color: _CF_PRE_COLORS[i], label: f.faixa
    })));
  } else {
    const fases = d.fases.slice(6);
    chart.data.labels = fases.map(f => f.faixa);
    chart.data.datasets[0].data = fases.map(f => f.valor);
    chart.data.datasets[0].backgroundColor = _CF_POS_COLORS;
    document.getElementById('donutCenter').innerHTML =
      `<div class="donut-val">${fmt.brl(d.posJuizo.valor)}</div><div class="donut-lbl">Pós-Prej.</div>`;
    document.getElementById('cf-donut-title').textContent = 'Pós-Prejuízo por Faixa (H–J)';
    makeLegend('legendDonut', fases.map((f, i) => ({
      type:'dot', color: _CF_POS_COLORS[i], label: f.faixa
    })));
  }
  chart.update();
}

function _cfUpdateTabela() {
  const fases = DATA.carteiraFases.fases;
  const em    = DATA.matrizEficiencia;
  const mesRaw = _cfResMes || '';
  const mesKey = mesRaw.replace(/\/26\*?/, '').trim() || 'Jul';
  const isJul     = mesKey === 'Jul';
  const histData  = !isJul ? (em.historico[mesKey] || null) : null;
  const hasEfic   = isJul || histData !== null;

  const thEfic = document.getElementById('th-efic-col');
  if (thEfic) {
    if (isJul)          thEfic.textContent = 'Efic. Proj. (%)';
    else if (histData)  thEfic.textContent = `Efic. ${mesKey} (%)`;
    else                thEfic.textContent = 'Efic. (%)';
  }

  const noteEl = document.getElementById('tableFasesNote');
  if (noteEl) {
    if (!isJul && hasEfic) {
      noteEl.style.display = 'block';
      noteEl.textContent = `Carteira (R$) e recuperado por faixa disponíveis apenas para o mês atual. Eficiência e ICM referentes a ${mesKey}/26.`;
    } else if (!isJul && !hasEfic) {
      noteEl.style.display = 'block';
      noteEl.textContent = `Detalhamento por faixa não disponível para ${mesKey}/26.`;
    } else {
      noteEl.style.display = 'none';
    }
  }

  document.getElementById('tableFasesBody').innerHTML = fases.map((f, i) => {
    if (_cfVista === 'pre'  && i > 5) return '';
    if (_cfVista === 'pos'  && i < 6) return '';

    const meta = em.meta[i];
    let eficVal, icmVal, eficCls = 'td-julproj';
    if (isJul) {
      eficVal = em.julProj[i];
      icmVal  = em.icmMeta[i];
    } else if (histData) {
      eficVal = histData[i];
      icmVal  = (meta > 0 && eficVal != null) ? eficVal / meta * 100 : null;
      eficCls = '';
    } else {
      eficVal = null;
      icmVal  = null;
    }

    const icmCls = icmVal != null ? (icmVal >= 100 ? 'td-pos' : 'td-neg') : '';
    const colsCarteira = isJul
      ? `<td class="td-blue">${fmt.brl(f.valor)}</td>
         <td>${fmt.pct(f.pct)}</td>
         <td>${fmt.brl(f.valor * f.taxaRec / 100)}</td>
         <td class="${f.taxaRec >= 15 ? 'td-pos' : f.taxaRec >= 5 ? '' : 'td-muted'}">${fmt.pct(f.taxaRec)}</td>`
      : `<td class="td-muted" style="color:var(--ink-muted)">—</td>
         <td class="td-muted" style="color:var(--ink-muted)">—</td>
         <td class="td-muted" style="color:var(--ink-muted)">—</td>
         <td class="td-muted" style="color:var(--ink-muted)">—</td>`;

    return `
    <tr>
      <td>${f.faixa}</td>
      ${colsCarteira}
      <td>${meta != null ? meta.toFixed(2) + '%' : '—'}</td>
      <td class="${eficCls}">${eficVal != null ? eficVal.toFixed(2) + '%' : '—'}</td>
      <td class="${icmCls}">${icmVal != null ? icmVal.toFixed(1) + '%' : '—'}</td>
    </tr>`;
  }).join('');
}

function initCarteiraFases() {
  const d = DATA.carteiraFases;
  _cfVista = 'ambos';
  const hist = DATA.resultadoGeral.historico;
  const mesesDisp = hist.slice(-5);
  _cfResMes = mesesDisp[mesesDisp.length - 1].mes;
  document.getElementById('cf-mes-filtros').innerHTML =
    '<span class="filter-label">Mês:</span>' +
    mesesDisp.map(h => {
      const label  = h.mes.replace('*','');
      const active = h.mes === _cfResMes ? ' active' : '';
      return `<button class="filter-btn${active}" data-cfm="${h.mes}" onclick="cfSetMes('${h.mes}')">${label}</button>`;
    }).join('');

  _cfUpdateCarteiraMes();

  _cfDonutChart = new Chart(document.getElementById('chartDonut'), {
    type: 'doughnut',
    data: {
      labels: ['Pré-Prejuízo', 'Pós-Prejuízo'],
      datasets: [{
        data: [d.preJuizo.valor, d.posJuizo.valor],
        backgroundColor: [COLORS.blue, COLORS.gold],
        borderWidth: 2, borderColor: '#fff', hoverOffset: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,36,97,.92)',
          callbacks: { label: ctx => `${ctx.label}: ${fmt.brl(ctx.parsed)}` }
        }
      }
    }
  });
  document.getElementById('donutCenter').innerHTML =
    `<div class="donut-val">${fmt.brl(d.totalCarteira)}</div><div class="donut-lbl">Total</div>`;
  makeLegend('legendDonut', [
    { type:'dot', color: COLORS.blue, label: `Pré-Prejuízo (${fmt.pct(d.preJuizo.percentual)})` },
    { type:'dot', color: COLORS.gold, label: `Pós-Prejuízo (${fmt.pct(d.posJuizo.percentual)})` }
  ]);

  const ev = d.evolucao;
  if (_cfEvolChart) { _cfEvolChart.destroy(); _cfEvolChart = null; }
  const _evTotals = ev.map(e => (e.pre + e.pos) / 1e6);
  const _evPcts   = _cfEvolPct(_evTotals);
  const { min: _evY2Min, max: _evY2Max } = _cfY2Range(_evPcts);
  _cfEvolChart = new Chart(document.getElementById('chartCarteiraEvolucao'), {
    type:'bar',
    data:{
      labels: ev.map(e=>e.mes),
      datasets:[
        { label:'Pré-Prejuízo', data:ev.map(e=>e.pre/1e6), backgroundColor:COLORS.blue, borderRadius:3, borderSkipped:'bottom', stack:'c' },
        { label:'Pós-Prejuízo', data:ev.map(e=>e.pos/1e6), backgroundColor:COLORS.gold, borderRadius:0,  borderSkipped:'bottom', stack:'c' },
        _cfPctDataset(_evPcts)
      ]
    },
    plugins: [_cfVarLabelPlugin],
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ display:false },
        tooltip:{
          backgroundColor:'rgba(15,36,97,.92)',
          callbacks:{
            label: ctx => ctx.dataset.yAxisID === 'y2'
              ? `Var.: ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(2).replace('.',',')}%`
              : `${ctx.dataset.label}: R$ ${ctx.parsed.y.toFixed(2).replace('.',',')} MM`
          }
        }
      },
      scales:{
        x:{ grid:{color:COLORS.gridline,lineWidth:.5}, stacked:true, ticks:{color:'#898781',font:{size:10}} },
        y:{ min:0, grid:{color:COLORS.gridline,lineWidth:.5}, stacked:true, ticks:{callback:v=>`R$ ${v.toFixed(0)} MM`, color:'#898781', font:{size:10}}, border:{dash:[3,3],color:'transparent'} },
        y2:{
          position:'right',
          min: _evY2Min, max: _evY2Max,
          grid:{ drawOnChartArea:false },
          ticks:{
            callback: v => (v >= 0 ? '+' : '') + v.toFixed(1).replace('.',',') + '%',
            color:'#898781', font:{size:9}
          },
          border:{ dash:[3,3], color:'transparent' }
        }
      }
    }
  });

  _cfUpdateTabela();
  _cfRenderResultado();
}

// ══════════════════════════════════════════════════════════════
// TAB 5 — SEGMENTO DE FAIXA
// ══════════════════════════════════════════════════════════════
let _sfSeg = 'todos';
let _sfMes = null;

function sfSetMes(mes) {
  _sfMes = mes;
  document.querySelectorAll('[data-sfm]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.sfm === mes)
  );
  _sfUpdateMes();
}

function _sfUpdateMes() {
  const isJul   = _sfMes && _sfMes.includes('Jul');
  const detail  = document.getElementById('sf-detail-wrap');
  const note    = document.getElementById('sf-hist-note');
  const subtitle = document.getElementById('sf-subtitle');

  if (isJul) {
    detail.style.display = '';
    note.style.display   = 'none';
    subtitle.textContent = 'Recuperado, projeção e ICM s/ meta — por agrupamento de faixa de atraso · Jul/26 (parcial)';
    _sfRenderKPIsJul();
  } else {
    const hist = DATA.resultadoGeral.historico;
    const h    = hist.find(x => x.mes === _sfMes);
    if (!h) return;
    const mesLabel = h.mes.replace('*', '');
    subtitle.textContent = `Recuperado e ICM s/ meta — resultado total do mês · ${mesLabel}`;
    detail.style.display = 'none';
    note.style.display   = '';
    note.innerHTML = `<strong>ℹ️ Detalhamento por segmento disponível apenas para o mês corrente.</strong><br>
      Selecione <strong>Jul/26</strong> para ver o breakdown por segmento (Curto, Médio, Tardia, Loss).`;

    const icm     = h.recuperado / h.meta * 100;
    const icmCls  = icm >= 100 ? 'green' : icm >= 85 ? 'gold' : 'red';
    const delta   = h.recuperado - h.meta;
    document.getElementById('sf-kpis').innerHTML = `
      <div class="kpi-card navy">
        <div class="kpi-label">Recuperado — ${mesLabel}</div>
        <div class="kpi-value">${fmt.brl(h.recuperado)}</div>
        <div class="kpi-sub">Meta: ${fmt.brl(h.meta)}</div>
      </div>
      <div class="kpi-card ${icmCls}">
        <div class="kpi-label">ICM s/ Meta</div>
        <div class="kpi-value">${fmt.pct(icm)}</div>
        <div class="kpi-sub">${icm >= 100 ? 'Acima da meta' : 'Abaixo da meta'}</div>
      </div>
      <div class="kpi-card ${delta >= 0 ? 'blue' : ''}">
        <div class="kpi-label">Δ Resultado s/ Meta</div>
        <div class="kpi-value" style="color:${delta>=0?'var(--delta-pos)':'var(--delta-neg)'}">${delta>=0?'+':''}${fmt.brl(delta)}</div>
        <div class="kpi-sub">Mês encerrado</div>
      </div>
    `;
  }
}

function _sfRenderKPIsJul() {
  const d = DATA.segmentoFaixa;
  const totMeta = d.meta.reduce((s,v)=>s+v,0);
  const totRec  = d.recuperado.reduce((s,v)=>s+v,0);
  const totProj = d.projecao.reduce((s,v)=>s+v,0);
  const deltaProj = totProj - totMeta;
  const icmGeral  = totProj / totMeta * 100;
  const melhorIcmIdx = d.icm.indexOf(Math.max(...d.icm));
  document.getElementById('sf-kpis').innerHTML = `
    <div class="kpi-card navy">
      <div class="kpi-label">Recuperado Acumulado</div>
      <div class="kpi-value">${fmt.brl(totRec)}</div>
      <div class="kpi-sub">Meta: ${fmt.brl(totMeta)}</div>
    </div>
    <div class="kpi-card blue">
      <div class="kpi-label">Projeção do Mês</div>
      <div class="kpi-value">${fmt.brl(totProj)}</div>
      <div class="kpi-sub">Δ s/ meta: ${deltaProj>=0?'+':''}${fmt.brl(deltaProj)}</div>
    </div>
    <div class="kpi-card ${icmGeral>=100?'green':'gold'}">
      <div class="kpi-label">ICM Geral s/ Meta</div>
      <div class="kpi-value">${fmt.pct(icmGeral)}</div>
      <div class="kpi-sub">${icmGeral>=100?'Resultado acima da meta':'Resultado abaixo da meta'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Melhor Resultado (ICM)</div>
      <div class="kpi-value">${fmt.pct(d.icm[melhorIcmIdx])}</div>
      <div class="kpi-sub">${d.segmentos[melhorIcmIdx].split('(')[0].trim()}</div>
    </div>
  `;
}

function sfSetSeg(s) {
  _sfSeg = s;
  document.querySelectorAll('[data-sf]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sf === s);
  });
  _sfAplicarDestaque();
}

function _sfAplicarDestaque() {
  document.querySelectorAll('#tableSegValBody tr, #tableSegEficBody tr').forEach((row, i) => {
    const idx = i % DATA.segmentoFaixa.segmentos.length; 
    row.classList.toggle('seg-highlight', _sfSeg !== 'todos' && String(idx) === _sfSeg);
  });
}

function initSegmentoFaixa() {
  const d = DATA.segmentoFaixa;
  const hist = DATA.resultadoGeral.historico;
  const mesesSF = hist.slice(-5);
  _sfMes = mesesSF[mesesSF.length - 1].mes;
  document.getElementById('sf-mes-filtros').innerHTML =
    '<span class="filter-label">Mês:</span>' +
    mesesSF.map(h => {
      const label  = h.mes.replace('*', '');
      const active = h.mes === _sfMes ? ' active' : '';
      return `<button class="filter-btn${active}" data-sfm="${h.mes}" onclick="sfSetMes('${h.mes}')">${label}</button>`;
    }).join('');

  _sfRenderKPIsJul();

  document.getElementById('tableSegValBody').innerHTML = d.segmentos.map((seg, i) => {
    const delta    = d.projecao[i] - d.meta[i];
    const deltaCls = delta >= 0 ? 'td-pos' : 'td-neg';
    const sinal    = delta >= 0 ? '+' : '';
    return `<tr>
      <td>${seg}</td>
      <td>${fmt.brl(d.meta[i])}</td>
      <td>${fmt.brl(d.recuperado[i])}</td>
      <td class="td-blue">${fmt.brl(d.projecao[i])}</td>
      <td class="${deltaCls}">${sinal}${fmt.brl(delta)}</td>
    </tr>`;
  }).join('');

  document.getElementById('tableSegEficBody').innerHTML = d.segmentos.map((seg, i) => {
    const icmCls  = d.icm[i] >= 100 ? 'td-pos' : 'td-neg';
    const delta   = d.projecao[i] - d.meta[i];
    const deltaCls = delta >= 0 ? 'td-pos' : 'td-neg';
    const sinal   = delta >= 0 ? '+' : '';
    const status  = d.icm[i] >= 100 ? '✅ Acima da meta' : d.icm[i] >= 85 ? '⚠️ Dentro do limite' : '🔴 Abaixo da meta';
    return `<tr>
      <td>${seg}</td>
      <td class="${icmCls}">${fmt.pct(d.icm[i])}</td>
      <td class="${deltaCls}">${sinal}${fmt.brl(delta)}</td>
      <td>${status}</td>
    </tr>`;
  }).join('');

  _sfAplicarDestaque();

  const sfTotMeta      = d.meta.reduce((s,v)=>s+v,0);
  const sfTotProj      = d.projecao.reduce((s,v)=>s+v,0);
  const sfIcmGeral     = sfTotProj / sfTotMeta * 100;
  const sfDeltaProj    = sfTotProj - sfTotMeta;
  const sfMelhorIdx    = d.icm.indexOf(Math.max(...d.icm));
  const sfPiorIdx      = d.icm.indexOf(Math.min(...d.icm));
  const acima          = d.segmentos.filter((_, i) => d.icm[i] >= 100);
  const abaixo         = d.segmentos.filter((_, i) => d.icm[i] < 100);
  const lider          = d.segmentos[sfMelhorIdx];
  const pior           = d.segmentos[sfPiorIdx];
  const liderPctProj   = (d.projecao[sfMelhorIdx] / sfTotProj * 100).toFixed(1);

  document.getElementById('sf-padrao').innerHTML = `
    <div class="padrao-title">🔍 Padrão Identificado — Resultado por Segmento (Jul/26)</div>
    <p class="padrao-text">
      <strong>${acima.length} de ${d.segmentos.length} segmentos</strong> com resultado projetado acima da meta (ICM ≥ 100%):
      ${acima.map(s => `<strong>${s.split('(')[0].trim()}</strong>`).join(' e ') || '—'}.
      ${abaixo.length > 0
        ? `Resultado abaixo da meta em: <strong>${abaixo.map(s => s.split('(')[0].trim()).join(', ')}</strong>.`
        : 'Todos os segmentos com resultado acima da meta.'}
    </p>
    <p class="padrao-text" style="margin-top:10px">
      <strong>${lider.split('(')[0].trim()}</strong> lidera com ICM de
      <strong style="color:var(--delta-pos)">${fmt.pct(d.icm[sfMelhorIdx])}</strong>
      e representa <strong>${liderPctProj}%</strong> da projeção total
      (<strong>${fmt.brl(d.projecao[sfMelhorIdx])}</strong>).
      ${abaixo.length > 0
        ? ` Maior gap: <strong>${pior.split('(')[0].trim()}</strong> com ICM de <strong style="color:var(--delta-neg)">${fmt.pct(d.icm[sfPiorIdx])}</strong> (Δ ${fmt.brl(d.projecao[sfPiorIdx]-d.meta[sfPiorIdx])}).`
        : ''}
    </p>
    <p class="padrao-text" style="margin-top:10px">
      Resultado total projetado:
      <strong style="color:${sfIcmGeral>=100?'#008300':'#e34948'}">${fmt.brl(sfTotProj)}</strong>
      (ICM <strong>${fmt.pct(sfIcmGeral)}</strong> s/ meta de ${fmt.brl(sfTotMeta)}) —
      ${sfDeltaProj >= 0
        ? `<strong style="color:#008300">+${fmt.brl(sfDeltaProj)}</strong> acima da meta.`
        : `<strong style="color:#e34948">${fmt.brl(sfDeltaProj)}</strong> abaixo da meta.`}
    </p>
  `;

  const shortLabels = d.segmentos.map(s => s.split(' ').slice(0,2).join(' '));
  new Chart(document.getElementById('chartValorSeg'), {
    type:'bar',
    data:{
      labels: shortLabels,
      datasets:[
        { label:'Meta',      data:d.meta.map(v=>+(v/1e6).toFixed(2)),      backgroundColor:COLORS.gold+'88',  borderRadius:3, borderSkipped:'bottom', barPercentage:.75, categoryPercentage:.85 },
        { label:'Realizado', data:d.recuperado.map(v=>+(v/1e6).toFixed(3)), backgroundColor:COLORS.blue,       borderRadius:3, borderSkipped:'bottom', barPercentage:.75, categoryPercentage:.85 },
        { label:'Projeção',  data:d.projecao.map(v=>+(v/1e6).toFixed(2)),   backgroundColor:COLORS.green+'88', borderRadius:3, borderSkipped:'bottom', barPercentage:.75, categoryPercentage:.85 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{backgroundColor:'rgba(15,36,97,.92)', callbacks:{label:ctx=>`${ctx.dataset.label}: ${fmt.brlFull(ctx.parsed.y*1e6)}`}}
      },
      scales:{
        x:{grid:{color:COLORS.gridline,lineWidth:.5}, ticks:{color:'#898781',font:{size:10}}},
        y:{grid:{color:COLORS.gridline,lineWidth:.5}, ticks:{callback:v=>`R$${v}MM`, color:'#898781',font:{size:10}}, border:{dash:[3,3],color:'transparent'}}
      }
    }
  });
  makeLegend('legendSeg', [
    { type:'bar', color:COLORS.gold+'88', label:'Meta' },
    { type:'bar', color:COLORS.blue,      label:'Realizado' },
    { type:'bar', color:COLORS.green+'88',label:'Projeção' }
  ]);

  new Chart(document.getElementById('chartTaxaSeg'), {
    type:'bar',
    data:{
      labels: d.segmentos,
      datasets:[{
        label:'ICM s/ Meta (%)',
        data: d.icm,
        backgroundColor: d.icm.map(v => v>=100?COLORS.green:v>=85?COLORS.blue:COLORS.gold),
        borderRadius:3, borderSkipped:'left', barPercentage:0.7
      }]
    },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{backgroundColor:'rgba(15,36,97,.92)', callbacks:{label:ctx=>'ICM: '+fmt.pct(ctx.parsed.x)}}
      },
      scales:{
        x:{
          grid:{color:COLORS.gridline,lineWidth:.5},
          ticks:{callback:v=>v+'%', color:'#898781', font:{size:10}},
          border:{color:'#c3c2b7'}, min:0, max:130
        },
        y:{grid:{display:false}, ticks:{color:'#898781', font:{size:10}}, border:{color:'transparent'}}
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════
// TAB 6 — PERFORMANCE DE VENCIMENTOS
// ══════════════════════════════════════════════════════════════
let _pvVenc = 'todos';
let _pvMesSet = null;    
let _pvBuildCurva = null; 

function pvSetVenc(v) {
  _pvVenc = v;
  document.querySelectorAll('[data-pv]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pv === v);
  });
  document.querySelectorAll('#tableVencBody tr').forEach(row => {
    const dia = row.querySelector('td')?.textContent?.match(/\d+/)?.[0];
    const isSelected = v === 'todos' || dia === v;
    row.classList.toggle('seg-highlight', v !== 'todos' && isSelected);
    row.style.opacity = (v !== 'todos' && !isSelected) ? '0.35' : '';
  });
  if (_pvBuildCurva) _pvBuildCurva();
}

function initPerfVenc() {
  const d = DATA.performanceVencimentos;
  const r = d.resumo;

  document.getElementById('pv-subtitle').textContent =
    `% acumulado pago no vencimento (D0) e 4 dias após (D4) · ${DATA.meta.mesReferencia} (parcial) vs. Média ${DATA.meta.mediaReferencia}`;

  document.getElementById('perfSummary').innerHTML = `
    <div class="perf-card navy">
      <div class="perf-label">D0 · Média Vencs. Maturados</div>
      <div class="perf-big">${fmt.pct(r.d0.percentual)}</div>
      <div class="perf-vs">vs ${fmt.pct(r.d0.vsMedia)} (<span style="color:#6EE7B7">+${r.d0.variacao.toFixed(1)}%</span>)</div>
      <div class="perf-desc">Média trimestral (01, 05, 10)</div>
    </div>
    <div class="perf-card blue">
      <div class="perf-label">D4 · Média Vencs. Fechados</div>
      <div class="perf-big">${fmt.pct(r.d4.percentual)}</div>
      <div class="perf-vs">vs ${fmt.pct(r.d4.vsMedia)} (<span style="color:#6EE7B7">+${r.d4.variacao.toFixed(1)}%</span>)</div>
      <div class="perf-desc">Média trimestral (01, 05, 10)</div>
    </div>
    <div class="perf-card gold">
      <div class="perf-label" style="color:var(--brand-navy)">Vencimentos em Maturação</div>
      <div class="perf-big" style="color:var(--brand-navy)">${r.emMaturacao.atual} <span style="font-size:1.2rem;font-weight:500">de</span> ${r.emMaturacao.total}</div>
      <div class="perf-vs" style="color:var(--ink-secondary)">D0 (15, 20, 25) / D4 (15, 20, 25)</div>
      <div class="perf-desc" style="color:var(--brand-gold)">Ainda não fechados</div>
    </div>
  `;

  const statusMap = {
    maturado:  { cls:'badge-maturado',  label:'Maturado (D0 e D4)' },
    maturando: { cls:'badge-maturando', label:'Em maturação' },
    pendente:  { cls:'badge-pendente',  label:'Ainda não venceu' }
  };

  document.getElementById('tableVencBody').innerHTML = d.vencimentos.map(v => {
    const st = statusMap[v.status];
    const isMaturando = v.status === 'maturando';
    const isPendente  = v.status === 'pendente';
    const dimCls = isMaturando ? '' : (isPendente ? 'td-muted' : '');
    const d0Lbl  = v.mesD0  != null ? fmt.pct(v.mesD0) + (v.parcial ? '*' : '') : '—';
    const d4Lbl  = v.mesD4  != null ? fmt.pct(v.mesD4) + (v.parcial ? '*' : '') : '—';
    const v0Lbl  = v.varD0  != null ? `<span class="${v.varD0>0?'td-pos':'td-neg'}">${fmt.deltaSign(v.varD0)}${Math.abs(v.varD0).toFixed(1)}%</span>` : '<span class="td-muted">—</span>';
    const v4Lbl  = v.varD4  != null ? `<span class="${v.varD4>0?'td-pos':'td-neg'}">${fmt.deltaSign(v.varD4)}${Math.abs(v.varD4).toFixed(1)}%</span>` : '<span class="td-muted">—</span>';
    const diaLabel = isMaturando ? `<span style="color:var(--brand-blue);font-weight:700">Dia ${v.dia}</span>` : (isPendente ? `<span class="td-muted">Dia ${v.dia}</span>` : `<span style="color:var(--brand-blue);font-weight:700">Dia ${v.dia}</span>`);
    const subLabel = isMaturando ? ` <span class="td-muted" style="font-size:.7rem">(D${v.diaCorrido})</span>` : '';
    return `<tr>
      <td>${diaLabel}${subLabel}</td>
      <td class="${dimCls}">${fmt.pct(v.mediaTrimD0)}</td>
      <td class="td-blue">${d0Lbl}</td>
      <td>${v0Lbl}</td>
      <td class="${dimCls}">${fmt.pct(v.mediaTrimD4)}</td>
      <td class="td-blue">${d4Lbl}</td>
      <td>${v4Lbl}</td>
      <td><span class="badge ${st.cls}">${st.label}${isMaturando&&v.diaCorrido?' (D'+v.diaCorrido+')':''}</span></td>
    </tr>`;
  }).join('');

  const curva = d.curvaRecuperacao;
  const meses  = Object.keys(curva.meses);
  const curvaColors = [COLORS.green, COLORS.blue, COLORS.gold, COLORS.orange];
  const mesAtivo = new Set(meses); 
  const d0Idx = curva.dias.indexOf(0);
  const d4Idx = curva.dias.indexOf(4);

  if (_pvMesSet === null) _pvMesSet = new Set(['trim', meses[meses.length - 1]]);

  const filterContainer = document.getElementById('curvaMesesFilter');
  const _pvMesColors = [COLORS.blue, COLORS.green, COLORS.orange, COLORS.aqua];

  function _pvTrimCurve() {
    const mesesTrim = meses.slice(0, -1);
    return curva.dias.map((_, i) => {
      const vals = mesesTrim.map(m => curva.meses[m][i]).filter(v => v != null);
      return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
    });
  }

  function _pvRebuildMesFilter() {
    if (_pvVenc === 'todos') {
      filterContainer.innerHTML = '<span class="filter-label">Meses:</span>' +
        meses.map(m => `<button class="filter-btn ${mesAtivo.has(m) ? 'active' : ''}" data-pvmes="${m}">${m}</button>`).join('');
    } else {
      const opts = ['trim', ...meses];
      filterContainer.innerHTML = '<span class="filter-label">Meses:</span>' +
        opts.map(m => `<button class="filter-btn ${_pvMesSet.has(m) ? 'active' : ''}" data-pvmes="${m}">${m === 'trim' ? 'Média Trim.' : m}</button>`).join('');
    }
  }

  let curvaChart = null;

  function buildCurvaChart() {
    if (curvaChart) curvaChart.destroy();
    _pvRebuildMesFilter();

    let datasets, tituloTexto;
    const mesAtualKey = meses[meses.length - 1];

    if (_pvVenc !== 'todos') {
      const vData = d.vencimentos.find(v => String(v.dia) === _pvVenc);
      const baseTrim   = _pvTrimCurve();
      const baseD0Trim = baseTrim[d0Idx] || 1;
      const scaleTrim  = vData && vData.mediaTrimD0 != null ? vData.mediaTrimD0 / baseD0Trim : 1;
      const trimData   = baseTrim.map(v => v != null ? Math.min(100, +(v * scaleTrim).toFixed(2)) : null);
      const pointTrim  = baseTrim.map((_, i) => (i === d0Idx || i === d4Idx) ? 4 : 0);

      datasets = [];
      const legendHtml = [];

      if (_pvMesSet.has('trim')) {
        datasets.push({
          label: 'Média Trim.',
          data: trimData,
          borderColor: COLORS.gold,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: pointTrim,
          pointBackgroundColor: '#fff',
          pointBorderColor: COLORS.gold,
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          tension: 0.4,
          spanGaps: false
        });
        legendHtml.push(`<div class="legend-item">
          <div style="width:18px;height:0;border-top:1.5px dashed ${COLORS.gold};margin-right:6px"></div>
          <span>Média Trim. — Dia ${_pvVenc}</span>
        </div>`);
      }

      let colorIdx = 0;
      meses.forEach(m => {
        if (!_pvMesSet.has(m)) return;
        const color      = _pvMesColors[colorIdx++ % _pvMesColors.length];
        const baseAtual  = curva.meses[m] || [];
        const baseD0Atual = baseAtual[d0Idx] || 1;
        const scaleAtual = (m === mesAtualKey && vData && vData.mesD0 != null)
          ? vData.mesD0 / baseD0Atual
          : scaleTrim * (baseD0Atual / baseD0Trim);
        const atualData  = baseAtual.map(v => v != null ? Math.min(100, +(v * scaleAtual).toFixed(2)) : null);
        const pointAtual = baseAtual.map((_, i) => (i === d0Idx || i === d4Idx) ? 5 : 0);
        datasets.push({
          label: m,
          data: atualData,
          borderColor: color,
          backgroundColor: color + '10',
          borderWidth: 2.5,
          borderDash: [],
          pointRadius: pointAtual,
          pointBackgroundColor: '#fff',
          pointBorderColor: color,
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          tension: 0.4,
          spanGaps: false,
          fill: false
        });
        legendHtml.push(`<div class="legend-item">
          <div class="legend-line" style="background:${color};height:2px;width:18px"></div>
          <span>${m} — Dia ${_pvVenc}</span>
        </div>`);
      });

      const activeLabels = [
        ...(_pvMesSet.has('trim') ? ['Média Trim.'] : []),
        ...meses.filter(m => _pvMesSet.has(m))
      ];
      tituloTexto = `Curva de Recuperação — Dia ${_pvVenc} · ${activeLabels.join(' · ')}`;
      document.getElementById('legendCurva').innerHTML = legendHtml.join('');

    } else {
      tituloTexto = 'Curva de Recuperação por Dia de Atraso (D-13 a D+20)';
      datasets = meses.filter(m => mesAtivo.has(m)).map((m, i) => ({
        label: m,
        data: curva.meses[m],
        borderColor: curvaColors[i % curvaColors.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.4,
        spanGaps: false
      }));

      document.getElementById('legendCurva').innerHTML = meses.filter(m => mesAtivo.has(m)).map((m, i) => `
        <div class="legend-item">
          <div class="legend-line" style="background:${curvaColors[i % curvaColors.length]};height:2px;width:18px"></div>
          <span>${m}</span>
        </div>`).join('');
    }

    const tituloEl = document.getElementById('curvaTitulo');
    if (tituloEl) tituloEl.textContent = tituloTexto;

    curvaChart = new Chart(document.getElementById('chartCurva'), {
      type: 'line',
      data: { labels: curva.dias.map(d => d >= 0 ? 'D+' + d : 'D' + d), datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: 'rgba(15,36,97,.92)',
            callbacks: {
              title: items => 'Dia de atraso: ' + items[0].label,
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y != null ? fmt.pct(ctx.parsed.y) : '—'}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: COLORS.gridline, lineWidth: .5 },
            ticks: {
              color: '#898781', font: { size: 10 },
              callback: (v, i) => { const dd = curva.dias[i]; return dd === 0 ? 'D0 ▼' : (dd % 5 === 0 ? (dd >= 0 ? 'D+' + dd : 'D' + dd) : ''); }
            },
            border: { color: '#c3c2b7' }
          },
          y: {
            grid: { color: COLORS.gridline, lineWidth: .5 },
            ticks: { callback: v => v + '%', color: '#898781', font: { size: 10 } },
            border: { dash: [3, 3], color: 'transparent' },
            min: 0, max: 100
          }
        }
      }
    });
  }

  buildCurvaChart();
  _pvBuildCurva = buildCurvaChart; 

  filterContainer.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn || !btn.dataset.pvmes) return;
    const m = btn.dataset.pvmes;
    if (_pvVenc === 'todos') {
      if (mesAtivo.has(m)) { if (mesAtivo.size > 1) { mesAtivo.delete(m); btn.classList.remove('active'); } }
      else { mesAtivo.add(m); btn.classList.add('active'); }
      buildCurvaChart();
    } else {
      if (_pvMesSet.has(m)) { if (_pvMesSet.size > 1) { _pvMesSet.delete(m); btn.classList.remove('active'); } }
      else { _pvMesSet.add(m); btn.classList.add('active'); }
      buildCurvaChart();
    }
  });

  const venc = d.vencimentos.filter(v => v.mesD0 != null || v.mediaTrimD0 != null);
  new Chart(document.getElementById('chartComparativo'), {
    type:'bar',
    data:{
      labels: venc.map(v=>'Dia '+v.dia),
      datasets:[
        { label:'Média Trim. D0', data:venc.map(v=>v.mediaTrimD0), backgroundColor:COLORS.blue+'55', borderRadius:3, borderSkipped:'bottom', barPercentage:.75, categoryPercentage:.85 },
        { label:'Mês Atual D0',   data:venc.map(v=>v.mesD0),       backgroundColor:COLORS.blue,      borderRadius:3, borderSkipped:'bottom', barPercentage:.75, categoryPercentage:.85 },
        { label:'Média Trim. D4', data:venc.map(v=>v.mediaTrimD4), backgroundColor:COLORS.gold+'55', borderRadius:3, borderSkipped:'bottom', barPercentage:.75, categoryPercentage:.85 },
        { label:'Mês Atual D4',   data:venc.map(v=>v.mesD4),       backgroundColor:COLORS.gold,      borderRadius:3, borderSkipped:'bottom', barPercentage:.75, categoryPercentage:.85 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{backgroundColor:'rgba(15,36,97,.92)', callbacks:{label:ctx=>ctx.parsed.y!=null?`${ctx.dataset.label}: ${fmt.pct(ctx.parsed.y)}`:'—'}}},
      scales:{
        x:{grid:{color:COLORS.gridline,lineWidth:.5}, ticks:{color:'#898781',font:{size:10}}},
        y:{grid:{color:COLORS.gridline,lineWidth:.5}, min:0, max:100, ticks:{callback:v=>v+'%', color:'#898781', font:{size:10}}, border:{dash:[3,3],color:'transparent'}}
      }
    }
  });
  makeLegend('legendComp', [
    { type:'bar', color:COLORS.blue+'55', label:'Média Trim. D0' },
    { type:'bar', color:COLORS.blue,      label:'Mês Atual D0' },
    { type:'bar', color:COLORS.gold+'55', label:'Média Trim. D4' },
    { type:'bar', color:COLORS.gold,      label:'Mês Atual D4' }
  ]);
}

// ══════════════════════════════════════════════════════════════
// TAB 7 — MATRIZ DE EFICIÊNCIA
// ══════════════════════════════════════════════════════════════
let _mePeriodo = 'todos';

function meSetPeriodo(p) {
  _mePeriodo = p;
  document.querySelectorAll('[data-me]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.me === p);
  });
  _meAplicarFoco();
}

const _ME_COL = { mar: 1, abr: 2, mai: 3, jun: 4, trim: 5, jul: 6 };

function _meAplicarFoco() {
  const colIdx = _ME_COL[_mePeriodo]; 
  document.querySelectorAll('#tableMatrizBody tr').forEach(row => {
    row.querySelectorAll('td').forEach((td, i) => {
      td.classList.remove('col-focus');
      if (colIdx !== undefined && i === colIdx) td.classList.add('col-focus');
    });
  });
}

function initMatrizEficiencia() {
  const m = DATA.matrizEficiencia;

  function effCell(v, extraClass) {
    return `<td class="${extraClass || ''}">${v.toFixed(2)}%</td>`;
  }
  function varMetaCell(jul, meta) {
    const v   = (jul / meta - 1) * 100;
    const cls = v >= 0 ? 'td-pos' : 'td-neg';
    const sinal = v >= 0 ? '+' : '';
    return `<td class="${cls}">${sinal}${v.toFixed(2)}%</td>`;
  }
  function varTrimCell(v) {
    const cls = v >= 0 ? 'td-pos' : 'td-neg';
    const sinal = v >= 0 ? '+' : '';
    return `<td class="${cls}">${sinal}${v.toFixed(2)}%</td>`;
  }

  let rows = '';
  m.faixas.forEach((f, i) => {
    const mar      = m.historico["Mar"][i];
    const abr      = m.historico["Abr"][i];
    const mai      = m.historico["Mai"][i];
    const jun      = m.historico["Jun"][i];
    const julReal  = m.historico["Jul"][i];
    const trim     = (abr + mai + jun) / 3;
    const jul      = m.julProj[i];
    const meta     = m.meta[i];
    const vTrim    = m.varTrim[i];

    rows += `<tr>
      <td>${f.label}</td>
      ${effCell(mar)}
      ${effCell(abr)}
      ${effCell(mai)}
      ${effCell(jun)}
      ${effCell(trim)}
      ${effCell(julReal)}
      <td class="td-julproj">${jul.toFixed(2)}%</td>
      <td>${meta.toFixed(2)}%</td>
      ${varMetaCell(jul, meta)}
      ${varTrimCell(vTrim)}
    </tr>`;
  });

  const gh    = m.globalHistorico;
  const gMar  = gh["Mar"], gAbr = gh["Abr"], gMai = gh["Mai"], gJun = gh["Jun"], gJulReal = gh["Jul"];
  const gTrim = (gAbr + gMai + gJun) / 3;

  rows += `<tr class="row-global">
    <td>Eficiência Global</td>
    ${effCell(gMar)}
    ${effCell(gAbr)}
    ${effCell(gMai)}
    ${effCell(gJun)}
    ${effCell(gTrim)}
    ${effCell(gJulReal)}
    <td class="td-julproj">${m.globalJulProj.toFixed(2)}%</td>
    <td>${m.globalMeta.toFixed(2)}%</td>
    ${varMetaCell(m.globalJulProj, m.globalMeta)}
    ${varTrimCell(m.globalVarTrim)}
  </tr>`;

  document.getElementById('tableMatrizBody').innerHTML = rows;
  _meAplicarFoco();

  const acimaMeta  = m.faixas.filter((_, i) => m.icmMeta[i] >= 100);
  const abaixoMeta = m.faixas.filter((_, i) => m.icmMeta[i] < 100);
  const melhorIdx  = m.icmMeta.indexOf(Math.max(...m.icmMeta));
  const piorIdx    = m.icmMeta.indexOf(Math.min(...m.icmMeta));

  const melhorandoJul = m.faixas
    .filter((_, i) => m.varTrim[i] > 0)
    .map(f => f.id);
  const piorandoJul = m.faixas
    .filter((_, i) => m.varTrim[i] < 0)
    .map(f => f.id);

  const gIcm = m.globalIcmMeta;
  const globalStatus = gIcm >= 100
    ? `<strong>ICM Global s/ Meta: ${gIcm.toFixed(1)}%</strong> — eficiência global projetada <strong>acima da meta</strong> em Jul/26, com variação de <strong>${m.globalVarTrim >= 0 ? '+' : ''}${m.globalVarTrim.toFixed(2)} p.p.</strong> vs. média trimestral.`
    : `<strong>ICM Global s/ Meta: ${gIcm.toFixed(1)}%</strong> — eficiência global projetada <strong>abaixo da meta</strong> em Jul/26, com variação de <strong>${m.globalVarTrim.toFixed(2)} p.p.</strong> vs. média trimestral.`;

  document.getElementById('me-destaque').innerHTML = `
    <div class="destaque-title">⚡ Destaque Automático — Jul/26</div>
    <p class="destaque-text">${globalStatus}</p>
    <p class="destaque-text" style="margin-top:10px">
      <strong>${acimaMeta.length} de ${m.faixas.length} faixas</strong> projetadas acima da meta de eficiência:
      ${acimaMeta.map(f => `<strong>${f.id}</strong>`).join(', ') || '—'}.
      ${abaixoMeta.length > 0
        ? `Faixas abaixo da meta: ${abaixoMeta.map(f => `<strong>${f.id}</strong>`).join(', ')} — requerem atenção.`
        : 'Todas as faixas acima da meta.'}
    </p>
    <p class="destaque-text" style="margin-top:10px">
      <strong>Melhor ICM s/ Meta:</strong> Faixa <strong>${m.faixas[melhorIdx].id}</strong>
      com <strong style="color:var(--delta-pos)">${m.icmMeta[melhorIdx].toFixed(1)}%</strong> (proj. ${m.julProj[melhorIdx].toFixed(2)}% vs. meta ${m.meta[melhorIdx].toFixed(2)}%).
      <strong>Pior ICM:</strong> Faixa <strong>${m.faixas[piorIdx].id}</strong>
      com <strong style="color:var(--delta-neg)">${m.icmMeta[piorIdx].toFixed(1)}%</strong>.
    </p>
    ${melhorandoJul.length > 0 ? `
    <p class="destaque-text" style="margin-top:10px">
      Faixas com <strong>tendência de melhora</strong> vs. média trimestral:
      ${melhorandoJul.map(l => `<strong>${l}</strong>`).join(', ')}.
      ${piorandoJul.length > 0 ? `Tendência de queda: ${piorandoJul.map(l => `<strong>${l}</strong>`).join(', ')}.` : ''}
    </p>` : ''}
  `;
}
