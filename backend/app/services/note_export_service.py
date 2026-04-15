from __future__ import annotations

from datetime import datetime
from io import BytesIO

try:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font
except ModuleNotFoundError:  # pragma: no cover - optional dependency at runtime
    Workbook = None
    Alignment = Font = None

from app.models.note import NoteRecord


def create_notes_workbook(notes: list[NoteRecord]) -> bytes:
    if Workbook is None:
        raise RuntimeError("openpyxl is required to export notes workbooks.")

    wb = Workbook()
    ws = wb.active
    ws.title = "日誌一覧"
    ws.freeze_panes = "A2"

    headers = [
        "日付",
        "タイトル",
        "今日やったこと",
        "今後の課題等",
        "作成日時",
        "更新日時",
    ]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for note in notes:
        ws.append([
            note.note_date.isoformat(),
            note.title,
            note.did_today,
            note.future_tasks,
            _format_dt(note.created_at),
            _format_dt(note.updated_at),
        ])

    widths = [14, 22, 48, 48, 22, 22]
    for column_index, width in enumerate(widths, start=1):
        ws.column_dimensions[chr(ord("A") + column_index - 1)].width = width

    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)

    ws.sheet_view.showGridLines = True
    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def _format_dt(value: datetime) -> str:
    return value.astimezone().strftime("%Y-%m-%d %H:%M:%S")
