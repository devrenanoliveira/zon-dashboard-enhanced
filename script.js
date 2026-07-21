function _renderEficiencia() {
  const ef = DATA.matrizEficiencia;
  const hist = DATA.resultadoGeral.eficienciaHistorico || [];

  // Função padrão de cores para o ICM (Vermelho <=50, Amarelo <=90, Verde >90)
  function icmColor(v) {
    if (v == null || isNaN(v)) return 'inherit';
    return v <= 50 ? '#EF4444' : v <= 90 ? '#F59E0B' : '#10B981';
  }

  // Cores dinâmicas para o texto do card de ICM Efic Atual
  const icmAtualVal = ef.icmEficAtual;
  const corTextoCard = icmColor(icmAtualVal);

  // 1. Renderização dos Cards Principais
  document.getElementById('efic-kpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">META EFICIÊNCIA JUL/26</div>
      <div class="kpi-value">${ef.metaJul.toFixed(2).replace('.', ',')}%</div>
      <div class="kpi-sub">% recuperado sobre carteira</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">EFICIÊNCIA ATUAL (PARCIAL)</div>
      <div class="kpi-value">${ef.eficAtual.toFixed(2).replace('.', ',')}%</div>
      <div class="kpi-sub">Acumulado até ${ef.diasUteisDecorridos} DUs</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">EFICIÊNCIA PROJETADA</div>
      <div class="kpi-value">${ef.eficProj.toFixed(2).replace('.', ',')}%</div>
      <div class="kpi-sub">Estimativa para o mês fechado</div>
    </div>
    <div class="kpi-card" style="background-color: #ECFDF5; border-color: #A7F3D0;">
      <div class="kpi-label" style="color: #065F46;">ICM EFIC. ATUAL</div>
      <div class="kpi-value" style="color: ${corTextoCard};">${icmAtualVal.toFixed(1).replace('.', ',')}%</div>
      <div class="kpi-sub" style="color: #047857;">Efic. atual vs. meta</div>
    </div>
    <div class="kpi-card dark">
      <div class="kpi-label">ICM EFIC. PROJETADO</div>
      <div class="kpi-value">${ef.icmEficProj.toFixed(1).replace('.', ',')}%</div>
      <div class="kpi-sub">Projeção do mês vs. meta</div>
    </div>
  `;

  // 2. Renderização da Tabela de Histórico (com as cores aplicadas no ICM)
  const tbody = document.getElementById('efic-historico-tbody');
  if (!tbody) return;

  tbody.innerHTML = hist.map(row => {
    const metaTxt = row.metaEfic != null ? row.metaEfic.toFixed(2).replace('.', ',') + '%' : '—';
    const atualTxt = row.eficAtual != null ? row.eficAtual.toFixed(2).replace('.', ',') + '%' : '—';
    const projTxt = row.eficProj != null ? row.eficProj.toFixed(2).replace('.', ',') + '%' : '—';
    
    const icmAtualNum = row.icmAtual;
    const icmProjNum = row.icmProj;

    const icmAtualTxt = icmAtualNum != null ? icmAtualNum.toFixed(1).replace('.', ',') + '%' : '—';
    const icmProjTxt = icmProjNum != null ? icmProjNum.toFixed(1).replace('.', ',') + '%' : '—';

    const corIcmAtual = icmColor(icmAtualNum);
    const corIcmProj = icmColor(icmProjNum);

    return `
      <tr>
        <td><strong>${row.mes}</strong></td>
        <td>${metaTxt}</td>
        <td>${atualTxt}</td>
        <td>${projTxt}</td>
        <td><strong style="color: ${corIcmAtual};">${icmAtualTxt}</strong></td>
        <td><strong style="color: ${corIcmProj};">${icmProjTxt}</strong></td>
      </tr>
    `;
  }).join('');
}
