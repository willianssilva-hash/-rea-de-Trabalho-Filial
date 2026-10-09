# COCKPIT DIÁRIO · Colormaq — Área de Trabalho Filial

Painel web (tema **azul & branco**) para acompanhamento intra-dia da operação de
entregas e coletas da filial, alimentado pelas abas **“Cockpit Diário”** e
**“Rotina Diária Mot. Frota2”** da planilha *Área de Trabalho Filial*.

> Repositório de publicação: <https://github.com/willianssilva-hash/Cockpit>
> (branch `arena/01932278-rea-de-trabalho-filial`)

---

## O que o painel entrega

**Indicadores do dia** (aba *Cockpit Diário*)
- Entregas realizadas × previstas e % de conclusão do plano
- OTD e SLA contra meta, coletas, devoluções/avarias, ocorrências
- Disponibilidade de frota, custo por km, km rodado × planejado, horas extras e absenteísmo

**Visualizações**
1. Curva de entregas do dia (acumulado previsto × realizado) — mostra se a operação está à frente ou atrás do plano hora a hora
2. Rosca de status das entregas (concluídas, em rota, pendentes, devolução, avaria)
3. OTD × meta nos últimos dias de operação (pontos vermelhos = dia abaixo da meta)
4. Disponibilidade da frota (operação, reserva, manutenção, parados)
5. Conclusão de rota por motorista com linha de meta (aba *Rotina Diária Mot. Frota2*)
6. Devoluções × ocorrências no histórico

**Insights & destaques** — leitura automática dos dados:
projeção de fechamento do dia, OTD vs. meta, rotas em risco de não concluir,
rotas modelo, capacidade perdida por frota parada, devoluções vs. média,
custo/eficiência de rodagem e saídas fora do horário.

**Rotina diária — motoristas & frota**: tabela completa com filtros por status,
busca, ordenação por coluna, barras de progresso e linha de totais.

## Como executar

O painel é 100% estático (HTML + CSS + JS + Chart.js empacotado em `app/vendor/`),
sem build e sem dependências externas:

```bash
cd app
python3 -m http.server 8080 --bind 0.0.0.0
# abra http://localhost:8080
```

## Conectando a planilha real

Os JSONs em `app/data/` espelham o esquema das duas abas. Para substituir os
dados de demonstração pelos reais:

```bash
# opção 1 — exporte as abas em CSV (Arquivo > Baixar > CSV) e importe:
python3 scripts/import_spreadsheet.py --rotina "Rotina.csv" --cockpit "Cockpit.csv"

# opção 2 — com a planilha pública ("qualquer pessoa com o link"):
python3 scripts/import_spreadsheet.py --sheet-id 1McDH0IhIa3LyvJ_QIkTlTZjUf90SLRGQlabdZXuDyIM \
        --gid-cockpit 1951800208 --gid-rotina <gid da aba de rotina>
```

O importador normaliza cabeçalhos (acentos/caixa), aceita sinônimos de colunas e
relata o que não conseguir mapear. Metas ajustáveis por variável de ambiente
(`COCKPIT_META_OTD`, `COCKPIT_META_SLA`, `COCKPIT_META_CUSTO_KM`,
`COCKPIT_META_DEV`, `COCKPIT_META_DISP`, `COCKPIT_FILIAL`).

Para regenerar o conjunto de demonstração: `python3 scripts/build_demo_data.py`.

## Estrutura

```
app/
  index.html            página do cockpit
  css/style.css         tema azul & branco
  js/app.js             renderização (KPIs, gráficos, insights, tabela)
  vendor/chart.umd.min.js  Chart.js 4.5.1 (empacotado)
  assets/               logo Colormaq (azul, branca e oficial)
  data/                 cockpit_diario.json + rotina_diaria.json
scripts/
  import_spreadsheet.py importação CSV/Sheets -> app/data
  build_demo_data.py    gera dados de demonstração coerentes
```

## Identidade visual

Tema em azul (`#052E5C → #0A4FA0`) e branco, com a logo **Colormaq** no topo
(versão branca sobre o cabeçalho azul) e no rodapé.
