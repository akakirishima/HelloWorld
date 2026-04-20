# 研究室 在室・勤怠・日誌管理システム

React + FastAPI を前提にした、研究室向けの在室・勤怠・日誌管理アプリです。  
本リポジトリの本番前提は、Raspberry Pi に `frontend + backend + Caddy` を載せるネイティブ運用です。Docker は必須ではなく、QNAP は使うとしても保存先 NAS としてだけ扱います。

## このリポジトリにあるもの

- `frontend/`: Vite + React + TypeScript + React Router + TanStack Query + React Hook Form + Zod + Tailwind CSS
- `backend/`: FastAPI + SQLite + JSON/Markdown ストア + pytest
- `infra/caddy/Caddyfile.rpi-native`: Raspberry Pi ネイティブ運用向け Caddy 設定
- `infra/systemd/`: Raspberry Pi ネイティブ運用向け systemd ユニット
- `docs/rpi-lan-deployment.md`: Raspberry Pi への常駐手順
- バックアップコマンドと seed データ、API テスト

## 本番構成

正式な運用構成は次のとおりです。

- アプリ本体: Raspberry Pi
- frontend 配信: Caddy から `/srv/lab-app/frontend/dist`
- backend 公開: `127.0.0.1:8000` を Caddy が中継
- DB: Raspberry Pi ローカルの SQLite
- 日誌やバックアップ: 必要なら NAS 共有を Raspberry Pi からマウントして保存
- 公開 URL: `http://<raspberry-pi-host>:8088`

手順の詳細は `docs/rpi-lan-deployment.md` を参照してください。

## Raspberry Pi への配置

ここでは Docker は使わず、`systemd + Caddy + frontend build` で常駐させます。

1. backend の仮想環境を作る

```bash
cd backend
python3.11 -m venv .venv
. .venv/bin/activate
pip install -e .
```

2. `.env.rpi.example` をコピーして `.env.rpi` を作る

```bash
cp .env.rpi.example .env.rpi
```

3. frontend を build して Raspberry Pi の配信先へ配置する

```bash
cd frontend
npm ci
npm run build
sudo rsync -a --delete dist/ /srv/lab-app/frontend/dist/
```

4. `infra/systemd/` と `infra/caddy/Caddyfile.rpi-native` を配置して有効化する

Pi 上の常駐手順、ディレクトリ作成、Caddy の CIDR 制限、バックアップ設定は `docs/rpi-lan-deployment.md` にまとめています。

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
CONTACT_TIME_ROOT_PATH=/mnt/nas-helloworld/data
SQLITE_PATH=./data/local.db
BACKUP_ROOT_PATH=./data/nas/backups
AUTO_SEED=true
```

## 開発用アカウント

seed で以下を投入します。

- `admin` / `admin1234`
- `shimizu-yuichiro` / `shimizu1234`

`/api/auth/login` `/api/auth/logout` `/api/auth/me` `/api/auth/change-password` は実装済みです。  
管理者は `settings` `rooms` `users` を操作でき、メンバーは在室・勤怠・日誌フローを使います。

## 初期確認ポイント

- frontend から `GET /api/health` の疎通が成功する
- backend の `/api/docs` が開く
- `backend/data/local.db` が作成される
- `backend/data/nas/` 配下に notes / sessions / status_changes / audit_logs / backups が作成される
- `contact_time/` は NAS 側に生成される
- `admin` でログインできる

## タッチモニター運用（キオスクモード）

ダッシュボードをタッチモニターでキオスク表示する場合は Chromium をキオスクモードで起動します。

```bash
chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --overscroll-history-navigation=0 \
  http://localhost:5174/admin/dashboard/board
```

- `--kiosk`: フルスクリーン固定、アドレスバー・タブ非表示
- `--noerrdialogs`: エラーダイアログを抑制
- `--disable-infobars`: フルスクリーン終了バーを非表示
- `--disable-session-crashed-bubble`: クラッシュ復元バブルを非表示
- `--autoplay-policy=no-user-gesture-required`: 自動再生をジェスチャーなしで許可
- `--overscroll-history-navigation=0`: スワイプによる前後ページ移動を無効化

### タッチキャリブレーション

タッチ位置がずれている場合は `/demo/calibration` でキャリブレーションできます。  
四隅＋中央の × を順番にタッチすると変換行列を自動計算し、`/etc/X11/xorg.conf.d/99-calibration.conf` に保存します。

初回のみ書き込み権限を付与してください。

```bash
sudo chown $USER /etc/X11/xorg.conf.d/99-calibration.conf
```

## 補足

- `docker-compose.yml` `docker-compose.rpi.yml` `docker-compose.qnap.yml` はいずれも NAS 保存前提です。
- QNAP はアプリ本体の置き場ではなく、NAS 保存先として扱います。
