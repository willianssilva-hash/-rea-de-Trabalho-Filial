#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Importa os dados da planilha "Área de Trabalho Filial" para o COCKPIT DIÁRIO.

Uso:
  1) Exporte as duas abas da planilha em CSV (Arquivo > Baixar > CSV) e rode:
       python3 scripts/import_spreadsheet.py --rotina "Rotina Diaria Mot. Frota2.csv" \
                                             --cockpit "Cockpit Diario.csv"

  2) Ou, se a planilha estiver pública ("qualquer pessoa com o link"), informe o
     id e os gids:
       python3 scripts/import_spreadsheet.py --sheet-id 1McDH0Ih... \
             --gid-cockpit 1951800208 --gid-rotina 0

O script normaliza cabeçalhos (sem acento/caixa) e aceita sinônimos comuns de
colunas; o que não for mapeado é listado no relatório final. O formato de saída
é exatamente o que app/js/app.js consome (app/data/*.json).
"""
import argparse
import csv
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "app", "data")

SIN_ROTINA = {
    "motorista": ["motorista", "condutor", "nome_motorista", "nome_do_motorista", "colaborador"],
    "veiculo": ["veiculo", "veicul", "caminhao", "descricao_veiculo"],
    "placa": ["placa", "placa_veiculo"],
    "tipo": ["tipo", "tipo_veiculo", "categoria"],
    "rota": ["rota", "rota_regiao", "regiao", "zona", "setor"],
    "saida_prevista": ["saida_prevista", "saida_prev", "horario_saida_previsto", "prev_saida"],
    "saida_real": ["saida_real", "horario_saida", "saida"],
    "entregas_previstas": ["entregas_previstas", "entregas_prev", "prev_entregas", "vol_previstos"],
    "entregas_realizadas": ["entregas_realizadas", "entregas_real", "entregas", "vol_entregues"],
    "coletas_previstas": ["coletas_previstas", "coletas_prev", "prev_coletas"],
    "coletas_realizadas": ["coletas_realizadas", "coletas_real", "coletas"],
    "ocorrencias": ["ocorrencias", "ocorrencia", "eventos"],
    "km_planejado": ["km_planejado", "km_previsto", "km_prev", "km_planejados"],
    "km_rodado": ["km_rodado", "km_real", "km_percorrido", "km"],
    "status": ["status", "situacao", "status_rota"],
    "observacao": ["observacao", "observacoes", "obs", "comentario"],
}

SIN_COCKPIT = {
    "entregas_previstas": ["entregas_previstas", "entregas_prev", "previstas", "vol_previstos"],
    "entregas_realizadas": ["entregas_realizadas", "entregas_real", "realizadas", "vol_entregues"],
    "entregas_em_rota": ["entregas_em_rota", "em_rota"],
    "entregas_pendentes": ["entregas_pendentes", "pendentes"],
    "devolucoes": ["devolucoes", "devolucao"],
    "avarias": ["avarias", "avaria"],
    "coletas_previstas": ["coletas_previstas", "coletas_prev"],
    "coletas_realizadas": ["coletas_realizadas", "coletas_real", "coletas"],
    "otd": ["otd", "otd_percentual", "entregas_no_prazo"],
    "sla": ["sla", "sla_percentual"],
    "veiculos_total": ["veiculos_total", "frota_total", "total_veiculos"],
    "veiculos_ativos": ["veiculos_ativos", "veiculos_em_operacao", "ativos"],
    "veiculos_manutencao": ["veiculos_manutencao", "manutencao", "veiculos_em_manutencao"],
    "veiculos_parados": ["veiculos_parados", "parados"],
    "veiculos_reserva": ["veiculos_reserva", "reserva"],
    "km_planejado": ["km_planejado", "km_previsto"],
    "km_rodado": ["km_rodado", "km_real"],
    "custo_km": ["custo_km", "custo_por_km"],
    "horas_extras": ["horas_extras", "he", "horas_extras_h"],
    "absenteismo": ["absenteismo", "faltas"],
    "ocorrencias": ["ocorrencias", "ocorrencia"],
    "data": ["data", "dia", "dt_referencia", "data_referencia"],
}


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


def numero(v):
    if v is None:
        return None
    s = str(v).strip().replace("%", "").replace(" ", "")
    if s in ("", "-", "—"):
        return None
    s = s.replace(".", "") if s.count(".") == 1 and s.count(",") == 0 and len(s.split(".")[1]) == 3 else s
    s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def hora(v):
    s = str(v or "").strip()
    m = re.search(r"(\d{1,2})[:hH](\d{2})", s)
    if m:
        return f"{int(m.group(1)):02d}:{m.group(2)}"
    return s or "—"


def ler_csv(caminho_or_url):
    if caminho_or_url.startswith("http"):
        with urllib.request.urlopen(caminho_or_url) as r:
            raw = r.read().decode("utf-8-sig")
    else:
        with open(caminho_or_url, encoding="utf-8-sig") as f:
            raw = f.read()
    linhas = list(csv.reader(io.StringIO(raw), delimiter=";"))
    if len(linhas) > 1 and len(linhas[0]) == 1:
        linhas = list(csv.reader(io.StringIO(raw)))
    linhas = [l for l in linhas if any(str(c).strip() for c in l)]
    return linhas


def mapear_cabecalho(cab, sinonimos):
    idx, nao_mapeados = {}, []
    normais = [norm(c) for c in cab]
    for campo, sins in sinonimos.items():
        achou = None
        for s in [norm(x) for x in sins]:
            for i, n in enumerate(normais):
                if n == s:
                    achou = i
                    break
            if achou is not None:
                break
        if achou is None:  # tentativa parcial
            for s in [norm(x) for x in sins]:
                for i, n in enumerate(normais):
                    if s and s in n:
                        achou = i
                        break
                if achou is not None:
                    break
        if achou is not None:
            idx[campo] = achou
        else:
            nao_mapeados.append(campo)
    return idx, nao_mapeados


def importar_rotina(linhas):
    cab = linhas[0]
    idx, faltas = mapear_cabecalho(cab, SIN_ROTINA)
    rows = []
    for l in linhas[1:]:
        g = lambda c, d="": (l[idx[c]].strip() if idx.get(c) is not None and idx[c] < len(l) else d)
        rows.append({
            "motorista": g("motorista", "—") or "—",
            "veiculo": g("veiculo", "—"),
            "placa": g("placa", "—"),
            "tipo": g("tipo", "—"),
            "rota": g("rota", "—"),
            "saida_prevista": hora(g("saida_prevista", "—")),
            "saida_real": hora(g("saida_real", "—")),
            "entregas_previstas": numero(g("entregas_previstas")) or 0,
            "entregas_realizadas": numero(g("entregas_realizadas")) or 0,
            "coletas_previstas": numero(g("coletas_previstas")) or 0,
            "coletas_realizadas": numero(g("coletas_realizadas")) or 0,
            "ocorrencias": numero(g("ocorrencias")) or 0,
            "km_planejado": numero(g("km_planejado")) or 0,
            "km_rodado": numero(g("km_rodado")) or 0,
            "status": g("status", "—") or "—",
            "observacao": g("observacao"),
        })
    return rows, faltas


def importar_cockpit(linhas, rotina):
    cab = linhas[0]
    idx, faltas = mapear_cabecalho(cab, SIN_COCKPIT)
    eh_chave_valor = len(cab) == 2 and norm(cab[0]) in ("indicador", "item", "kpi", "descricao", "")
    dados = {}
    historico = []
    if eh_chave_valor:
        for l in linhas[1:]:
            chave = None
            for campo, sins in SIN_COCKPIT.items():
                if norm(l[0]) in [norm(s) for s in sins]:
                    chave = campo
                    break
            if chave:
                v = numero(l[1])
                dados[chave] = int(v) if v is not None and float(v).is_integer() and chave not in ("otd", "sla", "custo_km", "horas_extras", "absenteismo") else v
    else:
        for l in linhas[1:]:
            g = lambda c: (l[idx[c]].strip() if idx.get(c) is not None and idx[c] < len(l) else None)
            reg = {c: numero(g(c)) for c in SIN_COCKPIT if c in idx}
            reg["data"] = g("data")
            historico.append(reg)
        if historico:
            dados = historico[-1]
            historico = historico[:-1][-12:]
    return dados, historico, faltas


def montar(rotina_rows, cock, historico, sheet_id):
    soma = lambda k: sum(r[k] for r in rotina_rows)
    ind = {
        "entregas_previstas": cock.get("entregas_previstas") or soma("entregas_previstas"),
        "entregas_realizadas": cock.get("entregas_realizadas") or soma("entregas_realizadas"),
        "entregas_em_rota": cock.get("entregas_em_rota") or 0,
        "entregas_pendentes": cock.get("entregas_pendentes") or 0,
        "devolucoes": cock.get("devolucoes") or 0,
        "avarias": cock.get("avarias") or 0,
        "coletas_previstas": cock.get("coletas_previstas") or soma("coletas_previstas"),
        "coletas_realizadas": cock.get("coletas_realizadas") or soma("coletas_realizadas"),
        "otd": cock.get("otd") or 0,
        "sla": cock.get("sla") or 0,
        "veiculos_total": cock.get("veiculos_total") or len(rotina_rows),
        "veiculos_ativos": cock.get("veiculos_ativos") or len([r for r in rotina_rows if r["status"] in ("Em rota", "Concluído")]),
        "veiculos_manutencao": cock.get("veiculos_manutencao") or len([r for r in rotina_rows if r["status"] == "Manutenção"]),
        "veiculos_parados": cock.get("veiculos_parados") or len([r for r in rotina_rows if r["status"] == "Parado"]),
        "veiculos_reserva": cock.get("veiculos_reserva") or len([r for r in rotina_rows if r["status"] == "Reserva"]),
        "km_planejado": cock.get("km_planejado") or soma("km_planejado"),
        "km_rodado": cock.get("km_rodado") or soma("km_rodado"),
        "custo_km": cock.get("custo_km") or 0,
        "horas_extras": cock.get("horas_extras") or 0,
        "absenteismo": cock.get("absenteismo") or 0,
        "ocorrencias": cock.get("ocorrencias") or soma("ocorrencias"),
    }
    hist = []
    for h in historico:
        if h.get("data"):
            hist.append({
                "data": h["data"],
                "entregas_previstas": h.get("entregas_previstas") or 0,
                "entregas_realizadas": h.get("entregas_realizadas") or 0,
                "otd": h.get("otd") or 0,
                "devolucoes": h.get("devolucoes") or 0,
                "ocorrencias": h.get("ocorrencias") or 0,
            })
    return {
        "meta": {
            "aba_origem": "Cockpit Diário",
            "filial": os.environ.get("COCKPIT_FILIAL", "Filial 01"),
            "data_referencia": cock.get("data") or date.today().isoformat(),
            "atualizado_em": datetime.now().isoformat(timespec="minutes"),
            "otd": float(os.environ.get("COCKPIT_META_OTD", 95)),
            "sla": float(os.environ.get("COCKPIT_META_SLA", 96)),
            "disponibilidade_frota": float(os.environ.get("COCKPIT_META_DISP", 90)),
            "custo_km": float(os.environ.get("COCKPIT_META_CUSTO_KM", 3.2)),
            "devolucoes_max": float(os.environ.get("COCKPIT_META_DEV", 8)),
        },
        "indicadores": ind,
        "status_entregas": {
            "Concluídas": ind["entregas_realizadas"],
            "Em rota": ind["entregas_em_rota"],
            "Pendentes": ind["entregas_pendentes"],
            "Devolução": ind["devolucoes"],
            "Avaria": ind["avarias"],
        },
        "curva_horaria": cock.get("curva_horaria") or {
            "horas": [], "previsto_acumulado": [], "realizado_acumulado": []},
        "historico": hist,
        "fonte": {
            "planilha": "Área de Trabalho Filial (Google Sheets)" + (f" · {sheet_id}" if sheet_id else ""),
            "abas": ["Cockpit Diário", "Rotina Diária Mot. Frota2"],
            "demo": False,
            "nota": "Importado em " + datetime.now().strftime("%d/%m/%Y %H:%M"),
        },
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--rotina", help="CSV exportado da aba 'Rotina Diária Mot. Frota2'")
    ap.add_argument("--cockpit", help="CSV exportado da aba 'Cockpit Diário'")
    ap.add_argument("--sheet-id", help="id da planilha pública (opcional)")
    ap.add_argument("--gid-rotina", help="gid da aba de rotina (com --sheet-id)")
    ap.add_argument("--gid-cockpit", help="gid da aba cockpit (com --sheet-id)")
    args = ap.parse_args()

    if args.sheet_id:
        base = f"https://docs.google.com/spreadsheets/d/{args.sheet_id}/export?format=csv&gid="
        rotina_src = base + (args.gid_rotina or "0")
        cockpit_src = base + (args.gid_cockpit or "0")
    else:
        if not args.rotina or not args.cockpit:
            ap.error("informe --rotina e --cockpit (CSVs) ou --sheet-id com os gids")
        rotina_src, cockpit_src = args.rotina, args.cockpit

    linhas_rotina = ler_csv(rotina_src)
    linhas_cockpit = ler_csv(cockpit_src)
    rotina_rows, faltas_r = importar_rotina(linhas_rotina)
    cock, historico, faltas_c = importar_cockpit(linhas_cockpit, rotina_rows)

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "rotina_diaria.json"), "w", encoding="utf-8") as f:
        json.dump({
            "meta": {"aba_origem": "Rotina Diária Mot. Frota2",
                     "filial": os.environ.get("COCKPIT_FILIAL", "Filial 01"),
                     "data_referencia": cock.get("data") or date.today().isoformat()},
            "colunas": list(SIN_ROTINA.keys()),
            "linhas": rotina_rows,
        }, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUT, "cockpit_diario.json"), "w", encoding="utf-8") as f:
        json.dump(montar(rotina_rows, cock, historico, args.sheet_id), f, ensure_ascii=False, indent=2)

    print(f"✔ {len(rotina_rows)} linhas de rotina e {len(historico)} dias de histórico importados.")
    if faltas_r:
        print("  colunas de rotina não mapeadas (usei padrão):", ", ".join(faltas_r))
    if faltas_c and not (len(linhas_cockpit[0]) == 2):
        print("  colunas de cockpit não mapeadas:", ", ".join(faltas_c))
    print("  JSONs gravados em app/data/. Recarregue o painel no navegador.")


if __name__ == "__main__":
    main()
