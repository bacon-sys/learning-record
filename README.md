# 專題學習紀錄平台

宜蘭縣立大同國中「專題基礎實務」學生每週學習筆記平台。

- 網站：GitHub Pages（這個儲存庫的 main 分支）
- 資料庫、帳號：Supabase 專案 `learning-record`（東京）
- 學生帳號＝入學學年＋座號（例：11501），由老師在「名單與帳號」貼名單建立

## 檔案
- `index.html`：整個網站（單頁）
- `css/editor.css`、`js/editor.js`：仿 Word 編輯器
- `css/app.css`、`js/app.js`：登入、班級、學習紀錄頁、老師端
- `js/config.js`：Supabase 連線設定（公開金鑰，權限由資料庫規則把關）
- `js/vendor/`：supabase-js 2.119.0、qrcode-generator 1.4.4（MIT）
