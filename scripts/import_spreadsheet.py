#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Importa as abas da planilha "Área de Trabalho Filial" para o COCKPIT DIÁRIO,
gerando app/data/*.json no esquema que o painel consome.

Aba "Cockpit Diário" (COCKPIT RESUMO DIÁRIO GERAL) — layout em tópicos:
    LOCAL | CATEGORIA | STATUS | CONTAGEM
    FILIAL-BA | BITREM FROTA | Vazio (F) | 4
    (linhas de total — "CARRETA AGREG. Total", "FILIAL-BA Total", "Total geral" —
     são ignoradas e recalculadas)

Aba "Rotina Diária Mot. Frota2" (Acompanhamento Diário Frota - Geral):
    LOCAL CD | MOTORISTA | STATUS
    CD FILIAL - BA | EDIVAN DE SOUZA BORGES | Carregado (F)

Uso:
  python3 scripts/import_spreadsheet.py --rotina "Rotina.csv" --cockpit "Cockpit.csv"
  python3 scripts/import_spreadsheet.py --sheet-id 1McDH0Ih... \
        --gid-cockpit 1951800208 --gid-rotina 1316334574
"""
import argparse
import csv
import io
import json
import os
import re
import unicodedata
import urllib.request
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "app", "data")


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s.lower())).strip()


def limpa(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def sem_sufixo(s):
    """Remove sufixo de local ' (F)' / ' (M)' do status."""
    return limpa(re.sub(r"\((F|M)\)\s*$", "", limpa(s)))


def numero(v):
    s = limpa(v).replace(".", "").replace(",", ".") if re.match(r"^\d{1,3}(\.\d{3})+$", limpa(v)) else limpa(v).replace(",", ".")
    try:
        f = float(s)
        return int(f) if f.is_integer() else f
    except ValueError:
        return None


def ler_csv(origem):
    if origem.startswith("http"):
        with urllib.request.urlopen(origem) as r:
            raw = r.read().decode("utf-8-sig")
    else:
        with open(origem, encoding="utf-8-sig") as f:
            raw = f.read()
    linhas = list(csv.reader(io.StringIO(raw), delimiter=";"))
    if len(linhas) > 1 and len(linhas[0]) == 1:
        linhas = list(csv.reader(io.StringIO(raw)))
    return [[limpa(c) for c in l] for l in linhas if any(limpa(c) for c in l)]


def importar_cockpit(linhas):
    res, cur_local, cur_cat = [], None, None
    for l in linhas:
        a, b, c, d = (l + ["", "", "", ""])[:4]
        na = norm(a)
        if not a and not b and not c:
            continue
        if na and ("total geral" in na or na.endswith(" total")) and not b:
            continue                      # linha de total de local
        if a and not na.endswith(" total"):
            cur_local = limpa(a)
        if b:
            nb = norm(b)
            if nb.endswith(" total") or nb == "total geral":
                continue                  # linha de total de categoria / geral
            cur_cat = limpa(b)
        q = numero(d)
        if c and q is not None and cur_local and cur_cat:
            res.append({"local": cur_local, "categoria": cur_cat,
                        "status": sem_sufixo(c), "quantidade": q})
    return res


def importar_rotina(linhas):
    rows, cur_local = [], None
    for l in linhas:
        a, b, c = (l + ["", "", ""])[:3]
        na = norm(a)
        if na and na.endswith(" total"):
            continue
        if a:
            cur_local = limpa(a)
        if b and cur_local and norm(b) != "motorista":
            rows.append({"local": cur_local, "motorista": limpa(b),
                         "status": sem_sufixo(c) if c else "Não informado"})
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--rotina", help="CSV da aba 'Rotina Diária Mot. Frota2'")
    ap.add_argument("--cockpit", help="CSV da aba 'Cockpit Diário'")
    ap.add_argument("--sheet-id")
    ap.add_argument("--gid-rotina")
    ap.add_argument("--gid-cockpit")
    ap.add_argument("--data-referencia", help="data da contagem (AAAA-MM-DD); padrão: hoje")
    args = ap.parse_args()

    if args.sheet_id:
        base = f"https://docs.google.com/spreadsheets/d/{args.sheet_id}/export?format=csv&gid="
        cockpit_src = base + (args.gid_cockpit or "1951800208")
        rotina_src = base + (args.gid_rotina or "1316334574")
    elif args.rotina and args.cockpit:
        cockpit_src, rotina_src = args.cockpit, args.rotina
    else:
        ap.error("informe --rotina e --cockpit (CSVs) ou --sheet-id com os gids")

    resumo = importar_cockpit(ler_csv(cockpit_src))
    motoristas = importar_rotina(ler_csv(rotina_src))
    if not resumo:
        raise SystemExit("Nenhuma linha de contagem reconhecida no CSV do cockpit — confira o layout.")

    data_ref = args.data_referencia or date.today().isoformat()
    agora = datetime.now().isoformat(timespec="minutes")
    locais = list(dict.fromkeys(r["local"] for r in resumo))

    cockpit = {
        "meta": {
            "aba_origem": "Cockpit Diário",
            "titulo_aba": "COCKPIT RESUMO DIÁRIO GERAL",
            "data_referencia": data_ref,
            "atualizado_em": agora,
            "locais": locais,
        },
        "resumo": resumo,
        "fonte": {
            "planilha": "Área de Trabalho Filial (Google Sheets)" + (f" · {args.sheet_id}" if args.sheet_id else ""),
            "abas": ["Cockpit Diário", "Rotina Diária Mot. Frota2"],
            "demo": False,
            "capturas": False,
            "nota": "Importado em " + datetime.now().strftime("%d/%m/%Y %H:%M"),
        },
    }
    rotina = {
        "meta": {
            "aba_origem": "Rotina Diária Mot. Frota2",
            "titulo_aba": "Acompanhamento Diário Frota - Geral",
            "data_referencia": data_ref,
            "atualizado_em": agora,
        },
        "colunas": ["local", "motorista", "status"],
        "linhas": motoristas,
    }

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "cockpit_diario.json"), "w", encoding="utf-8") as f:
        json.dump(cockpit, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUT, "rotina_diaria.json"), "w", encoding="utf-8") as f:
        json.dump(rotina, f, ensure_ascii=False, indent=2)

    total = sum(r["quantidade"] for r in resumo)
    print(f"✔ {len(resumo)} linhas de contagem ({total} veículos) e {len(motoristas)} motoristas.")
    print(f"  locais: {', '.join(locais)}")
    print("  JSONs gravados em app/data/. Clique em 'Atualizar' no painel.")


if __name__ == "__main__":
    main()
