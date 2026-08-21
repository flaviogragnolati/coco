#!/usr/bin/env python3
"""Generate synthetic, non-sensitive fixtures for q-tool-pdf smoke tests."""
from __future__ import annotations

import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import Color, black, lightgrey


def make_basic(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    for page_num in range(1, 4):
        c.setFont("Helvetica-Bold", 18)
        c.drawString(54, height - 70, f"PDF Toolkit Fixture — Page {page_num}")
        c.setFont("Helvetica", 11)
        c.drawString(54, height - 95, "Selectable text for extraction, ordering, and validation.")
        c.drawString(54, height - 115, f"Page marker: P{page_num}")
        if page_num == 2:
            x0, y0 = 72, height - 330
            col_widths = [150, 90, 90]
            row_height = 28
            rows = [
                ["Item", "Quantity", "Price"],
                ["Alpha", "2", "10.50"],
                ["Beta", "1", "7.25"],
            ]
            total_width = sum(col_widths)
            total_height = row_height * len(rows)
            c.setFillColor(lightgrey)
            c.rect(x0, y0 + total_height - row_height, total_width, row_height, fill=1, stroke=0)
            c.setFillColor(black)
            for row_index, row in enumerate(rows):
                y = y0 + total_height - (row_index + 1) * row_height
                x = x0
                for col_index, value in enumerate(row):
                    c.rect(x, y, col_widths[col_index], row_height, fill=0, stroke=1)
                    c.drawString(x + 6, y + 9, value)
                    x += col_widths[col_index]
        c.showPage()
    c.setTitle("q-tool-pdf basic fixture")
    c.setAuthor("Quasar test fixture")
    c.save()


def make_stamp(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    c.setFillColor(Color(0.5, 0.5, 0.5, alpha=0.25))
    c.setFont("Helvetica-Bold", 42)
    c.saveState()
    c.translate(width / 2, height / 2)
    c.rotate(32)
    c.drawCentredString(0, 0, "VALIDATION STAMP")
    c.restoreState()
    c.save()


def make_form(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    form = c.acroForm
    c.setFont("Helvetica-Bold", 18)
    c.drawString(54, height - 70, "PDF Toolkit Form Fixture")
    c.setFont("Helvetica", 11)

    c.drawString(54, height - 120, "Full name")
    form.textfield(
        name="full_name",
        tooltip="Full name",
        x=150,
        y=height - 137,
        width=300,
        height=22,
        borderStyle="inset",
        forceBorder=True,
    )

    c.drawString(54, height - 175, "Accept terms")
    form.checkbox(
        name="accept_terms",
        tooltip="Accept terms",
        x=150,
        y=height - 188,
        size=14,
        buttonStyle="check",
        forceBorder=True,
    )

    c.drawString(54, height - 225, "Role")
    form.radio(name="role", value="Engineer", x=150, y=height - 235, buttonStyle="circle", selected=True)
    c.drawString(170, height - 232, "Engineer")
    form.radio(name="role", value="Researcher", x=250, y=height - 235, buttonStyle="circle", selected=False)
    c.drawString(270, height - 232, "Researcher")

    c.drawString(54, height - 280, "Country")
    form.choice(
        name="country",
        tooltip="Country",
        value="Argentina",
        options=["Argentina", "Chile", "Uruguay"],
        x=150,
        y=height - 295,
        width=180,
        height=22,
        borderStyle="solid",
        forceBorder=True,
    )

    c.drawString(54, 80, "Fixture values are synthetic.")
    c.save()


def main() -> int:
    output = Path(sys.argv[1] if len(sys.argv) > 1 else "fixtures").resolve()
    output.mkdir(parents=True, exist_ok=True)
    make_basic(output / "basic.pdf")
    make_stamp(output / "stamp.pdf")
    make_form(output / "form.pdf")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
