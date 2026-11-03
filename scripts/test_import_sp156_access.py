import datetime as dt
import unittest

import import_sp156_access as importer


class ImportAccessTest(unittest.TestCase):
    def test_classifies_only_selected_road_and_access_services(self):
        row = {
            "Serviço": "Alagamento", "Data de Abertura": "09/05/2026",
            "Data de Finalização": "09/06/2026", "Latitude": "-23.6234",
            "Longitude": "-46.6985", "Logradouro": "Rua Exemplo",
            "Número": "10", "Status": "Finalizada",
        }
        today = dt.date(2026, 11, 2)
        selected = importer.select(row, today)
        self.assertEqual(selected["category"], "ALAGAMENTO")
        self.assertEqual(selected["finishedAt"], "2026-09-06")
        self.assertEqual(importer.select({**row, "Serviço": "Circulação e acesso de veículos e pessoas - Solicitar avaliação"}, today)["category"], "ACESSO")
        self.assertEqual(importer.select({**row, "Serviço": "Reparos em Pontes, Viadutos e Túneis"}, today)["category"], "ESTRUTURA")
        self.assertIsNone(importer.select({**row, "Serviço": "Tapa-buraco"}, today))
        self.assertIsNone(importer.select({**row, "Latitude": ""}, today))

    def test_preserves_request_status_without_claiming_active_hazard(self):
        row = {
            "Serviço": "Queda de galho", "Data de Abertura": "08/11/2026",
            "Data de Finalização": "", "Latitude": "-23.62", "Longitude": "-46.69",
            "Logradouro": "Rua Exemplo", "Número": "", "Status": "Aberto",
        }
        data = importer.aggregate([row], "2026-10-13", dt.date(2026, 11, 2))
        self.assertEqual(data["includedRequests"], 1)
        self.assertEqual(data["records"][0]["status"], "Aberto")
        self.assertNotIn("protocol", str(data).lower())


if __name__ == "__main__":
    unittest.main()
