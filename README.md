# SEMICON Taiwan 看展助手｜完整版本

## 前端
GitHub Pages 放：
- `index.html`
- `manifest.json`
- `sw.js`
- `data/exhibitors.json`

功能：
- 內建 1,304 家 SEMICON 參展商
- 廠商名稱以 `;` 分隔搜尋
- 關注廠商 CSV 匯入
- 核心技術關鍵字本地比對
- AI 深度情報
- AI 找出未指定但可能值得拜訪的廠商
- 基本攤位排序路線
- Visit Card 現場速記（localStorage）
- 手機/PWA

## Cloudflare Worker
`worker/` 是獨立部署的 AI API。

**不要把 Gemini API Key 放 GitHub。**

部署：
1. 進入 `worker/`
2. 執行 `npx wrangler secret put GEMINI_API_KEY`
3. 貼上 Gemini API Key
4. 執行 `npx wrangler deploy`
5. 把 Worker 網址填入根目錄 `index.html` 的 `WORKER_URL`

Google Gemini 目前建議新專案使用 Interactions API；此 Worker 使用 `google_search` grounding，並以 structured output 讓前端收到固定 JSON。詳見 Google 官方文件。

## 注意
- `WORKER_URL` 不是秘密，可以公開。
- `GEMINI_API_KEY` 是秘密，只存在 Cloudflare Worker Secret。
- 本專案目前的展商資料以 `data/exhibitors.json` 為準。

## 目前資料的重要限制
你提供的 `semicon參展廠商.csv` 有 1,304 家資料，但「官方簡介或技術領域」欄位目前為空白；因此完整版本不假裝這些欄位有內容。技術關聯與公司情報改由 Gemini + Google Search grounding 補足，且 AI 被要求只從內建參展商清單中挑選「發現的廠商」。
