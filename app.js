const apiUrl = 'http://localhost:3000'; // Или ngrok URL
let token = localStorage.getItem('token');
let isAdmin = false;
let lang = 'ru'; // По умолчанию русский

// Telegram Web App init
if (Telegram.WebApp) {
  Telegram.WebApp.ready();
}

// Смена темы
document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  document.body.classList.toggle('light-theme');
  const icon = document.body.classList.contains('dark-theme') ? '🌙' : '☀️';
  document.getElementById('theme-toggle').textContent = icon;
});

// Смена языка
document.getElementById('language').addEventListener('change', (e) => {
  lang = e.target.value;
  // Здесь перевести тексты, для простоты опустим полный перевод, добавьте сами с объектом translations
});

// Роутинг
function route() {
  const hash = location.hash.slice(2) || 'home';
  const content = document.getElementById('content');
  content.innerHTML = '';
  if (hash === 'home') renderHome();
  else if (hash === 'categories') renderCategories();
  else if (hash === 'create-ad') renderCreateAd();
  else if (hash.startsWith('ad/')) renderAdDetail(hash.split('/')[1]);
  else if (hash === 'admin') renderAdmin();
}

window.addEventListener('hashchange', route);
route();

// Главная
async function renderHome() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="filters">
      <input id="search" placeholder="Поиск...">
      <input id="minPrice" placeholder="Мин цена" type="number">
      <input id="maxPrice" placeholder="Макс цена" type="number">
      <select id="city"><option>Город</option></select>
      <button id="apply-filter">Применить</button>
    </div>
    <div id="ads"></div>
  `;
  const cities = await fetch(`${apiUrl}/cities`).then(res => res.json());
  cities.forEach(city => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.text = city;
    document.getElementById('city').appendChild(opt);
  });

  loadAds();

  document.getElementById('apply-filter').addEventListener('click', loadAds);
}

async function loadAds() {
  const params = new URLSearchParams({
    search: document.getElementById('search')?.value,
    minPrice: document.getElementById('minPrice')?.value,
    maxPrice: document.getElementById('maxPrice')?.value,
    city: document.getElementById('city')?.value,
  });
  const ads = await fetch(`${apiUrl}/ads?${params}`).then(res => res.json());
  const adsDiv = document.getElementById('ads');
  adsDiv.innerHTML = '';
  ads.forEach(ad => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${ad.photos[0]}" alt="${ad.title}">
      <h3>${ad.title}</h3>
      <p class="price">${ad.price} ₴</p>
      <p class="city">${ad.city}</p>
    `;
    card.addEventListener('click', () => location.hash = '#/ad/' + ad.id);
    adsDiv.appendChild(card);
  });
}

// Категории
async function renderCategories() {
  const content = document.getElementById('content');
  content.innerHTML = '<div id="cats"></div>';
  const cats = await fetch(`${apiUrl}/categories`).then(res => res.json());
  const catsDiv = document.getElementById('cats');
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat.name;
    btn.addEventListener('click', async () => {
      const ads = await fetch(`${apiUrl}/ads?category=${cat.name}`).then(res => res.json());
      content.innerHTML += '<div id="ads"></div>';
      // Аналогично loadAds, отобразить ads
      const adsDiv = document.getElementById('ads');
      adsDiv.innerHTML = '';
      ads.forEach(ad => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <img src="${ad.photos[0]}" alt="${ad.title}">
          <h3>${ad.title}</h3>
          <p class="price">${ad.price} ₴</p>
          <p class="city">${ad.city}</p>
        `;
        card.addEventListener('click', () => location.hash = '#/ad/' + ad.id);
        adsDiv.appendChild(card);
      });
    });
    catsDiv.appendChild(btn);
  });
}

// Создать объявление
async function renderCreateAd() {
  if (!token) return alert('Войдите сначала');
  const content = document.getElementById('content');
  content.innerHTML = `
    <form id="ad-form">
      <input name="title" placeholder="Название">
      <select name="category">
        <!-- Заполнить -->
      </select>
      <input name="price" type="number" placeholder="Цена в ₴">
      <textarea name="description" placeholder="Описание"></textarea>
      <select name="city"><option>Киев</option><option>Львов</option><!-- etc --></select>
      <input type="file" name="photos" multiple>
      <button type="submit">Отправить</button>
    </form>
  `;
  const cats = await fetch(`${apiUrl}/categories`).then(res => res.json());
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.text = cat.name;
    document.querySelector('select[name="category"]').appendChild(opt);
  });

  document.getElementById('ad-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await fetch(`${apiUrl}/ads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    }).then(res => res.json());
    alert('Объявление отправлено на модерацию');
  });
}

// Детали объявления
async function renderAdDetail(id) {
  const ad = await fetch(`${apiUrl}/ads/${id}`).then(res => res.json());
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>${ad.title}</h2>
    <div class="photos">
      ${ad.photos.map(p => `<img src="${p}">`).join('')}
    </div>
    <p>${ad.description}</p>
    <p>Цена: ${ad.price} ₴</p>
    <p>Город: ${ad.city}</p>
    <button id="contact">Написать продавцу</button>
  `;
  document.getElementById('contact').addEventListener('click', () => {
    window.open(`https://t.me/${ad.telegram}`, '_blank');
  });
}

// Админ панель
function renderAdmin() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <input id="admin-pass" type="password" placeholder="Пароль">
    <button id="admin-login">Войти</button>
    <div id="admin-content"></div>
  `;
  document.getElementById('admin-login').addEventListener('click', async () => {
    const pass = document.getElementById('admin-pass').value;
    const res = await fetch(`${apiUrl}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    }).then(res => res.json());
    if (res.token) {
      token = res.token;
      localStorage.setItem('token', token);
      isAdmin = true;
      loadAdminAds();
    } else alert('Неверный пароль');
  });
}

async function loadAdminAds() {
  const ads = await fetch(`${apiUrl}/admin/ads`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.json());
  const adminContent = document.getElementById('admin-content');
  adminContent.innerHTML = '';
  ads.forEach(ad => {
    const div = document.createElement('div');
    div.innerHTML = `
      <h3>${ad.title}</h3>
      <button class="approve">Одобрить</button>
      <button class="reject">Отклонить</button>
    `;
    div.querySelector('.approve').addEventListener('click', () => updateAd(ad.id, 'approved'));
    div.querySelector('.reject').addEventListener('click', () => updateAd(ad.id, 'rejected'));
    adminContent.appendChild(div);
  });
}

async function updateAd(id, status) {
  await fetch(`${apiUrl}/admin/ads/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status })
  });
  loadAdminAds();
}

// Логин/Регистрация (добавьте модалки аналогично)

document.getElementById('login-btn').addEventListener('click', () => {
  // Модалка для логина, fetch /login, сохранить token
});

document.getElementById('register-btn').addEventListener('click', () => {
  // Модалка для регистрации, включая telegram_username
});

document.getElementById('admin-btn').addEventListener('click', () => location.hash = '#/admin');