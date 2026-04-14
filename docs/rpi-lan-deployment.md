# Raspberry Pi LAN限定 配置メモ

研究室LAN限定で Raspberry Pi に `frontend + backend + reverse proxy` を載せるときの最小構成です。  
ここでは Docker は使わず、`systemd + Caddy + frontend build` で常駐させます。アプリ本体は Raspberry Pi に置き、QNAP は使うとしても NAS 保存先としてだけ扱います。

## 役割分担

- Raspberry Pi
  - frontend
  - backend
  - Caddy
  - SQLite
- NAS
  - 日誌 Markdown
  - CSV 長期保存
  - バックアップ世代

NAS は必須ではありません。運用を単純化したい場合は、NAS 側に置いているディレクトリも Raspberry Pi ローカルへ寄せて構いません。

## ホスト側ディレクトリ

```text
/srv/lab-app/local/
  sqlite/

/mnt/lab-app-nas/
  notes/
  sessions/
  status_changes/
  audit_logs/
  backups/
```

- `/srv/lab-app/local` は Raspberry Pi ローカル永続領域
- `/mnt/lab-app-nas` は Raspberry Pi 側でマウント済みの NAS 共有フォルダの例
- NAS を使わない場合は、`notes` `sessions` `status_changes` `audit_logs` `backups` も `/srv/lab-app/local` 配下へ寄せてよい

## 構成ファイル

- `infra/caddy/Caddyfile.rpi-native`
- `infra/systemd/lab-management-backend@.service`
- `infra/systemd/lab-management-backup@.service`
- `infra/systemd/lab-management-backup@.timer`
- `.env.rpi.example`

## セットアップ

1. 必要なら NAS 共有を Raspberry Pi 側で `/mnt/lab-app-nas` にマウントする
2. Caddy をインストールする
3. `/srv/lab-app/local/sqlite` と `/srv/lab-app/frontend/dist` を作る
4. `.env.rpi.example` をコピーして `.env.rpi` を作る
5. `infra/caddy/Caddyfile.rpi-native` の CIDR を研究室LANに合わせて編集する
6. backend の仮想環境を作り、frontend を build する
7. `systemd` ユニットを有効化する

ディレクトリ作成:

```bash
sudo mkdir -p /srv/lab-app/local/sqlite
sudo mkdir -p /srv/lab-app/frontend/dist
sudo mkdir -p /mnt/lab-app-nas/{notes,sessions,status_changes,audit_logs,backups}
```

NAS を使わない場合は、代わりに次のようなローカルディレクトリを作ります。

```bash
sudo mkdir -p /srv/lab-app/local/{notes,sessions,status_changes,audit_logs,backups}
```

環境変数:

```bash
cp .env.rpi.example .env.rpi
```

必要に応じて `DATA_ROOT_PATH` と `BACKUP_ROOT_PATH` をローカルパスへ変えてください。未指定時の保存世代数は `BACKUP_RETENTION_COUNT=7` です。

Caddy インストール:

```bash
sudo apt update
sudo apt install -y caddy rsync
```

backend セットアップ:

```bash
cd backend
python3.11 -m venv .venv
. .venv/bin/activate
pip install -e .
```

frontend build 配置:

```bash
cd frontend
npm ci
npm run build
sudo rsync -a --delete dist/ /srv/lab-app/frontend/dist/
```

systemd ユニット配置:

```bash
sudo cp infra/systemd/lab-management-backend@.service /etc/systemd/system/
sudo cp infra/systemd/lab-management-backup@.service /etc/systemd/system/
sudo cp infra/systemd/lab-management-backup@.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lab-management-backend@${USER}
sudo systemctl enable --now lab-management-backup@${USER}.timer
```

Caddy 設定配置:

```bash
sudo cp infra/caddy/Caddyfile.rpi-native /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy
```

`lab-management-backend@.service` と `lab-management-backup@.service` は、リポジトリが `/home/<user>/Documents/HelloWorld` にある前提です。別パスへ置く場合は `WorkingDirectory` / `EnvironmentFile` / `ExecStart` を合わせて編集してください。

## ネットワーク制御

- 公開URLは `http://<pi-host>:8088`
- Caddy が研究室LAN外のアクセスを 403 で遮断する
- backend も `ALLOWED_SUBNETS` で同じ制御を行う
- backend は `127.0.0.1:8000` のみに bind し、Caddy 経由のみを正式導線にする

複数サブネットを使う場合は、`.env.rpi` の `ALLOWED_SUBNETS` をカンマ区切りにし、`infra/caddy/Caddyfile.rpi-native` の `remote_ip` 条件にも同じ CIDR を追加します。

## 保存方針

- `SQLite`: Raspberry Pi ローカル
- `notes`, `sessions`, `status_changes`, `audit_logs`: NAS または Raspberry Pi ローカル
- `backups`: NAS または Raspberry Pi ローカル

NAS が一時断した場合は、SQLite を使う API の継続を優先する想定です。NAS 保存が必要な処理は失敗をログで追える前提で運用します。NAS を使わない場合はこの考慮は不要です。

## 運用

ログ確認:

```bash
sudo journalctl -u lab-management-backend@${USER} -f
```

更新:

```bash
cd frontend
npm run build
sudo rsync -a --delete dist/ /srv/lab-app/frontend/dist/

sudo systemctl restart lab-management-backend@${USER}
sudo systemctl reload caddy
```

SQLite バックアップ:

```bash
sudo systemctl start lab-management-backup@${USER}
```

受け入れ確認:

- `http://<pi-host>:8088` で画面表示できる
- `http://<pi-host>:8088/api/health` が `200`
- ログイン、出勤、状態変更、退勤、日誌登録が通る
- Raspberry Pi 再起動後に自動復旧する
- SQLite が消えない
- NAS 未接続時の挙動をログで追える
