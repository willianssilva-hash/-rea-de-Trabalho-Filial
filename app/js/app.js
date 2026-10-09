/* ==========================================================================
   COCKPIT DIÁRIO · Colormaq — Área de Trabalho Filial
   Painel de frota: contagem de veículos por local × categoria × status
   (aba "Cockpit Diário" · COCKPIT RESUMO DIÁRIO GERAL) e acompanhamento
   diário de motoristas (aba "Rotina Diária Mot. Frota2").
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

  /* status da planilha -> grupo de leitura do cockpit */
  const GRUPO = {
    "Carregado": "Carregado",
    "Em Viagem": "Em trânsito",
    "Retorno": "Em trânsito",
    "Vazio": "Vazio / reposição",
    "Ag. Desc. Cliente": "Aguard. desc. cliente",
    "Aguard. Descarga Cliente": "Aguard. desc. cliente",
    "Manutenção": "Indisponível",
    "MEC": "Indisponível",
    "Sinistro Batida": "Indisponível",
    "Inativo": "Indisponível",
    "Fluxo CD": "Interno / CD",
    "Manobra": "Interno / CD",
    "Interno": "Interno / CD",
    "Disponível": "Disponível",
    "Sem contagem": "Sem contagem",
    "Não informado": "Não informado",
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

  /* texto central nas rosquinhas */
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
  const estado = { cockpit: null, rotina: null, charts: {}, filtro: "todos", busca: "", sort: null };

  async function carregar() {
    const cb = "?v=" + Date.now();
    const [c, r] = await Promise.all([
      fetch("data/cockpit_diario.json" + cb).then((r) => r.json()),
      fetch("data/rotina_diaria.json" + cb).then((r) => r.json()),
    ]);
    estado.cockpit = c;
    estado.rotina = r;
  }

  /* --------------------------- agregações ------------------------------ */
  function agregar() {
    const res = estado.cockpit.resumo || [];
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
    return { res, locais, cats, porLocal, porCat, porGrupo, porStatus, total, motStatus, motLocal };
  }

  /* ================================ KPIs ================================ */
  function renderKPIs(A) {
    const g = (k) => A.porGrupo[k] || 0;
    const transito = g("Em trânsito");
    const indisp = g("Indisponível");
    const informados = (estado.rotina.linhas || []).filter((l) => l.status !== "Não informado").length;
    const cards = [
      { rot: "Frota contada no dia", valor: num(A.total), compl: " veículos",
        foot: `<span>${A.locais.map((l) => `${l} <b>${num(A.porLocal[l] && Object.values(A.porLocal[l]).reduce((s, v) => s + v, 0))}</b>`).join(" · ")}</span>` },
      { rot: "Carregados", valor: num(g("Carregado")), compl: " · " + pct(pctOf(g("Carregado"), A.total)),
        barra: pctOf(g("Carregado"), A.total), tone: "ok", foot: "<span>carregados / prontos para expedição</span>" },
      { rot: "Em trânsito", valor: num(transito), compl: " · " + pct(pctOf(transito, A.total)),
        barra: pctOf(transito, A.total), foot: `<span>em viagem <b>${num(A.porStatus["Em Viagem"] || 0)}</b> · retorno <b>${num(A.porStatus["Retorno"] || 0)}</b></span>` },
      { rot: "Aguard. desc. cliente", valor: num(g("Aguard. desc. cliente")), compl: " · " + pct(pctOf(g("Aguard. desc. cliente"), A.total)),
        barra: pctOf(g("Aguard. desc. cliente"), A.total), tone: g("Aguard. desc. cliente") / A.total > .15 ? "risk" : "warn",
        foot: "<span>veículos parados no cliente</span>" },
      { rot: "Vazios / reposição", valor: num(g("Vazio / reposição")), compl: " · " + pct(pctOf(g("Vazio / reposição"), A.total)),
        barra: pctOf(g("Vazio / reposição"), A.total), foot: "<span>disponíveis para reposicionar</span>" },
      { rot: "Indisponíveis", valor: num(indisp), compl: " · " + pct(pctOf(indisp, A.total)),
        barra: pctOf(indisp, A.total), tone: indisp ? "risk" : "ok",
        foot: `<span>manutenção <b>${num(A.porStatus["Manutenção"] || 0)}</b> · MEC <b>${num(A.porStatus["MEC"] || 0)}</b> · sinistro <b>${num(A.porStatus["Sinistro Batida"] || 0)}</b> · inativo <b>${num(A.porStatus["Inativo"] || 0)}</b></span>` },
      { rot: "Fluxo CD / manobra", valor: num(g("Interno / CD")), compl: " · " + pct(pctOf(g("Interno / CD"), A.total)),
        barra: pctOf(g("Interno / CD"), A.total), foot: "<span>movimentação interna / CD</span>" },
      { rot: "Motoristas acompanhados", valor: num((estado.rotina.linhas || []).length),
        compl: " · " + num(informados) + " c/ status",
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

    /* --- status por local (barras empilhadas horizontais) --- */
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
    $("#tag-locais").textContent = A.locais.map((l) => `${sigla(l)} ${num(Object.values(A.porLocal[l]).reduce((s, v) => s + v, 0))}`).join(" × ");

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
    $("#tag-cats").textContent = "maior: " + maiorCat;

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
    const porLocalStatus = (st) => A.locais.map((l) => ({ l, q: (A.res.filter((r) => r.local === l && r.status === st).reduce((s, r) => s + r.quantidade, 0)) })).filter((x) => x.q > 0);
    const porCatStatus = (st) => {
      const m = {};
      A.res.filter((r) => r.status === st).forEach((r) => { const k = r.categoria + " · " + sigla(r.local); m[k] = (m[k] || 0) + r.quantidade; });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };

    const d = diaSemana(estado.cockpit.meta.data_referencia);
    $("#insight-summary").innerHTML =
      `<strong>${d[0].toUpperCase() + d.slice(1)}, ${dataBR(estado.cockpit.meta.data_referencia)}</strong> · ` +
      `<strong>${num(t)} veículos</strong> contados (${A.locais.map((l) => `${sigla(l)} ${num(Object.values(A.porLocal[l]).reduce((s, v) => s + v, 0))}`).join(" · ")}) · ` +
      `carregados <strong>${pct(pctOf(g("Carregado"), t))}</strong> · em trânsito <strong>${pct(pctOf(g("Em trânsito"), t))}</strong> · ` +
      `aguardando descarga no cliente <strong>${pct(pctOf(g("Aguard. desc. cliente"), t))}</strong> · indisponíveis <strong>${pct(pctOf(g("Indisponível"), t))}</strong> · ` +
      `${num((estado.rotina.linhas || []).length)} motoristas acompanhados.`;

    /* 1 · fila no cliente */
    const ag = g("Aguard. desc. cliente");
    if (ag) {
      const top = porCatStatus("Ag. Desc. Cliente")[0];
      cards.push({
        tipo: "alerta", ico: "⏳", titulo: ag + " veículos parados em descarga no cliente",
        texto: `<b>${pct(pctOf(ag, t))} da frota</b> aguardando liberação no cliente (${porLocalStatus("Ag. Desc. Cliente").map((x) => `${sigla(x.l)} ${num(x.q)}`).join(" × ")}). ` +
               `Maior concentração: <b>${top[0]} (${num(top[1])})</b>. Cada dia parado aqui equivale a ~1 viagem a menos por veículo — priorizar negociação de janelas de descarga.`,
      });
    }

    /* 2 · indisponíveis */
    const ind = g("Indisponível");
    if (ind) {
      cards.push({
        tipo: "alerta", ico: "🔧", titulo: ind + " veículos indisponíveis (" + pct(pctOf(ind, t)) + ")",
        texto: `Manutenção <b>${num(A.porStatus["Manutenção"] || 0)}</b> (${porCatStatus("Manutenção").map(([k, v]) => `${k} ${num(v)}`).join(", ")}), ` +
               `MEC <b>${num(A.porStatus["MEC"] || 0)}</b>, sinistro batida <b>${num(A.porStatus["Sinistro Batida"] || 0)}</b> e inativo <b>${num(A.porStatus["Inativo"] || 0)}</b>. ` +
               `Revisar previsão de liberação da oficina e avaliar substituição por agregados.`,
      });
    }

    /* 3 · vazios */
    const vz = g("Vazio / reposição");
    if (vz) {
      const top = porCatStatus("Vazio")[0];
      cards.push({
        tipo: "acao", ico: "🔄", titulo: vz + " veículos vazios para reposicionar",
        texto: `<b>${pct(pctOf(vz, t))} da frota</b> vazia (${porLocalStatus("Vazio").map((x) => `${sigla(x.l)} ${num(x.q)}`).join(" × ")}); ` +
               `maior bolsa em <b>${top ? top[0] + " (" + num(top[1]) + ")" : "—"}</b>. Cruzar com cargas pendentes de expedição para reduzir km vazio.`,
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
        texto: `<b>${num(A.porStatus["Em Viagem"] || 0)}</b> em viagem e <b>${num(A.porStatus["Retorno"] || 0)}</b> em retorno (${pct(pctOf(tr, t))} da frota). ` +
               `Volume que define a capacidade de descarga/recebimento do próximo dia.`,
      });
    }

    /* 6 · operação interna */
    const interno = g("Interno / CD");
    if (interno) {
      cards.push({
        tipo: "tendencia", ico: "🏭", titulo: interno + " veículos em movimentação interna",
        texto: `Fluxo CD <b>${num(A.porStatus["Fluxo CD"] || 0)}</b> e manobra <b>${num(A.porStatus["Manobra"] || 0)}</b>, somados a ` +
               `<b>${num(A.motStatus["Interno"] || 0)} motoristas em atividade interna</b> (FÁB. FILIAL - BA). Frente interna pesada hoje — verificar se há ociosidade convertível em viagem.`,
      });
    }

    /* 7 · motoristas sem status */
    const sem = A.motStatus["Não informado"] || 0;
    if (sem) {
      cards.push({
        tipo: "acao", ico: "📝", titulo: sem + " motoristas sem status informado",
        texto: `Todos da <b>MATRIZ-SP</b> aparecem sem status na contagem de 09/10, enquanto a FILIAL-BA tem apenas ` +
               `<b>${num(A.motStatus["Disponível"] || 0)} disponíveis</b> e <b>${num(A.motStatus["Aguard. Descarga Cliente"] || 0)}</b> aguardando descarga. ` +
               `Padronizar o preenchimento diário para fechar o cruzamento motorista × veículo.`,
      });
    }

    /* 8 · concentração da frota */
    const sp = Object.values(A.porLocal[A.locais.find((l) => l.includes("SP"))] || {}).reduce((s, v) => s + v, 0);
    const carreta = A.cats.filter((c) => c.startsWith("CARRETA AGREG.")).reduce((s, c) => s + Object.values(A.porCat[c]).reduce((a, v) => a + v, 0), 0);
    cards.push({
      tipo: "tendencia", ico: "📍", titulo: "Concentração da frota",
      texto: `<b>${pct(pctOf(sp, t))} da frota na MATRIZ-SP</b> (${num(sp)} veículos) e <b>${pct(pctOf(carreta, t))} em CARRETA AGREG.</b> (${num(carreta)}). ` +
             `Decisões de agregados e janelas de descarga nesses dois cortes impactam a maior parte da operação.`,
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
    /* filtros dinâmicos por local */
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

  /* --------------------------- cabeçalho/rodapé -------------------------- */
  function renderMoldura(A) {
    const m = estado.cockpit.meta;
    $("#chip-data").textContent = diaSemana(m.data_referencia) + ", " + dataBR(m.data_referencia);
    $("#chip-total").textContent = "🚛 " + num(A.total) + " veículos · " + num((estado.rotina.linhas || []).length) + " motoristas";
    $("#chip-atualizacao").textContent = "🕒 contagem às " + horaBR(m.atualizado_em);
    const flag = $("#source-flag");
    const f = estado.cockpit.fonte || {};
    if (f.demo) {
      flag.hidden = false;
      flag.className = "source-flag warn";
      flag.innerHTML = "⚠ Exibindo <strong>dados de demonstração</strong>. Conecte a planilha com <code>scripts/import_spreadsheet.py</code>.";
    } else if (f.capturas) {
      flag.hidden = false;
      flag.className = "source-flag info";
      flag.innerHTML = "ℹ " + f.nota;
    } else flag.hidden = true;
    $("#footer-source").innerHTML =
      `Fonte: ${f.planilha || "planilha da filial"} · abas <b>${(f.abas || []).join("</b> e <b>")}</b> · ` +
      `contagem de ${dataBR(m.data_referencia)} às ${horaBR(m.atualizado_em)} · COCKPIT DIÁRIO v2.0`;
  }

  /* ------------------------------- eventos ------------------------------- */
  function ligarEventos() {
    $("#filters").addEventListener("click", (e) => {
      const b = e.target.closest(".filter");
      if (!b) return;
      document.querySelectorAll(".filter").forEach((f) => f.classList.remove("is-active"));
      b.classList.add("is-active");
      estado.filtro = b.dataset.local;
      renderRotina(agregar());
    });
    $("#busca").addEventListener("input", (e) => { estado.busca = e.target.value.trim(); renderRotina(agregar()); });
    document.querySelectorAll("#tabela-rotina thead th[data-key]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        const dir = estado.sort && estado.sort.key === key ? -estado.sort.dir : 1;
        estado.sort = { key, dir };
        document.querySelectorAll("#tabela-rotina thead th .arrow").forEach((a) => a.remove());
        const s = document.createElement("span");
        s.className = "arrow"; s.textContent = dir === 1 ? " ▲" : " ▼";
        th.appendChild(s);
        renderRotina(agregar());
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
