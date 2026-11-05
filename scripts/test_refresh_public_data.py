import datetime as dt
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import refresh_public_data as refresh
import import_sp156_pavement as pavement

class RefreshTest(unittest.TestCase):
    def test_selects_newest_period_not_recently_edited_old_file(self):
        resources=[{'name':'Dados do SP156 - 4º TRI 2026','format':'.csv','last_modified':'2027-01-15'}, {'name':'Dados do SP156 - 3º TRI 2026','format':'CSV','last_modified':'2027-02-20'}]
        resource,start,end=refresh.latest_resource(resources,dt.date(2027,2,21))
        self.assertIn('4º',resource['name'])
        self.assertEqual(start,dt.date(2026,10,1))
        self.assertEqual(end,dt.date(2026,12,31))
    def test_imports_new_quarter_and_rejects_future_rows(self):
        row={'Serviço':'Tapa-buraco','Data de Abertura':'10/10/2026','Latitude':'-23.6','Longitude':'-46.7','Logradouro':'Rua Teste'}
        self.assertIsNotNone(pavement.select(row,dt.date(2026,11,5),dt.date(2026,10,1),dt.date(2026,12,31)))
        self.assertIsNone(pavement.select({**row,'Data de Abertura':'12/10/2026'},dt.date(2026,11,5),dt.date(2026,10,1),dt.date(2026,12,31)))
    def test_download_failure_preserves_previous_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory); target=path/'ssp-vehicles.json'
            refresh.write(target,{'periodEnd':'2026-09'})
            before=target.read_bytes()
            with patch.object(refresh,'download',side_effect=TimeoutError('offline')):
                with self.assertRaises(TimeoutError):refresh.refresh('safety',path,path)
            self.assertEqual(before,target.read_bytes())
    def test_refuses_period_regression(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory); target=path/'ssp-vehicles.json'
            refresh.write(target,{'periodEnd':'2026-09'})
            with patch.object(refresh,'download',return_value='new'),patch.object(refresh.police,'aggregate',return_value={'periodEnd':'2026-08'}):
                with self.assertRaises(ValueError):refresh.refresh('safety',path,path)
            self.assertEqual(refresh.read(target)['periodEnd'],'2026-09')

if __name__=='__main__':unittest.main()
