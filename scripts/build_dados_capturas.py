#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera app/data/*.json com o conteúdo das capturas de tela da planilha
"Área de Trabalho Filial" (contagem de 09/10):

  * aba "Cockpit Diário"            -> COCKPIT RESUMO DIÁRIO GERAL
                                       (local × categoria × status → contagem)
  * aba "Rotina Diária Mot. Frota2" -> Acompanhamento Diário Frota - Geral
                                       (local CD × motorista → status)

Quando a planilha for liberada como pública, `scripts/import_spreadsheet.py`
regrava estes mesmos JSONs direto do Google Sheets (mesmo esquema).
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "app", "data")
DATA_REF = "2026-10-09"          # contagem de 09/10 exibida nas capturas
ATUALIZADO = "2026-10-09T17:40:00"

# ---------------------------------------------------------------------------
# COCKPIT RESUMO DIÁRIO GERAL  (local, categoria, status, contagem)
# ---------------------------------------------------------------------------
RESUMO = [
    ("FILIAL-BA", "BITREM FROTA",    "Vazio",              4),
    ("FILIAL-BA", "CARRETA AGREG.",  "Carregado",          3),
    ("FILIAL-BA", "CARRETA AGREG.",  "Manutenção",         1),
    ("FILIAL-BA", "CARRETA AGREG.",  "Retorno",            4),
    ("FILIAL-BA", "CARRETA AGREG.",  "Em Viagem",          3),
    ("FILIAL-BA", "CARRETA AGREG.",  "Vazio",              7),
    ("FILIAL-BA", "CARRETA AGREG.",  "Ag. Desc. Cliente",  2),
    ("FILIAL-BA", "CARRETA AGREG.",  "MEC",                1),
    ("FILIAL-BA", "CVM. FROTA",      "Manobra",            1),
    ("FILIAL-BA", "CVM. FROTA",      "Manutenção",         1),
    ("FILIAL-BA", "CVM. FROTA",      "Ag. Desc. Cliente",  1),
    ("FILIAL-BA", "TRUCK FLUXO",     "Fluxo CD",          13),
    ("FILIAL-BA", "TRUCK FROTA",     "Carregado",          4),
    ("FILIAL-BA", "TRUCK FROTA",     "Em Viagem",          2),
    ("FILIAL-BA", "TRUCK FROTA",     "Vazio",              2),
    ("MATRIZ-SP", "BITREM AGREGADO", "Carregado",          4),
    ("MATRIZ-SP", "BITREM AGREGADO", "Manutenção",         2),
    ("MATRIZ-SP", "BITREM AGREGADO", "Retorno",            2),
    ("MATRIZ-SP", "BITREM AGREGADO", "Em Viagem",          4),
    ("MATRIZ-SP", "BITREM AGREGADO", "Ag. Desc. Cliente",  6),
    ("MATRIZ-SP", "CARGA SECA",      "Sem contagem",       0),
    ("MATRIZ-SP", "CARRETA AGREG.",  "Sinistro Batida",    1),
    ("MATRIZ-SP", "CARRETA AGREG.",  "Carregado",         18),
    ("MATRIZ-SP", "CARRETA AGREG.",  "Manutenção",         3),
    ("MATRIZ-SP", "CARRETA AGREG.",  "Retorno",            5),
    ("MATRIZ-SP", "CARRETA AGREG.",  "Em Viagem",          4),
    ("MATRIZ-SP", "CARRETA AGREG.",  "Ag. Desc. Cliente", 10),
    ("MATRIZ-SP", "CARRETA AGREG.",  "Inativo",            1),
    ("MATRIZ-SP", "CAVALO TRAÇÃO",   "Sem contagem",       0),
    ("MATRIZ-SP", "CVM. FROTA",      "Sem contagem",       0),
    ("MATRIZ-SP", "PLATAF. (GUINCHO)", "Sem contagem",     0),
    ("MATRIZ-SP", "TRUCK FROTA",     "Sem contagem",       0),
]

# ---------------------------------------------------------------------------
# ACOMPANHAMENTO DIÁRIO FROTA - GERAL  (local CD, motorista, status)
# ---------------------------------------------------------------------------
MOTORISTAS = [
    ("CD FILIAL - BA", "EDIVAN DE SOUZA BORGES",               "Carregado"),
    ("CD FILIAL - BA", "EDIVAN SANTOS DE OLIVEIRA",            "Carregado"),
    ("CD FILIAL - BA", "FRANCISCO DE ASSIS CARNEIRO",          "Disponível"),
    ("CD FILIAL - BA", "GERSON BARRETO DE OLIVEIRA",           "Aguard. Descarga Cliente"),
    ("CD FILIAL - BA", "JUARI OLIVEIRA FREITAS",               "Interno"),
    ("CD FILIAL - BA", "MARCOS HENRIQUE GOMES SILVA",          "Disponível"),
    ("CD FILIAL - BA", "MAYRON DA SILVA CORDEIRO",             "Em Viagem"),
    ("CD FILIAL - BA", "ROMILSON DE SOUSA AMORIM",             "Em Viagem"),
    ("CD FILIAL - BA", "UBIRAJARA SOUZA DA SILVA",             "Carregado"),
    ("CD FILIAL - BA", "WANDERSON MARCOS DOS SANTOS OLIVEIRA", "Carregado"),
    ("CD FILIAL - BA", "WELLINGTON RICARDO MOREIRA PESSOA",    "Carregado"),
    ("FÁB. FILIAL - BA", "CESAR HENRIQUE SILVA RAMOS",         "Interno"),
    ("FÁB. FILIAL - BA", "ELENILSON PEREIRA FERREIRA",         "Interno"),
    ("FÁB. FILIAL - BA", "GIDILANE MOREIRA DE JESUS",          "Interno"),
    ("FÁB. FILIAL - BA", "JACIEL ALMEIDA DE JESUS",            "Interno"),
    ("FÁB. FILIAL - BA", "JARDEL SANTANA DE LIMA",             "Interno"),
    ("FÁB. FILIAL - BA", "MARCOS SOUZA DE PAULA",              "Interno"),
    ("FÁB. FILIAL - BA", "ROBERVAL IDELBRANDO REIS",           "Interno"),
    ("FÁB. FILIAL - BA", "ROGERIO DOS SANTOS VIEIRA",          "Interno"),
    ("MATRIZ-SP", "CARLOS ROBERTO PEREIRA DOS SANTOS",        None),
    ("MATRIZ-SP", "DIRCEU AMBROSIO",                          None),
    ("MATRIZ-SP", "DOUGLAS RODRIGUES COUTINHO",               None),
    ("MATRIZ-SP", "EDER WILSON SOUSA SILVA",                  None),
    ("MATRIZ-SP", "ERASMO SILVA CARNEIRO",                    None),
    ("MATRIZ-SP", "FRANCIS FABIANO MORAES DE OLIVEIRA",       None),
    ("MATRIZ-SP", "NIVALDO BRAGA MACHADO",                    None),
    ("MATRIZ-SP", "ROBERTO BORGES DOS SANTOS",                None),
]

cockpit = {
    "meta": {
        "aba_origem": "Cockpit Diário",
        "titulo_aba": "COCKPIT RESUMO DIÁRIO GERAL",
        "data_referencia": DATA_REF,
        "atualizado_em": ATUALIZADO,
        "locais": ["FILIAL-BA", "MATRIZ-SP"],
    },
    "resumo": [
        {"local": l, "categoria": c, "status": s, "quantidade": q}
        for (l, c, s, q) in RESUMO
    ],
    "fonte": {
        "planilha": "Área de Trabalho Filial (Google Sheets)",
        "abas": ["Cockpit Diário", "Rotina Diária Mot. Frota2"],
        "demo": False,
        "capturas": True,
        "nota": "Valores transcritos das capturas de tela da planilha (contagem de 09/10). "
                "Com a planilha pública, scripts/import_spreadsheet.py atualiza automaticamente.",
    },
}

rotina = {
    "meta": {
        "aba_origem": "Rotina Diária Mot. Frota2",
        "titulo_aba": "Acompanhamento Diário Frota - Geral",
        "data_referencia": DATA_REF,
        "atualizado_em": ATUALIZADO,
    },
    "colunas": ["local", "motorista", "status"],
    "linhas": [
        {"local": l, "motorista": m, "status": s or "Não informado"}
        for (l, m, s) in MOTORISTAS
    ],
}

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "cockpit_diario.json"), "w", encoding="utf-8") as f:
    json.dump(cockpit, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT, "rotina_diaria.json"), "w", encoding="utf-8") as f:
    json.dump(rotina, f, ensure_ascii=False, indent=2)

total = sum(q for *_, q in RESUMO)
print("OK · frota total", total, "· motoristas", len(MOTORISTAS))
