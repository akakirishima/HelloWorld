# 研究室 在室・勤怠・日誌管理システム

研究室向けの在室状況・勤怠・日誌を管理するウェブアプリです。  
Raspberry Pi 上で動かし、研究室のLAN内だけからアクセスできます。

---

## 構成

| 役割 | 技術 | URL |
|------|------|-----|
| 画面（frontend） | Vite + React + TypeScript | `http://172.16.1.111:5173` |
| API（backend） | FastAPI + SQLite | `http://127.0.0.1:8000` |

- frontend と backend を別々のターミナルで起動します
- Raspberry Pi が研究室 LAN（172.16.1.x）にしかつながっていないため、外部からはアクセスできません

---

## 起動方法

### backend を起動する

```bash
cd ~/Documents/HelloWorld/backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

起動すると `http://127.0.0.1:8000` で API が立ち上がります。  
`--reload` をつけると、コードを変更したときに自動で再起動します。

### frontend を起動する

別のターミナルを開いて：

```bash
cd ~/Documents/HelloWorld/frontend
npm run dev -- --host
```

起動すると `http://172.16.1.111:5173` でアクセスできます。  
`--host` をつけることで、同じ LAN 内の他の端末からもアクセスできるようになります。

### 停止する

それぞれのターミナルで `Ctrl+C` を押すと止まります。

---

## 初回セットアップ

クローン直後など、初めて動かすときだけ必要な手順です。

### backend のセットアップ

```bash
cd ~/Documents/HelloWorld/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

`.env` ファイルがない場合は作成します：

```bash
cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
APP_ENV=development
DATA_ROOT_PATH=./data/nas
SQLITE_PATH=./data/local.db
BACKUP_ROOT_PATH=./data/nas/backups
AUTO_SEED=true
EOF
```

`AUTO_SEED=true` にしておくと、初回起動時にデモ用のアカウントとデータが自動で入ります。

### frontend のセットアップ

```bash
cd ~/Documents/HelloWorld/frontend
npm install
```

---

## 使えるアカウント（初期データ）

`AUTO_SEED=true` で起動した場合、以下のアカウントが使えます：

| ユーザー名 | パスワード | 権限 |
|-----------|-----------|------|
| `admin` | `admin1234` | 管理者（設定・部屋・ユーザー管理） |
| `shimizu-yuichiro` | `shimizu1234` | メンバー（在室・勤怠・日誌） |

---

## 動作確認ポイント

起動後に以下を確認してください：

- `http://172.16.1.111:5173` でログイン画面が出る
- `http://127.0.0.1:8000/api/health` を開いて `{"status":"ok"}` が返ってくる
- `http://127.0.0.1:8000/api/docs` でAPI一覧が見られる
- `admin` でログインできる
- `backend/data/local.db` が作成されている

---

## ディレクトリ構成

```
HelloWorld/
├── frontend/        # Vite + React + TypeScript + Tailwind CSS
│   └── src/
│       ├── app/         # ルーティング・認証
│       ├── components/  # UI パーツ
│       └── features/    # 機能ごとのロジック
├── backend/         # FastAPI + SQLite
│   ├── app/
│   │   ├── api/         # APIエンドポイント
│   │   ├── core/        # 設定・認証
│   │   ├── models/      # データモデル
│   │   └── services/    # ビジネスロジック
│   ├── data/            # SQLite・JSONストア（起動後に自動生成）
│   └── .venv/           # Python 仮想環境
├── infra/           # Caddy・systemd 設定（使う場合）
├── docs/            # 詳細な手順書
└── CLAUDE.md        # Claude Code 向けの指示
```

---

## タッチモニター（キオスクモード）

ダッシュボードをタッチモニターでフルスクリーン表示する場合：

```bash
chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --overscroll-history-navigation=0 \
  http://localhost:5173/admin/dashboard/board
```

### タッチ位置がずれている場合

`http://172.16.1.111:5173/demo/calibration` を開いて、画面に表示される × を順番にタッチするとキャリブレーションできます。  
設定は `/etc/X11/xorg.conf.d/99-calibration.conf` に保存されます。

初回のみ書き込み権限を付与してください：

```bash
sudo chown $USER /etc/X11/xorg.conf.d/99-calibration.conf
```
