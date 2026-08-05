# CLAUDE.md

このファイルは、このリポジトリで作業するエージェント向けの実装メモです。
アプリケーションコードの事実関係は、必ず実ファイルを確認してから判断してください。

## プロジェクト概要

研究室向けの在室・勤怠・日誌管理 Web アプリです。

- frontend: Vite + React + TypeScript + Tailwind CSS
- backend: FastAPI + SQLite
- 認証: Cookie セッションベース。API は既定で `/api` 配下
- 永続化: SQLite が主。旧形式の JSON / Markdown / CSV データを起動時に SQLite へ移行する処理がある

## 起動方法

### backend

```bash
cd backend
python -m venv .venv  # Python 3.11 以上
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Windows PowerShell では仮想環境の有効化は次を使います。

```powershell
cd backend
py -m venv .venv  # Python 3.11 以上
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

backend の既定 URL:

- root endpoint: `http://127.0.0.1:8000/`
- health: `http://127.0.0.1:8000/api/health`
- OpenAPI docs: `http://127.0.0.1:8000/api/docs`

現行 backend で `backend/app/api/router.py` に登録されている公開ルートは `auth`、`attendance`、`calibration`、`health`、`notes`、`presence`、`sessions`、`settings`、`users` です。部屋管理は `/api/rooms`、研究室設定は `/api/settings/lab` として `settings.py` で提供されています。

### frontend

```bash
cd frontend
npm install
npm run dev -- --host
```

Vite の設定は `frontend/vite.config.ts` にあり、既定ポートは `5173`、API proxy の既定ターゲットは `http://localhost:8000` です。

## 主なコマンド

```bash
# backend
cd backend && pytest
cd backend && ruff check .

# frontend
cd frontend && npm run lint
cd frontend && npm run test:e2e
```

`npm run build` script は `frontend/package.json` に存在しますが、このプロジェクトでは本番ビルド手順として提案しません。通常の確認は `npm run lint` と、必要に応じて `npm run test:e2e` を使います。

`npm run test:e2e` は Playwright を使い、`frontend/playwright.config.ts` の webServer 設定で `127.0.0.1:4173` に Vite dev server を起動します。backend は自動起動されないため、API を使う E2E では別途 `uvicorn app.main:app --reload` を起動しておきます。

## 依存関係

backend は `backend/pyproject.toml` を正とします。`requires-python = ">=3.11"` なので、Python 3.10 前提で扱わないでください。

- Python: `>=3.11`
- FastAPI: `>=0.116,<1.0`
- Uvicorn: `>=0.35,<1.0`
- itsdangerous: `>=2.2,<3.0`
- filelock: `>=3.16,<4.0`
- pydantic-settings: `>=2.10,<3.0`
- pwdlib[argon2]: `>=0.2,<1.0`
- python-dotenv: `>=1.1,<2.0`
- python-multipart: `>=0.0.20,<1.0`
- tzdata: `>=2025.2`
- openpyxl: `>=3.1,<4.0`
- httpx: `>=0.28,<1.0` (dev)
- pytest: `>=8.4,<9.0`
- ruff: `>=0.13,<1.0`

frontend は `frontend/package.json` と `frontend/package-lock.json` を正とします。下記は `package.json` の `dependencies` / `devDependencies` です。

- React / React DOM: `^19.2.0`
- React Router DOM: `^7.13.1`
- @tanstack/react-query: `^5.90.21`
- React Hook Form: `^7.71.2`
- @hookform/resolvers: `^5.2.2`
- zod: `^4.3.6`
- lucide-react: `^1.8.0`
- clsx: `^2.1.1`
- @eslint/js: `^9.39.1`
- @types/node: `^24.12.0`
- @types/react: `^19.2.7`
- @types/react-dom: `^19.2.3`
- @vitejs/plugin-react: `^5.1.1`
- autoprefixer: `^10.4.27`
- eslint: `^9.39.1`
- eslint-plugin-react-hooks: `^7.0.1`
- eslint-plugin-react-refresh: `^0.4.24`
- globals: `^16.5.0`
- postcss: `^8.5.8`
- typescript-eslint: `^8.48.0`
- Vite: `^7.3.1`
- TypeScript: `~5.9.3`
- Tailwind CSS: `^3.4.17`
- @playwright/test: `^1.58.2`

`frontend/package.json` に Node の `engines` 指定はありません。リポジトリ直下に `package.json` はありません。`package-lock.json` の解決済み依存には Node 20 以上を要求するものがあります。React Router DOM 7.13.1 は `>=20.0.0`、Vite 7.3.1 と `@vitejs/plugin-react` 5.1.4 は `^20.19.0 || >=22.12.0` です。一方、`typescript-eslint` 8.56.1 と通常の `eslint-visitor-keys` 4.2.1 は `^18.18.0 || ^20.9.0 || >=21.1.0` です。Node 22 固定とは扱わず、実行環境で `node --version` と `npm --version` を確認してください。

この作業環境では `backend/.venv` は存在せず、グローバルの `python --version` は `3.12.3`、`node --version` は `v24.15.0`、`npm --version` は `11.12.1` です。`package-lock.json` 上の主な解決済みバージョンは React / React DOM `19.2.4`、`@types/react` `19.2.14`、`@vitejs/plugin-react` `5.1.4`、ESLint `9.39.4`、`eslint-plugin-react-refresh` `0.4.26`、`typescript-eslint` `8.56.1` です。

## 環境変数

backend の設定は `backend/app/core/config.py` の `Settings` が正です。`env_file=".env"` はプロセスのカレントディレクトリ基準で解決されるため、上記の起動手順どおり `backend` ディレクトリから実行する場合は `backend/.env` が読み込まれます。

`Settings` で定義されている設定値:

- `APP_NAME`
- `APP_ENV`
- `API_PREFIX`
- `APP_BASE_URL`
- `DATA_ROOT_PATH`
- `CONTACT_TIME_ROOT_PATH`
- `SQLITE_PATH`
- `DATABASE_URL`
- `BACKUP_ROOT_PATH`
- `BACKUP_RETENTION_COUNT`
- `SESSION_SECRET_KEY`
- `CORS_ORIGINS`
- `AUTO_SEED`
- `ALLOWED_SUBNETS`

frontend では `VITE_API_PROXY_TARGET` を参照します。未指定時は `http://localhost:8000` です。

`DATABASE_URL` は現在のアプリ本体の接続先切り替えには使われておらず、`backend/app/services/backup_service.py` の PostgreSQL バックアップ用です。通常の永続化と SQLite バックアップは `SQLITE_PATH` の SQLite を使います。

`APP_BASE_URL` は `Settings` には定義されていますが、現時点の backend コードでは参照されていません。

`ALLOWED_SUBNETS` はカンマ区切りの CIDR 文字列として扱われます。未指定または空ならネットワーク制限は無効です。指定時は loopback と許可サブネット内のクライアントのみ通します。

現時点の作業ツリーには `backend/.env` と `frontend/.env` は存在しません。

`backend/.env.example` は現行の `Settings` を網羅していません。`APP_BASE_URL`、`DATA_ROOT_PATH`、`SQLITE_PATH`、`BACKUP_ROOT_PATH`、`BACKUP_RETENTION_COUNT`、`SESSION_SECRET_KEY`、`ALLOWED_SUBNETS` は載っていません。また、現行の `Settings` では定義されていない古い変数が残っています。`SQLALCHEMY_ECHO` と Google OAuth 関連の変数は、現時点の backend コードでは `extra="ignore"` により無視されます。`DATABASE_URL=sqlite:///./data/app.db` もアプリ本体の SQLite 接続先にはならず、通常の DB パスは `SQLITE_PATH` で決まります。

## ディレクトリ構成

- `frontend/src/app/`: ルーティング、React Query などのアプリ基盤
- `frontend/src/api/`: API クライアント
- `frontend/src/pages/`: ページコンポーネント
- `frontend/src/components/layout/`: 共通レイアウト
- `frontend/src/components/ui/`: 再利用 UI コンポーネント
- `frontend/src/features/`: 機能単位の状態・ロジック
- `frontend/src/lib/`: 汎用ユーティリティ
- `frontend/src/mocks/`: モックデータ
- `frontend/src/types/`: frontend 共通型
- `frontend/tests/`: Playwright E2E テスト
- `backend/app/api/routes/`: FastAPI ルート
- `backend/app/core/`: 設定、定数、セキュリティ
- `backend/app/db/`: SQLite 接続とスキーマ
- `backend/app/middleware/`: ネットワークアクセス制限などの FastAPI middleware
- `backend/app/models/`: データモデル
- `backend/app/schemas/`: API スキーマ
- `backend/app/services/`: ドメインサービス、バックアップ、シード、日誌エクスポートなど
- `backend/app/store/`: 永続化ストア
- `backend/app/commands/`: バックアップ用コマンド
- `backend/scripts/`: コンタクトタイム帳票生成スクリプト
- `backend/tests/`: pytest テスト
- `docs/`: 補足ドキュメント

## 実装上の注意

- アプリケーションコードを変更する前に、関連するテストと設定ファイルを確認する
- Python は ruff 設定に従う。`line-length = 100`、`target-version = "py311"`
- TypeScript / TSX は既存の小文字ファイル名と named export のパターンに合わせる
- API は frontend 側で `/api` prefix を付けて呼び出す。backend 側の `API_PREFIX` と Vite proxy 設定の関係を崩さない
- `.env`、SQLite DB、NAS データ、バックアップ成果物、ログはコミットしない。現時点の `.gitignore` は `backend/*.log` を除外していないため、未追跡ログを誤って含めない
- 日誌 API は `backend/app/store/note_store.py` の `NoteStore` を使い、SQLite に保存します。`backend/app/services/file_notes_service.py` の `FileNotesStore` は現行ルートから参照されていない旧ファイル保存実装です。
- `frontend/src/pages/admin-settings-page.tsx` には日誌を Markdown / NAS 保存と説明する古い表示文言が残っていますが、現行の notes API の保存先は SQLite です。
- `frontend/src/pages/admin-corrections-page.tsx`、`frontend/src/pages/admin-aggregates-page.tsx`、`frontend/src/pages/admin-audit-logs-page.tsx` は `frontend/src/mocks/app-data.ts` のモックデータ表示です。backend には週次勤怠サマリ API と日誌の Excel 出力 API はありますが、勤怠修正一覧 API、集計 CSV 出力 API、監査ログ一覧 API には接続されていません。

## 既知の削除済み・未確認情報

- `infra/` ディレクトリは現時点のリポジトリには存在しない
- Caddy / nginx / Apache / systemd / Docker 用の設定ファイルは現時点のリポジトリには存在しない
- Google OAuth 関連の環境変数は `backend/app/core/config.py` では定義されておらず、現行の notes API にも Google OAuth 接続ルートは存在しない
- `/api/audit-logs` の専用ルートは現時点では存在しない。監査ログの store / service はありますが、公開 API としては提供されていません。
