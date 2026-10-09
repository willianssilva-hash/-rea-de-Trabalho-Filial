#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera os JSONs de demonstração consumidos pelo COCKPIT DIÁRIO (app/data/*.json).

O esquema dos JSONs espelha as abas da planilha origem:
  * "Cockpit Diário"          -> data/cockpit_diario.json
  * "Rotina Diária Mot. Frota2"-> data/rotina_diaria.json

Quando os dados reais forem disponibilizados (export CSV das abas ou link
público da planilha), rode `scripts/import_spreadsheet.py` que ele regrava os
mesmos JSONs neste formato - o painel não precisa de nenhuma alteração.
"""
import json
import os
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "app", "data")
HOJE = date(2026, 10, 9)

# ----------------------------------------------------------------------------
# Aba "Rotina Diária Mot. Frota2"
# ----------------------------------------------------------------------------
ROTINA = [
    # motorista, veiculo, placa, tipo, rota, saida_prev, saida_real,
    # ent_prev, ent_real, col_prev, col_real, ocorr, km_prev, km_real, status, obs
    ["Carlos Menezes",   "Caminhão VW 9.160",  "OMQ-2A41", "Caminhão",   "Rota 01 - Norte",      "07:00", "06:52", 42, 42, 8, 8, 0, 168, 171, "Concluído",  "Rota finalizada sem ocorrências"],
    ["Ana Paula Ribeiro","Fiat Fiorino",       "OMQ-1B77", "Utilitário", "Rota 02 - Centro",     "07:00", "07:05", 38, 36, 6, 6, 0, 96,  101, "Em rota",    "2 entregas em andamento"],
    ["João V. Santana",  "Caminhão VW 9.160",  "OMQ-2A38", "Caminhão",   "Rota 03 - Sul",        "07:00", "07:10", 45, 39, 9, 7, 1, 182, 176, "Em rota",    "Avaria leve em 1 volume"],
    ["Marcos Dutra",     "Mercedes Sprinter",  "OMQ-3C19", "Van",        "Rota 04 - Leste",      "07:30", "07:28", 40, 40, 7, 7, 0, 141, 138, "Concluído",  ""],
    ["Renata Almeida",   "Fiat Fiorino",       "OMQ-1B80", "Utilitário", "Rota 05 - Oeste",      "07:30", "07:41", 36, 29, 6, 4, 1, 104, 112, "Em rota",    "Trânsito intenso no setor 7"],
    ["Paulo Henrique",   "Caminhão MB 710",    "OMQ-2A55", "Caminhão",   "Rota 06 - Noroeste",   "07:00", "06:58", 44, 44, 8, 8, 0, 175, 169, "Concluído",  ""],
    ["Sandra Lopes",     "Mercedes Sprinter",  "OMQ-3C22", "Van",        "Rota 07 - Sudoeste",   "07:30", "07:30", 39, 33, 7, 5, 0, 133, 127, "Em rota",    ""],
    ["Diego Farias",     "Fiat Fiorino",       "OMQ-1B91", "Utilitário", "Rota 08 - Centro-Sul", "08:00", "08:12", 34, 24, 5, 3, 2, 88,  95,  "Em rota",    "2 devoluções por endereço fechado"],
    ["Juliana Prado",    "Caminhão VW 9.160",  "OMQ-2A47", "Caminhão",   "Rota 09 - Norte II",   "07:00", "06:59", 43, 43, 8, 8, 0, 170, 166, "Concluído",  ""],
    ["Roberto Lima",     "Mercedes Sprinter",  "OMQ-3C30", "Van",        "Rota 10 - Leste II",   "07:30", "07:52", 37, 27, 6, 4, 1, 128, 121, "Em rota",    "Saída atrasada (checklist)"],
    ["Fernanda Costa",   "Fiat Fiorino",       "OMQ-1B64", "Utilitário", "Rota 11 - Oeste II",   "08:00", "07:57", 33, 33, 5, 5, 0, 92,  89,  "Concluído",  ""],
    ["Tiago Nogueira",   "Caminhão MB 710",    "OMQ-2A60", "Caminhão",   "Rota 12 - Sul II",     "07:00", "06:57", 41, 30, 8, 6, 0, 177, 158, "Em rota",    ""],
    ["Beatriz Ramos",    "Mercedes Sprinter",  "OMQ-3C35", "Van",        "Rota 13 - Centro-Norte","07:30","07:26", 35, 21, 6, 3, 1, 121, 108, "Em rota",    "1 ocorrência de atraso registrada"],
    ["Alexandre Pires",  "Fiat Fiorino",       "OMQ-1B58", "Utilitário", "Rota 14 - Aeroporto",  "08:00", "07:58", 30, 18, 4, 2, 0, 84,  77,  "Em rota",    ""],
    ["—",                "Caminhão VW 8.150",  "OMQ-2A33", "Caminhão",   "—",                    "—",     "—",     0,  0,  0, 0, 0, 0,   0,   "Manutenção", "Oficina - freios (previsão 10/10)"],
    ["—",                "Mercedes Sprinter",  "OMQ-3C11", "Van",        "—",                    "—",     "—",     0,  0,  0, 0, 0, 0,   0,   "Manutenção", "Revisão preventiva 30 mil km"],
    ["—",                "Fiat Fiorino",       "OMQ-1B49", "Utilitário", "—",                    "—",     "—",     0,  0,  0, 0, 0, 0,   0,   "Parado",     "Aguardando documentação (licenciamento)"],
    ["—",                "Caminhão MB 710",    "OMQ-2A51", "Caminhão",   "Reserva",              "—",     "—",     0,  0,  0, 0, 0, 0,   0,   "Reserva",    "Disponível para contingência"],
]

COLS = ["motorista", "veiculo", "placa", "tipo", "rota", "saida_prevista",
        "saida_real", "entregas_previstas", "entregas_realizadas",
        "coletas_previstas", "coletas_realizadas", "ocorrencias",
        "km_planejado", "km_rodado", "status", "observacao"]

rotina_rows = [dict(zip(COLS, r)) for r in ROTINA]

ent_prev = sum(r["entregas_previstas"] for r in rotina_rows)
ent_real = sum(r["entregas_realizadas"] for r in rotina_rows)
col_prev = sum(r["coletas_previstas"] for r in rotina_rows)
col_real = sum(r["coletas_realizadas"] for r in rotina_rows)
ocorr    = sum(r["ocorrencias"] for r in rotina_rows)
km_prev  = sum(r["km_planejado"] for r in rotina_rows)
km_real  = sum(r["km_rodado"] for r in rotina_rows)

# ----------------------------------------------------------------------------
# Aba "Cockpit Diário"
# ----------------------------------------------------------------------------
historico = []
otd_base = [93.1, 94.6, 92.4, 95.2, 94.0, 91.7, 95.8, 93.9, 96.1, 92.8,
            94.4, 93.2, 95.0, 94.2]
prev_base = [498, 512, 486, 521, 515, 502, 528, 511, 534, 507, 517, 503,
             524, 512]
for i, d in enumerate(range(14, 0, -1)):
    dia = HOJE - timedelta(days=d)
    if dia.weekday() == 6:  # domingo sem operação
        continue
    prev = prev_base[i]
    otd = otd_base[i]
    hist_real = int(round(prev * otd / 100.0))
    historico.append({
        "data": dia.isoformat(),
        "entregas_previstas": prev,
        "entregas_realizadas": hist_real,
        "otd": otd,
        "devolucoes": [7, 9, 6, 5, 8, 12, 4, 7, 5, 9, 6, 8, 5, 11][i],
        "ocorrencias": [3, 2, 4, 1, 3, 5, 2, 3, 1, 4, 2, 3, 2, 6][i],
    })

cockpit = {
    "meta": {
        "aba_origem": "Cockpit Diário",
        "filial": "Filial 01",
        "data_referencia": HOJE.isoformat(),
        "atualizado_em": "2026-10-09T16:20:00",
        "otd": 95.0,
        "sla": 96.0,
        "disponibilidade_frota": 90.0,
        "custo_km": 3.20,
        "devolucoes_max": 8,
    },
    "indicadores": {
        "entregas_previstas": ent_prev,
        "entregas_realizadas": ent_real,
        "entregas_em_rota": 45,
        "entregas_pendentes": 22,
        "devolucoes": 8,
        "avarias": 3,
        "coletas_previstas": col_prev,
        "coletas_realizadas": col_real,
        "otd": 91.8,
        "sla": 94.1,
        "veiculos_total": 18,
        "veiculos_ativos": 14,
        "veiculos_manutencao": 2,
        "veiculos_parados": 1,
        "veiculos_reserva": 1,   # reserva conta como disponível não ativo
        "km_planejado": km_prev,
        "km_rodado": km_real,
        "custo_km": 3.42,
        "horas_extras": 14.5,
        "absenteismo": 5.6,
        "ocorrencias": ocorr,
    },
    "status_entregas": {
        "Concluídas": ent_real,
        "Em rota": 45,
        "Pendentes": 22,
        "Devolução": 8,
        "Avaria": 3,
    },
    "curva_horaria": {
        "horas": ["07h", "08h", "09h", "10h", "11h", "12h", "13h", "14h",
                  "15h", "16h", "17h", "18h"],
        "previsto_acumulado": [42, 96, 156, 219, 281, 322, 361, 407, 452,
                               494, 521, 537],
        "realizado_acumulado": [40, 92, 149, 210, 268, 307, 344, 386, 424,
                                459, None, None],
    },
    "historico": historico,
    "fonte": {
        "planilha": "Área de Trabalho Filial (Google Sheets)",
        "abas": ["Cockpit Diário", "Rotina Diária Mot. Frota2"],
        "demo": True,
        "nota": "Dados de demonstração no mesmo esquema das abas. Substitua via scripts/import_spreadsheet.py.",
    },
}

# garante coerência entre a rotina e o cockpit
cockpit["indicadores"]["entregas_previstas"] = ent_prev
cockpit["indicadores"]["entregas_realizadas"] = ent_real
cockpit["indicadores"]["coletas_previstas"] = col_prev
cockpit["indicadores"]["coletas_realizadas"] = col_real
cockpit["indicadores"]["ocorrencias"] = ocorr
cockpit["indicadores"]["km_planejado"] = km_prev
cockpit["indicadores"]["km_rodado"] = km_real
cockpit["status_entregas"]["Concluídas"] = ent_real

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "cockpit_diario.json"), "w", encoding="utf-8") as f:
    json.dump(cockpit, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT, "rotina_diaria.json"), "w", encoding="utf-8") as f:
    json.dump({
        "meta": {
            "aba_origem": "Rotina Diária Mot. Frota2",
            "filial": "Filial 01",
            "data_referencia": HOJE.isoformat(),
        },
        "colunas": COLS,
        "linhas": rotina_rows,
    }, f, ensure_ascii=False, indent=2)

print("OK", ent_prev, ent_real, col_prev, col_real, ocorr, km_prev, km_real)
