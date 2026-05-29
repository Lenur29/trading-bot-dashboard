// Источник данных дашборда.
//
// На проде (Cloudflare) данные тянутся напрямую с GitHub-raw — браузер получает
// свежий data.json без пересборки Cloudflare. Локально (localhost / file://)
// используется ./data.json, чтобы можно было смотреть без интернета.
//
// Если поменяешь логин/имя репозитория — поправь RAW_URL ниже.
const RAW_URL = 'https://raw.githubusercontent.com/Lenur29/trading-bot-dashboard/main/data.json'
const IS_LOCAL = ['localhost', '127.0.0.1', ''].includes(location.hostname)

window.DASH_CONFIG = {
  DATA_URL: IS_LOCAL ? './data.json' : RAW_URL,
  REFRESH_MS: 60000, // браузер перезапрашивает данные раз в минуту
}
