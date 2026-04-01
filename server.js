const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const app = express();
const PORT = 3000;

// Укажи здесь оригинальный сайт
const TARGET_SITE = 'https://eblo.id';

// Функция для конвертации абсолютных URL в относительные
function convertToRelative(html, targetUrl) {
  const $ = cheerio.load(html);
  const baseUrl = new URL(targetUrl);
  
  // Удаляем рекламу - ищем div с ссылкой на yourlnk.ru
  $('div').each((i, elem) => {
    const $div = $(elem);
    if ($div.find('a[href*="yourlnk.ru"]').length > 0) {
      $div.remove();
    }
  });
  
  // Удаляем баннер скачивания
  $('.banner_download').remove();
  
  // Удаляем рекламные блоки DLE по атрибуту
  $('div[data-dlebid]').remove();
  $('div[data-dlebclicks]').remove();
  
  // Удаляем Яндекс Метрику
  $('script[src*="mc.yandex.ru"]').remove();
  $('script[src*="metrika/watch.js"]').remove();
  $('script').each((i, elem) => {
    const scriptContent = $(elem).html();
    if (scriptContent && scriptContent.includes('ym(')) {
      $(elem).remove();
    }
  });
  $('noscript:has(img[src*="mc.yandex.ru"])').remove();
  
  // Удаляем рекламные и трекинговые скрипты
  $('script[src*="adfinity.pro"]').remove();
  $('script[src*="dandik.fun"]').remove();
  $('script[src*="vak345.com"]').remove();
  
  // Удаляем любые ссылки на yourlnk.ru и extlinka.ru
  $('a[href*="yourlnk.ru"]').remove();
  $('a[href*="extlinka.ru"]').remove();
  
  // Удаляем картинку 8.png и 9.png
  $('img[src*="uploads/8.png"]').closest('div').remove();
  $('img[src*="uploads/9.png"]').closest('div').remove();
  
  // Обработка ссылок <a href="">
  $('a[href]').each((i, elem) => {
    const href = $(elem).attr('href');
    if (href && href.startsWith(targetUrl)) {
      const newHref = href.replace(targetUrl, '');
      $(elem).attr('href', newHref || '/');
    } else if (href && href.startsWith(baseUrl.origin)) {
      const newHref = href.replace(baseUrl.origin, '');
      $(elem).attr('href', newHref || '/');
    }
  });
  
  // Обработка изображений <img src="">
  $('img[src]').each((i, elem) => {
    const src = $(elem).attr('src');
    if (src && src.startsWith(targetUrl)) {
      $(elem).attr('src', src.replace(targetUrl, ''));
    } else if (src && src.startsWith(baseUrl.origin)) {
      $(elem).attr('src', src.replace(baseUrl.origin, ''));
    }
  });
  
  // Обработка скриптов <script src="">
  $('script[src]').each((i, elem) => {
    const src = $(elem).attr('src');
    if (src && src.startsWith(targetUrl)) {
      $(elem).attr('src', src.replace(targetUrl, ''));
    } else if (src && src.startsWith(baseUrl.origin)) {
      $(elem).attr('src', src.replace(baseUrl.origin, ''));
    }
  });
  
  // Обработка стилей <link href="">
  $('link[href]').each((i, elem) => {
    const href = $(elem).attr('href');
    if (href && href.startsWith(targetUrl)) {
      $(elem).attr('href', href.replace(targetUrl, ''));
    } else if (href && href.startsWith(baseUrl.origin)) {
      $(elem).attr('href', href.replace(baseUrl.origin, ''));
    }
  });
  
  // Делаем кнопку авторизации неактивной
  $('.auth-section a.auth-btn').each((i, elem) => {
    const $btn = $(elem);
    $btn.attr('href', 'javascript:void(0)');
    $btn.css({
      'opacity': '0.5',
      'cursor': 'not-allowed',
      'pointer-events': 'none'
    });
    $btn.attr('title', 'Вы используете зеркало, тут это невозможно');
  });
  
  // Добавляем кнопку "Открыть на eblo.id"
  $('.auth-section').append(`
    <a href="#" class="open-original-btn" onclick="window.open('https://eblo.id' + window.location.pathname, '_blank'); return false;">
      <span class="auth-btn-text">Открыть на eblo.id</span>
    </a>
  `);
  
  // Добавляем стили и скрипт для подсказки
  $('head').append(`
    <style>
      .auth-section {
        position: relative;
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .auth-section::after {
        content: 'Вы используете зеркало, тут это невозможно';
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 14px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
        margin-bottom: 8px;
        z-index: 1000;
      }
      .auth-section:hover::after {
        opacity: 1;
      }
      .auth-section .auth-btn {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
        pointer-events: none !important;
      }
      .open-original-btn {
        display: inline-flex;
        align-items: center;
        padding: 8px 16px;
        background: #9147ff;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 600;
        transition: background 0.3s;
        cursor: pointer;
      }
      .open-original-btn:hover {
        background: #772ce8;
      }
    </style>
  `);
  
  return $.html();
}

// Прокси для всех запросов
app.use(async (req, res) => {
  try {
    const targetUrl = TARGET_SITE + req.url;
    console.log(`Proxying: ${targetUrl}`);
    
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0'
      },
      responseType: 'arraybuffer',
      validateStatus: () => true,
      maxRedirects: 5
    });
    
    const contentType = response.headers['content-type'] || '';
    
    // Копируем важные заголовки из оригинального ответа
    if (response.headers['content-disposition']) {
      res.set('Content-Disposition', response.headers['content-disposition']);
    }
    if (response.headers['content-length']) {
      res.set('Content-Length', response.headers['content-length']);
    }
    
    // Если это HTML, конвертируем ссылки
    if (contentType.includes('text/html')) {
      const html = response.data.toString('utf-8');
      const modifiedHtml = convertToRelative(html, TARGET_SITE);
      
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(modifiedHtml);
    } else {
      // Для остальных типов (CSS, JS, изображения, файлы) отдаём как есть
      res.set('Content-Type', contentType);
      res.status(response.status);
      res.send(response.data);
    }
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('Proxy error: ' + error.message);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mirror proxy running on http://localhost:${PORT}`);
  console.log(`Mirroring: ${TARGET_SITE}`);
});
