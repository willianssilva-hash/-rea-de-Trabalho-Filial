/* ==========================================================================
   COCKPIT DIÁRIO · Colormaq — Área de Trabalho Filial  (v3)
   Painel de frota alimentado pela matriz veículo × data da aba
   "Cockpit Diário" (COCKPIT DIÁRIO FROTA CAPTAÇÃO) e pelo acompanhamento
   de motoristas da aba "Rotina Diária Mot. Frota2".
   Fontes: data/cockpit_diario.json e data/rotina_diaria.json
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------ utilidades ----------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const num = (v) => nf0.format(v || 0);
  const pct = (v) => nf1.format(v || 0) + "%";
  const pctOf = (a, b) => (b ? (a / b) * 100 : 0);
  const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const dataBR = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`; };
  const dataCurta = (iso) => dataBR(iso).slice(0, 5);
  const diaSemana = (iso) => { const [y, m, d] = iso.split("-").map(Number); return DIAS[new Date(y, m - 1, d).getDay()]; };
  const horaBR = (iso) => (iso || "").split("T")[1]?.slice(0, 5) || "—";
  const sigla = (local) => (local.includes("BA") ? "BA" : local.includes("SP") ? "SP" : local);

  /* --------------------------- tema & status ---------------------------- */
  const COR = {
    azul900: "#052E5C", azul800: "#063B78", azul700: "#08468D", azul600: "#0A4FA0",
    azul500: "#1669C4", azul300: "#7FB0E4", azul100: "#DCE9F8", azul050: "#EEF5FC",
    cinza: "#B9CDE4", ok: "#128A5A", warn: "#D98A00", risk: "#C6362B",
    grade: "#E3ECF6", texto: "#5A7184",
  };
  const GRUPO = {
    "Carregado": "Carregado", "Em Viagem": "Em trânsito", "Retorno": "Em trânsito",
    "Vazio": "Vazio / reposição", "Ag. Desc. Cliente": "Aguard. desc. cliente",
    "Aguard. Descarga Cliente": "Aguard. desc. cliente", "Manutenção": "Indisponível",
    "MEC": "Indisponível", "Sinistro Batida": "Indisponível", "Inativo": "Indisponível",
    "Fluxo CD": "Interno / CD", "Manobra": "Interno / CD", "Interno": "Interno / CD",
    "Disponível": "Disponível", "Sem contagem": "Sem contagem", "Não informado": "Não informado",
  };
  const ORDEM_GRUPO = ["Carregado", "Em trânsito", "Vazio / reposição", "Aguard. desc. cliente",
    "Interno / CD", "Indisponível", "Disponível", "Sem contagem", "Não informado"];
  const COR_GRUPO = {
    "Carregado": COR.azul600, "Em trânsito": COR.azul500, "Vazio / reposição": COR.azul300,
    "Aguard. desc. cliente": "#7C4DBC", "Interno / CD": "#6E86A8", "Indisponível": COR.risk,
    "Disponível": COR.ok, "Sem contagem": "#D9E2EC", "Não informado": COR.cinza,
  };
  const COR_STATUS = {
    "Carregado": COR.azul600, "Em Viagem": COR.ok, "Retorno": COR.warn, "Vazio": COR.azul300,
    "Ag. Desc. Cliente": "#7C4DBC", "Aguard. Descarga Cliente": "#7C4DBC",
    "Manutenção": COR.risk, "MEC": "#8D6E63", "Sinistro Batida": "#8E1B12", "Inativo": "#8A97A5",
    "Fluxo CD": "#B39DDB", "Manobra": "#90A4AE", "Interno": "#9FA8DA", "Disponível": COR.ok,
    "Sem contagem": "#D9E2EC", "Não informado": COR.cinza,
  };
  const dot = (status) => `<i class="dot" style="background:${COR_STATUS[status] || COR.cinza}"></i>`;

  Chart.defaults.font.family = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
  Chart.defaults.font.size = 11.5;
  Chart.defaults.color = COR.texto;
  Chart.defaults.borderColor = COR.grade;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.tooltip.backgroundColor = "rgba(5,46,92,.94)";
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;

  Chart.register({
    id: "centroRosca",
    afterDraw(chart, args, opts) {
      if (!opts || !opts.texto) return;
      const meta = chart.getDatasetMeta(0);
      if (!meta.data.length) return;
      const { x, y } = meta.data[0];
      const { ctx } = chart;
      ctx.save();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "700 24px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = COR.azul900; ctx.fillText(opts.texto, x, y - 8);
      ctx.font = "600 10.5px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = COR.texto; ctx.fillText(opts.rotulo || "", x, y + 13);
      ctx.restore();
    },
  });

  /* ------------------------------ estado ------------------------------- */
  const estado = {
    cockpit: null, rotina: null, charts: {},
    data: null, datas: [],
    filtro: "todos", busca: "", sort: null,
    filtroFrota: "todos", buscaFrota: "", sortFrota: null,
  };

  async function carregar() {
    const cb = "?v=" + Date.now();
    const [c, r] = await Promise.all([
      fetch("data/cockpit_diario.json" + cb).then((r) => r.json()),
      fetch("data/rotina_diaria.json" + cb).then((r) => r.json()),
    ]);
    estado.cockpit = c;
    estado.rotina = r;
    estado.datas = Object.entries(c.resumo_por_data || {})
      .filter(([, rows]) => rows.reduce((s, r) => s + r.quantidade, 0) > 0)
      .map(([d]) => d).sort();
    if (!estado.data || !estado.datas.includes(estado.data)) {
      estado.data = c.meta.data_referencia && estado.datas.includes(c.meta.data_referencia)
        ? c.meta.data_referencia : estado.datas[estado.datas.length - 1];
    }
  }

  /* --------------------------- agregações ------------------------------ */
  function agregar() {
    const res = (estado.cockpit.resumo_por_data || {})[estado.data] || [];
    const locais = [], cats = [];
    const porLocal = {}, porCat = {}, porGrupo = {}, porStatus = {};
    let total = 0;
    for (const r of res) {
      if (!porLocal[r.local]) { porLocal[r.local] = {}; locais.push(r.local); }
      const ck = r.categoria + " · " + sigla(r.local);
      if (!porCat[ck]) { porCat[ck] = {}; cats.push(ck); }
      const g = GRUPO[r.status] || "Sem contagem";
      porLocal[r.local][g] = (porLocal[r.local][g] || 0) + r.quantidade;
      porCat[ck][g] = (porCat[ck][g] || 0) + r.quantidade;
      porGrupo[g] = (porGrupo[g] || 0) + r.quantidade;
      porStatus[r.status] = (porStatus[r.status] || 0) + r.quantidade;
      total += r.quantidade;
    }
    const motStatus = {}, motLocal = {};
    for (const l of estado.rotina.linhas || []) {
      motStatus[l.status] = (motStatus[l.status] || 0) + 1;
      motLocal[l.local] = (motLocal[l.local] || 0) + 1;
    }
    /* evolução: totais por grupo em cada data com contagem */
    const evol = estado.datas.map((d) => {
      const g = {};
      let t = 0;
      for (const r of (estado.cockpit.resumo_por_data || {})[d] || []) {
        const gr = GRUPO[r.status] || "Sem contagem";
        g[gr] = (g[gr] || 0) + r.quantidade; t += r.quantidade;
      }
      return { data: d, grupos: g, total: t };
    });
    const idx = estado.datas.indexOf(estado.data);
    return { res, locais, cats, porLocal, porCat, porGrupo, porStatus, total,
             motStatus, motLocal, evol, anterior: idx > 0 ? evol[idx - 1] : null };
  }

  /* ================================ KPIs ================================ */
  function delta(v, rotulo) {
    if (v == null) return `<span>${rotulo}</span>`;
    const cls = v === 0 ? "flat" : v > 0 ? "up" : "down";
    return `<span class="kpi-delta ${cls}">${v === 0 ? "•" : v > 0 ? "▲" : "▼"} ${num(Math.abs(v))}</span><span>${rotulo}</span>`;
  }
  function renderKPIs(A) {
    const g = (k) => A.porGrupo[k] || 0;
    const gAnt = (k) => (A.anterior ? A.anterior.grupos[k] || 0 : null);
    const d1 = (k) => (A.anterior ? g(k) - gAnt(k) : null);
    const cards = [
      { rot: "Frota contada no dia", valor: num(A.total), compl: " veículos",
        foot: delta(d1("total") != null ? A.total - A.anterior.total : null, A.anterior ? " vs. " + dataCurta(A.anterior.data) : "") +
              `<span> · ${A.locais.map((l) => sigla(l) + " " + num(Object.values(A.porLocal[l]).reduce((s, v) => s + v, 0))).join(" · ")}</span>` },
      { rot: "Carregados", valor: num(g("Carregado")), compl: " · " + pct(pctOf(g("Carregado"), A.total)),
        barra: pctOf(g("Carregado"), A.total), tone: "ok", foot: delta(d1("Carregado"), " vs. dia anterior") },
      { rot: "Em trânsito", valor: num(g("Em trânsito")), compl: " · " + pct(pctOf(g("Em trânsito"), A.total)),
        barra: pctOf(g("Em trânsito"), A.total),
        foot: `<span>viagem <b>${num(A.porStatus["Em Viagem"] || 0)}</b> · retorno <b>${num(A.porStatus["Retorno"] || 0)}</b></span>` },
      { rot: "Aguard. desc. cliente", valor: num(g("Aguard. desc. cliente")), compl: " · " + pct(pctOf(g("Aguard. desc. cliente"), A.total)),
        barra: pctOf(g("Aguard. desc. cliente"), A.total),
        tone: pctOf(g("Aguard. desc. cliente"), A.total) > 15 ? "risk" : "warn",
        foot: delta(d1("Aguard. desc. cliente"), " vs. dia anterior") },
      { rot: "Vazios / reposição", valor: num(g("Vazio / reposição")), compl: " · " + pct(pctOf(g("Vazio / reposição"), A.total)),
        barra: pctOf(g("Vazio / reposição"), A.total), foot: delta(d1("Vazio / reposição"), " vs. dia anterior") },
      { rot: "Indisponíveis", valor: num(g("Indisponível")), compl: " · " + pct(pctOf(g("Indisponível"), A.total)),
        barra: pctOf(g("Indisponível"), A.total), tone: g("Indisponível") ? "risk" : "ok",
        foot: `<span>manut. <b>${num(A.porStatus["Manutenção"] || 0)}</b> · MEC <b>${num(A.porStatus["MEC"] || 0)}</b> · sinistro <b>${num(A.porStatus["Sinistro Batida"] || 0)}</b> · inativo <b>${num(A.porStatus["Inativo"] || 0)}</b></span>` },
      { rot: "Fluxo CD / manobra", valor: num(g("Interno / CD")), compl: " · " + pct(pctOf(g("Interno / CD"), A.total)),
        barra: pctOf(g("Interno / CD"), A.total), foot: "<span>movimentação interna / CD</span>" },
      { rot: "Motoristas acompanhados", valor: num((estado.rotina.linhas || []).length),
        compl: " · " + num((estado.rotina.linhas || []).filter((l) => l.status !== "Não informado").length) + " c/ status",
        foot: `<span>disponíveis <b>${num(A.motStatus["Disponível"] || 0)}</b> · internos <b>${num(A.motStatus["Interno"] || 0)}</b> · sem status <b>${num(A.motStatus["Não informado"] || 0)}</b></span>` },
    ];
    $("#kpi-grid").innerHTML = cards.map((c) => `
      <article class="kpi ${c.tone ? "tone-" + c.tone : ""}">
        <div class="kpi-label">${c.rot}</div>
        <div class="kpi-value">${c.valor}${c.compl ? `<small>${c.compl}</small>` : ""}</div>
        ${c.barra != null ? `<div class="kpi-bar"><i style="width:${Math.min(100, c.barra)}%"></i></div>` : ""}
        <div class="kpi-foot">${c.foot || ""}</div>
      </article>`).join("");
  }

  /* ============================== gráficos ============================== */
  function destruir(id) { if (estado.charts[id]) { estado.charts[id].destroy(); delete estado.charts[id]; } }
  const gruposPresentes = (A) => ORDEM_GRUPO.filter((gr) => (A.porGrupo[gr] || 0) > 0);

  function renderCharts(A) {
    const grupos = gruposPresentes(A);
    const ds = (mapFn) => grupos.map((gr) => ({
      label: gr, data: mapFn(gr), backgroundColor: COR_GRUPO[gr],
      borderColor: "#fff", borderWidth: 1, borderRadius: 3, barPercentage: .68,
    }));

    /* --- evolução diária (todos os dias captados) --- */
    destruir("evol");
    const gruposEvol = ORDEM_GRUPO.filter((gr) => A.evol.some((e) => (e.grupos[gr] || 0) > 0));
    estado.charts.evol = new Chart($("#chart-evol"), {
      type: "bar",
      data: {
        labels: A.evol.map((e) => dataCurta(e.data)),
        datasets: gruposEvol.map((gr) => ({
          label: gr, data: A.evol.map((e) => e.grupos[gr] || 0),
          backgroundColor: COR_GRUPO[gr], borderRadius: 2, barPercentage: .8,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: COR.grade } } },
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { footer: (it) => "total: " + num(A.evol[it[0].dataIndex].total) + " veículos" } },
        },
      },
    });
    $("#tag-evol").textContent = A.evol.length + " dias · " + num(A.evol[A.evol.length - 1].total) + " veículos no último";

    /* --- status por local --- */
    destruir("locais");
    estado.charts.locais = new Chart($("#chart-locais"), {
      type: "bar",
      data: { labels: A.locais, datasets: ds((gr) => A.locais.map((l) => A.porLocal[l][gr] || 0)) },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        scales: { x: { stacked: true, beginAtZero: true, grid: { color: COR.grade } }, y: { stacked: true, grid: { display: false } } },
        plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${num(c.parsed.x)} veículos` } } },
      },
    });
    $("#tag-locais").textContent = "contagem de " + dataCurta(estado.data);

    /* --- distribuição geral --- */
    destruir("grupos");
    const gruposRosca = grupos.filter((gr) => gr !== "Sem contagem");
    estado.charts.grupos = new Chart($("#chart-grupos"), {
      type: "doughnut",
      data: {
        labels: gruposRosca,
        datasets: [{ data: gruposRosca.map((gr) => A.porGrupo[gr]), backgroundColor: gruposRosca.map((gr) => COR_GRUPO[gr]), borderColor: "#fff", borderWidth: 2, hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "62%",
        plugins: {
          legend: { position: "bottom" },
          centroRosca: { texto: num(A.total), rotulo: "veículos" },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${num(c.parsed)} (${pct(pctOf(c.parsed, A.total))})` } },
        },
      },
    });

    /* --- categorias × status --- */
    destruir("cats");
    estado.charts.cats = new Chart($("#chart-categorias"), {
      type: "bar",
      data: { labels: A.cats, datasets: ds((gr) => A.cats.map((ck) => A.porCat[ck][gr] || 0)) },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 38, minRotation: 38 } }, y: { stacked: true, beginAtZero: true, grid: { color: COR.grade } } },
        plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${num(c.parsed.y)} veículos` } } },
      },
    });
    const maiorCat = A.cats.slice().sort((a, b) =>
      Object.values(A.porCat[b]).reduce((s, v) => s + v, 0) - Object.values(A.porCat[a]).reduce((s, v) => s + v, 0))[0];
    $("#tag-cats").textContent = "maior: " + (maiorCat || "—");

    /* --- motoristas por status --- */
    destruir("mot");
    const mst = Object.entries(A.motStatus).sort((a, b) => b[1] - a[1]);
    estado.charts.mot = new Chart($("#chart-motoristas"), {
      type: "doughnut",
      data: {
        labels: mst.map((m) => m[0]),
        datasets: [{ data: mst.map((m) => m[1]), backgroundColor: mst.map((m) => COR_STATUS[m[0]] || COR.cinza), borderColor: "#fff", borderWidth: 2, hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "62%",
        plugins: {
          legend: { position: "bottom" },
          centroRosca: { texto: num((estado.rotina.linhas || []).length), rotulo: "motoristas" },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${num(c.parsed)} motoristas` } },
        },
      },
    });
    $("#tag-mot").textContent = Object.keys(A.motLocal).length + " locais";
  }

  /* ============================== insights ============================== */
  function renderInsights(A) {
    const g = (k) => A.porGrupo[k] || 0;
    const t = A.total;
    const cards = [];
    const porLocalStatus = (st) => A.locais.map((l) => ({ l, q: A.res.filter((r) => r.local === l && r.status === st).reduce((s, r) => s + r.quantidade, 0) })).filter((x) => x.q > 0);
    const porCatStatus = (st) => {
      const m = {};
      A.res.filter((r) => r.status === st).forEach((r) => { const k = r.categoria + " · " + sigla(r.local); m[k] = (m[k] || 0) + r.quantidade; });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };

    const d = diaSemana(estado.data);
    $("#insight-summary").innerHTML =
      `<strong>${d[0].toUpperCase() + d.slice(1)}, ${dataBR(estado.data)}</strong> · ` +
      `<strong>${num(t)} veículos</strong> contados (${A.locais.map((l) => `${sigla(l)} ${num(Object.values(A.porLocal[l]).reduce((s, v) => s + v, 0))}`).join(" · ")}) · ` +
      `carregados <strong>${pct(pctOf(g("Carregado"), t))}</strong> · em trânsito <strong>${pct(pctOf(g("Em trânsito"), t))}</strong> · ` +
      `aguardando descarga no cliente <strong>${pct(pctOf(g("Aguard. desc. cliente"), t))}</strong> · indisponíveis <strong>${pct(pctOf(g("Indisponível"), t))}</strong> · ` +
      `${num((estado.rotina.linhas || []).length)} motoristas acompanhados.`;

    /* 0 · variação D-1 */
    if (A.anterior) {
      const dt = t - A.anterior.total;
      cards.push({
        tipo: "tendencia", ico: "📆", titulo: `Contagem ${dt >= 0 ? "+" : ""}${num(dt)} veículos vs. ${dataCurta(A.anterior.data)}`,
        texto: `Destaques da variação: carregados ${A.anterior.grupos["Carregado"] || 0} → <b>${g("Carregado")}</b>, ` +
               `aguard. cliente ${A.anterior.grupos["Aguard. desc. cliente"] || 0} → <b>${g("Aguard. desc. cliente")}</b>, ` +
               `em trânsito ${A.anterior.grupos["Em trânsito"] || 0} → <b>${g("Em trânsito")}</b>. ` +
               `A base muda conforme os lançamentos: <b>${num((estado.cockpit.veiculos || []).filter((v) => v.status[A.anterior.data] && !v.status[estado.data]).length)} veículos com status em ${dataCurta(A.anterior.data)} ficaram sem lançamento no dia selecionado</b> e saem da contagem; ` +
               `a MATRIZ-SP passou a ser captada em ${dataCurta((A.evol.find((e) => e.total > 0 && e.data >= "2026-10-06") || {}).data || estado.datas[0])}.`,
      });
    }

    /* 1 · fila no cliente */
    const ag = g("Aguard. desc. cliente");
    if (ag) {
      const top = porCatStatus("Ag. Desc. Cliente")[0];
      cards.push({
        tipo: "alerta", ico: "⏳", titulo: ag + " veículos parados em descarga no cliente",
        texto: `<b>${pct(pctOf(ag, t))} da frota</b> aguardando liberação (${porLocalStatus("Ag. Desc. Cliente").map((x) => `${sigla(x.l)} ${num(x.q)}`).join(" × ")}). ` +
               `Maior concentração: <b>${top[0]} (${num(top[1])})</b>. Cada dia parado aqui equivale a ~1 viagem a menos por veículo.`,
      });
    }

    /* 2 · indisponíveis */
    const ind = g("Indisponível");
    if (ind) {
      cards.push({
        tipo: "alerta", ico: "🔧", titulo: ind + " veículos indisponíveis (" + pct(pctOf(ind, t)) + ")",
        texto: `Manutenção <b>${num(A.porStatus["Manutenção"] || 0)}</b> (${porCatStatus("Manutenção").map(([k, v]) => `${k} ${num(v)}`).join(", ")}), ` +
               `MEC <b>${num(A.porStatus["MEC"] || 0)}</b>, sinistro <b>${num(A.porStatus["Sinistro Batida"] || 0)}</b>, inativo <b>${num(A.porStatus["Inativo"] || 0)}</b>. ` +
               `Revisar previsão de oficina e substituição por agregados.`,
      });
    }

    /* 3 · vazios */
    const vz = g("Vazio / reposição");
    if (vz) {
      const top = porCatStatus("Vazio")[0];
      cards.push({
        tipo: "acao", ico: "🔄", titulo: vz + " veículos vazios para reposicionar",
        texto: `<b>${pct(pctOf(vz, t))} da frota</b> vazia (${porLocalStatus("Vazio").map((x) => `${sigla(x.l)} ${num(x.q)}`).join(" × ")}); maior bolsa em <b>${top ? top[0] + " (" + num(top[1]) + ")" : "—"}</b>. ` +
               `Cruzar com cargas pendentes de expedição para reduzir km vazio.`,
      });
    }

    /* 4 · carregados */
    const cg = g("Carregado");
    if (cg) {
      const top = porCatStatus("Carregado")[0];
      cards.push({
        tipo: "destaque", ico: "🚛", titulo: cg + " veículos carregados prontos (" + pct(pctOf(cg, t)) + ")",
        texto: `Destaque para <b>${top[0]} (${num(top[1])})</b>. Garantir motoristas e janelas de saída para converter essa carteira em viagens ainda hoje.`,
      });
    }

    /* 5 · em trânsito */
    const tr = g("Em trânsito");
    if (tr) {
      cards.push({
        tipo: "tendencia", ico: "🛣", titulo: tr + " veículos em trânsito (viagem/retorno)",
        texto: `<b>${num(A.porStatus["Em Viagem"] || 0)}</b> em viagem e <b>${num(A.porStatus["Retorno"] || 0)}</b> em retorno (${pct(pctOf(tr, t))} da frota) — volume que define a descarga/recebimento do próximo dia.`,
      });
    }

    /* 6 · operação interna */
    const interno = g("Interno / CD");
    if (interno) {
      cards.push({
        tipo: "tendencia", ico: "🏭", titulo: interno + " veículos em movimentação interna",
        texto: `Fluxo CD <b>${num(A.porStatus["Fluxo CD"] || 0)}</b> e manobra <b>${num(A.porStatus["Manobra"] || 0)}</b>, somados a <b>${num(A.motStatus["Interno"] || 0)} motoristas internos</b> (FÁB. FILIAL - BA). Verificar ociosidade convertível em viagem.`,
      });
    }

    /* 7 · motoristas sem status */
    const sem = A.motStatus["Não informado"] || 0;
    if (sem) {
      cards.push({
        tipo: "acao", ico: "📝", titulo: sem + " motoristas sem status informado",
        texto: `Todos da <b>MATRIZ-SP</b> aparecem sem status na captura de 09/10, enquanto a FILIAL-BA tem <b>${num(A.motStatus["Disponível"] || 0)} disponíveis</b>. Padronizar o preenchimento diário para fechar o cruzamento motorista × veículo.`,
      });
    }

    /* 8 · concentração */
    const sp = Object.values(A.porLocal[A.locais.find((l) => l.includes("SP"))] || {}).reduce((s, v) => s + v, 0);
    const carreta = A.cats.filter((c) => c.startsWith("CARRETA AGREG.")).reduce((s, c) => s + Object.values(A.porCat[c]).reduce((a, v) => a + v, 0), 0);
    cards.push({
      tipo: "tendencia", ico: "📍", titulo: "Concentração da frota",
      texto: `<b>${pct(pctOf(sp, t))} da frota na MATRIZ-SP</b> (${num(sp)}) e <b>${pct(pctOf(carreta, t))} em CARRETA AGREG.</b> (${num(carreta)}): decisões de agregados e janelas de descarga nesses cortes impactam a maior parte da operação.`,
    });

    const ordem = { alerta: 0, acao: 1, tendencia: 2, destaque: 3 };
    cards.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
    const rotulo = { alerta: "Alerta", acao: "Ação recomendada", tendencia: "Tendência", destaque: "Destaque" };
    $("#insight-grid").innerHTML = cards.map((c) => `
      <article class="insight ${c.tipo}">
        <div class="ico">${c.ico}</div>
        <div><h4>${rotulo[c.tipo]} · ${c.titulo}</h4><p>${c.texto}</p></div>
      </article>`).join("");
  }

  /* ====================== tabela resumo (árvore) ======================= */
  function renderResumo(A) {
    const linhas = [];
    let grand = 0;
    for (const local of A.locais) {
      const cats = [...new Set(A.res.filter((r) => r.local === local).map((r) => r.categoria))];
      let totLocal = 0, primeiroLocal = true;
      for (const cat of cats) {
        const sts = A.res.filter((r) => r.local === local && r.categoria === cat);
        const totCat = sts.reduce((s, r) => s + r.quantidade, 0);
        totLocal += totCat;
        sts.forEach((r, i) => {
          linhas.push(`<tr class="tr-status">
            <td>${primeiroLocal && i === 0 ? `<b class="cell-local">${local}</b>` : ""}</td>
            <td>${i === 0 ? cat : ""}</td>
            <td>${dot(r.status)} ${r.status}</td>
            <td class="num">${num(r.quantidade)}</td></tr>`);
        });
        linhas.push(`<tr class="tr-cat"><td></td><td><b>${cat} Total</b></td><td></td><td class="num"><b>${num(totCat)}</b></td></tr>`);
        primeiroLocal = false;
      }
      linhas.push(`<tr class="tr-local"><td></td><td><b>${local} Total</b></td><td></td><td class="num"><b>${num(totLocal)}</b></td></tr>`);
      grand += totLocal;
    }
    linhas.push(`<tr class="tr-grand"><td></td><td>Total geral</td><td></td><td class="num">${num(grand)}</td></tr>`);
    $("#tbody-resumo").innerHTML = linhas.join("");
  }

  /* ===================== tabela motoristas (rotina) ==================== */
  function renderRotina(A) {
    const box = $("#filters");
    if (box.dataset.feito !== "1") {
      box.dataset.feito = "1";
      Object.keys(A.motLocal).forEach((l) => {
        const b = document.createElement("button");
        b.className = "filter"; b.dataset.local = l; b.textContent = l;
        box.appendChild(b);
      });
    }
    let grupos = Object.keys(A.motLocal);
    if (estado.filtro !== "todos") grupos = [estado.filtro];
    const html = [];
    for (const loc of grupos) {
      let ls = (estado.rotina.linhas || []).filter((l) => l.local === loc);
      if (estado.busca) {
        const b = estado.busca.toLowerCase();
        ls = ls.filter((l) => (l.motorista + " " + l.local + " " + l.status).toLowerCase().includes(b));
      }
      if (estado.sort) {
        const { key, dir } = estado.sort;
        ls = ls.slice().sort((a, b) => String(a[key]).localeCompare(String(b[key]), "pt-BR") * dir);
      }
      if (!ls.length) continue;
      html.push(`<tr class="tr-group"><td colspan="3">${loc} <span>· ${num(ls.length)} ${ls.length === 1 ? "motorista" : "motoristas"}</span></td></tr>`);
      for (const l of ls) {
        html.push(`<tr>
          <td>${l.local}</td>
          <td class="cell-mot">${l.motorista}</td>
          <td><span class="status-pill"><i style="background:${COR_STATUS[l.status] || COR.cinza}"></i>${l.status}</span></td>
        </tr>`);
      }
      html.push(`<tr class="tr-cat"><td colspan="2"><b>${loc} Total</b></td><td class="num"><b>${num(ls.length)}</b></td></tr>`);
    }
    $("#tbody-rotina").innerHTML = html.join("") ||
      `<tr><td colspan="3" style="text-align:center;padding:26px;color:var(--tinta-suave)">Nenhum motorista corresponde ao filtro.</td></tr>`;
  }

  /* ====================== tabela frota por veículo ===================== */
  function renderFrota() {
    let vs = estado.cockpit.veiculos || [];
    if (estado.filtroFrota !== "todos") vs = vs.filter((v) => v.local === estado.filtroFrota);
    if (estado.buscaFrota) {
      const b = estado.buscaFrota.toLowerCase();
      vs = vs.filter((v) => [v.placa, v.marca, v.modelo, v.categoria, v.tp_veiculo, v.local, v.situacao].join(" ").toLowerCase().includes(b));
    }
    if (estado.sortFrota) {
      const { key, dir } = estado.sortFrota;
      vs = vs.slice().sort((a, b) => String(a[key] || "").localeCompare(String(b[key] || ""), "pt-BR") * dir);
    }
    const show = vs.slice(0, 400);
    $("#tbody-frota").innerHTML = show.map((v) => {
      const st = v.status[estado.data];
      return `<tr>
        <td class="cell-mot">${v.placa}</td>
        <td>${v.marca} ${v.modelo}${v.ano ? `<span class="cell-sub">${v.ano}</span>` : ""}</td>
        <td>${v.tp_veiculo}</td>
        <td>${v.categoria}</td>
        <td>${v.local}</td>
        <td>${v.situacao === "ATIVO" ? '<span style="color:var(--ok);font-weight:700">ATIVO</span>' : `<span style="color:var(--risk);font-weight:700">${v.situacao}</span>`}</td>
        <td>${st ? `<span class="status-pill"><i style="background:${COR_STATUS[st] || COR.cinza}"></i>${st}</span>` : '<span style="color:var(--tinta-suave)">— sem status no dia</span>'}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="7" style="text-align:center;padding:26px;color:var(--tinta-suave)">Nenhum veículo corresponde ao filtro.</td></tr>`;
  }

  /* --------------------------- cabeçalho/rodapé -------------------------- */
  function renderMoldura(A) {
    const m = estado.cockpit.meta;
    $("#chip-data").textContent = diaSemana(estado.data) + ", " + dataBR(estado.data);
    $("#chip-total").textContent = "🚛 " + num(A.total) + " veículos · " + num((estado.rotina.linhas || []).length) + " motoristas";
    $("#chip-atualizacao").textContent = "🕒 carga " + horaBR(m.atualizado_em);
    const sel = $("#sel-data");
    sel.innerHTML = estado.datas.slice().reverse().map((d) =>
      `<option value="${d}" ${d === estado.data ? "selected" : ""}>${dataBR(d).slice(0, 5)} · ${diaSemana(d).slice(0, 3)}</option>`).join("");
    const flag = $("#source-flag");
    const f = estado.cockpit.fonte || {};
    if (f.demo) {
      flag.hidden = false; flag.className = "source-flag warn";
      flag.innerHTML = "⚠ Exibindo <strong>dados de demonstração</strong>. Conecte a planilha com <code>scripts/import_spreadsheet.py</code>.";
    } else if (f.nota) {
      flag.hidden = false; flag.className = "source-flag info";
      flag.innerHTML = "ℹ " + f.nota;
    } else flag.hidden = true;
    $("#footer-source").innerHTML =
      `Fonte: ${f.planilha || "planilha da filial"} · abas <b>${(f.abas || []).join("</b> e <b>")}</b> · ` +
      `contagem de ${dataBR(estado.data)} · COCKPIT DIÁRIO v3.0`;
  }

  /* ------------------------------- eventos ------------------------------- */
  function ligarEventos() {
    $("#sel-data").addEventListener("change", (e) => { estado.data = e.target.value; renderizar(); });
    $("#filters").addEventListener("click", (e) => {
      const b = e.target.closest(".filter"); if (!b) return;
      document.querySelectorAll("#filters .filter").forEach((f) => f.classList.remove("is-active"));
      b.classList.add("is-active"); estado.filtro = b.dataset.local; renderRotina(agregar());
    });
    $("#busca").addEventListener("input", (e) => { estado.busca = e.target.value.trim(); renderRotina(agregar()); });
    document.querySelectorAll("#tabela-rotina thead th[data-key]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        const dir = estado.sort && estado.sort.key === key ? -estado.sort.dir : 1;
        estado.sort = { key, dir };
        document.querySelectorAll("#tabela-rotina thead th .arrow").forEach((a) => a.remove());
        const s = document.createElement("span"); s.className = "arrow"; s.textContent = dir === 1 ? " ▲" : " ▼";
        th.appendChild(s); renderRotina(agregar());
      });
    });
    $("#filters-frota").addEventListener("click", (e) => {
      const b = e.target.closest(".filter"); if (!b) return;
      document.querySelectorAll("#filters-frota .filter").forEach((f) => f.classList.remove("is-active"));
      b.classList.add("is-active"); estado.filtroFrota = b.dataset.local; renderFrota();
    });
    $("#busca-frota").addEventListener("input", (e) => { estado.buscaFrota = e.target.value.trim(); renderFrota(); });
    document.querySelectorAll("#tabela-frota thead th[data-fkey]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.fkey;
        const dir = estado.sortFrota && estado.sortFrota.key === key ? -estado.sortFrota.dir : 1;
        estado.sortFrota = { key, dir };
        document.querySelectorAll("#tabela-frota thead th .arrow").forEach((a) => a.remove());
        const s = document.createElement("span"); s.className = "arrow"; s.textContent = dir === 1 ? " ▲" : " ▼";
        th.appendChild(s); renderFrota();
      });
    });
    $("#btn-atualizar").addEventListener("click", async () => {
      const btn = $("#btn-atualizar");
      btn.disabled = true; btn.style.opacity = .6;
      try { await carregar(); renderizar(); }
      catch (err) { alert("Falha ao recarregar os dados: " + err.message); }
      btn.disabled = false; btn.style.opacity = 1;
    });
  }

  function renderizar() {
    const A = agregar();
    renderMoldura(A);
    renderKPIs(A);
    renderCharts(A);
    renderInsights(A);
    renderResumo(A);
    renderRotina(A);
    renderFrota();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await carregar();
      renderizar();
      ligarEventos();
    } catch (err) {
      document.querySelector(".page").innerHTML =
        `<div class="card" style="padding:30px;text-align:center">
           <h2 style="color:var(--azul-800)">Não foi possível carregar os dados do cockpit</h2>
           <p style="color:var(--tinta-suave)">${err.message}<br>
           Sirva a pasta <code>app/</code> por HTTP (ex.: <code>python3 -m http.server</code>) — arquivos JSON não carregam via <code>file://</code>.</p>
         </div>`;
    }
  });
})();
