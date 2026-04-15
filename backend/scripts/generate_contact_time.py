#!/usr/bin/env python3
"""
情報処理システム研究室　コンタクトタイム報告書 生成スクリプト

使い方:
    python generate_contact_time.py
    python generate_contact_time.py --output /path/to/output.xlsx
    python generate_contact_time.py --student-name "山田 太郎"
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# backend/ をパスに追加してアプリ内モジュールをインポートできるようにする
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.contact_time_service import create_contact_time_workbook  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="コンタクトタイム報告書 Excel 生成")
    parser.add_argument("--output", default="情報処理システム研究室_コンタクトタイム_見本.xlsx",
                        help="出力ファイルパス")
    parser.add_argument("--student-name", default="", help="学生氏名")
    args = parser.parse_args()

    wb = create_contact_time_workbook(student_name=args.student_name)
    out = Path(args.output)
    wb.save(out)
    print(f"生成完了: {out.resolve()}")


if __name__ == "__main__":
    main()
