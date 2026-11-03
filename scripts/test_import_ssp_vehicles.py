import tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import import_ssp_vehicles as importer
class ImportTest(unittest.TestCase):
 def test_dedup_latest_version_recovered_and_ambiguous_locations(self):
  row={"NOME_DELEGACIA":"TEST","ANO_BO":"2026","NUM_BO":"A","VERSAO":"1","DESCR_OCORRENCIA_VEICULO":"Furtado","CIDADE":"S.PAULO","DATA_OCORRENCIA_BO":"46053","LATITUDE":"-23.62","LONGITUDE":"-46.69"}
  records=[row,row,{**row,"NUM_BO":"B","DESCR_OCORRENCIA_VEICULO":"Localizado / Entregue"},{**row,"NUM_BO":"C"},{**row,"NUM_BO":"C","VERSAO":"2","DESCR_OCORRENCIA_VEICULO":"Localizado / Entregue"},{**row,"NUM_BO":"D"},{**row,"NUM_BO":"D","LATITUDE":"-23.7"},{**row,"NUM_BO":"E","LATITUDE":"0"}]
  with tempfile.TemporaryDirectory() as directory,patch.object(importer,"rows",return_value=iter(records)):
   path=Path(directory)/"input";path.write_bytes(b"fixture")
   data=importer.aggregate(path,2026)
  self.assertEqual(data["counts"]["includedBOs"],1)
  self.assertEqual(data["counts"]["ambiguousLocationBOs"],1)
  self.assertEqual(sum(c["count"] for c in data["cells"]),1)
  self.assertNotIn("NUM_BO",str(data))
if __name__=="__main__":unittest.main()
