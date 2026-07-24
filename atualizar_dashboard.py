import json
import os
import re
import pandas as pd
from github import Github
from datetime import datetime, timezone, timedelta

BRT = timezone(timedelta(hours=-3))  # Brasília (UTC-3, sem horário de verão)

# ─── CONFIGURAÇÕES ────────────────────────────────────────────────
REPO_NAME         = "devrenanoliveira/zon-dashboard-enhanced"
FILE_PATH_IN_REPO = "data.json"

EXPORT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS_S_-IE3A40T6BkRrRMm6CxN-T72cNnEboQ1QfSY8ebEXveWL2gJ621sSrTFWeV2j3jghsbmX3klta/pub?gid=1091839868&single=true&output=csv"

PERF_VENC_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS_S_-IE3A40T6BkRrRMm6CxN-T72cNnEboQ1QfSY8ebEXveWL2gJ621sSrTFWeV2j3jghsbmX3klta/pub?gid=1282570949&single=true&output=csv"

DIAS_VENC = [1, 5, 10, 15, 20, 25]

# ─── HELPERS ──────────────────────────────────────────────────────
def limpar_float(val):
    """Converte 'R$ 1.234,56' ou '12,34%' para float. Retorna None se vazio."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).replace("R$", "").replace("%", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(s)
    except ValueError:
        return None

def limpar_int(val):
    v = limpar_float(val)
    return int(round(v)) if v is not None else None

def r2(v):
    return round(v, 2) if v is not None else None

def parse_pct(v):
    """Converte '58,23%' ou '58.23' para float (0–100). Retorna None se inválido."""
    s = str(v).replace('%', '').replace(',', '.').strip()
    try:
        return round(float(s), 2)
    except (ValueError, TypeError):
        return None

def media_safe(lst, key):
    """Média dos valores não-None de uma lista de dicts."""
    vals = [item[key] for item in lst if item.get(key) is not None]
    return round(sum(vals) / len(vals), 2) if vals else None

# ─── PERFORMANCE DE VENCIMENTOS ───────────────────────────────────
def processar_performance_vencimentos(dados):
    print("\n📥 Lendo Performance de Vencimentos...")
    try:
        df_raw = pd.read_csv(PERF_VENC_URL, header=None, dtype=str)
    except Exception as e:
        print(f"❌ Erro ao carregar CSV de performance: {e}")
        return

    print(f"📊 CSV de vencimentos: {len(df_raw)} linhas, {len(df_raw.columns)} colunas")

    # ── Localiza dinamicamente a linha que contém "0" e "4" como cabeçalhos ──
    # (o Sheets pode ter linhas em branco ou título antes dos cabeçalhos reais)
    header_row_idx = None
    for i in range(min(10, len(df_raw))):
        row_vals = df_raw.iloc[i].fillna('').astype(str).str.strip().tolist()
        if '0' in row_vals and '4' in row_vals:
            header_row_idx = i
            break

    if header_row_idx is None:
        print(f"❌ Linha de cabeçalho com D0/D4 não encontrada nas primeiras 10 linhas.")
        print(f"   Linha 0: {df_raw.iloc[0].fillna('').tolist()[:20]}")
        return

    header_dias = df_raw.iloc[header_row_idx].fillna('').astype(str).str.strip().tolist()
    col_d0 = next((i for i, v in enumerate(header_dias) if v == "0"), None)
    col_d4 = next((i for i, v in enumerate(header_dias) if v == "4"), None)

    if col_d0 is None or col_d4 is None:
        print(f"❌ Colunas D0/D4 não encontradas. Headers linha {header_row_idx}: {header_dias[:20]}")
        return

    print(f"📌 Cabeçalho na linha {header_row_idx} — D0 na coluna {col_d0}, D4 na coluna {col_d4}")

    # ── Dados reais: tudo após a linha de cabeçalho (date parsing descarta não-datas) ──
    df = df_raw.iloc[header_row_idx + 1:].reset_index(drop=True).copy()

    # ── Parse de datas (coluna 0 = DATA VENCIMENTO, formato dd/mm/aaaa) ──
    df['data_venc'] = pd.to_datetime(df[0], dayfirst=True, errors='coerce')
    df = df.dropna(subset=['data_venc'])
    df['dia']     = df['data_venc'].dt.day
    df['mes_ano'] = df['data_venc'].dt.to_period('M')

    # ── Filtra apenas os dias de vencimento relevantes ──
    df = df[df['dia'].isin(DIAS_VENC)].copy()

    # ── Parse dos percentuais D0 e D4 ──
    df['d0'] = df[col_d0].apply(parse_pct)
    df['d4'] = df[col_d4].apply(parse_pct)

    # ── Períodos: mês atual e últimos 3 meses (trimestral) ──
    hoje      = datetime.now(BRT)
    mes_atual = pd.Period(f"{hoje.year}-{hoje.month:02d}", 'M')
    meses_trim = [mes_atual - i for i in range(1, 4)]

    df_atual = df[df['mes_ano'] == mes_atual].copy()
    df_trim  = df[df['mes_ano'].isin(meses_trim)].copy()

    print(f"📅 Mês atual: {mes_atual} — {len(df_atual)} vencimentos encontrados")
    print(f"📊 Trimestral: {[str(m) for m in meses_trim]} — {len(df_trim)} registros")

    # ── Média trimestral por dia de vencimento ──
    trim_avg = df_trim.groupby('dia').agg(
        d0_media=('d0', 'mean'),
        d4_media=('d4', 'mean')
    )

    # ── Monta array de vencimentos ──
    vencimentos = []
    for dia in DIAS_VENC:
        try:
            data_d0 = datetime(hoje.year, hoje.month, dia, tzinfo=BRT)
            data_d4 = data_d0 + timedelta(days=4)
        except ValueError:
            continue  # dia inválido para o mês

        # Status baseado na data de hoje
        if hoje.date() > data_d4.date():
            status, parcial, dia_corrido = 'maturado', False, None
        elif hoje.date() >= data_d0.date():
            status      = 'maturando'
            parcial     = True
            dia_corrido = (hoje.date() - data_d0.date()).days
        else:
            status, parcial, dia_corrido = 'pendente', False, None

        # Valores do mês atual
        row = df_atual[df_atual['dia'] == dia]
        mes_d0 = float(row['d0'].values[0]) if len(row) > 0 and pd.notna(row['d0'].values[0]) else None
        mes_d4 = float(row['d4'].values[0]) if len(row) > 0 and pd.notna(row['d4'].values[0]) else None

        # Médias trimestrais
        med_d0 = round(trim_avg.loc[dia, 'd0_media'], 2) if dia in trim_avg.index else None
        med_d4 = round(trim_avg.loc[dia, 'd4_media'], 2) if dia in trim_avg.index else None

        var_d0 = r2(mes_d0 - med_d0) if mes_d0 is not None and med_d0 is not None else None
        var_d4 = r2(mes_d4 - med_d4) if mes_d4 is not None and med_d4 is not None else None

        vencimentos.append({
            'dia':         dia,
            'status':      status,
            'parcial':     parcial,
            'diaCorrido':  dia_corrido,
            'mesD0':       mes_d0,
            'mesD4':       mes_d4,
            'mediaTrimD0': med_d0,
            'mediaTrimD4': med_d4,
            'varD0':       var_d0,
            'varD4':       var_d4,
        })

    # ── Cards de resumo: média de dias 01, 05, 10 (já maturados) ──
    maturados = [v for v in vencimentos if v['dia'] in [1, 5, 10] and v['mesD0'] is not None]

    d0_pct  = media_safe(maturados, 'mesD0')
    d4_pct  = media_safe(maturados, 'mesD4')
    d0_trim = media_safe(maturados, 'mediaTrimD0')
    d4_trim = media_safe(maturados, 'mediaTrimD4')
    d0_var  = r2(d0_pct - d0_trim) if d0_pct is not None and d0_trim is not None else 0
    d4_var  = r2(d4_pct - d4_trim) if d4_pct is not None and d4_trim is not None else 0

    # Em maturação: dias 15, 20, 25 ainda não fechados em D4
    tardios       = [v for v in vencimentos if v['dia'] in [15, 20, 25]]
    em_mat_total  = len(tardios)
    em_mat_atual  = sum(1 for v in tardios if v['status'] != 'maturado')

    # ── Grava no dados ──
    pv = dados['performanceVencimentos']
    pv['vencimentos'] = vencimentos

    r = pv['resumo']
    r['d0']['percentual'] = d0_pct
    r['d0']['vsMedia']    = d0_trim
    r['d0']['variacao']   = d0_var
    r['d4']['percentual'] = d4_pct
    r['d4']['vsMedia']    = d4_trim
    r['d4']['variacao']   = d4_var
    r['emMaturacao']['atual'] = em_mat_atual
    r['emMaturacao']['total'] = em_mat_total

    print(f"✅ Performance processada: {len(vencimentos)} vencimentos | "
          f"D0={d0_pct}% | D4={d4_pct}% | Em maturação: {em_mat_atual}/{em_mat_total}")

# ─── PRINCIPAL ────────────────────────────────────────────────────
def atualizar_dashboard():
    print("📥 Lendo JSON_EXPORT do Google Sheets...")
    try:
        df = pd.read_csv(EXPORT_URL, header=None)
    except Exception as e:
        print(f"❌ Erro ao carregar CSV: {e}")
        return

    print(f"📊 CSV carregado: {len(df)} linhas, {len(df.columns)} colunas")
    print(f"🔍 Primeiras 3 linhas:\n{df.head(3).to_string()}")

    # Detecta automaticamente se o CSV tem 2 colunas (chave|valor)
    # ou 4 colunas (vazia|linha|chave|valor)
    num_cols = len(df.columns)
    if num_cols >= 4:
        col_chave, col_valor = 2, 3
    else:
        col_chave, col_valor = 0, 1
    print(f"📌 Usando colunas: chave={col_chave}, valor={col_valor}")

    # Mapa chave → float limpo  |  mapa chave → string original
    dados_map = {}
    raw_map   = {}
    SKIP = {"Coluna A (Chave)", "Chave", "Linha", ""}
    for _, row in df.iterrows():
        if len(row) > col_chave and pd.notna(row[col_chave]):
            chave = str(row[col_chave]).strip()
            if chave in SKIP:
                continue
            raw = str(row[col_valor]).strip() if len(row) > col_valor and pd.notna(row[col_valor]) else None
            raw_map[chave]   = raw
            dados_map[chave] = limpar_float(raw)

    print(f"✅ {len(dados_map)} chaves carregadas do CSV")
    print(f"🔑 Chaves encontradas: {list(dados_map.keys())[:10]}...")

    # ─── GITHUB ───────────────────────────────────────────────────
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise ValueError("Token do GitHub (GITHUB_TOKEN) não encontrado.")

    g        = Github(token)
    repo     = g.get_repo(REPO_NAME)
    contents = repo.get_contents(FILE_PATH_IN_REPO)
    dados    = json.loads(contents.decoded_content.decode("utf-8"))

    # Detecta o mês parcial dinamicamente ("Jul/26*", "Ago/26*", etc.)
    mes_parcial = next(
        (h["mes"] for h in dados["resultadoGeral"]["historico"] if "*" in h["mes"]),
        None
    )
    if not mes_parcial:
        print("❌ Nenhum mês parcial encontrado no histórico.")
        return
    # Extrai a chave curta ("Jul", "Ago", etc.) para usar na Matriz
    mes_key = re.sub(r"/\d{2}\*$", "", mes_parcial)  # "Jul/26*" → "Jul"

    print(f"📅 Mês parcial detectado: {mes_parcial} (chave: {mes_key})")

    # ─── LEITURA DOS VALORES DO CSV ───────────────────────────────

    def gv(chave, fallback=0):
        v = dados_map.get(chave)
        return v if v is not None else fallback

    meta_mensal      = gv("meta_mensal")
    recuperado_atual = gv("recuperado_atual")
    projecao_mes     = gv("projecao_mes")
    efic_anterior    = gv("eficiencia_anterior",
                          dados["resultadoGeral"].get("eficienciaAnterior", 0))
    meta_efic_global = gv("meta_efic_global",
                          dados["resultadoGeral"].get("metaEficMes", 0))
    efic_proj_global = gv("efic_proj_global")
    var_trim_global  = gv("var_trim_global")

    carteira_total   = gv("carteira_total")
    pre_juizo_valor  = gv("pre_juizo_valor")
    pre_juizo_real   = gv("pre_juizo_real")
    pos_juizo_valor  = gv("pos_juizo_valor")
    pos_juizo_real   = gv("pos_juizo_real")

    # Faixas B–J
    faixas_ids      = ["B", "C", "D", "E", "F", "G", "H", "I", "J"]
    carteira_faixas = [gv(f"carteira_{f}") for f in faixas_ids]
    efic_faixas     = [gv(f"efic_{f}")     for f in faixas_ids]
    meta_faixas     = [gv(f"meta_efic_{f}") for f in faixas_ids]
    proj_faixas     = [gv(f"proj_efic_{f}") for f in faixas_ids]
    var_trim_faixas = [gv(f"var_trim_{f}") for f in faixas_ids]

    # Segmentos
    seg_keys = ["curto", "medio", "tardia", "loss"]
    seg_meta = [gv(f"seg_{k}_meta") for k in seg_keys]
    seg_real = [gv(f"seg_{k}_real") for k in seg_keys]
    seg_proj = [gv(f"seg_{k}_proj") for k in seg_keys]

    # Recuperação por DU
    rec_du_vals = []
    for i in range(1, 24):
        v = dados_map.get(f"rec_du_{i}")
        if v and v > 0:
            rec_du_vals.append({"du": i, "val": int(round(v))})

    # Produção por dia
    prod_dia_vals = []
    for i in range(1, 32):
        v = dados_map.get(f"prod_dia_{i}")
        if v and v > 0:
            prod_dia_vals.append({"du": i, "val": round(v, 2)})

    # ─── DERIVAÇÕES ───────────────────────────────────────────────
    dus_decorridos = len(rec_du_vals)
    diario_atual   = rec_du_vals[-1]["val"] if rec_du_vals else 0

    efic_atual        = r2(recuperado_atual / meta_mensal * 100) if meta_mensal else 0
    efic_atual_global = r2(recuperado_atual / carteira_total * 100) if carteira_total else 0

    if not efic_proj_global and carteira_total:
        efic_proj_global = r2(projecao_mes / carteira_total * 100)
    efic_proj_global = efic_proj_global or 0

    icm_efic_atual = r2(efic_atual_global / meta_efic_global * 100) if meta_efic_global else 0
    icm_efic_proj  = r2(efic_proj_global  / meta_efic_global * 100) if meta_efic_global else 0

    pre_pct  = r2(pre_juizo_valor / carteira_total * 100) if carteira_total else 0
    pos_pct  = r2(pos_juizo_valor / carteira_total * 100) if carteira_total else 0
    pre_taxa = r2(pre_juizo_real  / pre_juizo_valor * 100) if pre_juizo_valor else 0
    pos_taxa = r2(pos_juizo_real  / pos_juizo_valor * 100) if pos_juizo_valor else 0

    seg_icm = [
        r2(seg_proj[i] / seg_meta[i] * 100) if seg_meta[i] else 0
        for i in range(4)
    ]

    def taxa_ponderada(indices):
        cart = sum(carteira_faixas[i] for i in indices if carteira_faixas[i])
        if not cart:
            return 0
        rec = sum((carteira_faixas[i] or 0) * efic_faixas[i] / 100 for i in indices)
        return r2(rec / cart * 100)

    seg_taxa = [
        taxa_ponderada([0]),
        taxa_ponderada([1, 2]),
        taxa_ponderada([3, 4, 5]),
        taxa_ponderada([6, 7, 8])
    ]

    icm_meta_faixas = [
        r2(proj_faixas[i] / meta_faixas[i] * 100) if meta_faixas[i] else 0
        for i in range(9)
    ]

    # ─── ATUALIZA O JSON ──────────────────────────────────────────
    dados["meta"]["lastUpdated"] = datetime.now(BRT).strftime("%d/%m/%Y, %H:%M")
    dados["meta"]["mesCurto"]   = mes_key  # "Jul", "Ago"… usado pelo JS para lógica dinâmica

    # mesAnterior: último mês encerrado (sem "*") no histórico
    historico_encerrados = [h["mes"] for h in dados["resultadoGeral"]["historico"] if "*" not in h["mes"]]
    dados["meta"]["mesAnterior"] = historico_encerrados[-1] if historico_encerrados else None

    # RESULTADO GERAL
    rg = dados["resultadoGeral"]
    rg["recuperacaoAtual"]    = r2(recuperado_atual)
    rg["metaMensal"]          = r2(meta_mensal)
    rg["projecaoMes"]         = r2(projecao_mes)
    rg["diasUteisDecorridos"] = dus_decorridos
    rg["eficienciaAtual"]     = efic_atual
    rg["eficienciaAnterior"]  = efic_anterior
    rg["taxaRecuperacao"]     = efic_proj_global
    rg["eficAtualMes"]        = efic_atual_global
    rg["eficProjMes"]         = efic_proj_global
    rg["metaEficMes"]         = meta_efic_global
    rg["icmEficAtual"]        = icm_efic_atual
    rg["icmEficProj"]         = icm_efic_proj
    rg["diarioAtual"]         = diario_atual

    # Histórico — mês parcial
    for h in rg["historico"]:
        if h["mes"] == mes_parcial:
            h["recuperado"] = r2(recuperado_atual)
            h["meta"]       = r2(meta_mensal)
            h["recupPre"]   = r2(pre_juizo_real)
            h["recupPos"]   = r2(pos_juizo_real)
            h["diasUteis"]  = rg.get("diasUteisTotais", 23)
            break

    # Eficiência histórico — mês parcial
    for e in rg["eficienciaHistorico"]:
        if e["mes"] == mes_parcial:
            e["eficAtual"]    = efic_atual_global
            e["eficProj"]     = efic_proj_global
            e["metaEfic"]     = meta_efic_global
            e["icmEficAtual"] = icm_efic_atual
            e["icmEficProj"]  = icm_efic_proj
            break

    # PRODUÇÃO POR DU
    if prod_dia_vals:
        dados["producaoPorDU"]["meses"][mes_parcial]["dados"] = prod_dia_vals

    # RECUPERAÇÃO POR DU
    if rec_du_vals:
        dados["recuperacaoPorDU"]["mesAtual"] = rec_du_vals

    # CARTEIRA E FASES
    cf = dados["carteiraFases"]
    cf["totalCarteira"]       = r2(carteira_total)
    cf["projecaoRecuperacao"] = r2(projecao_mes)

    cf["preJuizo"]["valor"]      = r2(pre_juizo_valor)
    cf["preJuizo"]["percentual"] = pre_pct
    cf["preJuizo"]["taxaRec"]    = pre_taxa
    cf["preJuizo"]["variacao"]   = 0

    cf["posJuizo"]["valor"]      = r2(pos_juizo_valor)
    cf["posJuizo"]["percentual"] = pos_pct
    cf["posJuizo"]["taxaRec"]    = pos_taxa
    cf["posJuizo"]["variacao"]   = 0

    # Evolução — mês parcial
    ev_key = mes_key + "*"
    for ev in cf["evolucao"]:
        if ev["mes"] == ev_key:
            ev["pre"] = r2(pre_juizo_valor)
            ev["pos"] = r2(pos_juizo_valor)
            break

    # Fases B–J
    for i, fase in enumerate(cf["fases"]):
        if carteira_faixas[i]:
            fase["valor"]   = r2(carteira_faixas[i])
            fase["pct"]     = r2(carteira_faixas[i] / carteira_total * 100) if carteira_total else 0
            fase["taxaRec"] = efic_faixas[i]

    # SEGMENTO DE FAIXA
    sf = dados["segmentoFaixa"]
    sf["meta"]       = [r2(v) for v in seg_meta]
    sf["recuperado"] = [r2(v) for v in seg_real]
    sf["projecao"]   = [r2(v) for v in seg_proj]
    sf["icm"]        = seg_icm
    sf["taxa"]       = seg_taxa

    # MATRIZ DE EFICIÊNCIA
    me = dados["matrizEficiencia"]
    me["historico"][mes_key] = [r2(v) for v in efic_faixas]
    me["projAtual"]          = [r2(v) for v in proj_faixas]   # genérico: era "julProj"
    me["meta"]               = [r2(v) for v in meta_faixas]
    me["varTrim"]            = [r2(v) for v in var_trim_faixas]
    me["icmMeta"]            = icm_meta_faixas
    me["globalHistorico"][mes_key] = efic_atual_global
    me["globalProjAtual"]    = efic_proj_global             # genérico: era "globalJulProj"
    me["globalVarTrim"]      = r2(var_trim_global)
    me["globalIcmMeta"]      = icm_efic_proj

    # PERFORMANCE DE VENCIMENTOS — leitura automática do CSV separado
    processar_performance_vencimentos(dados)

    # ─── GRAVA NO GITHUB ──────────────────────────────────────────
    novo_json = json.dumps(dados, ensure_ascii=False, indent=2)
    print("\n💾 Atualizando data.json no GitHub...")
    repo.update_file(
        path=contents.path,
        message=f"Atualização automática — {datetime.now(BRT).strftime('%d/%m/%Y %H:%M')}",
        content=novo_json,
        sha=contents.sha
    )
    print("✅ Dashboard atualizado com sucesso!")

if __name__ == "__main__":
    atualizar_dashboard()
