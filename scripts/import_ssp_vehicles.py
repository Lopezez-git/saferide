"""Import the SSP public vehicle workbook into a minimal, aggregate map dataset.
Raw workbook stays outside git. No plates, addresses, names or BO IDs in output.
"""
import argparse, collections, datetime as dt, hashlib, json, math, re, unicodedata, urllib.request, xml.etree.ElementTree as ET, zipfile
from pathlib import Path
SOURCE = "https://www.ssp.sp.gov.br/assets/estatistica/transparencia/baseDados/veiculosSub/VeiculosSubtraidos_{year}.xlsx"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
def norm(value):
    return "".join(c for c in unicodedata.normalize("NFD", str(value)) if unicodedata.category(c) != "Mn").lower()
def time_window(value):
    """Excel stores time of day as a fraction; absent or invalid hours stay unknown."""
    try:
        fraction=float(value)
        if not math.isfinite(fraction) or not 0 <= fraction < 1:return None
        hour=int(fraction*24)
        return ("00-06","06-12","12-18","18-24")[hour//6]
    except (TypeError,ValueError):return None
def rows(path):
    with zipfile.ZipFile(path) as z:
        strings=[]
        with z.open("xl/sharedStrings.xml") as f:
            for _,el in ET.iterparse(f,events=["end"]):
                if el.tag==NS+"si":
                    strings.append("".join(t.text or "" for t in el.iter(NS+"t")));el.clear()
        for sheet in [n for n in z.namelist() if re.fullmatch(r"xl/worksheets/sheet[0-9]+.xml",n)]:
            with z.open(sheet) as f:
                header=None
                context=ET.iterparse(f,events=["start","end"]); _,root=next(context)
                for event,el in context:
                    if event!="end" or el.tag!=NS+"row":continue
                    values={}
                    for c in el:
                        v=c.find(NS+"v");value=v.text if v is not None else ""
                        if c.get("t")=="s":value=strings[int(value)]
                        values[re.sub(r"[0-9]","",c.get("r",""))]=value
                    if header is None:
                        if "LATITUDE" not in values.values():break
                        header=values
                    else:yield {header[k]:v for k,v in values.items() if k in header}
                    el.clear();root.clear()
def aggregate(path,year):
    bos={};counts=collections.Counter();statuses=collections.Counter()
    for row in rows(path):
        counts["sourceRows"]+=1
        key=tuple(row.get(k,"") for k in ["NOME_DELEGACIA","ANO_BO","NUM_BO"])
        if not all(key):counts["missingIdentity"]+=1;continue
        version=int(float(row.get("VERSAO") or 0))
        current=bos.get(key)
        if current is None or version>current["version"]:
            current={"version":version,"points":set(),"types":set(),"hours":set()};bos[key]=current
        if version<current["version"]:continue
        status=norm(row.get("DESCR_OCORRENCIA_VEICULO",""));statuses[status]+=1
        kind="Roubo" if "roub" in status else "Furto" if "furt" in status else None
        if not kind or any(x in status for x in ["localiz","recuper"]):continue
        if norm(row.get("CIDADE","")) not in ("s.paulo","sao paulo"):continue
        try:
            date=(dt.date(1899,12,30)+dt.timedelta(days=int(float(row["DATA_OCORRENCIA_BO"])))).isoformat()
            lat=float(row["LATITUDE"]);lon=float(row["LONGITUDE"])
            if not (math.isfinite(lat) and math.isfinite(lon) and -24.1<=lat<=-23.3 and -46.9<=lon<=-46.3):raise ValueError()
            if not date.startswith(str(year)) or date>dt.date.today().isoformat():raise ValueError()
        except (ValueError,KeyError,OverflowError):counts["invalidDateOrPointRows"]+=1;continue
        current["points"].add((round(lat,4),round(lon,4),date[:7]));current["types"].add(kind)
        window=time_window(row.get("HORA_OCORRENCIA"))
        if window:current["hours"].add(window)
    cells=collections.Counter()
    for bo in bos.values():
        if len(bo["points"])>1:counts["ambiguousLocationBOs"]+=1;continue
        if not bo["points"]:continue
        lat,lon,month=next(iter(bo["points"]))
        kind="Roubo e furto" if len(bo["types"])>1 else next(iter(bo["types"]))
        if len(bo["hours"])>1:counts["ambiguousHourBOs"]+=1
        window=next(iter(bo["hours"])) if len(bo["hours"])==1 else "UNKNOWN"
        if window=="UNKNOWN":counts["unknownHourBOs"]+=1
        cells[(lat,lon,month,kind,window)]+=1;counts["includedBOs"]+=1
    if not cells:raise ValueError("No eligible BOs; refusing to replace dataset")
    print(json.dumps({"counts":counts,"vehicleStatuses":statuses},ensure_ascii=True))
    months=sorted({k[2] for k in cells})
    return {"source":"SSP-SP · Veículos subtraídos", "sourceUrl":SOURCE.format(year=year),"importedAt":dt.datetime.now(dt.timezone.utc).isoformat(),"sha256":hashlib.sha256(Path(path).read_bytes()).hexdigest(),"year":year,"periodStart":months[0],"periodEnd":months[-1],"city":"São Paulo","counts":dict(counts),"cells":[{"latitude":a,"longitude":b,"month":m,"category":k,"timeWindow":w,"count":v} for (a,b,m,k,w),v in sorted(cells.items())]}
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--year",type=int,default=dt.date.today().year);parser.add_argument("--input",type=Path);parser.add_argument("--output",type=Path,required=True);a=parser.parse_args()
    if a.input is None:
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/"ssp.xlsx";urllib.request.urlretrieve(SOURCE.format(year=a.year),path);data=aggregate(path,a.year)
    else:data=aggregate(a.input,a.year)
    a.output.parent.mkdir(parents=True,exist_ok=True);tmp=a.output.with_suffix(".tmp");tmp.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf-8");tmp.replace(a.output)
if __name__=="__main__":main()
