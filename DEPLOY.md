# 部署順序（只需要做一次）

## A. GitHub Pages
把根目錄內容上傳到 `natsuki0124/semicon-guide`：
- index.html
- manifest.json
- sw.js
- README.md
- data/exhibitors.json

GitHub Pages：Settings → Pages → Deploy from a branch → main → /(root)。

## B. Cloudflare Worker
Worker 不要放在 GitHub Pages 根目錄部署；它是另一個專案。

在 Cloudflare Worker 專案目錄：
```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

把部署後的 `https://xxxxx.workers.dev` 貼到 `index.html`：
```js
const WORKER_URL = "https://xxxxx.workers.dev";
```

再把更新後的 index.html commit 到 GitHub。

## C. 手機
用 GitHub Pages 網址開啟後，可使用瀏覽器的「加入主畫面」功能。
