# CLAUDE.md

## このプロジェクトの動かし方

### backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

### frontend

```bash
cd frontend
npm run dev -- --host
```

ブラウザ: `http://172.16.1.111:5173`

### 環境

- Python 3.10（python3.11 はインストールされていない）
- Node は nvm 管理（v22）
- ラズパイ IP: 172.16.1.111（研究室 LAN のみ）

---

## Claude への制約

- **Docker は使わない**
- **Caddy・nginx・Apache などのリバースプロキシは提案しない**
- **systemd による自動起動は提案しない**
- **`npm run build` による本番ビルドは提案しない**
- LAN 制限はラズパイが `172.16.1.0/24` にしか存在しないことで解決済み。追加のネットワーク制御は不要
- 起動方法は上記の Vite dev server + uvicorn のみを前提にする

---

## プロジェクト構成

- `frontend/src/pages/` — ページコンポーネント
- `frontend/src/components/layout/` — 共通レイアウト
- `frontend/src/components/ui/` — 再利用 UI パーツ
- `backend/app/api/routes/` — API ルート
- `backend/app/services/` — ドメインロジック
- `backend/app/store/` — 永続化
- `backend/app/models/` — データモデル
- `backend/tests/` — テスト

---

## コーディング規約

- TypeScript/TSX: インデント 2 スペース
- Python: インデント 4 スペース
- コンポーネント・ページファイル名: `PascalCase`
- 関数・変数・フック: `camelCase`
- Python モジュール・関数・テストファイル: `snake_case`
- 小さく明示的な関数、短いモジュール境界を心がける
- 変更前に `eslint` と `ruff` を通す

---

## テスト

- backend テスト: `pytest`（`backend/tests/` に `test_<feature>.py` で配置）
- store/service はユニットテスト、ルートは API テストを優先
- 永続化コードを触るときは削除フロー・バックアップ挙動もカバーする

コマンド:

```bash
# backend
cd backend && pytest
cd backend && ruff check .

# frontend
cd frontend && npm run lint
```

---

## コミット規約

- メッセージ形式: `feat: ...` / `fix: ...` / `remove ...` など、短く命令形
- PR にはサマリー・影響範囲・確認手順を書く
- UI 変更にはスクリーンショットまたは録画を添付

---

## セキュリティ

- `.env` ファイル・SQLite ファイル・NAS パスはコミットしない
