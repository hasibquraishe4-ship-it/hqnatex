from io import BytesIO

from django.test import SimpleTestCase
from openpyxl import load_workbook

from apps.reporting.exports import (
    export_pdf,
    export_xlsx,
    printable_html,
)


class ReportingOutputTests(SimpleTestCase):
    columns = [
        ("code", "Code"),
        ("customer", "Customer"),
        ("amount", "Amount"),
    ]

    rows = [
        {
            "code": "INV-001",
            "customer": "Customer A",
            "amount": 1250,
        },
        {
            "code": "INV-002",
            "customer": "Customer B",
            "amount": 2200,
        },
    ]

    def test_real_excel_generation(self):
        content = export_xlsx(
            self.columns,
            self.rows,
            sheet_name="Invoices",
        )

        self.assertTrue(
            content.startswith(b"PK")
        )

        workbook = load_workbook(
            BytesIO(content),
            read_only=True,
        )

        sheet = workbook["Invoices"]

        self.assertEqual(
            sheet["A1"].value,
            "Code",
        )

        self.assertEqual(
            sheet["A2"].value,
            "INV-001",
        )

        self.assertEqual(
            sheet["C3"].value,
            2200,
        )

    def test_real_pdf_generation(self):
        content = export_pdf(
            "Invoice Report",
            self.columns,
            self.rows,
        )

        self.assertTrue(
            content.startswith(b"%PDF")
        )

        self.assertGreater(
            len(content),
            500,
        )

    def test_printable_html_generation(self):
        html = printable_html(
            "گزارش",
            [
                ("name", "نام"),
                ("amount", "مبلغ"),
            ],
            [
                {
                    "name": "<Customer>",
                    "amount": "1250",
                }
            ],
            direction="rtl",
        )

        self.assertIn(
            '<html dir="rtl">',
            html,
        )

        self.assertIn(
            "&lt;Customer&gt;",
            html,
        )

        self.assertIn(
            "@media print",
            html,
        )

        self.assertIn(
            "<table>",
            html,
        )
