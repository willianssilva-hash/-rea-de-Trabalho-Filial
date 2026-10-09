/* ==========================================================================
   COCKPIT DIÁRIO · Colormaq — Área de Trabalho Filial
   Painel de acompanhamento intra-dia da operação de entregas e coletas.
   Fontes de dados (JSON espelhando as abas da planilha):
     data/cockpit_diario.json   <- aba "Cockpit Diário"
     data/rotina_diaria.json    <- aba "Rotina Diária Mot. Frota2"
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------ utilidades ----------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (v) => nf0.format(v || 0);
  const pct = (v, d) => (d === 2 ? nf2.format(v || 0) : nf1.format(v || 0)) + "%";
  const brl = (v) => "R$ " + nf2.format(v || 0);
  const pctOf = (a, b) => (b ? (a / b) * 100 : 0);
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

  function dataBR(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-").map(Number);
    return String(d).padStart(2, "0") + "/" + String(m).padStart(2, "0") + "/" + y;
  }
  function dataCurta(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return String(d).padStart(2, "0") + "/" + String(m).padStart(2, "0");
  }
  function diaSemana(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return DIAS[new Date(y, m - 1, d).getDay()];
  }
  function horaBR(iso) {
    if (!iso) return "—";
    const t = iso.split("T")[1] || "";
    return t.slice(0, 5);
  }

  /* --------------------------- cores do tema ---------------------------- */
  const COR = {
    azul900: "#052E5C", azul800: "#063B78", azul700: "#08468D", azul600: "#0A4FA0",
    azul500: "#1669C4", azul300: "#7FB0E4", azul100: "#DCE9F8", azul050: "#EEF5FC",
    cinza: "#B9CDE4", ok: "#128A5A", warn: "#D98A00", risk: "#C6362B",
    grade: "#E3ECF6", texto: "#5A7184",
  };

  Chart.defaults.font.family = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
  Chart.defaults.font.size = 11.5;
  Chart.defaults.color = COR.texto;
  Chart.defaults.borderColor = COR.grade;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.tooltip.backgroundColor = "rgba(5,46,92,.94)";
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleFont = { weight: "700" };

  /* texto central nas rosquinhas */
  const centroRosca = {
    id: "centroRosca",
    afterDraw(chart, args, opts) {
      if (!opts || !opts.texto) return;
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      if (!meta.data.length) return;
      const { x, y } = meta.data[0];
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 22px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = COR.azul900;
      ctx.fillText(opts.texto, x, y - 7);
      ctx.font = "600 10.5px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = COR.texto;
      ctx.fillText(opts.rotulo || "", x, y + 12);
      ctx.restore();
    },
  };
  /* linha de meta vertical (gráfico de barras horizontais) */
  const linhaMeta = {
    id: "linhaMeta",
    afterDraw(chart, args, opts) {
      if (!opts || opts.value == null) return;
      const { ctx, chartArea, scales } = chart;
      const x = scales.x.getPixelForValue(opts.value);
      ctx.save();
      ctx.strokeStyle = COR.risk;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COR.risk;
      ctx.font = "700 10px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("meta " + opts.value + "%", x + 4, chartArea.top + 9);
      ctx.restore();
    },
  };
  Chart.register(centroRosca, linhaMeta);

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

  /* ================================ KPIs ================================ */
  function renderKPIs() {
    const k = estado.cockpit.indicadores;
    const m = estado.cockpit.meta;
    const hist = estado.cockpit.historico || [];
    const ontem = hist[hist.length - 1] || null;

    const conc = pctOf(k.entregas_realizadas, k.entregas_previstas);
    const curva = estado.cockpit.curva_horaria || { previsto_acumulado: [], realizado_acumulado: [] };
    const ultIdx = curva.realizado_acumulado.reduce((acc, v, i) => (v == null ? acc : i), 0);
    const esperadoHora = curva.previsto_acumulado[ultIdx] || k.entregas_previstas;
    const disp = pctOf(k.veiculos_ativos + (k.veiculos_reserva || 0), k.veiculos_total);
    const mediaDevol = hist.length ? hist.reduce((s, h) => s + h.devolucoes, 0) / hist.length : 0;

    const cards = [
      {
        rot: "Entregas realizadas", valor: num(k.entregas_realizadas),
        compl: " de " + num(k.entregas_previstas) + " prev.",
        barra: conc, tone: conc >= 90 ? "ok" : conc >= 75 ? "" : "warn",
        foot: deltaHtml(ontem ? k.entregas_realizadas - ontem.entregas_realizadas : 0, " vs. dia anterior", true),
      },
      {
        rot: "Conclusão do plano", valor: pct(conc),
        barra: conc, tone: conc >= 95 ? "ok" : conc >= 80 ? "" : "warn",
        foot: '<span>esperado p/ horário: <b>' + num(esperadoHora) + "</b> (" + pct(pctOf(esperadoHora, k.entregas_previstas)) + ")</span>",
      },
      {
        rot: "OTD do dia", valor: pct(k.otd),
        barra: k.otd, tone: k.otd >= m.otd ? "ok" : k.otd >= m.otd - 2 ? "warn" : "risk",
        foot: deltaHtml(k.otd - m.otd, " vs. meta " + pct(m.otd), true, "p.p."),
      },
      {
        rot: "SLA de entrega", valor: pct(k.sla),
        barra: k.sla, tone: k.sla >= m.sla ? "ok" : k.sla >= m.sla - 2 ? "warn" : "risk",
        foot: deltaHtml(k.sla - m.sla, " vs. meta " + pct(m.sla), true, "p.p."),
      },
      {
        rot: "Coletas realizadas", valor: num(k.coletas_realizadas),
        compl: " de " + num(k.coletas_previstas) + " prev.",
        barra: pctOf(k.coletas_realizadas, k.coletas_previstas),
        tone: pctOf(k.coletas_realizadas, k.coletas_previstas) >= 90 ? "ok" : "",
        foot: "<span>" + pct(pctOf(k.coletas_realizadas, k.coletas_previstas)) + " do plano de coletas</span>",
      },
      {
        rot: "Devoluções", valor: num(k.devolucoes),
        compl: " · avarias " + num(k.avarias),
        tone: k.devolucoes > m.devolucoes_max ? "risk" : k.devolucoes === m.devolucoes_max ? "warn" : "ok",
        foot: "<span>limite do dia: <b>" + num(m.devolucoes_max) + "</b> · média hist. " + nf1.format(mediaDevol) + "</span>",
      },
      {
        rot: "Ocorrências", valor: num(k.ocorrencias),
        tone: k.ocorrencias > 4 ? "risk" : k.ocorrencias > 2 ? "warn" : "ok",
        foot: "<span>avarias, atrasos e devoluções registradas em rota</span>",
      },
      {
        rot: "Disponibilidade frota", valor: pct(disp),
        barra: disp, tone: disp >= m.disponibilidade_frota ? "ok" : disp >= m.disponibilidade_frota - 5 ? "warn" : "risk",
        foot: "<span>" + k.veiculos_ativos + " ativos · " + k.veiculos_manutencao + " manut. · " + k.veiculos_parados + " parado · " + (k.veiculos_reserva || 0) + " reserva</span>",
      },
      {
        rot: "Custo por km", valor: brl(k.custo_km),
        tone: k.custo_km <= m.custo_km ? "ok" : k.custo_km <= m.custo_km * 1.05 ? "warn" : "risk",
        foot: deltaHtml(pctOf(k.custo_km - m.custo_km, m.custo_km), " vs. alvo " + brl(m.custo_km), false, "%"),
      },
      {
        rot: "Km rodado / planejado", valor: num(k.km_rodado),
        compl: " de " + num(k.km_planejado),
        barra: pctOf(k.km_rodado, k.km_planejado), tone: "",
        foot: "<span>horas extras: <b>" + nf1.format(k.horas_extras) + "h</b> · absenteísmo " + pct(k.absenteismo) + "</span>",
      },
    ];

    $("#kpi-grid").innerHTML = cards.map((c) => `
      <article class="kpi ${c.tone ? "tone-" + c.tone : ""}">
        <div class="kpi-label">${c.rot}</div>
        <div class="kpi-value">${c.valor}${c.compl ? `<small>${c.compl}</small>` : ""}</div>
        ${c.barra != null ? `<div class="kpi-bar"><i style="width:${Math.min(100, c.barra)}%"></i></div>` : ""}
        <div class="kpi-foot">${c.foot || ""}</div>
      </article>`).join("");
  }

  function deltaHtml(v, rotulo, maiorEMelhor, unid) {
    unid = unid || "";
    const cls = Math.abs(v) < 0.05 ? "flat" : (v > 0) === maiorEMelhor ? "up" : "down";
    const seta = cls === "flat" ? "•" : v > 0 ? "▲" : "▼";
    const val = unid === "p.p." ? nf1.format(Math.abs(v)) + " p.p." :
                unid === "%" ? nf1.format(Math.abs(v)) + "%" : num(Math.abs(v));
    return `<span class="kpi-delta ${cls}">${seta} ${val}</span><span>${rotulo}</span>`;
  }

  /* ============================== gráficos ============================== */
  function destruir(id) {
    if (estado.charts[id]) { estado.charts[id].destroy(); delete estado.charts[id]; }
  }

  function renderCharts() {
    const k = estado.cockpit.indicadores;
    const m = estado.cockpit.meta;
    const curva = estado.cockpit.curva_horaria;
    const hist = estado.cockpit.historico;

    /* --- curva intra-dia --- */
    destruir("curva");
    estado.charts.curva = new Chart($("#chart-curva"), {
      type: "line",
      data: {
        labels: curva.horas,
        datasets: [
          {
            label: "Previsto (acum.)", data: curva.previsto_acumulado,
            borderColor: COR.azul300, backgroundColor: COR.azul050,
            borderDash: [6, 4], borderWidth: 2, pointRadius: 2.5, fill: true, tension: .3,
          },
          {
            label: "Realizado (acum.)", data: curva.realizado_acumulado,
            borderColor: COR.azul600, backgroundColor: "rgba(10,79,160,.14)",
            borderWidth: 2.6, pointRadius: 3, pointBackgroundColor: COR.azul600, fill: true, tension: .3, spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: { y: { beginAtZero: true, grid: { color: COR.grade } }, x: { grid: { display: false } } },
        plugins: { legend: { position: "top", align: "end" } },
      },
    });
    const ult = curva.realizado_acumulado.filter((v) => v != null);
    if (!ult.length || !curva.horas.length) {
      $("#tag-curva").textContent = "curva intra-dia não informada";
    } else {
      const previstoHora = curva.previsto_acumulado[ult.length - 1];
      const gap = previstoHora - ult[ult.length - 1];
      $("#tag-curva").textContent = gap > 0 ? "déficit de " + num(gap) + " entregas no horário" : "à frente do plano";
    }

    /* --- status das entregas --- */
    destruir("status");
    const st = estado.cockpit.status_entregas;
    estado.charts.status = new Chart($("#chart-status"), {
      type: "doughnut",
      data: {
        labels: Object.keys(st),
        datasets: [{
          data: Object.values(st),
          backgroundColor: [COR.azul600, COR.azul500, COR.cinza, COR.warn, COR.risk],
          borderColor: "#fff", borderWidth: 2, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "64%",
        plugins: {
          legend: { position: "bottom" },
          centroRosca: { texto: num(k.entregas_previstas), rotulo: "entregas no dia" },
          tooltip: {
            callbacks: {
              label: (c) => " " + c.label + ": " + num(c.parsed) + " (" + pct(pctOf(c.parsed, k.entregas_previstas)) + ")",
            },
          },
        },
      },
    });

    /* --- OTD histórico × meta --- */
    destruir("otd");
    estado.charts.otd = new Chart($("#chart-otd"), {
      type: "line",
      data: {
        labels: hist.map((h) => dataCurta(h.data)),
        datasets: [
          {
            label: "OTD realizado", data: hist.map((h) => h.otd),
            borderColor: COR.azul600, backgroundColor: COR.azul600,
            borderWidth: 2.4, pointRadius: 3.5, tension: .3, fill: false,
            pointBackgroundColor: hist.map((h) => (h.otd >= m.otd ? COR.ok : COR.risk)),
          },
          {
            label: "Meta " + pct(m.otd), data: hist.map(() => m.otd),
            borderColor: COR.risk, borderDash: [6, 4], borderWidth: 1.6, pointRadius: 0, fill: false,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { suggestedMin: 85, suggestedMax: 100, ticks: { callback: (v) => v + "%" }, grid: { color: COR.grade } }, x: { grid: { display: false } } },
        plugins: { legend: { position: "top", align: "end" } },
      },
    });
    const abaixo = hist.filter((h) => h.otd < m.otd).length;
    $("#tag-otd").textContent = abaixo + " de " + hist.length + " dias abaixo da meta";

    /* --- frota --- */
    destruir("frota");
    estado.charts.frota = new Chart($("#chart-frota"), {
      type: "doughnut",
      data: {
        labels: ["Em operação", "Reserva", "Manutenção", "Parados"],
        datasets: [{
          data: [k.veiculos_ativos, k.veiculos_reserva || 0, k.veiculos_manutencao, k.veiculos_parados],
          backgroundColor: [COR.azul600, COR.azul300, COR.warn, COR.risk],
          borderColor: "#fff", borderWidth: 2, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "64%",
        plugins: {
          legend: { position: "bottom" },
          centroRosca: { texto: pct(pctOf(k.veiculos_ativos + (k.veiculos_reserva || 0), k.veiculos_total)), rotulo: "disponibilidade" },
        },
      },
    });

    /* --- conclusão por motorista --- */
    destruir("mot");
    const linhas = estado.rotina.linhas
      .filter((l) => l.entregas_previstas > 0)
      .map((l) => ({ nome: l.motorista, p: pctOf(l.entregas_realizadas, l.entregas_previstas), st: l.status }))
      .sort((a, b) => b.p - a.p);
    estado.charts.mot = new Chart($("#chart-motoristas"), {
      type: "bar",
      data: {
        labels: linhas.map((l) => l.nome),
        datasets: [{
          label: "% conclusão da rota",
          data: linhas.map((l) => +l.p.toFixed(1)),
          backgroundColor: linhas.map((l) =>
            l.st !== "Concluído" && l.st !== "Em rota" ? COR.cinza :
            l.p >= 95 ? COR.azul600 : l.p >= 80 ? COR.azul300 : l.p >= 70 ? COR.warn : COR.risk),
          borderRadius: 5, barPercentage: .72,
        }],
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + "%" }, grid: { color: COR.grade } },
          y: { grid: { display: false } },
        },
        plugins: {
          legend: { display: false },
          linhaMeta: { value: 95 },
          tooltip: { callbacks: { label: (c) => " conclusão: " + pct(c.parsed.x) } },
        },
      },
    });

    /* --- devoluções × ocorrências --- */
    destruir("dev");
    estado.charts.dev = new Chart($("#chart-devol"), {
      type: "bar",
      data: {
        labels: hist.map((h) => dataCurta(h.data)),
        datasets: [
          { label: "Devoluções", data: hist.map((h) => h.devolucoes), backgroundColor: COR.warn, borderRadius: 4 },
          { label: "Ocorrências", data: hist.map((h) => h.ocorrencias), backgroundColor: COR.azul500, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 2 }, grid: { color: COR.grade } }, x: { grid: { display: false } } },
        plugins: { legend: { position: "top", align: "end" } },
      },
    });
  }

  /* ============================== insights ============================== */
  function renderInsights() {
    const k = estado.cockpit.indicadores;
    const m = estado.cockpit.meta;
    const hist = estado.cockpit.historico;
    const linhas = estado.rotina.linhas;
    const ativas = linhas.filter((l) => l.entregas_previstas > 0);
    const conc = pctOf(k.entregas_realizadas, k.entregas_previstas);
    const cards = [];

    /* resumo executivo */
    const melhor = ativas.slice().sort((a, b) =>
      pctOf(b.entregas_realizadas, b.entregas_previstas) - pctOf(a.entregas_realizadas, a.entregas_previstas))[0];
    $("#insight-summary").innerHTML =
      `<strong>${diaSemana(m.data_referencia)[0].toUpperCase() + diaSemana(m.data_referencia).slice(1)}, ${dataBR(m.data_referencia)}</strong> · ` +
      `${num(k.entregas_realizadas)} de ${num(k.entregas_previstas)} entregas concluídas (<strong>${pct(conc)}</strong> do plano) · ` +
      `OTD <strong>${pct(k.otd)}</strong> (meta ${pct(m.otd)}) · ${k.veiculos_ativos} de ${k.veiculos_total} veículos em operação · ` +
      `${num(k.ocorrencias)} ocorrências em rota. Melhor desempenho do dia: <strong>${melhor.motorista}</strong> (${melhor.rota}).`;

    /* 1 · projeção de fechamento do dia */
    const curva = estado.cockpit.curva_horaria || { horas: [], realizado_acumulado: [], previsto_acumulado: [] };
    const reais = curva.realizado_acumulado.filter((v) => v != null);
    if (reais.length >= 3) {
    const ultIdx = reais.length - 1;
    const ultVal = reais[ultIdx];
    const ritmo = ultIdx >= 3 ? (ultVal - reais[ultIdx - 3]) / 3 : ultVal / (ultIdx + 1);
    const horasRest = Math.max(1, (curva.realizado_acumulado.length - 1 - ultIdx));
    const proj = ultVal + ritmo * horasRest;
    const ritmoNec = horasRest > 0 ? (k.entregas_previstas - ultVal) / horasRest : 0;
    cards.push({
      tipo: proj >= k.entregas_previstas ? "destaque" : "acao",
      ico: proj >= k.entregas_previstas ? "🎯" : "⏱",
      titulo: "Projeção de fechamento",
      texto: `Mantido o ritmo das últimas horas (<b>${nf1.format(ritmo)} entregas/h</b>), o dia fecha em <b>${num(Math.round(proj))} entregas (${pct(pctOf(proj, k.entregas_previstas))} do plano)</b>. ` +
             `Para cumprir 100% são necessárias <b>${nf1.format(ritmoNec)} entregas/h</b> até ${curva.horas[curva.horas.length - 1]} ` +
             `(${pctOf(ritmoNec - ritmo, ritmo) > 0 ? "+" : ""}${nf1.format(pctOf(ritmoNec - ritmo, ritmo))}% sobre o ritmo atual).`,
    });
    }

    /* 2 · OTD vs meta */
    const abaixo = hist.filter((h) => h.otd < m.otd).length;
    const seq = (() => { let s = 0; for (let i = hist.length - 1; i >= 0; i--) { if (hist[i].otd < m.otd) s++; else break; } return s; })();
    cards.push({
      tipo: k.otd >= m.otd ? "destaque" : "alerta",
      ico: k.otd >= m.otd ? "✅" : "⚠️",
      titulo: "OTD " + (k.otd >= m.otd ? "dentro da meta" : "abaixo da meta"),
      texto: `OTD do dia em <b>${pct(k.otd)}</b> contra meta de ${pct(m.otd)} (${nf1.format(k.otd - m.otd)} p.p.). ` +
             `Nos últimos ${hist.length} dias de operação, <b>${abaixo} ficaram abaixo da meta</b>${seq > 1 ? `, sendo <b>${seq} dias consecutivos</b> — padrão que pede ação estrutural` : ""}. ` +
             `SLA acompanha em <b>${pct(k.sla)}</b> (meta ${pct(m.sla)}).`,
    });

    /* 3 · rotas em risco */
    const risco = ativas.filter((l) => l.status === "Em rota" && pctOf(l.entregas_realizadas, l.entregas_previstas) < 78)
      .sort((a, b) => pctOf(a.entregas_realizadas, a.entregas_previstas) - pctOf(b.entregas_realizadas, b.entregas_previstas));
    if (risco.length) {
      cards.push({
        tipo: "alerta", ico: "🚨", titulo: risco.length + " rotas em risco de não concluir",
        texto: risco.map((l) => `<b>${l.motorista}</b> (${l.rota}) com ${pct(pctOf(l.entregas_realizadas, l.entregas_previstas))} concluído`).join(" · ") +
               `. Somam <b>${num(risco.reduce((s, l) => s + (l.entregas_previstas - l.entregas_realizadas), 0))} entregas abertas</b> — priorizar apoio ou remanejo de carga.`,
      });
    }

    /* 4 · destaque positivo */
    const tops = ativas.filter((l) => l.status === "Concluído" && l.ocorrencias === 0 &&
      pctOf(l.entregas_realizadas, l.entregas_previstas) >= 99);
    if (tops.length) {
      cards.push({
        tipo: "destaque", ico: "🏆", titulo: "Rotas modelo do dia",
        texto: `<b>${tops.map((t) => t.motorista).join("</b>, <b>")}</b> concluíram 100% das entregas e coletas sem nenhuma ocorrência. ` +
               `Prática recomendada como referência de roteiro e checklist de saída.`,
      });
    }

    /* 5 · frota indisponível */
    const indisp = linhas.filter((l) => l.status === "Manutenção" || l.status === "Parado");
    if (indisp.length) {
      const mediaPorVeic = k.entregas_previstas / Math.max(1, k.veiculos_ativos);
      cards.push({
        tipo: "acao", ico: "🔧", titulo: "Capacidade perdida por frota parada",
        texto: `<b>${indisp.length} veículos</b> fora de operação (${indisp.map((i) => i.placa).join(", ")}) retiraram da rota cerca de ` +
               `<b>${num(Math.round(mediaPorVeic * indisp.length))} entregas/dia</b> (${pct(pctOf(indisp.length, k.veiculos_total))} da capacidade). ` +
               `O veículo reserva (${(linhas.find((l) => l.status === "Reserva") || {}).placa || "—"}) cobre parte do gap; ` +
               `previsão de retorno: ${indisp.map((i) => (i.observacao.match(/\(([^)]*)\)/) || [])[1]).filter(Boolean).join("; ") || "não informada"}.`,
      });
    }

    /* 6 · devoluções */
    const mediaDev = hist.length ? hist.reduce((s, h) => s + h.devolucoes, 0) / hist.length : 0;
    cards.push({
      tipo: k.devolucoes > m.devolucoes_max ? "alerta" : k.devolucoes > mediaDev ? "tendencia" : "destaque",
      ico: k.devolucoes > mediaDev ? "📦" : "✅", titulo: "Devoluções " + (k.devolucoes > mediaDev ? "acima da média" : "sob controle"),
      texto: `Foram <b>${num(k.devolucoes)} devoluções</b> hoje (média histórica ${nf1.format(mediaDev)}; limite diário ${num(m.devolucoes_max)}), ` +
             `concentradas em endereço fechado/destinatário ausente. Cada devolução gera retrabalho médio de ~12 km e nova tentativa no D+1.`,
    });

    /* 7 · eficiência de km / custo */
    const kmPct = pctOf(k.km_rodado, k.km_planejado);
    cards.push({
      tipo: k.custo_km > m.custo_km * 1.05 ? "alerta" : k.custo_km > m.custo_km ? "tendencia" : "destaque",
      ico: "⛽", titulo: "Custo e eficiência de rodagem",
      texto: `Custo de <b>${brl(k.custo_km)}/km</b> contra alvo de ${brl(m.custo_km)} (${nf1.format(pctOf(k.custo_km - m.custo_km, m.custo_km))}% acima). ` +
             `A frota rodou <b>${num(k.km_rodado)} km (${pct(kmPct)} do plano)</b> para ${pct(conc)} das entregas — sinal de rotas retrabalhadas; ` +
             `revisar sequenciamento das rotas com menor % de conclusão.`,
    });

    /* 8 · saídas atrasadas */
    const atrasos = ativas.filter((l) => l.saida_real !== "—" && l.saida_prevista !== "—" && l.saida_real > l.saida_prevista)
      .map((l) => ({ ...l, min: (parseInt(l.saida_real.slice(0, 2)) * 60 + parseInt(l.saida_real.slice(3, 5))) - (parseInt(l.saida_prevista.slice(0, 2)) * 60 + parseInt(l.saida_prevista.slice(3, 5))) }))
      .sort((a, b) => b.min - a.min);
    if (atrasos.length) {
      cards.push({
        tipo: atrasos.length >= 4 ? "tendencia" : "acao", ico: "🕒", titulo: atrasos.length + " saídas após o horário previsto",
        texto: `Atraso médio de <b>${nf1.format(atrasos.reduce((s, a) => s + a.min, 0) / atrasos.length)} min</b>; maior desvio: ` +
               `<b>${atrasos[0].motorista}</b> (+${atrasos[0].min} min, ${atrasos[0].rota}). Saídas tardias comprimem a janela da tarde e ` +
               `elevam horas extras (<b>${nf1.format(k.horas_extras)}h</b> hoje).`,
      });
    }

    const ordem = { alerta: 0, acao: 1, tendencia: 2, destaque: 3 };
    cards.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
    const rotulo = { alerta: "Alerta", acao: "Ação recomendada", tendencia: "Tendência", destaque: "Destaque" };
    const icoDefault = { alerta: "⚠️", acao: "🛠", tendencia: "📈", destaque: "⭐" };

    $("#insight-grid").innerHTML = cards.map((c) => `
      <article class="insight ${c.tipo}">
        <div class="ico">${c.ico || icoDefault[c.tipo]}</div>
        <div><h4>${rotulo[c.tipo]} · ${c.titulo}</h4><p>${c.texto}</p></div>
      </article>`).join("");
  }

  /* =============================== tabela =============================== */
  const RANK = { "Em rota": 0, Concluído: 1, Reserva: 2, Manutenção: 3, Parado: 4 };
  const PILL = { "Em rota": "em-rota", Concluído: "concluido", Manutenção: "manutencao", Parado: "parado", Reserva: "reserva" };

  function linhasFiltradas() {
    let ls = estado.rotina.linhas.slice();
    if (estado.filtro !== "todos") ls = ls.filter((l) => l.status === estado.filtro);
    if (estado.busca) {
      const b = estado.busca.toLowerCase();
      ls = ls.filter((l) => [l.motorista, l.veiculo, l.placa, l.rota, l.status].join(" ").toLowerCase().includes(b));
    }
    if (estado.sort) {
      const { key, dir } = estado.sort;
      ls.sort((a, b) => {
        let va = a[key], vb = b[key];
        if (key === "status") { va = RANK[va]; vb = RANK[vb]; }
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
        return String(va).localeCompare(String(vb), "pt-BR") * dir;
      });
    }
    return ls;
  }

  function renderTabela() {
    const ls = linhasFiltradas();
    $("#tbody-rotina").innerHTML = ls.map((l) => {
      const p = l.entregas_previstas ? pctOf(l.entregas_realizadas, l.entregas_previstas) : null;
      const tone = p == null ? "" : p >= 95 ? "ok" : p >= 80 ? "" : p >= 70 ? "warn" : "risk";
      return `<tr>
        <td class="cell-mot">${l.motorista}</td>
        <td>${l.veiculo}<span class="cell-sub">${l.tipo}</span></td>
        <td>${l.placa}</td>
        <td>${l.rota}</td>
        <td class="num">${l.saida_prevista}</td>
        <td class="num">${l.saida_real}${l.saida_real !== "—" && l.saida_prevista !== "—" && l.saida_real > l.saida_prevista ? ' <span style="color:var(--risk)">▲</span>' : ""}</td>
        <td class="num">${num(l.entregas_realizadas)} / ${num(l.entregas_previstas)}</td>
        <td>${p == null ? '<span style="color:var(--tinta-suave)">—</span>' :
          `<div class="prog ${tone}"><div class="prog-top"><span>${pct(p)}</span></div><div class="prog-bar"><i style="width:${Math.min(100, p)}%"></i></div></div>`}</td>
        <td class="num">${num(l.coletas_realizadas)} / ${num(l.coletas_previstas)}</td>
        <td class="num">${l.ocorrencias ? '<b style="color:var(--risk)">' + l.ocorrencias + "</b>" : "0"}</td>
        <td class="num">${num(l.km_rodado)}${l.km_planejado ? '<span class="cell-sub">/ ' + num(l.km_planejado) + "</span>" : ""}</td>
        <td><span class="pill ${PILL[l.status]}">${l.status}</span></td>
        <td style="color:var(--tinta-suave)">${l.observacao || "—"}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="13" style="text-align:center;padding:26px;color:var(--tinta-suave)">Nenhuma linha corresponde ao filtro selecionado.</td></tr>`;

    const tot = ls.reduce((s, l) => ({
      ep: s.ep + l.entregas_previstas, er: s.er + l.entregas_realizadas,
      cp: s.cp + l.coletas_previstas, cr: s.cr + l.coletas_realizadas,
      oc: s.oc + l.ocorrencias, km: s.km + l.km_rodado,
    }), { ep: 0, er: 0, cp: 0, cr: 0, oc: 0, km: 0 });
    $("#tfoot-rotina").innerHTML = `<tr>
      <td colspan="6">Total (${ls.length} ${ls.length === 1 ? "linha" : "linhas"})</td>
      <td class="num">${num(tot.er)} / ${num(tot.ep)}</td>
      <td class="num">${tot.ep ? pct(pctOf(tot.er, tot.ep)) : "—"}</td>
      <td class="num">${num(tot.cr)} / ${num(tot.cp)}</td>
      <td class="num">${num(tot.oc)}</td>
      <td class="num">${num(tot.km)}</td>
      <td colspan="2"></td>
    </tr>`;
  }

  /* --------------------------- cabeçalho/rodapé -------------------------- */
  function renderMoldura() {
    const m = estado.cockpit.meta;
    $("#chip-data").textContent = diaSemana(m.data_referencia) + ", " + dataBR(m.data_referencia);
    $("#chip-filial").textContent = "🏭 " + m.filial;
    $("#chip-atualizacao").textContent = "🕒 atualizado às " + horaBR(m.atualizado_em);
    $("#demo-flag").hidden = !(estado.cockpit.fonte && estado.cockpit.fonte.demo);
    $("#footer-source").innerHTML =
      `Fonte: ${estado.cockpit.fonte.planilha} · abas <b>${estado.cockpit.fonte.abas.join("</b> e <b>")}</b> · ` +
      `carga em ${dataBR(m.data_referencia)} às ${horaBR(m.atualizado_em)} · COCKPIT DIÁRIO v1.0`;
  }

  /* ------------------------------- eventos ------------------------------- */
  function ligarEventos() {
    $("#filters").addEventListener("click", (e) => {
      const b = e.target.closest(".filter");
      if (!b) return;
      document.querySelectorAll(".filter").forEach((f) => f.classList.remove("is-active"));
      b.classList.add("is-active");
      estado.filtro = b.dataset.status;
      renderTabela();
    });
    $("#busca").addEventListener("input", (e) => { estado.busca = e.target.value.trim(); renderTabela(); });
    document.querySelectorAll("#tabela-rotina thead th[data-key]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        const dir = estado.sort && estado.sort.key === key ? -estado.sort.dir : 1;
        estado.sort = { key, dir };
        document.querySelectorAll("#tabela-rotina thead th .arrow").forEach((a) => a.remove());
        const s = document.createElement("span");
        s.className = "arrow";
        s.textContent = dir === 1 ? " ▲" : " ▼";
        th.appendChild(s);
        renderTabela();
      });
    });
    $("#btn-atualizar").addEventListener("click", async () => {
      const btn = $("#btn-atualizar");
      btn.disabled = true;
      btn.style.opacity = .6;
      try { await carregar(); renderizar(); }
      catch (err) { alert("Falha ao recarregar os dados: " + err.message); }
      btn.disabled = false;
      btn.style.opacity = 1;
    });
  }

  function renderizar() {
    renderMoldura();
    renderKPIs();
    renderCharts();
    renderInsights();
    renderTabela();
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
