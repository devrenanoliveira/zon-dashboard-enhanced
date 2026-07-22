import json
import os
import re
import pandas as pd
from github import Github
from datetime import datetime

# ─── CONFIGURAÇÕES ────────────────────────────────────────────────
REPO_NAME        = "devrenanoliveira/zon-dashboard-enhanced"   # <-- confirmar nome exato do repo
FILE_PATH_IN_REPO = "data.json"

EXPORT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS_S_-IE3A40T6BkRrRMm6CxN-T72cNnEboQ1QfSY8ebEXveWL2gJ621sSrTFWeV2j3jghsbmX3klta/pub?gid=1091839868&single=true&output=csv"

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

# ─── PRINCIPAL ────────────────────────────────────────────────────
def atualizar_dashboard():
    print("📥 Lendo JSON_EXPORT do Google Sheets...")
    try:
        df = pd.read_csv(EXPORT_URL, header=None)
    except Exception as e:
        print(f"❌ Erro ao carregar CSV: {e}")
        return

    # Mapa chave → float limpo  |  mapa chave → string original
    dados_map = {}
    raw_map   = {}
    for _, row in df.iterrows():
        if pd.notna(row[0]):
            chave = str(row[0]).strip()
            raw   = str(row[1]).strip() if len(row) > 1 and pd.notna(row[1]) else None
            raw_map[chave]   = raw
            dados_map[chave] = limpar_float(raw)

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

    def g(chave, fallback=0):
        v = dados_map.get(chave)
        return v if v is not None else fallback

    meta_mensal      = g("meta_mensal")
    recuperado_atual = g("recuperado_atual")
    projecao_mes     = g("projecao_mes")
    efic_anterior    = g("eficiencia_anterior",
                         dados["resultadoGeral"].get("eficienciaAnterior", 0))
    meta_efic_global = g("meta_efic_global",
                         dados["resultadoGeral"].get("metaEficMes", 0))
    efic_proj_global = g("efic_proj_global")     # eficiência projetada global (% da carteira)
    var_trim_global  = g("var_trim_global")

    carteira_total   = g("carteira_total")
    pre_juizo_valor  = g("pre_juizo_valor")
    pre_juizo_real   = g("pre_juizo_real")
    pos_juizo_valor  = g("pos_juizo_valor")
    pos_juizo_real   = g("pos_juizo_real")

    # Faixas B–J
    faixas_ids      = ["B", "C", "D", "E", "F", "G", "H", "I", "J"]
    carteira_faixas = [g(f"carteira_{f}") for f in faixas_ids]
    efic_faixas     = [g(f"efic_{f}")     for f in faixas_ids]
    meta_faixas     = [g(f"meta_efic_{f}") for f in faixas_ids]
    proj_faixas     = [g(f"proj_efic_{f}") for f in faixas_ids]
    var_trim_faixas = [g(f"var_trim_{f}") for f in faixas_ids]

    # Segmentos
    seg_keys = ["curto", "medio", "tardia", "loss"]
    seg_meta = [g(f"seg_{k}_meta") for k in seg_keys]
    seg_real = [g(f"seg_{k}_real") for k in seg_keys]
    seg_proj = [g(f"seg_{k}_proj") for k in seg_keys]

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

    # ICM e eficiências
    efic_atual        = r2(recuperado_atual / meta_mensal * 100) if meta_mensal else 0
    efic_atual_global = r2(recuperado_atual / carteira_total * 100) if carteira_total else 0

    # efic_proj_global vem do CSV (fórmula do sheets); fallback para cálculo simples
    if not efic_proj_global and carteira_total:
        efic_proj_global = r2(projecao_mes / carteira_total * 100)
    efic_proj_global = efic_proj_global or 0

    icm_efic_atual = r2(efic_atual_global / meta_efic_global * 100) if meta_efic_global else 0
    icm_efic_proj  = r2(efic_proj_global  / meta_efic_global * 100) if meta_efic_global else 0

    # Carteira pré/pós
    pre_pct  = r2(pre_juizo_valor / carteira_total * 100) if carteira_total else 0
    pos_pct  = r2(pos_juizo_valor / carteira_total * 100) if carteira_total else 0
    pre_taxa = r2(pre_juizo_real  / pre_juizo_valor * 100) if pre_juizo_valor else 0
    pos_taxa = r2(pos_juizo_real  / pos_juizo_valor * 100) if pos_juizo_valor else 0

    # ICM por segmento
    seg_icm = [
        r2(seg_proj[i] / seg_meta[i] * 100) if seg_meta[i] else 0
        for i in range(4)
    ]

    # Taxa de recuperação por segmento (média ponderada pela carteira de cada faixa)
    def taxa_ponderada(indices):
        cart = sum(carteira_faixas[i] for i in indices if carteira_faixas[i])
        if not cart:
            return 0
        rec = sum((carteira_faixas[i] or 0) * efic_faixas[i] / 100 for i in indices)
        return r2(rec / cart * 100)

    seg_taxa = [
        taxa_ponderada([0]),       # Curto: B
        taxa_ponderada([1, 2]),    # Médio: C, D
        taxa_ponderada([3, 4, 5]), # Tardia: E, F, G
        taxa_ponderada([6, 7, 8])  # Loss: H, I, J
    ]

    # ICM por faixa (Matriz de Eficiência)
    icm_meta_faixas = [
        r2(proj_faixas[i] / meta_faixas[i] * 100) if meta_faixas[i] else 0
        for i in range(9)
    ]

    # ─── ATUALIZA O JSON ──────────────────────────────────────────
    dados["meta"]["lastUpdated"] = datetime.now().strftime("%d/%m/%Y, %H:%M")

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

    # Evolução — mês parcial (formato: "Jul*", "Ago*", etc.)
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
    me["julProj"]            = [r2(v) for v in proj_faixas]
    me["meta"]               = [r2(v) for v in meta_faixas]
    me["varTrim"]            = [r2(v) for v in var_trim_faixas]
    me["icmMeta"]            = icm_meta_faixas
    me["globalHistorico"][mes_key] = efic_atual_global
    me["globalJulProj"]      = efic_proj_global
    me["globalVarTrim"]      = r2(var_trim_global)
    me["globalIcmMeta"]      = icm_efic_proj

    # PERFORMANCE DE VENCIMENTOS — gerenciada manualmente, não tocada pelo script

    # ─── GRAVA NO GITHUB ──────────────────────────────────────────
    novo_json = json.dumps(dados, ensure_ascii=False, indent=2)
    print("💾 Atualizando data.json no GitHub...")
    repo.update_file(
        path=contents.path,
        message=f"Atualização automática — {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        content=novo_json,
        sha=contents.sha
    )
    print("✅ Dashboard atualizado com sucesso!")

if __name__ == "__main__":
    atualizar_dashboard()
