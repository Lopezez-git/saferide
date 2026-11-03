"""Extract selected road/access SP156 requests without storing the raw CSV.

These are requests as published, not confirmed active road conditions.
"""
import argparse
import csv
import datetime as dt
import io
import json
import math
import unicodedata
import urllib.request
from pathlib import Path

from import_sp156_pavement import RESOURCE_PAGE, RESOURCE_URL, metadata, parse_date


def category_for(service):
    normalized = "".join(
        char for char in unicodedata.normalize("NFD", service.casefold())
        if unicodedata.category(char) != "Mn"
    ).strip()
    if normalized == "alagamento":
        return "ALAGAMENTO"
    if normalized in {"queda de arvore", "queda de galho", "risco iminente de queda de arvore"}:
        return "OBSTACULO"
    if normalized.startswith("circulacao e acesso de veiculos e pessoas - solicitar avaliacao"):
        return "ACESSO"
    if normalized == "reparos em pontes, viadutos e tuneis":
        return "ESTRUTURA"
    return None


def select(row, today):
    service = row.get("Serviço", "").strip()
    category = category_for(service)
    if category is None:
        return None
    opened = parse_date(row.get("Data de Abertura", ""))
    if not opened or not dt.date(2026, 7, 1) <= opened <= min(today, dt.date(2026, 9, 30)):
        return None
    try:
        latitude = float(row["Latitude"])
        longitude = float(row["Longitude"])
    except (KeyError, ValueError, TypeError):
        return None
    if not (math.isfinite(latitude) and math.isfinite(longitude)
            and -24.1 <= latitude <= -23.3 and -46.9 <= longitude <= -46.3):
        return None
    street = row.get("Logradouro", "").strip()[:120]
    if not street:
        return None
    finished = parse_date(row.get("Data de Finalização", ""))
    return {
        "latitude": round(latitude, 5),
        "longitude": round(longitude, 5),
        "openedAt": opened.isoformat(),
        "finishedAt": finished.isoformat() if finished and finished >= opened else None,
        "street": street,
        "number": row.get("Número", "").strip()[:15],
        "service": service[:120],
        "category": category,
        "status": row.get("Status", "").strip()[:50] or "Não informado",
    }


def aggregate(rows, source_updated_at, today=None):
    today = today or dt.datetime.now(dt.timezone(dt.timedelta(hours=-3))).date()
    records = []
    source_rows = 0
    for row in rows:
        source_rows += 1
        request = select(row, today)
        if request:
            records.append(request)
    if not records:
        raise ValueError("Nenhuma solicitação de acesso elegível; base anterior preservada")
    dates = [item["openedAt"] for item in records]
    return {
        "source": "Prefeitura de São Paulo · SP156",
        "sourceUrl": RESOURCE_PAGE,
        "resourceUrl": RESOURCE_URL,
        "sourceUpdatedAt": source_updated_at,
        "importedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "periodStart": min(dates),
        "periodEnd": max(dates),
        "sourceRows": source_rows,
        "includedRequests": len(records),
        "records": records,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, help="CSV local para testes; padrão: publicação oficial")
    parser.add_argument("--source-updated-at", help="Data ISO somente para CSV local")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.input:
        if not args.source_updated_at:
            parser.error("--source-updated-at é obrigatório com --input")
        with args.input.open("r", encoding="utf-8-sig", newline="") as file:
            data = aggregate(csv.DictReader(file), args.source_updated_at)
    else:
        source_updated_at = metadata()
        with urllib.request.urlopen(RESOURCE_URL, timeout=90) as response:
            rows = csv.DictReader(io.TextIOWrapper(response, encoding="utf-8-sig", newline=""))
            data = aggregate(rows, source_updated_at)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(args.output)
    print(json.dumps({"sourceRows": data["sourceRows"], "includedRequests": data["includedRequests"],
                      "periodStart": data["periodStart"], "periodEnd": data["periodEnd"],
                      "sourceUpdatedAt": data["sourceUpdatedAt"]}))


if __name__ == "__main__":
    main()
