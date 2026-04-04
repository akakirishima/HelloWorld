# 研究室 在室・勤怠・日誌管理システム

React + FastAPI を前提にした MVP の開発基盤です。  
既存の Flutter サンプルである `hello_world/` は触らず、要件書どおりの新構成をリポジトリ直下に追加しています。

## セットアップ済みの内容

- `frontend/`: Vite + React + TypeScript + React Router + TanStack Query + React Hook Form + Zod + Tailwind CSS
- `backend/`: FastAPI + SQLAlchemy 2.x + Alembic + pytest
- `docker-compose.yml`: frontend / backend / Caddy をまとめて起動
- `docker-compose.qnap.yml`: QNAP TS-433 + PostgreSQL + NAS保存向け本番構成
- `infra/caddy/Caddyfile`: `/api` を backend に、それ以外を frontend にリバースプロキシ
- Alembic 初期マイグレーション
- seed データ

## ディレクトリ構成

```text
frontend/
  src/
    app/
    api/
    components/
    hooks/
    lib/
    pages/
    types/
backend/
  app/
    api/
    core/
    db/
    models/
    repositories/
    schemas/
    services/
  alembic/
  tests/
infra/
  caddy/
```

## 起動方法

### 1. Docker Compose で起動

```bash
docker compose up --build
```

起動後のアクセス先:

- アプリ: [http://localhost:8088](http://localhost:8088)
- frontend 直アクセス: [http://localhost:5173](http://localhost:5173)
- backend API: [http://localhost:8000](http://localhost:8000)
- OpenAPI Docs: [http://localhost:8088/api/docs](http://localhost:8088/api/docs)

### 2. 開発用アカウント

seed で以下を投入します。

- `admin` / `admin1234`
- `member` / `member1234`

現時点では認証 API は未実装で、ログイン画面はフォーム接続確認用の仮画面です。

## ローカル開発

### frontend

```bash
cd frontend
npm install
npm run dev
```

### backend

Python 3.11 以上を前提にしています。

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
alembic -c alembic.ini upgrade head
python -m app.db.seed
uvicorn app.main:app --reload
```

## 初期確認ポイント

- frontend のダッシュボードで `GET /api/health` の疎通が成功する
- backend の `/api/docs` が開く
- `backend/data/app.db` が作成される

## QNAP TS-433 本番構成

QNAP `172.16.1.10` へ載せる本番構成は `docker-compose.qnap.yml` を使います。想定は次のとおりです。

- 公開URL: `http://172.16.1.10:8088`
- QNAP管理画面: `https://172.16.1.10` または `http://172.16.1.10:8080`
- DB: `PostgreSQL`
- 日報: NAS 共有フォルダ上の Markdown
- ネットワーク制限: `172.16.1.0/24`

### QNAP 側の準備

1. Container Station を有効化する
2. 共有フォルダ `lab-app` を作る
3. `lab-app/postgres` `lab-app/reports` `lab-app/backups` を作る
4. `.env.qnap.example` をコピーして `.env.qnap` を作り、`QNAP_APP_ROOT` を実機の共有フォルダパスへ合わせる

### 起動

```bash
docker compose --env-file .env.qnap -f docker-compose.qnap.yml up --build -d
```

### PostgreSQL バックアップ

backend コンテナ内で次を実行すると、`/app/data/backups/postgres` にダンプを作成します。

```bash
python -m app.commands.backup_postgres
```

## 次フェーズ

要件書の実装優先順位に沿って、次は以下を載せていく想定です。

1. 認証 API
2. ユーザー管理 API
3. 出勤 / 退勤 / 在室 API
4. 日誌 / 集計 / 監査ログ
