"""Stream public SP156 requests into a small, location-only tapa-buraco snapshot.

The raw CSV is never committed. A request is evidence of a request, not a road inspection.
"""
import argparse
import csv
import datetime as dt
import io
import json
import math
import urllib.request
from pathlib import Path

RESOURCE_ID = "f67fcc12-8da4-485f-92a3-d2af40cc771e"
DATASET_URL = "https://dados.prefeitura.sp.gov.br/dataset/dados-do-sp156"
RESOURCE_PAGE = f"{DATASET_URL}/resource/{RESOURCE_ID}"
RESOURCE_URL = (
    "https://dados.prefeitura.sp.gov.br/dataset/0aecfa2b-aa3a-40d4-8183-0d4351b7fd0a/"
    f"resource/{RESOURCE_ID}/download/arquivo-final-3-trim-26.csv"
)
METADATA_URL = f"https://dados.prefeitura.sp.gov.br/api/3/action/resource_show?id={RESOURCE_ID}"


def parse_date(value):
    try:
        return dt.datetime.strptime(value.strip()[:10], "%m/%d/%Y").date()
    except (ValueError, AttributeError):
        return None


def select(row, today, period_start=dt.date(2026, 7, 1), period_end=dt.date(2026, 9, 30)):
    service = row.get("Serviço", "").strip()
    if "tapa-buraco" not in service.casefold():
        return None
    opened = parse_date(row.get("Data de Abertura", ""))
    if not opened or not period_start <= opened <= min(today, period_end):
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
        "service": service[:100],
        "status": row.get("Status", "").strip()[:50] or "Não informado",
    }


def aggregate(rows, source_updated_at, today=None, period_start=dt.date(2026, 7, 1), period_end=dt.date(2026, 9, 30)):
    today = today or dt.datetime.now(dt.timezone(dt.timedelta(hours=-3))).date()
    records = []
    source_rows = 0
    for row in rows:
        source_rows += 1
        request = select(row, today, period_start, period_end)
        if request:
            records.append(request)
    if not records:
        raise ValueError("Nenhuma solicitação de tapa-buraco elegível; base anterior preservada")
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


def metadata():
    with urllib.request.urlopen(METADATA_URL, timeout=20) as response:
        result = json.load(response)
    if not result.get("success"):
        raise ValueError("Metadados SP156 indisponíveis")
    raw = result["result"]["last_modified"]
    return dt.datetime.fromisoformat(raw).date().isoformat()


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
        with urllib.request.urlopen(RESOURCE_URL, timeout=60) as response:
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
