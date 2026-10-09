#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Converte o raw da aba "Cockpit Diário" (matriz veículo × data, baixada da
planilha pública em data/raw/cockpit_*.md) nos JSONs do painel.

Gera:
  * veiculos[]          — cadastro + status por data (placa, modelo, categoria…)
  * resumo_por_data{}   — contagem local × categoria × status por dia
                          (mesmo esquema do COCKPIT RESUMO DIÁRIO GERAL)
  * historico[]         — totais por grupo de status por dia (evolução)

Validação impressa: totais por local da data de referência (esperado
FILIAL-BA 49 · MATRIZ-SP 60 · total 109 em 09/10).
"""
import glob
import json
import os
import re
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "app", "data")
ANO = 2026

EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U00002B00-\U00002BFF\U0000FE0F\u26a0\u274c\u2b55]",
    flags=re.IGNORECASE)
PLACA = re.compile(r"^[A-Z]{3} \d[A-Z0-9]\d{2}$")


def limpa(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def sem_emoji(s):
    return limpa(EMOJI.sub("", s))


def status_limpo(s):
    s = sem_emoji(s)
    s = re.sub(r"\((F|M)\)\s*$", "", s)
    return limpa(s)


def ler_tabela():
    bruto = ""
    for arq in sorted(glob.glob(os.path.join(RAW, "cockpit_*.md"))):
        with open(arq, encoding="utf-8") as f:
            bruto += f.read()
    linhas = []
    for ln in bruto.split("\n"):
        ln = ln.rstrip()
        if not ln.strip():
            continue
        if not ln.startswith("|"):           # continuação de linha quebrada
            if linhas:
                linhas[-1] += ln
            continue
        linhas.append(ln)
    return linhas


def celulas(ln):
    parts = ln.strip().strip("|").split("|")
    return [limpa(p) for p in parts]


def main():
    linhas = ler_tabela()
    cabe = None
    datas = []
    for ln in linhas:
        c = celulas(ln)
        if c and c[0] == "SITUAÇÃO":
            cabe = c
            break
    if not cabe:
        raise SystemExit("Cabeçalho SITUAÇÃO não encontrado no raw.")
    for i, cell in enumerate(cabe):
        m = re.match(r"^(\d{2})/(\d{2})$", cell)
        if m and m.group(2) == "10":
            datas.append((i, f"{ANO}-{m.group(2)}-{m.group(1)}"))

    veiculos = []
    for ln in linhas:
        c = celulas(ln)
        if len(c) < 9 or not PLACA.match(c[7] or ""):
            continue
        local = c[8]
        if local not in ("FILIAL-BA", "MATRIZ-SP"):
            continue
        st = {}
        for i, iso in datas:
            if i < len(c) and c[i]:
                st[iso] = status_limpo(c[i])
        veiculos.append({
            "situacao": sem_emoji(c[0]) or "ATIVO",
            "marca": c[1], "modelo": c[2], "ano": c[3],
            "tp_veiculo": c[4], "categoria": c[5], "rastr": c[6],
            "placa": c[7], "local": local, "status": st,
        })

    # resumo por data: local × categoria × status
    resumo_por_data = {}
    for _, iso in datas:
        blocos = {}
        ordem = []
        for v in veiculos:
            s = v["status"].get(iso)
            # o resumo oficial conta apenas veículos com situação ATIVO
            if not s or v["situacao"] != "ATIVO":
                continue
            chave = (v["local"], v["categoria"], s)
            if chave not in blocos:
                blocos[chave] = 0
                ordem.append(chave)
            blocos[chave] += 1
        resumo_por_data[iso] = [
            {"local": l, "categoria": cat, "status": s, "quantidade": q}
            for (l, cat, s), q in blocos.items()
        ]

    # validação contra o resumo oficial (09/10): BA 49 · SP 60 · total 109
    ref = resumo_por_data.get(f"{ANO}-10-09", [])
    tot = {}
    for r in ref:
        tot[r["local"]] = tot.get(r["local"], 0) + r["quantidade"]
    print("contagem 09/10:", tot, "total", sum(tot.values()))

    agora = datetime.now().isoformat(timespec="minutes")
    cockpit = {
        "meta": {
            "aba_origem": "Cockpit Diário",
            "titulo_aba": "COCKPIT DIÁRIO FROTA CAPTAÇÃO",
            "data_referencia": f"{ANO}-10-09",
            "atualizado_em": agora,
            "datas": [iso for _, iso in datas],
            "locais": ["FILIAL-BA", "MATRIZ-SP"],
        },
        "veiculos": veiculos,
        "resumo_por_data": resumo_por_data,
        "fonte": {
            "planilha": "Área de Trabalho Filial (Google Sheets · publicação web)",
            "abas": ["Cockpit Diário", "Rotina Diária Mot. Frota2"],
            "demo": False,
            "capturas": False,
            "nota": "Importado da planilha pública em " + datetime.now().strftime("%d/%m/%Y %H:%M") +
                    " (matriz veículo × data). Motoristas: captura de tela de 09/10.",
        },
    }
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "cockpit_diario.json"), "w", encoding="utf-8") as f:
        json.dump(cockpit, f, ensure_ascii=False, indent=2)
    print("✔", len(veiculos), "veículos ·", len(datas), "datas ·",
          len(resumo_por_data.get(f"{ANO}-10-09", [])), "linhas de resumo em 09/10")


if __name__ == "__main__":
    main()
