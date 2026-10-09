# COCKPIT DIÁRIO · Colormaq — Área de Trabalho Filial

Painel web (tema **azul & branco**, logo **Colormaq**) para acompanhamento
diário da frota e dos motoristas da filial, espelhando as abas da planilha
*Área de Trabalho Filial*:

- **“Cockpit Diário”** → *COCKPIT RESUMO DIÁRIO GERAL* — contagem de veículos por
  **local × categoria × status** (FILIAL-BA e MATRIZ-SP);
- **“Rotina Diária Mot. Frota2”** → *Acompanhamento Diário Frota - Geral* —
  status de cada **motorista** por local CD.

> Repositório de publicação: <https://github.com/willianssilva-hash/Cockpit>
> Desenvolvimento na branch `arena/01932278-rea-de-trabalho-filial`.

---

## O que o painel entrega

**Indicadores do dia** — frota contada, carregados, em trânsito (viagem + retorno),
aguardando descarga no cliente, vazios/reposição, indisponíveis
(manutenção + MEC + sinistro + inativo), fluxo CD/manobra e motoristas acompanhados.

**Visualizações**
1. Evolução diária da frota por status (todos os dias captados na planilha)
2. Status da frota por local (barras empilhadas FILIAL-BA × MATRIZ-SP)
3. Distribuição geral da frota por grupo de status (rosca com total ao centro)
4. Categorias de veículo × status (bitrem, carreta agreg., CVM, truck, plataformas…)
5. Motoristas por status (rosca)

**Seletor de data** no topo: todos os KPIs, gráficos, insights e a tabela-árvore
recalculam para o dia escolhido, com comparação D-1 nos cartões.

**Insights & destaques** — leitura automática da contagem:
fila de descarga no cliente, indisponíveis de oficina/sinistro, bolsa de vazios
para reposicionar, carregados prontos, volume em trânsito, movimentação interna,
motoristas sem status e concentração da frota.

**Tabelas fiéis à planilha**
- *Cockpit Resumo Diário Geral*: estrutura em tópicos local → categoria → status,
  com pontos coloridos por status, totais por categoria, por local e total geral;
- *Frota detalhada por veículo*: placa, marca/modelo, tipo, categoria, local,
  situação e status do dia (147 veículos), com filtros, busca e ordenação;
- *Acompanhamento Diário Frota*: motoristas agrupados por local CD, com filtros,
  busca, ordenação e totais por grupo.

## Como executar

Painel 100% estático (HTML + CSS + JS + Chart.js empacotado em `app/vendor/`),
sem build e sem dependências externas:

```bash
cd app
python3 -m http.server 8080 --bind 0.0.0.0
# abra http://localhost:8080
```

## Conectando a planilha real

A planilha já está **publicada na web**, e o painel hoje roda com a matriz
veículo × data baixada dela (contagens validadas: 09/10 = FILIAL-BA 49 ·
MATRIZ-SP 60 · total 109, idêntico ao resumo oficial).

Fluxo de atualização:

```bash
# 1. baixe o HTML publicado da aba "Cockpit Diário" (matriz veículo × data)
#    e salve os chunks em data/raw/cockpit_NN.md
# 2. converta para os JSONs do painel:
python3 scripts/import_pubhtml.py
```

Para importar a partir de CSVs exportados (Arquivo → Baixar → CSV),
use `scripts/import_spreadsheet.py --cockpit ... --rotina ...`
(entende o layout em tópicos, ignora linhas de total e remove sufixos
“(F)/(M)”); `scripts/build_dados_capturas.py` regenera o conjunto
transcrito das capturas de tela (motoristas de 09/10).

## Publicar no repositório Cockpit

O desenvolvimento acontece na branch `arena/01932278-rea-de-trabalho-filial`
deste repositório. Para espelhar no `Cockpit` (assim que a integração tiver
permissão de escrita nele, ou a partir da sua máquina):

```bash
git clone https://github.com/willianssilva-hash/-rea-de-Trabalho-Filial.git cockpit
cd cockpit
git checkout arena/01932278-rea-de-trabalho-filial
git remote add cockpit https://github.com/willianssilva-hash/Cockpit.git
git push cockpit arena/01932278-rea-de-trabalho-filial:main
```

(ou publique a própria branch e defina-a como default em *Settings → Branches*;
o painel funciona igual, basta servir/abrir a pasta `app/`.)

## Estrutura

```
app/
  index.html            página do cockpit
  css/style.css         tema azul & branco
  js/app.js             agregações, KPIs, gráficos, insights e tabelas
  vendor/chart.umd.min.js  Chart.js 4.5.1 (empacotado)
  assets/               logo Colormaq (azul, branca e oficial)
  data/                 cockpit_diario.json + rotina_diaria.json
data/raw/             raw publicado da aba "Cockpit Diário" (chunks .md)
scripts/
  import_pubhtml.py     raw (matriz veículo × data) -> app/data/cockpit_diario.json
  import_spreadsheet.py CSVs exportados -> app/data (layout em tópicos das abas)
  build_dados_capturas.py  contagem/motoristas de 09/10 transcritos das capturas
```

## Identidade visual

Tema em azul (`#052E5C → #0A4FA0`) e branco; logo **Colormaq** branca no
cabeçalho azul e azul no rodapé. Status seguem a codificação por cor da
planilha (carregado azul, em viagem verde, retorno âmbar, manutenção vermelho,
aguard. cliente roxo etc.).
