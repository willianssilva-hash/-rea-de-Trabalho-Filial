# TRANSFERÊNCIA DO PROJETO — COCKPIT DIÁRIO (Colormaq)

Todo o progresso desta sessão (painel v3 + dados reais da planilha + scripts)
está na branch `arena/01932278-rea-de-trabalho-filial` do repositório
`willianssilva-hash/-rea-de-Trabalho-Filial`. Os blocos abaixo carregam **100%
do conteúdo** para o diretório/repositório que você quiser — escolha o cenário
da outra aba e cole o bloco correspondente.

---

## CENÁRIO A — a outra aba está no diretório do repositório `Cockpit` (clone vazio ou não)

```bash
git fetch https://github.com/willianssilva-hash/-rea-de-Trabalho-Filial.git \
      arena/01932278-rea-de-trabalho-filial:refs/heads/arena/origem
git checkout -B main arena/origem
git push -u origin main
```

> Em repositório recém-criado (sem nenhum commit), os três comandos funcionam
> como estão: o `fetch` traz a branch, o `checkout -B main` cria a `main` com
> todo o conteúdo e o `push` publica no `Cockpit`.

## CENÁRIO B — a outra aba está num diretório QUALQUER (ainda sem git)

```bash
git clone -b arena/01932278-rea-de-trabalho-filial \
      https://github.com/willianssilva-hash/-rea-de-Trabalho-Filial.git Cockpit
cd Cockpit
git remote set-url origin https://github.com/willianssilva-hash/Cockpit.git
git push -u origin arena/01932278-rea-de-trabalho-filial:main
```

## CENÁRIO C — a outra aba é uma sessão do Arena vinculada ao repo `Cockpit`

Cole este texto para o agente de lá:

> Busque todo o conteúdo do painel COCKPIT DIÁRIO e publique neste repositório:
> `git fetch https://github.com/willianssilva-hash/-rea-de-Trabalho-Filial.git arena/01932278-rea-de-trabalho-filial:refs/heads/arena/origem && git checkout -B main arena/origem && git push -u origin main`.
> Não altere nenhum arquivo; apenas confirme depois que `app/index.html`,
> `app/js/app.js`, `app/data/*.json`, `scripts/` e `README.md` existem na raiz.

## CENÁRIO D — quer só VER/BAIXAR os arquivos sem git

Abrir no navegador (branch da sessão):
`https://github.com/willianssilva-hash/-rea-de-Trabalho-Filial/tree/arena/01932278-rea-de-trabalho-filial`
ou baixar o zip:
`https://codeload.github.com/willianssilva-hash/-rea-de-Trabalho-Filial/zip/refs/heads/arena/01932278-rea-de-trabalho-filial`

---

## Conferência após colar (qualquer cenário)

```bash
ls app/index.html app/js/app.js app/data/cockpit_diario.json scripts/import_pubhtml.py README.md
cd app && python3 -m http.server 8080 --bind 0.0.0.0   # abra http://localhost:8080
```

O painel deve abrir com: contagem de 09/10 = **FILIAL-BA 49 · MATRIZ-SP 60 ·
total 109**, seletor de datas 01/10→09/10, gráfico de evolução, tabela-árvore
do resumo, frota detalhada (147 veículos) e motoristas (27).

## O que está incluído (manifesto)

```
README.md                         documentação completa do cockpit
app/index.html                    página do COCKPIT DIÁRIO (tema azul/branco, logo Colormaq)
app/css/style.css                 tema, KPIs, gráficos, tabelas, insights
app/js/app.js                     v3: seletor de data, D-1, evolução, agregações, insights
app/vendor/chart.umd.min.js       Chart.js 4.5.1 empacotado (sem CDN)
app/assets/logo-colormaq-*.png    logo Colormaq (branca p/ topo, azul p/ rodapé, oficial)
app/data/cockpit_diario.json      matriz real: 147 veículos × 21 datas + resumo por dia
app/data/rotina_diaria.json       27 motoristas × status (captura de 09/10)
data/raw/cockpit_00..04.md        raw publicado da aba "Cockpit Diário" (proveniência)
scripts/import_pubhtml.py         raw → JSON do painel (valida 49/60/109)
scripts/import_spreadsheet.py     CSVs exportados → JSON (layout em tópicos)
scripts/build_dados_capturas.py   regenera conjunto transcrito das capturas
```

## Atualizar os dados no futuro

1. Publicar/republishar a aba “Cockpit Diário” na web e salvar o HTML em
   `data/raw/cockpit_NN.md` (chunks, na ordem);
2. `python3 scripts/import_pubhtml.py`;
3. Recarregar o painel (botão **Atualizar**).
