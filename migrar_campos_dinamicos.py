"""
Script ONE-TIME: migra campos fixos de Jul no data.json para nomes genéricos.

Renomeia:
  matrizEficiencia.julProj       → matrizEficiencia.projAtual
  matrizEficiencia.globalJulProj → matrizEficiencia.globalProjAtual
Adiciona (se ainda não existir):
  meta.mesCurto = "Jul"
  meta.mesAnterior = "Jun/26"  (campo já usado pelo JS mas pode não estar no JSON)

Execute UMA VEZ. Após isso, atualizar_dashboard.py já gerencia esses campos automaticamente.
"""
import json
import os
from github import Github

REPO_NAME         = "devrenanoliveira/zon-dashboard-enhanced"
FILE_PATH_IN_REPO = "data.json"

def main():
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise ValueError("Variável GITHUB_TOKEN não encontrada.")

    g        = Github(token)
    repo     = g.get_repo(REPO_NAME)
    contents = repo.get_contents(FILE_PATH_IN_REPO)
    dados    = json.loads(contents.decoded_content.decode("utf-8"))

    alteracoes = []

    # 1. matrizEficiencia.julProj → projAtual
    me = dados.get("matrizEficiencia", {})
    if "julProj" in me:
        me["projAtual"] = me.pop("julProj")
        alteracoes.append("matrizEficiencia.julProj → projAtual")
    elif "projAtual" in me:
        alteracoes.append("projAtual já existe (ok)")

    # 2. matrizEficiencia.globalJulProj → globalProjAtual
    if "globalJulProj" in me:
        me["globalProjAtual"] = me.pop("globalJulProj")
        alteracoes.append("matrizEficiencia.globalJulProj → globalProjAtual")
    elif "globalProjAtual" in me:
        alteracoes.append("globalProjAtual já existe (ok)")

    # 3. meta.mesCurto (adiciona se ausente)
    meta = dados.setdefault("meta", {})
    if "mesCurto" not in meta:
        meta["mesCurto"] = "Jul"
        alteracoes.append("meta.mesCurto = 'Jul' (adicionado)")
    else:
        alteracoes.append(f"meta.mesCurto já existe: '{meta['mesCurto']}' (ok)")

    # 4. meta.mesAnterior (adiciona se ausente — usado pelo JS)
    if "mesAnterior" not in meta:
        meta["mesAnterior"] = "Jun/26"
        alteracoes.append("meta.mesAnterior = 'Jun/26' (adicionado)")
    else:
        alteracoes.append(f"meta.mesAnterior já existe: '{meta['mesAnterior']}' (ok)")

    print("Alterações:")
    for a in alteracoes:
        print(f"  ✅ {a}")

    novo_json = json.dumps(dados, ensure_ascii=False, indent=2)
    repo.update_file(
        path=contents.path,
        message="[one-time] Migra julProj→projAtual, globalJulProj→globalProjAtual; adiciona mesCurto/mesAnterior",
        content=novo_json,
        sha=contents.sha
    )
    print("\n💾 data.json atualizado no GitHub com sucesso!")

if __name__ == "__main__":
    main()
