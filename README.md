# Dashboard KPIs | Cobrança Z-ON Card

Dashboard web para acompanhamento dos indicadores operacionais e financeiros da operação de cobrança do **Z-ON Card** (cartão private label do Grupo Zonta). Atualização automática de segunda a sexta às 09h BRT, sem necessidade de login.

🔗 **[Acessar o dashboard](https://devrenanoliveira.github.io/zon-dashboard-enhanced/)**

---

## Abas

| Aba | Conteúdo |
|---|---|
| **Resultado Geral** | KPIs de recuperação, ICM, IEC e projeção de fechamento |
| **Produtividade Diária** | Recuperação por dia útil e evolução no mês |
| **Recuperação por DU** | Histórico de R$/DU e comparativo mensal |
| **Carteira & Fases** | Saldo por faixa de atraso (B–J), Pré e Pós-Prejuízo |
| **Segmento de Faixa** | Eficiência e ICM por segmento de aging |
| **Performance de Vencimentos** | D0/D4 por dia de vencimento + curva de recuperação |
| **Matriz de Eficiência** | Eficiência por faixa com variação vs. meta e vs. trimestre |
| **Assessorias** | Resultados por assessoria externa (Fácil, PG+, Decisão) |
| **Internalização** | Projeção de custos e economia com internalização da cobrança |

---

## Estrutura de arquivos

```
zon-dashboard-enhanced/
├── index.html                      # Estrutura HTML — 9 abas
├── script.js                       # Lógica JS (vanilla, sem frameworks)
├── style.css                       # Estilos + modo escuro
├── data.json                       # Fonte única de dados do dashboard
├── atualizar_dashboard.py          # Script Python de atualização
└── .github/
    └── workflows/
        └── atualizar.yml           # GitHub Actions — cron Seg–Sex 09h BRT
```

---

## Como funciona a atualização

```
Google Sheets (CSV publicado)
        │
        ▼
atualizar_dashboard.py   ←── GitHub Actions (cron: 0 12 * * 1-5)
        │
        ▼
    data.json   ──commit──▶   GitHub Pages   ──▶   Dashboard online
```

O script Python lê duas abas da planilha via CSV publicado:

- **`JSON_EXPORT`** — dados principais (recuperação, metas, carteira, assessorias etc.)
- **`PERF_VENC`** — percentuais D0/D4 e curvas D-13→D+20 por dia de vencimento (1, 5, 10, 15, 20, 25)

O `data.json` resultante é commitado automaticamente e o GitHub Pages serve a versão atualizada.

---

## Links externos na barra de navegação

| Botão | URL |
|---|---|
| Estudo para meta | https://targetszoncard.netlify.app/ |
| Governança | https://devrenanoliveira.github.io/collections_governance/ |
| Qualidade | https://devrenanoliveira.github.io/dashboard_analise_qualidade/ |
| Acionamento carteira | https://devrenanoliveira.github.io/acionamentos-zon/ |

---

## Stack técnico

- **Front-end:** HTML5 + CSS3 + JavaScript vanilla
- **Gráficos:** [Chart.js 4.4.1](https://www.chartjs.org/)
- **Exportação Excel:** [SheetJS xlsx 0.18.5](https://sheetjs.com/)
- **Back-end / pipeline:** Python 3 com `pandas`, `openpyxl`, `PyGithub`
- **Infraestrutura:** GitHub Pages + GitHub Actions
- **Tema:** modo claro/escuro com persistência em `localStorage`

---

## Regras de negócio principais

**Faixas de atraso (padrão B–J):**

| Faixa | Dias | Grupo |
|---|---|---|
| B | 05–30d | Pré-Prejuízo |
| C | 31–65d | Pré-Prejuízo |
| D | 66–90d | Pré-Prejuízo |
| E | 91–120d | Pré-Prejuízo |
| F | 121–150d | Pré-Prejuízo |
| G | 151–180d | Pré-Prejuízo |
| H | 181–360d | Pós-Prejuízo |
| I | 361–720d | Pós-Prejuízo |
| J | 720d+ | Pós-Prejuízo |

**Métricas principais:**

- **ICM** = Recuperado ÷ Meta × 100
- **Eficiência (%)** = Recuperado ÷ Carteira Total × 100
- **IEC** = Investimento Total ÷ Recuperação do mês (meta: < 5,9%)
- **Projeção** = Recuperado Atual ÷ DUs Decorridos × DUs Totais

**Sinalização de ICM:**

| ICM | Cor |
|---|---|
| ≥ 100% | 🟢 Verde |
| 85–99% | 🟡 Âmbar |
| < 85% | 🔴 Vermelho |

---

## Assessorias externas cobertas

| Assessoria | Atuação |
|---|---|
| **Fácil Resultado** | D+5 em diante |
| **Decisão** | D+66 em diante (em implantação) |
| **PG+** | D+181 em diante (Pós-Prejuízo) |
