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
1. Status da frota por local (barras empilhadas FILIAL-BA × MATRIZ-SP)
2. Distribuição geral da frota por grupo de status (rosca com total ao centro)
3. Categorias de veículo × status (bitrem, carreta agreg., CVM, truck, plataformas…)
4. Motoristas por status (rosca)

**Insights & destaques** — leitura automática da contagem:
fila de descarga no cliente, indisponíveis de oficina/sinistro, bolsa de vazios
para reposicionar, carregados prontos, volume em trânsito, movimentação interna,
motoristas sem status e concentração da frota.

**Tabelas fiéis à planilha**
- *Cockpit Resumo Diário Geral*: estrutura em tópicos local → categoria → status,
  com pontos coloridos por status, totais por categoria, por local e total geral;
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

Os JSONs em `app/data/` seguem o esquema das abas. Hoje eles carregam a contagem
de **09/10 transcrita das capturas de tela**; com a planilha pública
(*Compartilhar → qualquer pessoa com o link*), atualize com:

```bash
python3 scripts/import_spreadsheet.py --sheet-id 1McDH0IhIa3LyvJ_QIkTlTZjUf90SLRGQlabdZXuDyIM \
        --gid-cockpit 1951800208 --gid-rotina 1316334574 --data-referencia 2026-10-09
```

ou exporte as abas em CSV (Arquivo → Baixar → CSV):

```bash
python3 scripts/import_spreadsheet.py --cockpit "Cockpit Diario.csv" --rotina "Rotina.csv"
```

O importador entende o layout em tópicos das abas (ignora linhas de total,
remove sufixos “(F)/(M)” dos status) e recalcula todos os totais.
Para regenerar o conjunto transcrito das capturas:
`python3 scripts/build_dados_capturas.py`.

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
scripts/
  import_spreadsheet.py CSV/Sheets -> app/data (layout em tópicos das abas)
  build_dados_capturas.py  contagem de 09/10 transcrita das capturas
```

## Identidade visual

Tema em azul (`#052E5C → #0A4FA0`) e branco; logo **Colormaq** branca no
cabeçalho azul e azul no rodapé. Status seguem a codificação por cor da
planilha (carregado azul, em viagem verde, retorno âmbar, manutenção vermelho,
aguard. cliente roxo etc.).
