# システム起動ガイド

このページは、HelloWorld の frontend と backend をローカルで起動するための手順書です。

普段の起動では、**backend 用と frontend 用の2つのターミナルを開いたままにします。**

入力ミスを減らすため、この手順書ではコマンドをまとめず、**1行ずつ実行**します。

---

## 1. backend を起動する

まず1つ目のターミナルを開きます。

### 1-1. backend フォルダへ移動する

```bash
cd ~/Documents/HelloWorld/backend
```

ターミナルの表示が次のようになればOKです。

```text
~/Documents/HelloWorld/backend
```

### 1-2. Python の仮想環境を有効にする

```bash
source .venv/bin/activate
```

成功すると、ターミナルの行の先頭付近に `(.venv)` が表示されます。

例:

```text
(.venv) user@computer:~/Documents/HelloWorld/backend$
```

### 1-3. backend を起動する

```bash
uvicorn app.main:app --reload
```

次のような表示が出れば起動成功です。

```text
Uvicorn running on http://127.0.0.1:8000
Application startup complete.
```

backend が動いている間は、このターミナルを閉じないでください。

---

## 2. frontend を起動する

backend のターミナルはそのまま残し、**別のターミナルまたは新しいタブ**を開きます。

### 2-1. frontend フォルダへ移動する

```bash
cd ~/Documents/HelloWorld/frontend
```

### 2-2. frontend を起動する

```bash
npm run dev -- --host
```

次のような表示が出れば起動成功です。

```text
VITE ready

Local:   http://localhost:5173/
Network: http://xxx.xxx.xxx.xxx:5173/
```

frontend が動いている間は、このターミナルも閉じないでください。

---

## 3. システムを開く

起動した Ubuntu PC 自身で使う場合は、ブラウザで次を開きます。

```text
http://localhost:5173
```

同じ研究室 LAN に接続された別の PC やスマートフォンから使う場合は、frontend 起動時に表示された **Network の URL** を開きます。

例:

```text
http://172.16.1.77:5173
```

IP アドレスはネットワーク環境によって変わることがあります。  
README に書かれた古い IP アドレスを固定で使うのではなく、**その日の frontend 起動画面に表示された Network の URL を確認してください。**

---

## 4. 終了する

backend と frontend を終了するときは、それぞれのターミナルで

```text
Ctrl + C
```

を押します。

両方を終了すると HelloWorld システムも停止します。

---

## 5. 普段の起動で入力するコマンド

### backend 側

```bash
cd ~/Documents/HelloWorld/backend
```

```bash
source .venv/bin/activate
```

```bash
uvicorn app.main:app --reload
```

### frontend 側

別のターミナルで実行します。

```bash
cd ~/Documents/HelloWorld/frontend
```

```bash
npm run dev -- --host
```

---

## 6. よくある入力ミス

### `>` だけが表示されて先に進まない

クォート `'` や `"` を途中で入力してしまい、ターミナルが続きを待っている可能性があります。

```text
Ctrl + C
```

でキャンセルし、コマンドを最初から入力し直します。

### `unicorn: command not found` と表示される

`uvicorn` の `v` が抜けています。

正しくは次です。

```bash
uvicorn app.main:app --reload
```

### `.venv/bin/activate: No such file or directory` と表示される

まず、現在地が backend フォルダか確認してください。

```bash
cd ~/Documents/HelloWorld/backend
```

それでも同じエラーが出る場合は、初回セットアップが必要です。下の「初回セットアップ」を実行してください。

### `npm: command not found` と表示される

Node.js / npm が利用できる状態になっていない可能性があります。環境構築を確認してください。

---

## 7. 初回セットアップ

通常の起動では毎回行う必要はありません。新しい PC や Raspberry Pi に初めて環境を作る場合だけ実行します。

### backend

```bash
cd ~/Documents/HelloWorld/backend
```

```bash
python3 -m venv .venv
```

```bash
source .venv/bin/activate
```

```bash
pip install -e .[dev]
```

`.env` がまだない場合は、次を実行します。

```bash
cp .env.example .env
```

### frontend

```bash
cd ~/Documents/HelloWorld/frontend
```

```bash
npm install
```

セットアップが完了したら、このページ上部の通常の起動手順に戻ります。

---

## 8. 動作確認

backend が起動しているか確認する場合:

```text
http://127.0.0.1:8000/api/health
```

正常なら次のようなレスポンスが返ります。

```json
{"status":"ok"}
```

API の一覧を確認する場合:

```text
http://127.0.0.1:8000/api/docs
```

frontend は次を開いて画面が表示されれば正常です。

```text
http://localhost:5173
```
