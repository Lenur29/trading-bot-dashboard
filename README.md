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

### Свежие данные без лишних пересборок (текущая схема)

Данные тянутся **напрямую с GitHub-raw** (см. `config.js` → `RAW_URL`), а не из
собранной копии. Поэтому бот может пушить `data.json` хоть каждые 10 минут —
браузер берёт свежий файл с GitHub (кэш ~5 мин) и сам перезапрашивает раз в
минуту. Чтобы Cloudflare при этом **не пересобирался** на пушах данных (лимит
бесплатного тарифа — 500 сборок/мес), исключи `data.json` из сборок:

> Cloudflare → проект → **Settings → Builds & deployments → Build watch paths →
> Configure** → в **Exclude paths** добавь `data.json`.

После этого сборка запускается только когда меняешь код сайта (html/css/js), а
обновления данных идут мимо Cloudflare. Если логин/имя репо отличаются — поправь
`RAW_URL` в `config.js`.

## Подключение бота

В `.env` бота:
```dotenv
DASHBOARD_AUTO_PUSH=true
DASHBOARD_PUSH_MINUTES=10
DASHBOARD_DIR=/Users/<you>/Desktop/trading-bot-dashboard
```
Бот будет каждые N минут регенерировать `data.json` и пушить (см.
`scripts/push_dashboard.sh`). Для пуша у этого репо должен быть настроен
git-remote с авторизацией (SSH-ключ или HTTPS credential helper).

Разовый ручной экспорт без бота:
```bash
cd ../trading-bot && ./scripts/push_dashboard.sh
```
