// Источник данных дашборда.
//
// Вариант A (простой старт): data.json лежит в этой же репе → оставь './data.json'.
//   Cloudflare пересобирает сайт на каждый пуш данных (учитывай лимит 500 сборок/мес
//   на бесплатном тарифе).
//
// Вариант B (частые обновления без пересборок CF): укажи прямой GitHub-raw URL
//   с data.json — браузер тянет свежие данные напрямую с GitHub (кэш ~5 мин),
//   а Cloudflare не пересобирается. Пример:
//   DATA_URL: 'https://raw.githubusercontent.com/USER/REPO/main/data.json'
window.DASH_CONFIG = {
  DATA_URL: './data.json',
  REFRESH_MS: 60000,
}
