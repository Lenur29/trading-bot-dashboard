# Trading Signals — Dashboard

Статический сайт (HTML/CSS/JS, без сборки), показывающий открытые сделки,
историю и статистику торгового бота. Данные читаются из `data.json`, который
бот периодически генерирует и пушит в этот репозиторий.

```
бот на ноутбуке ──экспорт+push──▶ GitHub (этот репо) ──▶ Cloudflare Pages ──▶ сайт
```

## Файлы

| Файл | Назначение |
|------|------------|
| `index.html` | разметка дашборда |
| `styles.css` | оформление (тёмная тема) |
| `app.js` | загрузка `data.json` и рендер вкладок |
| `config.js` | **источник данных** (`DATA_URL`) и интервал авто-обновления |
| `data.json` | сами данные — обновляется ботом |

## Локальный просмотр

```bash
cd trading-bot-dashboard
python3 -m http.server 8000
# открыть http://localhost:8000
```

## Деплой на Cloudflare Pages

1. Создай репозиторий на GitHub (например `trading-bot-dashboard`) и запушь туда
   эту папку:
   ```bash
   git remote add origin git@github.com:USER/trading-bot-dashboard.git
   git push -u origin main
   ```
2. В Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** → выбери репозиторий.
3. Настройки сборки:
   - **Framework preset:** `None`
   - **Build command:** *(пусто)*
   - **Build output directory:** `/`
4. **Deploy.** Сайт будет на `https://<project>.pages.dev`.

Дальше бот пушит `data.json` → Cloudflare пересобирает → сайт обновляется.

### ⚠️ Лимит бесплатного тарифа Cloudflare

Бесплатный Pages — **500 сборок/месяц**. Если бот пушит часто (каждые 15 мин ≈
2900/мес), лимит закончится. Два решения:

- **Реже пушить** — выстави в боте `DASHBOARD_PUSH_MINUTES` так, чтобы за месяц
  было < 500 пушей (например раз в ~1.5–2 часа).
- **Отвязать данные от пересборок (рекомендуется для частых обновлений):** в
  `config.js` укажи прямой GitHub-raw URL:
  ```js
  DATA_URL: 'https://raw.githubusercontent.com/USER/trading-bot-dashboard/main/data.json'
  ```
  Тогда браузер берёт свежий `data.json` напрямую с GitHub (кэш ~5 мин), а
  Cloudflare не пересобирается на пушах данных вообще. Сам сайт пересоберётся
  только когда меняешь код фронта.

## Подключение бота

В `.env` бота:
```dotenv
DASHBOARD_AUTO_PUSH=true
DASHBOARD_PUSH_MINUTES=15
DASHBOARD_DIR=/Users/<you>/Desktop/trading-bot-dashboard
```
Бот будет каждые N минут регенерировать `data.json` и пушить (см.
`scripts/push_dashboard.sh`). Для пуша у этого репо должен быть настроен
git-remote с авторизацией (SSH-ключ или HTTPS credential helper).

Разовый ручной экспорт без бота:
```bash
cd ../trading-bot && ./scripts/push_dashboard.sh
```
