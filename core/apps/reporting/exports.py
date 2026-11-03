from __future__ import annotations

from html import escape
from io import BytesIO
from typing import Any, Iterable, Mapping, Sequence

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


Column = tuple[str, str]


def _value(row: Any, key: str) -> Any:
    if isinstance(row, Mapping):
        value = row.get(key, "")
    else:
        value = getattr(row, key, "")

    return "" if value is None else value


def _text(value: Any) -> str:
    return "" if value is None else str(value)


def export_xlsx(
    columns: Sequence[Column],
    rows: Iterable[Any],
    *,
    sheet_name: str = "Report",
) -> bytes:
    rows = list(rows)

    safe_name = (
        sheet_name
        .replace("/", "-")
        .replace("\\", "-")
        .replace("*", "-")
        .replace("?", "-")
        .replace("[", "(")
        .replace("]", ")")
        .replace(":", "-")
    )[:31] or "Report"

    wb = Workbook()
    ws = wb.active
    ws.title = safe_name

    ws.append([label for _, label in columns])

    for cell in ws[1]:
        cell.font = Font(bold=True)

    for row in rows:
        ws.append([
            _value(row, key)
            for key, _label in columns
        ])

    ws.freeze_panes = "A2"

    if ws.max_row >= 1 and ws.max_column >= 1:
        ws.auto_filter.ref = ws.dimensions

    for index, (_key, label) in enumerate(columns, 1):
        longest = len(str(label))

        for row_index in range(2, ws.max_row + 1):
            value = ws.cell(
                row=row_index,
                column=index,
            ).value

            longest = max(
                longest,
                len(_text(value)),
            )

        ws.column_dimensions[
            get_column_letter(index)
        ].width = min(
            max(longest + 2, 10),
            45,
        )

    output = BytesIO()
    wb.save(output)

    return output.getvalue()


def export_pdf(
    title: str,
    columns: Sequence[Column],
    rows: Iterable[Any],
) -> bytes:
    rows = list(rows)

    output = BytesIO()

    document = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        leftMargin=24,
        rightMargin=24,
        topMargin=24,
        bottomMargin=24,
        title=title,
    )

    styles = getSampleStyleSheet()

    data = [
        [
            Paragraph(
                escape(label),
                styles["BodyText"],
            )
            for _key, label in columns
        ]
    ]

    for row in rows:
        data.append([
            Paragraph(
                escape(
                    _text(
                        _value(row, key)
                    )
                ),
                styles["BodyText"],
            )
            for key, _label in columns
        ])

    table = Table(
        data,
        repeatRows=1,
        hAlign="LEFT",
    )

    table.setStyle(
        TableStyle(
            [
                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold",
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.grey,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    4,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    4,
                ),
            ]
        )
    )

    document.build(
        [
            Paragraph(
                escape(title),
                styles["Title"],
            ),
            Spacer(1, 12),
            table,
        ]
    )

    return output.getvalue()


def printable_html(
    title: str,
    columns: Sequence[Column],
    rows: Iterable[Any],
    *,
    direction: str = "ltr",
) -> str:
    if direction not in {"ltr", "rtl"}:
        raise ValueError(
            "direction must be 'ltr' or 'rtl'"
        )

    header = "".join(
        f"<th>{escape(label)}</th>"
        for _key, label in columns
    )

    body_rows = []

    for row in rows:
        cells = "".join(
            f"<td>{escape(_text(_value(row, key)))}</td>"
            for key, _label in columns
        )

        body_rows.append(
            f"<tr>{cells}</tr>"
        )

    body = "".join(body_rows)

    return f"""<!doctype html>
<html dir="{direction}">
<head>
<meta charset="utf-8">
<title>{escape(title)}</title>
<style>
body {{
    font-family: Arial, sans-serif;
    margin: 24px;
}}
table {{
    width: 100%;
    border-collapse: collapse;
}}
th, td {{
    border: 1px solid #888;
    padding: 6px;
    text-align: start;
}}
th {{
    font-weight: bold;
}}
@media print {{
    body {{
        margin: 0;
    }}
}}
</style>
</head>
<body>
<h1>{escape(title)}</h1>
<table>
<thead>
<tr>{header}</tr>
</thead>
<tbody>
{body}
</tbody>
</table>
</body>
</html>
"""
