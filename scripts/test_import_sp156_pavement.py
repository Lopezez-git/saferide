import datetime as dt
import unittest

import import_sp156_pavement as importer


class ImportPavementTest(unittest.TestCase):
    def test_selects_only_geolocated_tapa_buraco_requests(self):
        row = {
            "Serviço": "Tapa-buraco", "Data de Abertura": "09/30/2026",
            "Data de Finalização": "", "Latitude": "-23.6234", "Longitude": "-46.6985",
            "Logradouro": "Avenida Roque Petroni Júnior", "Número": "1089", "Status": "Aberto",
        }
        today = dt.date(2026, 11, 2)
        selected = importer.select(row, today)
        self.assertEqual(selected["openedAt"], "2026-09-30")
        self.assertEqual(selected["status"], "Aberto")
        self.assertIsNone(importer.select({**row, "Serviço": "Poda de árvore"}, today))
        self.assertIsNone(importer.select({**row, "Latitude": ""}, today))
        self.assertIsNone(importer.select({**row, "Data de Abertura": "01/01/2020"}, today))

    def test_keeps_request_status_as_published(self):
        row = {
            "Serviço": "Tapa-buraco", "Data de Abertura": "07/01/2026",
            "Data de Finalização": "07/25/2026", "Latitude": "-23.6", "Longitude": "-46.7",
            "Logradouro": "Rua Exemplo", "Número": "10", "Status": "Finalizada",
        }
        data = importer.aggregate([row], "2026-10-13", dt.date(2026, 11, 2))
        self.assertEqual(data["includedRequests"], 1)
        self.assertEqual(data["records"][0]["finishedAt"], "2026-07-25")
        self.assertNotIn("protocol", str(data).lower())


if __name__ == "__main__":
    unittest.main()
