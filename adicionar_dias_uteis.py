"""
Script ONE-TIME: adiciona "diasUteis" às entradas históricas de Jan–Jun/26
no data.json do repositório GitHub.

Execute uma única vez. Após isso, o atualizar_dashboard.py já gerencia
o mês parcial automaticamente.
"""
import json
import os
from github import Github

REPO_NAME         = "devrenanoliveira/zon-dashboard-enhanced"
FILE_PATH_IN_REPO = "data.json"

# Dias úteis confirmados pelo usuário para cada mês histórico
DIAS_UTEIS = {
    "Jan/26": 21,
    "Fev/26": 18,
    "Mar/26": 22,
    "Abr/26": 20,
    "Mai/26": 20,
    "Jun/26": 21,
}

def main():
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise ValueError("Variável GITHUB_TOKEN não encontrada.")

    g        = Github(token)
    repo     = g.get_repo(REPO_NAME)
    contents = repo.get_contents(FILE_PATH_IN_REPO)
    dados    = json.loads(contents.decoded_content.decode("utf-8"))

    historico = dados["resultadoGeral"]["historico"]
    atualizados = []

    for h in historico:
        mes = h.get("mes", "")
        # Ignora o mês parcial (tem "*") — já gerenciado pelo atualizar_dashboard.py
        if "*" in mes:
            continue
        if mes in DIAS_UTEIS:
            h["diasUteis"] = DIAS_UTEIS[mes]
            atualizados.append(f'{mes} → {DIAS_UTEIS[mes]} DU')

    if not atualizados:
        print("⚠️  Nenhuma entrada encontrada para atualizar. Verifique os nomes dos meses no data.json.")
        return

    print(f"✅ Entradas atualizadas: {', '.join(atualizados)}")

    novo_json = json.dumps(dados, ensure_ascii=False, indent=2)
    repo.update_file(
        path=contents.path,
        message="[one-time] Adiciona diasUteis ao histórico Jan–Jun/26",
        content=novo_json,
        sha=contents.sha
    )
    print("💾 data.json atualizado no GitHub com sucesso!")

if __name__ == "__main__":
    main()
