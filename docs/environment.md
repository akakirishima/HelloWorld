# 環境メモ

## 現状

| 項目 | 値 |
|------|-----|
| 機器 | Raspberry Pi |
| IP | 172.16.1.111（DHCP、ルーター 172.16.1.1 より割り当て） |
| アーキテクチャ | arm64 |
| OS | Linux 5.15 |
| Python | 3.10.12（`/usr/bin/python3`） |
| Node | v22（nvm 管理） |
| ネットワーク | eth0 有線のみ（wlan0 はオフ） |

起動構成:
- frontend: Vite dev server → `http://172.16.1.111:5173`
- backend: uvicorn → `http://127.0.0.1:8000`
- LAN外からは届かない（Pi が 172.16.1.0/24 にしか存在しないため）

データ保存先:
- SQLite: `backend/data/local.db`
- JSON/Markdown ストア: `backend/data/nas/`

---

## 別のラズパイへ移行する手順

### 1. データのバックアップ（旧Pi で実施）

```bash
cp backend/data/local.db ~/backup-local.db
cp -r backend/data/nas ~/backup-nas
```

### 2. リポジトリを新しいPiにクローン

```bash
git clone <repo-url> ~/Documents/HelloWorld
cd ~/Documents/HelloWorld
```

### 3. backend のセットアップ（新Pi で実施）

`.venv` はアーキテクチャ依存なので、コピーせず作り直す。

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

### 4. データを移す（必要な場合）

```bash
cp ~/backup-local.db backend/data/local.db
cp -r ~/backup-nas backend/data/nas
```

### 5. IPアドレスを確認して README / CLAUDE.md を更新

```bash
ip addr show eth0 | grep "inet "
```

新しいIPに合わせて以下を書き換える：
- `README.md` の `172.16.1.111` を新しいIPに変更
- `CLAUDE.md` の `172.16.1.111` を新しいIPに変更

### 6. frontend のセットアップ

```bash
cd frontend
npm install
```

### 7. 起動確認

```bash
# backend
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

# frontend（別ターミナル）
cd frontend && npm run dev -- --host
```

---

## IPを固定したい場合

ラズパイを再起動するたびにIPが変わる可能性があります。  
ルーターの管理画面でラズパイの MAC アドレス（`2c:cf:67:1a:8f:45`）に対して `172.16.1.111` を固定割り当てするのが一番簡単です。
