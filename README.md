# 研究室 在室・勤怠・日誌管理システム

React + FastAPI を前提にした、研究室向けの在室・勤怠・日誌管理アプリです。  
フロントエンド、API、QNAP 向け Docker 構成、Raspberry Pi 向けネイティブ運用構成をこのリポジトリで管理します。

## セットアップ済みの内容

- `frontend/`: Vite + React + TypeScript + React Router + TanStack Query + React Hook Form + Zod + Tailwind CSS
- `backend/`: FastAPI + SQLite + JSON/Markdown ストア + pytest
- `docker-compose.yml`: frontend / backend / Caddy をまとめて起動
- `docker-compose.qnap.yml`: QNAP TS-433 + PostgreSQL + NAS保存向け本番構成
- `docker-compose.rpi.yml`: Raspberry Pi 向け Docker 構成
- `infra/caddy/Caddyfile`: `/api` を backend に、それ以外を frontend にリバースプロキシ
- `infra/caddy/Caddyfile.rpi-native`: Raspberry Pi ネイティブ運用向け Caddy 設定
- `infra/systemd/`: Raspberry Pi ネイティブ運用向け systemd ユニット
- バックアップコマンド: SQLite / PostgreSQL
- seed データと API テスト

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
    schemas/
    services/
  tests/
infra/
  caddy/
  systemd/
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
- `shimizu-yuichiro` / `shimizu1234`

`/api/auth/login` `/api/auth/logout` `/api/auth/me` `/api/auth/change-password` は実装済みです。  
管理者は `settings` `rooms` `users` を操作でき、メンバーは在室・勤怠・日誌フローを使います。

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
uvicorn app.main:app --reload
```

`.env` を使う場合の例:

```env
APP_ENV=development
DATA_ROOT_PATH=./data/nas
SQLITE_PATH=./data/local.db
BACKUP_ROOT_PATH=./data/backups
AUTO_SEED=true
```

## 初期確認ポイント

- frontend から `GET /api/health` の疎通が成功する
- backend の `/api/docs` が開く
- `backend/data/local.db` が作成される
- `admin` でログインできる

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
3. `lab-app/postgres` `lab-app/notes` `lab-app/sessions` `lab-app/status_changes` `lab-app/audit_logs` `lab-app/backups` を作る
4. `.env.qnap.example` をコピーして `.env.qnap` を作り、`QNAP_APP_ROOT` を実機の共有フォルダパスへ合わせる

### 起動

```bash
docker compose --env-file .env.qnap -f docker-compose.qnap.yml up --build -d
```

### PostgreSQL バックアップ

backend コンテナ内で次を実行すると、`/app/data/nas/backups/postgres` にダンプを作成します。

```bash
python -m app.commands.backup_postgres
```

保持世代数は `BACKUP_RETENTION_COUNT` で調整できます。未指定時は 7 世代を残します。

## Raspberry Pi LAN限定 本番構成

Raspberry Pi に `frontend + backend + Caddy` を載せ、SQLite は Pi ローカル、Markdown / CSV / backups は NAS に置く構成は、基本的に `systemd + Caddy + frontend build` で運用します。  
`docker-compose.rpi.yml` は比較用の Docker 構成として残しています。

- 公開URL: `http://<raspberry-pi-host>:8088`
- backend の公開: `127.0.0.1:8000` を Caddy から中継
- frontend の公開: `/srv/lab-app/frontend/dist` を Caddy から配信
- ネットワーク制限: `ALLOWED_SUBNETS` と `infra/caddy/Caddyfile.rpi-native`
- バックアップ: `lab-management-backup@.timer` から `python -m app.commands.backup_sqlite`

詳細は [docs/rpi-lan-deployment.md](/home/ishikiri_02/Documents/HelloWorld/docs/rpi-lan-deployment.md) を参照してください。

## 次フェーズ

現時点で auth / users / attendance / notes / backup の土台は揃っています。次に進めやすい項目は以下です。

1. 権限別 UI の詰め
2. 集計画面の拡張
3. 運用ログと障害時の可観測性強化
4. 実機デプロイ手順の自動化
