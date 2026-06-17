# Frontend

研究室 在室・勤怠・日誌管理システムの Vite + React frontend です。

研究室運用で繰り返し使う画面を想定し、装飾よりも情報密度、視認性、タッチ操作しやすい導線を優先しています。

## 技術構成

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS
- lucide-react

## セットアップ

```bash
npm install
```

## 起動

```bash
npm run dev -- --host
```

研究室 LAN 内の端末から Raspberry Pi の Vite dev server にアクセスするため、`--host` を付けて起動します。

## 主な画面

- ログイン
- 在室ステータスボード
- タッチモニター用ボード
- 日誌
- 勤怠履歴
- 研究室設定
- ユーザー管理
- 勤怠修正
- 集計
- 監査ログ
- タッチ位置キャリブレーション

## 検証

```bash
npm run lint
```

## 補足

- API の基準 URL は `VITE_API_BASE_URL` で切り替えます
- 詳細な起動手順は repository root の `README.md` を参照してください
