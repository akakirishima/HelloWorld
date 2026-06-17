# Backend

研究室 在室・勤怠・日誌管理システムの FastAPI backend です。

在室ステータス、勤怠セッション、ステータス変更履歴、監査ログを API として提供し、ローカル運用向けに SQLite と JSON / Markdown file store を組み合わせています。

## 技術構成

- FastAPI
- SQLite
- JSON / Markdown file store
- Session-based auth
- Pydantic settings
- pytest
- ruff

## 主な領域

- `/api/auth`: ログイン、ログアウト、セッション確認
- `/api/presence`: 在室状況の取得とステータス変更
- `/api/attendance`: 出勤、退勤
- `/api/users`: メンバー管理
- `/api/rooms`: 部屋管理
- `/api/notes`: 日誌
- `/api/sessions`: 勤怠履歴
- `/api/audit-logs`: 監査ログ

## セットアップ

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

`.env` の例:

```env
APP_ENV=development
DATA_ROOT_PATH=./data/nas
SQLITE_PATH=./data/local.db
BACKUP_ROOT_PATH=./data/nas/backups
AUTO_SEED=true
```

## 起動

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

## 検証

```bash
pytest
ruff check .
```

## 補足

- ローカル DB は `backend/data/local.db` に作成されます
- JSON / Markdown store はユーザー、部屋、在室、日誌データを扱います
- backup command は SQLite と PostgreSQL deployment の両方を想定して整理されています
- 詳細な起動手順は repository root の `README.md` を参照してください
