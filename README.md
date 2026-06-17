# 研究室 在室・勤怠・日誌管理システム

研究室向けの在室状況、勤怠、日誌を管理する Web アプリです。

Raspberry Pi 上で frontend と backend を起動し、研究室 LAN 内の端末から在室ボードや管理画面を確認できる構成にしています。

## 目的

- 研究室メンバーの在室状況を、全体表示と部屋別表示で素早く確認する
- 出勤、退勤、在室ステータス変更を記録する
- 日誌、勤怠履歴、監査ログを研究室運用の記録として残す
- 管理者がメンバー、部屋、表示順、勤怠修正を扱える導線を用意する
- タッチモニターでも使いやすい、情報密度の高い業務 UI にする

## 構成

| 役割 | 技術 | ローカル URL |
| --- | --- | --- |
| frontend | Vite + React + TypeScript | `http://172.16.1.111:5173` |
| backend | FastAPI + SQLite / JSON store | `http://127.0.0.1:8000` |

- frontend と backend は別ターミナルで起動する
- Raspberry Pi は研究室 LAN 内で運用する
- 外部公開ではなく、研究室内の運用端末から使う前提

## 主な機能

- ログインとセッション管理
- 研究室全体 / 部屋別の在室ステータスボード
- 出勤、退勤、ステータス変更
- メンバー、部屋、表示順の管理
- 日誌作成、編集、閲覧
- 勤怠履歴、管理者による修正、監査ログ
- タッチモニター用ボード表示
- SQLite / JSON / Markdown データのバックアップ導線

## 技術スタック

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS
- lucide-react

### Backend

- FastAPI
- SQLite
- JSON / Markdown file store
- Session-based auth
- pytest
- ruff

## 起動方法

### backend

```bash
cd ~/Documents/HelloWorld/backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

API は `http://127.0.0.1:8000` で起動します。

`--reload` により、開発中のコード変更を検知して自動再起動します。

### frontend

別ターミナルで起動します。

```bash
cd ~/Documents/HelloWorld/frontend
npm run dev -- --host
```

研究室 LAN 内の端末から `http://172.16.1.111:5173` にアクセスします。

`--host` を付けることで、同じ LAN 内の別端末から確認できます。

### 停止

それぞれのターミナルで `Ctrl+C` を押します。

## 初回セットアップ

### backend

```bash
cd ~/Documents/HelloWorld/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

`.env` がない場合は作成します。

```bash
cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
APP_ENV=development
DATA_ROOT_PATH=./data/nas
SQLITE_PATH=./data/local.db
BACKUP_ROOT_PATH=./data/nas/backups
AUTO_SEED=true
EOF
```

`AUTO_SEED=true` にすると、ローカル確認用の初期データを投入できます。

公開 README には固定のログイン情報を置かず、実運用では環境ごとに初期情報を管理します。

### frontend

```bash
cd ~/Documents/HelloWorld/frontend
npm install
```

## 動作確認

- `http://172.16.1.111:5173` でログイン画面が表示される
- `http://127.0.0.1:8000/api/health` が `{"status":"ok"}` を返す
- `http://127.0.0.1:8000/api/docs` で API 一覧を確認できる
- 在室ボードで研究室全体と部屋別の状態を切り替えられる
- `backend/data/local.db` が作成される

## 検証コマンド

backend:

```bash
cd backend
pytest
ruff check .
```

frontend:

```bash
cd frontend
npm run lint
```

## ディレクトリ構成

```text
HelloWorld/
├── frontend/
│   └── src/
│       ├── api/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── pages/
│       └── types/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── services/
│   │   └── store/
│   ├── data/
│   └── tests/
├── docs/
└── CLAUDE.md
```

## タッチモニター表示

ダッシュボードをフルスクリーン表示する場合:

```bash
chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --overscroll-history-navigation=0 \
  http://localhost:5173/board
```

タッチ位置がずれる場合は、`/demo/calibration` でキャリブレーションできます。

設定は `/etc/X11/xorg.conf.d/99-calibration.conf` に保存します。

初回のみ書き込み権限を付与します。

```bash
sudo chown $USER /etc/X11/xorg.conf.d/99-calibration.conf
```
