import { NextRequest, NextResponse } from "next/server";

type Mode = "auto" | "code" | "game" | "site";
type SiteLanguage = "ru" | "tr" | "en";
type DeveloperOptions = {
  gameName: string;
  dimension: "2d" | "3d";
  style: "pixel" | "cartoon" | "realistic" | "neon" | "minimal";
  genre: "arcade" | "platformer" | "racing" | "puzzle" | "shooter" | "strategy";
  difficulty: "easy" | "medium" | "hard";
  controls: "keyboard" | "touch" | "both";
  players: "1" | "2";
  stack: "auto" | "html" | "javascript" | "typescript" | "python";
  quality: "production" | "prototype";
  siteName: string;
  siteType: "business" | "portfolio" | "store" | "blog" | "education";
  siteStyle: "modern" | "premium" | "bright" | "minimal";
  siteColor: "lime" | "blue" | "violet" | "orange";
  siteFeatures: Array<"contact" | "pricing" | "gallery" | "faq">;
};
type DeveloperResult = {
  title: string;
  explanation: string;
  language: string;
  code: string;
  filename: string;
  previewable: boolean;
  engine: "ai" | "template";
  validation?: { status: "passed" | "repaired" | "needs_review"; attempts: number; checks: string[]; issues: string[] };
};

function cleanLabel(value: string) {
  return value.replace(/[<>"']/g, "").replace(/\s+/g, " ").trim().slice(0, 70);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

function readOptions(value: unknown): DeveloperOptions {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const requestedFeatures = Array.isArray(raw.siteFeatures) ? raw.siteFeatures : [];
  return {
    gameName: cleanLabel(String(raw.gameName || "")),
    dimension: oneOf(raw.dimension, ["2d", "3d"] as const, "2d"),
    style: oneOf(raw.style, ["pixel", "cartoon", "realistic", "neon", "minimal"] as const, "neon"),
    genre: oneOf(raw.genre, ["arcade", "platformer", "racing", "puzzle", "shooter", "strategy"] as const, "arcade"),
    difficulty: oneOf(raw.difficulty, ["easy", "medium", "hard"] as const, "medium"),
    controls: oneOf(raw.controls, ["keyboard", "touch", "both"] as const, "both"),
    players: oneOf(raw.players, ["1", "2"] as const, "1"),
    stack: oneOf(raw.stack, ["auto", "html", "javascript", "typescript", "python"] as const, "auto"),
    quality: oneOf(raw.quality, ["production", "prototype"] as const, "production"),
    siteName: cleanLabel(String(raw.siteName || "")),
    siteType: oneOf(raw.siteType, ["business", "portfolio", "store", "blog", "education"] as const, "business"),
    siteStyle: oneOf(raw.siteStyle, ["modern", "premium", "bright", "minimal"] as const, "modern"),
    siteColor: oneOf(raw.siteColor, ["lime", "blue", "violet", "orange"] as const, "lime"),
    siteFeatures: requestedFeatures.filter((item): item is DeveloperOptions["siteFeatures"][number] => ["contact", "pricing", "gallery", "faq"].includes(String(item))),
  };
}

function configurationText(mode: Mode, options: DeveloperOptions) {
  if (mode === "game") return `Название: ${options.gameName || "выбрать по смыслу"}. Параметры игры: ${options.dimension.toUpperCase()}, стиль ${options.style}, жанр ${options.genre}, сложность ${options.difficulty}, управление ${options.controls}, игроков ${options.players}.`;
  if (mode === "site") return `Название: ${options.siteName || "выбрать по смыслу"}. Тип: ${options.siteType}. Стиль: ${options.siteStyle}. Цвет: ${options.siteColor}. Блоки: ${options.siteFeatures.join(", ") || "только необходимые"}. Технология: ${options.stack}. Уровень готовности: ${options.quality}.`;
  if (mode === "code") return `Технология: ${options.stack}. Уровень готовности: ${options.quality}.`;
  return `Если запрос окажется игрой, используй ${options.dimension.toUpperCase()}, стиль ${options.style}, жанр ${options.genre}; если кодом или сайтом — технология ${options.stack}, качество ${options.quality}.`;
}

function titleFromPrompt(prompt: string, fallback: string) {
  const quoted = prompt.match(/[«\"']([^»\"']{2,60})[»\"']/)?.[1];
  if (quoted) return cleanLabel(quoted);
  const afterName = prompt.match(/(?:названи(?:е|ем)|имя)\s*[:—-]?\s*([\p{L}\p{N}][\p{L}\p{N} _-]{1,45})/iu)?.[1];
  return cleanLabel(afterName || fallback);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function siteTemplate(prompt: string, options: DeveloperOptions): DeveloperResult {
  const typeFallbacks: Record<DeveloperOptions["siteType"], string> = { business: "Новый проект", portfolio: "Моё портфолио", store: "Умный каталог", blog: "Полезный блог", education: "Школа знаний" };
  const title = escapeHtml(options.siteName || titleFromPrompt(prompt, typeFallbacks[options.siteType]));
  const brief = escapeHtml(prompt.replace(/\s+/g, " ").trim().slice(0, 230));
  const palettes = { lime: ["#b7f34a", "#0a0d0a", "#182111"], blue: ["#60a5fa", "#080c14", "#111d31"], violet: ["#a78bfa", "#0d0914", "#211634"], orange: ["#fb923c", "#120b07", "#31180d"] } as const;
  const [accent, background, glow] = palettes[options.siteColor];
  const heroCopy: Record<DeveloperOptions["siteType"], [string, string]> = {
    business: ["Решение, которое работает на ваш результат", "Покажите ценность услуги, соберите заявки и дайте посетителю понятный следующий шаг."],
    portfolio: ["Работы, которыми хочется делиться", "Чёткая подача опыта, сильные проекты и удобный способ связаться с автором."],
    store: ["Выбирать легко. Заказывать удобно.", "Понятный каталог, цены и быстрый переход к оформлению заявки."],
    blog: ["Мысли, истории и полезные материалы", "Аккуратная лента публикаций с удобным чтением на любом экране."],
    education: ["Учиться понятно и с результатом", "Программа, преимущества и простая запись на первый урок."],
  };
  const featureCards: Record<DeveloperOptions["siteType"], Array<[string, string]>> = {
    business: [["01", "Понятное предложение"], ["02", "Рабочая заявка"], ["03", "Адаптация к телефону"]],
    portfolio: [["01", "Избранные проекты"], ["02", "Навыки и подход"], ["03", "Контакты автора"]],
    store: [["01", "Карточки товаров"], ["02", "Цены и преимущества"], ["03", "Быстрый заказ"]],
    blog: [["01", "Свежие статьи"], ["02", "Удобное чтение"], ["03", "Подписка на новости"]],
    education: [["01", "Программа обучения"], ["02", "Понятные форматы"], ["03", "Запись на занятие"]],
  };
  const cardsHtml = featureCards[options.siteType].map(([number, name], index) => `<article class="feature"><span>${number}</span><h3>${name}</h3><p>${index === 0 ? brief : "Блок полностью адаптирован, легко редактируется и ведёт посетителя к нужному действию."}</p></article>`).join("");
  const pricing = options.siteFeatures.includes("pricing") ? `<section class="section" id="prices"><div class="section-head"><span>Цены</span><h2>Выберите подходящий вариант</h2></div><div class="price-grid"><article><b>Старт</b><strong>₺990</strong><p>Базовый набор возможностей для быстрого начала.</p><button data-plan="Старт">Выбрать</button></article><article class="popular"><i>Популярно</i><b>Оптимум</b><strong>₺2 490</strong><p>Полный набор для основной задачи и поддержки.</p><button data-plan="Оптимум">Выбрать</button></article><article><b>Максимум</b><strong>₺4 990</strong><p>Расширенная версия с индивидуальными настройками.</p><button data-plan="Максимум">Выбрать</button></article></div></section>` : "";
  const gallery = options.siteFeatures.includes("gallery") ? `<section class="section" id="gallery"><div class="section-head"><span>Галерея</span><h2>Примеры и результаты</h2></div><div class="gallery"><div><b>Проект 01</b></div><div><b>Проект 02</b></div><div><b>Проект 03</b></div></div></section>` : "";
  const faq = options.siteFeatures.includes("faq") ? `<section class="section faq" id="faq"><div class="section-head"><span>FAQ</span><h2>Частые вопросы</h2></div><details><summary>Как начать?</summary><p>Выберите подходящий вариант или заполните форму — мы свяжемся с вами.</p></details><details><summary>Сайт работает на телефоне?</summary><p>Да, все блоки, меню, кнопки и форма адаптированы к небольшому экрану.</p></details><details><summary>Можно изменить тексты и цвета?</summary><p>Да, всё находится в одном HTML-файле и легко редактируется.</p></details></section>` : "";
  const contact = options.siteFeatures.includes("contact") ? `<section class="section contact" id="contact"><div><span>Связаться</span><h2>Расскажите о своей задаче</h2><p>Заполните поля — форма проверит данные и покажет подтверждение.</p></div><form id="contactForm" novalidate><label>Имя<input name="name" autocomplete="name" required minlength="2" placeholder="Ваше имя"></label><label>Телефон или e-mail<input name="contact" required placeholder="name@example.com"></label><label>Сообщение<textarea name="message" required minlength="5" placeholder="Что вам нужно?"></textarea></label><button type="submit">Отправить заявку</button><p class="form-status" role="status"></p></form></section>` : "";
  const radius = options.siteStyle === "minimal" ? "8px" : options.siteStyle === "premium" ? "26px" : "18px";
  const headingFont = options.siteStyle === "premium" ? "Georgia,serif" : "Inter,Arial,sans-serif";
  const code = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>:root{--accent:${accent};--bg:${background};--glow:${glow};--card:#ffffff0a;--line:#ffffff18;--text:#f7f8f5;--muted:#9aa39d;--radius:${radius}}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 85% 0,var(--glow),transparent 34%),var(--bg);color:var(--text);font-family:Inter,Arial,sans-serif}button,input,textarea{font:inherit}a{color:inherit}nav{position:sticky;z-index:20;top:0;height:70px;padding:0 max(22px,calc((100vw - 1120px)/2));display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);background:#090d10d9;backdrop-filter:blur(16px)}nav>a{font-weight:950;letter-spacing:.06em;text-decoration:none}nav>a span{color:var(--accent)}.links{display:flex;align-items:center;gap:20px}.links a{text-decoration:none;color:var(--muted);font-size:13px}.links a:hover{color:var(--text)}.menu{display:none;border:1px solid var(--line);background:transparent;color:var(--text);border-radius:9px;padding:8px 11px}.hero{min-height:78vh;padding:90px 24px;display:grid;place-items:center;text-align:center}.hero>div{max-width:930px}.eyebrow,.section-head>span,.contact>div>span{color:var(--accent);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.14em}.hero h1,.section h2{font-family:${headingFont}}.hero h1{margin:24px 0;font-size:clamp(48px,9vw,104px);line-height:.92;letter-spacing:-.065em}.hero p{max-width:720px;margin:0 auto 30px;color:var(--muted);font-size:clamp(16px,2vw,20px);line-height:1.7}.actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}.button,.actions a,.price-grid button,.contact button{padding:14px 20px;border:0;border-radius:12px;background:var(--accent);color:#081006;text-decoration:none;font-weight:900;cursor:pointer}.actions a.secondary{color:var(--text);border:1px solid var(--line);background:transparent}.section{width:min(1120px,calc(100% - 36px));margin:0 auto;padding:80px 0}.section-head{max-width:680px;margin-bottom:28px}.section h2{margin:9px 0;font-size:clamp(34px,5vw,60px);letter-spacing:-.045em}.features,.price-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.feature,.price-grid article{min-height:235px;padding:27px;border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(145deg,var(--card),transparent)}.feature span{color:var(--accent);font-weight:900}.feature h3{margin:58px 0 10px;font-size:22px}.feature p,.price-grid p,.faq p,.contact p{color:var(--muted);line-height:1.65}.price-grid article{position:relative;display:flex;flex-direction:column}.price-grid strong{margin:22px 0 4px;font-size:38px}.price-grid button{margin-top:auto}.price-grid .popular{border-color:color-mix(in srgb,var(--accent) 55%,transparent)}.price-grid i{position:absolute;right:18px;top:17px;color:var(--accent);font-size:11px;font-style:normal}.gallery{display:grid;grid-template-columns:2fr 1fr 1fr;gap:14px}.gallery div{min-height:280px;padding:20px;display:flex;align-items:flex-end;border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(135deg,var(--glow),#ffffff08)}.gallery b{color:var(--accent)}.faq details{margin-top:9px;padding:19px 21px;border:1px solid var(--line);border-radius:var(--radius);background:var(--card)}.faq summary{cursor:pointer;font-weight:850}.contact{display:grid;grid-template-columns:.8fr 1.2fr;gap:50px;align-items:start}.contact form{padding:24px;display:grid;gap:14px;border:1px solid var(--line);border-radius:var(--radius);background:var(--card)}.contact label{display:grid;gap:6px;color:var(--muted);font-size:12px}.contact input,.contact textarea{width:100%;padding:13px;border:1px solid var(--line);border-radius:10px;background:#0004;color:var(--text);outline:0}.contact input:focus,.contact textarea:focus{border-color:var(--accent)}.contact textarea{min-height:110px;resize:vertical}.form-status{min-height:22px;margin:0!important;font-size:12px}.form-status.ok{color:var(--accent)}.form-status.error{color:#ff8787}footer{padding:32px 22px;text-align:center;color:var(--muted);border-top:1px solid var(--line);font-size:12px}@media(max-width:760px){.menu{display:block}.links{position:absolute;left:12px;right:12px;top:76px;padding:16px;display:none;flex-direction:column;align-items:stretch;border:1px solid var(--line);border-radius:14px;background:#0b1014}.links.open{display:flex}.hero{min-height:68vh;padding-top:70px}.features,.price-grid,.gallery,.contact{grid-template-columns:1fr}.gallery div{min-height:190px}.section{padding:55px 0}}</style></head>
<body><nav><a href="#top">${title}<span>.</span></a><button class="menu" aria-expanded="false" aria-controls="navLinks">Меню</button><div class="links" id="navLinks"><a href="#about">О проекте</a>${options.siteFeatures.includes("pricing") ? '<a href="#prices">Цены</a>' : ""}${options.siteFeatures.includes("gallery") ? '<a href="#gallery">Галерея</a>' : ""}${options.siteFeatures.includes("faq") ? '<a href="#faq">FAQ</a>' : ""}${options.siteFeatures.includes("contact") ? '<a href="#contact">Контакты</a>' : ""}</div></nav><main id="top"><section class="hero"><div><span class="eyebrow">${title}</span><h1>${heroCopy[options.siteType][0]}</h1><p>${heroCopy[options.siteType][1]} ${brief}</p><div class="actions"><a href="#about">Посмотреть возможности</a>${options.siteFeatures.includes("contact") ? '<a class="secondary" href="#contact">Связаться</a>' : ""}</div></div></section><section class="section" id="about"><div class="section-head"><span>О проекте</span><h2>Всё необходимое — без лишнего</h2></div><div class="features">${cardsHtml}</div></section>${pricing}${gallery}${faq}${contact}</main><footer>© 2026 ${title} · Сделано с вниманием к деталям</footer>
<script>const menu=document.querySelector('.menu'),links=document.querySelector('.links');if(menu){menu.onclick=()=>{const open=links.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))};links.querySelectorAll('a').forEach(a=>a.onclick=()=>links.classList.remove('open'))}document.querySelectorAll('[data-plan]').forEach(button=>button.onclick=()=>{const target=document.querySelector('#contact');if(target){target.scrollIntoView({behavior:'smooth'});const message=target.querySelector('[name="message"]');if(message)message.value='Интересует вариант «'+button.dataset.plan+'»'}else alert('Выбран вариант «'+button.dataset.plan+'». Добавьте форму связи в настройках, чтобы принимать заявки.')});const form=document.querySelector('#contactForm');if(form)form.addEventListener('submit',event=>{event.preventDefault();const status=form.querySelector('.form-status');if(!form.checkValidity()){status.textContent='Проверьте обязательные поля.';status.className='form-status error';form.reportValidity();return}status.textContent='Спасибо! Заявка подготовлена. Подключите свой адрес или сервер для настоящей отправки.';status.className='form-status ok';form.reset()});</script></body></html>`;
  return { title: options.siteName || titleFromPrompt(prompt, typeFallbacks[options.siteType]), explanation: "Сайт собран по выбранному типу, стилю, цвету и блокам. Меню, кнопки, формы и мобильная версия работают в одном HTML-файле.", language: "html", code, filename: "index.html", previewable: true, engine: "template" };
}

function snakeGame(prompt: string, options?: DeveloperOptions): DeveloperResult {
  const title = options?.gameName || titleFromPrompt(prompt, "Неоновая змейка");
  const code = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070a0f;color:#fff;font-family:Arial}.game{text-align:center;padding:22px;border:1px solid #27303a;border-radius:22px;background:#111720;box-shadow:0 20px 80px #000}h1{margin:0 0 8px;color:#b7f34a}p{color:#8f9aa6}canvas{max-width:88vw;background:#080c10;border:1px solid #2c3540;border-radius:12px}.row{display:flex;justify-content:space-between;align-items:center;margin-top:10px}button{border:0;border-radius:10px;padding:11px 16px;background:#b7f34a;font-weight:800;cursor:pointer}</style></head><body><section class="game"><h1>${title}</h1><p>Стрелки или WASD · Собирайте светящиеся точки</p><canvas id="c" width="420" height="420"></canvas><div class="row"><b>Счёт: <span id="score">0</span></b><button id="restart">Заново</button></div></section><script>
const c=document.querySelector('#c'),x=c.getContext('2d'),score=document.querySelector('#score');let snake,food,dir,next,timer,points;
function spawn(){food={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)}}
function start(){snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];dir={x:1,y:0};next=dir;points=0;score.textContent=points;spawn();clearInterval(timer);timer=setInterval(tick,105)}
function tick(){dir=next;const h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};if(h.x<0||h.y<0||h.x>19||h.y>19||snake.some(p=>p.x===h.x&&p.y===h.y)){clearInterval(timer);draw(true);return}snake.unshift(h);if(h.x===food.x&&h.y===food.y){points++;score.textContent=points;spawn()}else snake.pop();draw(false)}
function draw(over){x.fillStyle='#080c10';x.fillRect(0,0,420,420);x.fillStyle='#ff5c7a';x.beginPath();x.arc(food.x*21+10.5,food.y*21+10.5,7,0,7);x.fill();snake.forEach((p,i)=>{x.fillStyle=i?'#7fd331':'#b7f34a';x.fillRect(p.x*21+2,p.y*21+2,17,17)});if(over){x.fillStyle='#fff';x.font='bold 34px Arial';x.textAlign='center';x.fillText('Игра окончена',210,205);x.font='16px Arial';x.fillText('Нажмите «Заново»',210,236)}}
addEventListener('keydown',e=>{const m={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]}[e.key];if(m&&!(m[0]===-dir.x&&m[1]===-dir.y)){next={x:m[0],y:m[1]};e.preventDefault()}});document.querySelector('#restart').onclick=start;start();
</script></body></html>`;
  return { title, explanation: "Готовая мини-игра «Змейка» с управлением, счётом, столкновениями и перезапуском.", language: "html", code, filename: "snake-game.html", previewable: true, engine: "template" };
}

function clickerGame(prompt: string, options?: DeveloperOptions): DeveloperResult {
  const title = options?.gameName || titleFromPrompt(prompt, "Космический кликер");
  const code = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle,#18264a,#070910 65%);color:#fff;font-family:Arial;text-align:center}.card{width:min(520px,92vw);padding:34px;border:1px solid #33436a;border-radius:28px;background:#0d1321dd;box-shadow:0 25px 90px #0008}h1{margin:0}.score{font-size:72px;font-weight:900;color:#7de3ff;margin:18px}.planet{width:190px;height:190px;border:0;border-radius:50%;font-size:82px;background:linear-gradient(145deg,#6f7bff,#3341af);box-shadow:0 0 55px #5667ff88;cursor:pointer;transition:.1s}.planet:active{transform:scale(.92)}.shop{display:flex;gap:10px;margin-top:28px}.shop button{flex:1;padding:13px;border:1px solid #33436a;border-radius:12px;background:#17223b;color:#fff;cursor:pointer}.shop button:hover{border-color:#7de3ff}</style></head><body><main class="card"><h1>${title}</h1><p>Собирайте энергию и покупайте ускорения</p><div class="score" id="score">0</div><button class="planet" id="planet">🪐</button><div class="shop"><button id="upgrade">+1 за клик · <b id="cost">10</b></button><button id="auto">Автосбор · <b id="autoCost">25</b></button></div></main><script>let score=0,power=1,auto=0,cost=10,autoCost=25;const out=document.querySelector('#score');function draw(){out.textContent=Math.floor(score);document.querySelector('#cost').textContent=cost;document.querySelector('#autoCost').textContent=autoCost}document.querySelector('#planet').onclick=()=>{score+=power;draw()};document.querySelector('#upgrade').onclick=()=>{if(score>=cost){score-=cost;power++;cost=Math.ceil(cost*1.7);draw()}};document.querySelector('#auto').onclick=()=>{if(score>=autoCost){score-=autoCost;auto++;autoCost=Math.ceil(autoCost*1.85);draw()}};setInterval(()=>{score+=auto;draw()},1000);draw()</script></body></html>`;
  return { title, explanation: "Готовый кликер в одном файле: очки, улучшение силы клика и автоматический сбор.", language: "html", code, filename: "clicker-game.html", previewable: true, engine: "template" };
}

function perspectiveGame(prompt: string, options: DeveloperOptions): DeveloperResult {
  const names: Record<DeveloperOptions["genre"], string> = { arcade: "Аркада", platformer: "Платформер", racing: "Гонки", puzzle: "Головоломка", shooter: "Шутер", strategy: "Стратегия" };
  const themes = { pixel: ["#83f28f", "#152418", "#ffdc69"], cartoon: ["#66d9ff", "#17234a", "#ff6b9b"], realistic: ["#d6e1e8", "#15191d", "#ff7043"], neon: ["#7df9ff", "#070a18", "#ff3df2"], minimal: ["#f5f5f0", "#111111", "#b7f34a"] } as const;
  const [accent, background, danger] = themes[options.style];
  const title = options.gameName || titleFromPrompt(prompt, `3D ${names[options.genre]}`);
  const speed = options.difficulty === "easy" ? 0.0048 : options.difficulty === "hard" ? 0.009 : 0.0068;
  const secondPlayer = options.players === "2";
  const touchControls = options.controls !== "keyboard";
  const code = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 10%,#202a52,${background} 64%);color:#fff;font-family:Inter,Arial,sans-serif}.game{width:min(980px,96vw);padding:18px;border:1px solid #ffffff25;border-radius:24px;background:#070b13dc;box-shadow:0 30px 100px #0009}.head,.bar{display:flex;align-items:center;justify-content:space-between;gap:14px}.head h1{margin:0;font-size:clamp(24px,4vw,42px);color:${accent}}.head p{margin:5px 0 0;color:#91a0ae;font-size:12px}.stats{display:flex;gap:8px}.stats b{padding:9px 12px;border-radius:10px;background:#ffffff0d;color:${accent};font-size:12px}canvas{width:100%;margin-top:14px;display:block;aspect-ratio:16/9;border:1px solid #ffffff20;border-radius:16px;background:${background};touch-action:none}.bar{margin-top:12px}.bar span{color:#8694a2;font-size:11px}.bar button,.touch button{border:0;border-radius:11px;background:${accent};color:#071015;font-weight:900;cursor:pointer}.bar button{padding:11px 18px}.touch{display:${touchControls ? "flex" : "none"};justify-content:center;gap:10px;margin-top:12px}.touch button{width:72px;height:48px;font-size:22px}@media(max-width:620px){.game{padding:11px}.head,.bar{align-items:flex-start;flex-direction:column}.stats,.bar button{width:100%}.stats b{flex:1;text-align:center}}</style></head><body><main class="game"><div class="head"><div><h1>${title}</h1><p>Объезжайте препятствия · P — пауза${secondPlayer ? " · Игрок 2: J / L" : ""}</p></div><div class="stats"><b>Счёт: <span id="score">0</span></b><b>Рекорд: <span id="best">0</span></b></div></div><canvas id="game" width="960" height="540" aria-label="Игровое поле"></canvas><div class="touch"><button data-move="-1" aria-label="Влево">←</button><button data-move="1" aria-label="Вправо">→</button></div><div class="bar"><span id="status">Нажмите «Старт». Стрелки или A / D.</span><button id="start">Старт</button></div></main><script>const c=document.querySelector('#game'),g=c.getContext('2d'),scoreEl=document.querySelector('#score'),bestEl=document.querySelector('#best'),statusEl=document.querySelector('#status'),startBtn=document.querySelector('#start'),lanes=[-1,0,1],accent='${accent}',danger='${danger}',speed=${speed};let running=false,paused=false,last=0,score=0,best=Number(localStorage.getItem('nehus-3d-best')||0),spawn=0,objects=[],p1=0,p2=1;bestEl.textContent=best;function reset(){score=0;spawn=0;objects=[];p1=0;p2=1;scoreEl.textContent='0';statusEl.textContent='Игра началась — держитесь на свободной полосе.';running=true;paused=false;startBtn.textContent='Заново';last=performance.now();requestAnimationFrame(loop)}function move(d,p=1){if(!running)return;if(p===2)p2=Math.max(-1,Math.min(1,p2+d));else p1=Math.max(-1,Math.min(1,p1+d))}addEventListener('keydown',e=>{if(['ArrowLeft','a','A'].includes(e.key)){move(-1);e.preventDefault()}if(['ArrowRight','d','D'].includes(e.key)){move(1);e.preventDefault()}${secondPlayer ? "if(['j','J'].includes(e.key))move(-1,2);if(['l','L'].includes(e.key))move(1,2);" : ""}if(e.key==='p'||e.key==='P'){paused=!paused;if(!paused){last=performance.now();requestAnimationFrame(loop)}statusEl.textContent=paused?'Пауза':'Игра продолжается'}});document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();move(Number(b.dataset.move))}));startBtn.onclick=reset;function roadX(lane,y){const depth=(y-125)/415;return 480+lane*(32+depth*150)}function box(x,y,w,h,color){g.fillStyle='#0008';g.fillRect(x-w/2+7,y-h+9,w,h);g.fillStyle=color;g.fillRect(x-w/2,y-h,w,h);g.fillStyle='#fff7';g.fillRect(x-w*.3,y-h*.78,w*.6,h*.18)}function draw(){g.clearRect(0,0,c.width,c.height);const sky=g.createLinearGradient(0,0,0,540);sky.addColorStop(0,'${background}');sky.addColorStop(1,'#111827');g.fillStyle=sky;g.fillRect(0,0,960,540);g.fillStyle='#fff';for(let i=0;i<44;i++){g.globalAlpha=.25+(i%4)*.15;g.fillRect((i*137)%960,(i*73)%120,2,2)}g.globalAlpha=1;g.fillStyle='#141b27';g.beginPath();g.moveTo(405,125);g.lineTo(555,125);g.lineTo(900,540);g.lineTo(60,540);g.closePath();g.fill();g.strokeStyle=accent;g.lineWidth=3;g.stroke();for(let lane=-1;lane<=1;lane+=2){g.strokeStyle='#ffffff50';g.setLineDash([16,22]);g.beginPath();g.moveTo(480+lane*48,125);g.lineTo(480+lane*280,540);g.stroke()}g.setLineDash([]);objects.forEach(o=>{const y=125+Math.pow(1-o.z,2)*420,s=.22+(1-o.z)*1.35;box(roadX(o.lane,y),y,44*s,42*s,danger)});box(roadX(p1,505),505,64,58,accent);${secondPlayer ? "box(roadX(p2,445),445,56,50,'#ffdc69');" : ""}if(!running){g.fillStyle='#000b';g.fillRect(0,0,960,540);g.fillStyle='#fff';g.textAlign='center';g.font='800 38px Arial';g.fillText('Готовы?',480,245);g.font='18px Arial';g.fillStyle=accent;g.fillText('Нажмите «Старт»',480,282)}}function finish(){running=false;best=Math.max(best,Math.floor(score));localStorage.setItem('nehus-3d-best',String(best));bestEl.textContent=best;statusEl.textContent='Столкновение. Попробуйте ещё раз!';draw()}function loop(now){if(!running||paused)return;const dt=Math.min(32,now-last);last=now;spawn-=dt;if(spawn<=0){objects.push({lane:lanes[Math.floor(Math.random()*3)],z:1});spawn=620+Math.random()*560}objects.forEach(o=>o.z-=speed*dt);for(const o of objects){if(o.z<.12&&o.z>-.03&&(o.lane===p1${secondPlayer ? "||o.lane===p2" : ""}))return finish()}objects=objects.filter(o=>o.z>-.08);score+=dt*.018;scoreEl.textContent=String(Math.floor(score));draw();requestAnimationFrame(loop)}draw();</script></body></html>`;
  return { title, explanation: `Готовая ${options.dimension.toUpperCase()}-игра: выбранный стиль, сложность, управление, счёт, рекорд, пауза, перезапуск и адаптация для телефона.`, language: "html", code, filename: "nehus-3d-game.html", previewable: true, engine: "template" };
}

function gameTheme(options: DeveloperOptions) {
  const themes = { pixel: ["#8df06c", "#0b150b", "#ffdc69"], cartoon: ["#5ee7ff", "#111c3b", "#ff6b9b"], realistic: ["#d9e2e8", "#11151a", "#ff7043"], neon: ["#7df9ff", "#08091a", "#ff3df2"], minimal: ["#f5f5ef", "#111", "#b7f34a"] } as const;
  return themes[options.style];
}

function memoryGame(prompt: string, options: DeveloperOptions): DeveloperResult {
  const title = options.gameName || titleFromPrompt(prompt, "Головоломка памяти");
  const [accent, background, second] = gameTheme(options);
  const pairs = options.difficulty === "easy" ? 6 : options.difficulty === "hard" ? 10 : 8;
  const twoPlayers = options.players === "2";
  const code = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:20px;display:grid;place-items:center;background:radial-gradient(circle at 50% 0,${second}33,transparent 42%),${background};color:#fff;font-family:Arial,sans-serif}.game{width:min(760px,96vw);padding:22px;border:1px solid #ffffff25;border-radius:24px;background:#070a10d9;box-shadow:0 25px 90px #0009}.head,.bar{display:flex;align-items:center;justify-content:space-between;gap:12px}.head h1{margin:0;color:${accent};font-size:clamp(25px,5vw,42px)}.head p{margin:5px 0 0;color:#8d98a2;font-size:12px}.stats{display:flex;gap:7px;flex-wrap:wrap}.stats b{padding:9px 11px;border-radius:9px;background:#ffffff0d;color:${accent};font-size:11px}.board{margin:19px 0;display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.card{aspect-ratio:1;border:1px solid #ffffff25;border-radius:13px;background:linear-gradient(145deg,#202b38,#111720);color:transparent;font-size:clamp(24px,5vw,46px);cursor:pointer;transform-style:preserve-3d;transition:.22s}.card.open,.card.done{color:#fff;background:${second}55;border-color:${accent};transform:rotateY(180deg)}.card.done{opacity:.65}.bar button{padding:11px 17px;border:0;border-radius:10px;background:${accent};color:#071014;font-weight:900;cursor:pointer}#status{color:#9aa5ae;font-size:12px}@media(max-width:560px){.head,.bar{align-items:flex-start;flex-direction:column}.board{grid-template-columns:repeat(4,1fr)}.bar button{width:100%}}</style></head><body><main class="game"><div class="head"><div><h1>${escapeHtml(title)}</h1><p>Найдите все одинаковые пары${twoPlayers ? " · игроки ходят по очереди" : ""}</p></div><div class="stats"><b>Ходы: <span id="moves">0</span></b>${twoPlayers ? '<b>Игрок: <span id="turn">1</span></b><b>Счёт: <span id="scores">0 : 0</span></b>' : ""}</div></div><section class="board" id="board" aria-label="Игровое поле"></section><div class="bar"><span id="status">Откройте две карточки.</span><button id="restart">Новая игра</button></div></main><script>const icons=['🚀','🪐','⭐','👾','💎','🎯','🧩','🔥','🌙','⚡','🎮','🏆'],pairCount=${pairs},twoPlayers=${twoPlayers};let deck=[],open=[],matched=0,moves=0,turn=0,scores=[0,0],locked=false;const board=document.querySelector('#board'),status=document.querySelector('#status');function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}function drawStats(){document.querySelector('#moves').textContent=moves;const t=document.querySelector('#turn'),s=document.querySelector('#scores');if(t)t.textContent=turn+1;if(s)s.textContent=scores[0]+' : '+scores[1]}function start(){deck=shuffle([...icons.slice(0,pairCount),...icons.slice(0,pairCount)]);open=[];matched=0;moves=0;turn=0;scores=[0,0];locked=false;status.textContent='Откройте две карточки.';board.innerHTML='';deck.forEach((icon,index)=>{const b=document.createElement('button');b.className='card';b.textContent=icon;b.setAttribute('aria-label','Закрытая карточка');b.onclick=()=>flip(b,index);board.appendChild(b)});drawStats()}function flip(button,index){if(locked||button.classList.contains('open')||button.classList.contains('done'))return;button.classList.add('open');open.push({button,index});if(open.length<2)return;moves++;locked=true;const [a,b]=open;if(deck[a.index]===deck[b.index]){a.button.className='card done';b.button.className='card done';matched+=2;scores[turn]++;open=[];locked=false;status.textContent='Пара найдена!';if(matched===deck.length)status.textContent='Победа! Все пары найдены за '+moves+' ходов.'}else{status.textContent='Не совпало — следующий ход.';setTimeout(()=>{a.button.classList.remove('open');b.button.classList.remove('open');open=[];if(twoPlayers)turn=1-turn;locked=false;drawStats()},650)}drawStats()}document.querySelector('#restart').onclick=start;start();</script></body></html>`;
  return { title, explanation: `Рабочая головоломка на ${pairs} пар: выбранные сложность и стиль, ${twoPlayers ? "режим двух игроков, " : ""}ходы, победа и перезапуск.`, language: "html", code, filename: "memory-game.html", previewable: true, engine: "template" };
}

function strategyGame(prompt: string, options: DeveloperOptions): DeveloperResult {
  const title = options.gameName || titleFromPrompt(prompt, "Тактическая сетка");
  const [accent, background, second] = gameTheme(options);
  const twoPlayers = options.players === "2";
  const code = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle,${second}44,${background} 65%);color:#fff;font-family:Arial}.game{width:min(520px,94vw);padding:25px;border:1px solid #ffffff22;border-radius:25px;background:#080c12e8;text-align:center}h1{margin:0;color:${accent};font-size:clamp(28px,6vw,45px)}p{color:#8f9aa5}.score{display:flex;gap:8px;margin:18px 0}.score b{flex:1;padding:10px;border-radius:10px;background:#ffffff0d;color:${accent}}.board{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.cell{aspect-ratio:1;border:1px solid #ffffff25;border-radius:15px;background:#131a24;color:#fff;font-size:clamp(45px,14vw,80px);font-weight:900;cursor:pointer}.cell:hover{border-color:${accent}}#restart{width:100%;margin-top:16px;padding:13px;border:0;border-radius:11px;background:${accent};color:#071014;font-weight:900;cursor:pointer}#status{min-height:22px;color:#a3adb6}</style></head><body><main class="game"><h1>${escapeHtml(title)}</h1><p>${twoPlayers ? "Два игрока: X против O" : "Победите компьютер: соберите линию из трёх"}</p><div class="score"><b>X: <span id="sx">0</span></b><b>Ничьи: <span id="sd">0</span></b><b>O: <span id="so">0</span></b></div><div class="board" id="board"></div><p id="status"></p><button id="restart">Новый раунд</button></main><script>const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]],twoPlayers=${twoPlayers},level='${options.difficulty}';let cells=[],turn='X',over=false,score={X:0,O:0,D:0};const board=document.querySelector('#board'),status=document.querySelector('#status');function winner(){for(const line of wins){const[a,b,c]=line;if(cells[a]&&cells[a]===cells[b]&&cells[a]===cells[c])return cells[a]}return cells.every(Boolean)?'D':''}function draw(){board.innerHTML='';cells.forEach((value,index)=>{const b=document.createElement('button');b.className='cell';b.textContent=value;b.onclick=()=>play(index);board.appendChild(b)});status.textContent=over?'Раунд завершён.':turn==='X'?'Ход X':twoPlayers?'Ход O':'Компьютер думает…';document.querySelector('#sx').textContent=score.X;document.querySelector('#so').textContent=score.O;document.querySelector('#sd').textContent=score.D}function finish(result){if(!result)return false;over=true;score[result]++;status.textContent=result==='D'?'Ничья!':'Победил '+result+'!';draw();return true}function play(index){if(over||cells[index]||(!twoPlayers&&turn==='O'))return;cells[index]=turn;if(finish(winner()))return;turn=turn==='X'?'O':'X';draw();if(!twoPlayers&&turn==='O')setTimeout(ai,350)}function findMove(mark){for(const line of wins){const empty=line.filter(i=>!cells[i]);const filled=line.filter(i=>cells[i]===mark);if(empty.length===1&&filled.length===2)return empty[0]}return-1}function ai(){if(over)return;let move=level==='easy'?-1:findMove('O');if(move<0&&level==='hard')move=findMove('X');if(move<0&&level==='hard'&&!cells[4])move=4;const empty=cells.map((v,i)=>v?null:i).filter(v=>v!==null);if(move<0)move=empty[Math.floor(Math.random()*empty.length)];cells[move]='O';if(finish(winner()))return;turn='X';draw()}function start(){cells=Array(9).fill('');turn='X';over=false;draw()}document.querySelector('#restart').onclick=start;start();</script></body></html>`;
  return { title, explanation: `Законченная стратегия «три в ряд»: ${twoPlayers ? "два игрока" : "соперник-компьютер"}, выбранная сложность, счёт, победа, ничья и новые раунды.`, language: "html", code, filename: "strategy-game.html", previewable: true, engine: "template" };
}

function platformGame(prompt: string, options: DeveloperOptions): DeveloperResult {
  const title = options.gameName || titleFromPrompt(prompt, "Прыжок к звёздам");
  const [accent, background, danger] = gameTheme(options);
  const speed = options.difficulty === "easy" ? 3.6 : options.difficulty === "hard" ? 5.6 : 4.5;
  const secondPlayer = options.players === "2";
  const touch = options.controls !== "keyboard";
  const code = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:14px;display:grid;place-items:center;background:${background};color:#fff;font-family:Arial}.game{width:min(900px,98vw);padding:16px;border:1px solid #ffffff25;border-radius:22px;background:#090d14}.head,.bar{display:flex;align-items:center;justify-content:space-between;gap:12px}h1{margin:0;color:${accent}}p{margin:5px 0;color:#89949e;font-size:12px}.stats{color:${accent};font-weight:900}canvas{width:100%;aspect-ratio:16/9;margin:12px 0;display:block;border:1px solid #ffffff25;border-radius:14px;background:${background};touch-action:none}.bar button,.touch button{border:0;border-radius:10px;background:${accent};color:#071014;font-weight:900;cursor:pointer}.bar button{padding:11px 17px}.touch{display:${touch ? "flex" : "none"};justify-content:center;gap:8px}.touch button{width:74px;height:46px;font-size:20px}@media(max-width:600px){.head,.bar{align-items:flex-start;flex-direction:column}.bar button{width:100%}}</style></head><body><main class="game"><div class="head"><div><h1>${escapeHtml(title)}</h1><p>A/D или стрелки · пробел — прыжок${secondPlayer ? " · игрок 2: J/L/I" : ""}</p></div><div class="stats">Звёзды: <span id="score">0</span>/5</div></div><canvas id="game" width="880" height="495"></canvas><div class="touch"><button data-key="left">←</button><button data-key="jump">↑</button><button data-key="right">→</button></div><div class="bar"><span id="status">Соберите 5 звёзд и доберитесь до портала.</span><button id="start">Старт</button></div></main><script>const c=document.querySelector('#game'),g=c.getContext('2d'),keys={},accent='${accent}',danger='${danger}',moveSpeed=${speed},two=${secondPlayer};let running=false,score=0,players=[],stars=[],enemy={x:420,y:425,w:38,h:28,v:2.1},platforms=[{x:0,y:465,w:880,h:30},{x:130,y:380,w:170,h:18},{x:365,y:315,w:150,h:18},{x:585,y:250,w:155,h:18},{x:700,y:390,w:125,h:18}];function makePlayer(x,color,scheme){return{x,y:410,w:31,h:45,vx:0,vy:0,color,on:false,scheme}}function reset(){score=0;document.querySelector('#score').textContent=0;players=[makePlayer(40,accent,1)];if(two)players.push(makePlayer(82,'#ffdc69',2));stars=[{x:190,y:340},{x:420,y:275},{x:650,y:210},{x:750,y:350},{x:845,y:425}];enemy.x=420;running=true;document.querySelector('#status').textContent='Игра началась!';requestAnimationFrame(loop)}addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowLeft','ArrowRight',' ','a','d','w','j','l','i'].includes(e.key))e.preventDefault()});addEventListener('keyup',e=>keys[e.key]=false);document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;b.onpointerdown=e=>{e.preventDefault();keys[k]=true};b.onpointerup=b.onpointercancel=()=>keys[k]=false});function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}function updatePlayer(p){const left=p.scheme===1?(keys.ArrowLeft||keys.a||keys.left):keys.j,right=p.scheme===1?(keys.ArrowRight||keys.d||keys.right):keys.l,jump=p.scheme===1?(keys[' ']||keys.w||keys.ArrowUp||keys.jump):keys.i;p.vx=(right?moveSpeed:0)-(left?moveSpeed:0);if(jump&&p.on){p.vy=-11.7;p.on=false}p.vy+=.58;p.x+=p.vx;p.y+=p.vy;p.x=Math.max(0,Math.min(849,p.x));p.on=false;for(const f of platforms){if(p.vy>=0&&p.x+p.w>f.x&&p.x<f.x+f.w&&p.y+p.h>=f.y&&p.y+p.h<=f.y+p.vy+12){p.y=f.y-p.h;p.vy=0;p.on=true}}if(hit(p,enemy)){p.x=30;p.y=410;p.vy=0;document.querySelector('#status').textContent='Осторожно: противник вернул героя в начало.'}stars=stars.filter(s=>{if(Math.hypot(p.x+p.w/2-s.x,p.y+p.h/2-s.y)<34){score++;document.querySelector('#score').textContent=score;return false}return true});if(score>=5&&p.x>835){running=false;document.querySelector('#status').textContent='Победа! Все звёзды собраны, портал открыт.'}}function draw(){g.fillStyle='${background}';g.fillRect(0,0,880,495);g.fillStyle='#ffffff10';for(let i=0;i<45;i++)g.fillRect((i*97)%880,(i*53)%300,2,2);platforms.forEach(f=>{g.fillStyle='#ffffff24';g.fillRect(f.x,f.y,f.w,f.h);g.fillStyle=accent;g.fillRect(f.x,f.y,f.w,3)});stars.forEach(s=>{g.fillStyle='#ffdc69';g.beginPath();g.arc(s.x,s.y,9,0,7);g.fill()});g.fillStyle=danger;g.fillRect(enemy.x,enemy.y,enemy.w,enemy.h);players.forEach(p=>{g.fillStyle=p.color;g.fillRect(p.x,p.y,p.w,p.h);g.fillStyle='#071014';g.fillRect(p.x+7,p.y+10,5,5);g.fillRect(p.x+20,p.y+10,5,5)});g.strokeStyle=score>=5?accent:'#ffffff35';g.lineWidth=5;g.strokeRect(850,390,24,75)}function loop(){if(!running){draw();return}enemy.x+=enemy.v;if(enemy.x<300||enemy.x>580)enemy.v*=-1;players.forEach(updatePlayer);draw();requestAnimationFrame(loop)}document.querySelector('#start').onclick=reset;draw();</script></body></html>`;
  return { title, explanation: `Рабочий 2D-платформер: прыжки, платформы, звёзды, противник, цель, победа, ${secondPlayer ? "два игрока, " : ""}${touch ? "экранные кнопки и " : ""}перезапуск.`, language: "html", code, filename: "platform-game.html", previewable: true, engine: "template" };
}

function arenaGame(prompt: string, options: DeveloperOptions): DeveloperResult {
  const shooter = options.genre === "shooter";
  const title = options.gameName || titleFromPrompt(prompt, shooter ? "Неоновая арена" : "Охота за энергией");
  const [accent, background, danger] = gameTheme(options);
  const enemySpeed = options.difficulty === "easy" ? 1.3 : options.difficulty === "hard" ? 2.6 : 1.9;
  const secondPlayer = options.players === "2";
  const touch = options.controls !== "keyboard";
  const code = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:14px;display:grid;place-items:center;background:radial-gradient(circle,${danger}22,${background} 70%);color:#fff;font-family:Arial}.game{width:min(900px,98vw);padding:16px;border:1px solid #ffffff25;border-radius:22px;background:#080c12e8}.head,.bar{display:flex;align-items:center;justify-content:space-between;gap:12px}h1{margin:0;color:${accent}}p{margin:5px 0;color:#8b96a0;font-size:12px}.stats{display:flex;gap:7px}.stats b{padding:8px 10px;border-radius:9px;background:#ffffff0d;color:${accent};font-size:11px}canvas{width:100%;aspect-ratio:16/9;margin:12px 0;display:block;border:1px solid #ffffff25;border-radius:14px;background:${background};touch-action:none}.bar button,.touch button{border:0;border-radius:10px;background:${accent};color:#071014;font-weight:900}.bar button{padding:11px 17px}.touch{display:${touch ? "flex" : "none"};justify-content:center;gap:8px}.touch button{min-width:62px;height:44px;font-size:18px}@media(max-width:600px){.head,.bar{align-items:flex-start;flex-direction:column}.stats,.bar button{width:100%}.stats b{flex:1;text-align:center}}</style></head><body><main class="game"><div class="head"><div><h1>${escapeHtml(title)}</h1><p>Стрелки/WASD${shooter ? " · пробел — выстрел" : " · собирайте энергию"}${secondPlayer ? " · игрок 2: IJKL" : ""} · P — пауза</p></div><div class="stats"><b>Счёт: <span id="score">0</span>/12</b><b>Жизни: <span id="lives">3</span></b></div></div><canvas id="game" width="880" height="495"></canvas><div class="touch"><button data-k="ArrowLeft">←</button><button data-k="ArrowUp">↑</button><button data-k="ArrowDown">↓</button><button data-k="ArrowRight">→</button>${shooter ? '<button data-k=" ">●</button>' : ""}</div><div class="bar"><span id="status">Нажмите «Старт».</span><button id="start">Старт</button></div></main><script>const c=document.querySelector('#game'),g=c.getContext('2d'),keys={},accent='${accent}',danger='${danger}',speed=${enemySpeed},shooter=${shooter},two=${secondPlayer};let running=false,paused=false,score=0,lives=3,lastShot=0,players=[],enemies=[],items=[],shots=[];function player(x,y,color,scheme){return{x,y,w:30,h:30,color,scheme,inv:0}}function reset(){score=0;lives=3;enemies=[];items=[];shots=[];players=[player(420,410,accent,1)];if(two)players.push(player(465,410,'#ffdc69',2));running=true;paused=false;document.querySelector('#score').textContent=0;document.querySelector('#lives').textContent=3;document.querySelector('#status').textContent=shooter?'Уничтожьте 12 целей.':'Соберите 12 зарядов и избегайте противников.';requestAnimationFrame(loop)}addEventListener('keydown',e=>{keys[e.key]=true;if(e.key==='p'||e.key==='P'){paused=!paused;if(!paused)requestAnimationFrame(loop);document.querySelector('#status').textContent=paused?'Пауза':'Игра продолжается'}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault()});addEventListener('keyup',e=>keys[e.key]=false);document.querySelectorAll('[data-k]').forEach(b=>{const k=b.dataset.k;b.onpointerdown=e=>{e.preventDefault();keys[k]=true};b.onpointerup=b.onpointercancel=()=>keys[k]=false});function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}function updatePlayer(p){const s=4.3,left=p.scheme===1?(keys.ArrowLeft||keys.a):keys.j,right=p.scheme===1?(keys.ArrowRight||keys.d):keys.l,up=p.scheme===1?(keys.ArrowUp||keys.w):keys.i,down=p.scheme===1?(keys.ArrowDown||keys.s):keys.k;p.x=Math.max(0,Math.min(850,p.x+(right-left)*s));p.y=Math.max(0,Math.min(465,p.y+(down-up)*s));if(p.inv>0)p.inv--;if(shooter&&p.scheme===1&&keys[' ']&&performance.now()-lastShot>230){shots.push({x:p.x+13,y:p.y-8,w:5,h:12});lastShot=performance.now()}items=items.filter(item=>{if(hit(p,item)){score++;document.querySelector('#score').textContent=score;return false}return true});for(const enemy of enemies){if(hit(p,enemy)&&p.inv<=0){lives--;p.inv=80;document.querySelector('#lives').textContent=lives;if(lives<=0)finish(false)}}}function finish(win){running=false;document.querySelector('#status').textContent=win?'Победа! Цель выполнена.':'Игра окончена. Попробуйте ещё раз.';draw()}function draw(){g.fillStyle='${background}';g.fillRect(0,0,880,495);g.fillStyle='#ffffff12';for(let i=0;i<50;i++)g.fillRect((i*83)%880,(i*47)%495,2,2);items.forEach(o=>{g.fillStyle='#ffdc69';g.beginPath();g.arc(o.x+9,o.y+9,9,0,7);g.fill()});enemies.forEach(o=>{g.fillStyle=danger;g.fillRect(o.x,o.y,o.w,o.h)});shots.forEach(o=>{g.fillStyle=accent;g.fillRect(o.x,o.y,o.w,o.h)});players.forEach(p=>{g.globalAlpha=p.inv&&Math.floor(p.inv/5)%2 ? .35 : 1;g.fillStyle=p.color;g.fillRect(p.x,p.y,p.w,p.h);g.globalAlpha=1})}function loop(){if(!running||paused)return;if(Math.random()<.025)enemies.push({x:Math.random()*850,y:-30,w:28,h:28,v:speed+Math.random()*1.2});if(!shooter&&items.length<3&&Math.random()<.035)items.push({x:20+Math.random()*820,y:30+Math.random()*410,w:18,h:18});players.forEach(updatePlayer);enemies.forEach(o=>o.y+=o.v);shots.forEach(o=>o.y-=7);if(shooter){for(const shot of shots)for(const enemy of enemies)if(hit(shot,enemy)){shot.y=-99;enemy.y=600;score++;document.querySelector('#score').textContent=score}}enemies=enemies.filter(o=>o.y<530);shots=shots.filter(o=>o.y>-20);if(score>=12)return finish(true);draw();requestAnimationFrame(loop)}document.querySelector('#start').onclick=reset;draw();</script></body></html>`;
  return { title, explanation: `Рабочая ${shooter ? "игра-шутер" : "аркада"}: выбранные стиль и сложность, ${secondPlayer ? "два игрока, " : ""}цель, жизни, победа/проигрыш, пауза, управление и перезапуск.`, language: "html", code, filename: "arena-game.html", previewable: true, engine: "template" };
}

function codeTemplate(prompt: string, options: DeveloperOptions): DeveloperResult {
  if (/function.?calling|функци.*вызов|инструмент.*openai|openai.*инструмент/i.test(prompt)) {
    const code = `import json
from openai import OpenAI

client = OpenAI()

def search_items(query: str, limit: int) -> list[dict]:
    """Замените каталог своими данными или подключением к базе/API."""
    catalog = [
        {"title": "Практический Python", "topic": "python"},
        {"title": "Основы искусственного интеллекта", "topic": "ai"},
        {"title": "Проектирование веб-приложений", "topic": "web"},
    ]
    words = {word.lower() for word in query.split() if len(word) > 2}
    ranked = sorted(catalog, key=lambda item: sum(word in str(item).lower() for word in words), reverse=True)
    return ranked[:max(1, min(limit, 50))]

tools = [{
    "type": "function",
    "name": "search_items",
    "description": "Ищет подходящие элементы по запросу пользователя",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Что нужно найти"},
            "limit": {"type": "integer", "minimum": 1, "maximum": 50, "description": "Максимум результатов"}
        },
        "required": ["query", "limit"],
        "additionalProperties": False
    },
    "strict": True
}]

response = client.responses.create(
    model="gpt-5.4-mini",
    input="Найди 5 книг об искусственном интеллекте",
    tools=tools,
)

tool_outputs = []
for item in response.output:
    if item.type == "function_call" and item.name == "search_items":
        arguments = json.loads(item.arguments)
        result = search_items(arguments["query"], arguments["limit"])
        tool_outputs.append({
            "type": "function_call_output",
            "call_id": item.call_id,
            "output": json.dumps(result, ensure_ascii=False),
        })

if tool_outputs:
    final_response = client.responses.create(
        model="gpt-5.4-mini",
        previous_response_id=response.id,
        input=tool_outputs,
        tools=tools,
    )
    print(final_response.output_text)
else:
    print(response.output_text)
`;
    return { title: "OpenAI Function Calling", explanation: "Полный пример инструмента: строгая схема, выполнение функции, возврат результата модели и готовая точка запуска.", language: "python", code, filename: "openai_tool.py", previewable: false, engine: "template" };
  }
  if (options.stack === "html") {
    const title = escapeHtml(titleFromPrompt(prompt, "Текстовый инструмент"));
    const code = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:#080b10;color:#f7f8fa;font-family:Inter,Arial,sans-serif}.app{width:min(720px,100%);padding:28px;border:1px solid #ffffff1f;border-radius:22px;background:#111722}h1{margin-top:0}p{color:#9aa4b2}textarea{width:100%;min-height:190px;padding:14px;border:1px solid #ffffff26;border-radius:12px;background:#070a0f;color:#fff;resize:vertical}button{margin-top:12px;padding:12px 18px;border:0;border-radius:10px;background:#b7f34a;color:#0a1205;font-weight:900;cursor:pointer}.result{margin-top:16px;padding:14px;border-radius:12px;background:#ffffff0b;line-height:1.7}.error{color:#ff8d8d}</style></head><body><main class="app"><h1>${title}</h1><p>Введите текст — инструмент проверит данные и рассчитает статистику.</p><textarea id="input" placeholder="Введите текст"></textarea><button id="run" type="button">Выполнить</button><div class="result" id="result" role="status">Результат появится здесь.</div></main><script>const input=document.querySelector('#input'),result=document.querySelector('#result');document.querySelector('#run').onclick=()=>{const value=input.value.trim();if(!value){result.textContent='Введите непустой текст.';result.className='result error';input.focus();return}const words=value.split(/\\s+/).filter(Boolean);result.textContent='Символов: '+value.length+' · слов: '+words.length;result.className='result'};</script></body></html>`;
    return { title: titleFromPrompt(prompt, "Текстовый инструмент"), explanation: "Готовый браузерный инструмент в одном HTML-файле с проверкой ввода и рабочей кнопкой.", language: "html", code, filename: "tool.html", previewable: true, engine: "template" };
  }
  if (options.stack === "python" || /python|питон/i.test(prompt)) {
    const code = `"""Рабочий обработчик по запросу: ${prompt.replace(/"""/g, "").slice(0, 180)}"""

from dataclasses import dataclass
from collections import Counter

@dataclass
class Result:
    ok: bool
    message: str
    data: dict

def run_task(query: str) -> Result:
    """Проверяет ввод и возвращает полезную статистику по запросу."""
    query = query.strip()
    if not query:
        return Result(False, "Пустой запрос", {})
    words = [word.strip(".,!?;:\"'()[]{}").lower() for word in query.split()]
    words = [word for word in words if word]
    return Result(True, "Задача обработана", {
        "query": query,
        "characters": len(query),
        "words": len(words),
        "frequent_words": Counter(words).most_common(5),
    })

if __name__ == "__main__":
    user_query = input("Введите запрос: ")
    print(run_task(user_query))
`;
    return { title: "Python-инструмент", explanation: "Рабочий обработчик текста с проверкой ввода, статистикой, типизированным результатом и точкой запуска.", language: "python", code, filename: "main.py", previewable: false, engine: "template" };
  }
  if (options.stack === "typescript") {
    const code = `export type TaskResult = { ok: true; input: string; words: number; createdAt: string };

export async function runTask(input: string): Promise<TaskResult> {
  if (typeof input !== "string" || !input.trim()) throw new TypeError("input должен быть непустой строкой");
  const normalized = input.trim().replace(/\\s+/g, " ");
  return { ok: true, input: normalized, words: normalized.split(" ").length, createdAt: new Date().toISOString() };
}

runTask(${JSON.stringify(prompt.slice(0, 180))}).then(console.log).catch(console.error);
`;
    return { title: "TypeScript-инструмент", explanation: "Типизированная асинхронная функция с проверкой ввода и готовым примером запуска.", language: "typescript", code, filename: "main.ts", previewable: false, engine: "template" };
  }
  const code = `/** Задача: ${prompt.replace(/\*\//g, "").slice(0, 180)} */
export async function runTask(input) {
  if (typeof input !== "string" || !input.trim()) {
    throw new TypeError("input должен быть непустой строкой");
  }
  const normalized = input.trim().replace(/\\s+/g, " ");
  return {
    ok: true,
    input: normalized,
    words: normalized.split(" ").length,
    createdAt: new Date().toISOString(),
  };
}

runTask("тестовый запрос").then(console.log).catch(console.error);
`;
  return { title: "JavaScript-заготовка", explanation: "Безопасная асинхронная функция с валидацией, результатом и обработкой ошибок.", language: "javascript", code, filename: "main.js", previewable: false, engine: "template" };
}

function resolveMode(prompt: string, mode: Mode): Exclude<Mode, "auto"> {
  if (mode !== "auto") return mode;
  if (/мини.?игр|игр|game|змейк|кликер/i.test(prompt)) return "game";
  if (/сайт|лендинг|портфолио|страниц|html/i.test(prompt)) return "site";
  return "code";
}

function applyFeedbackOptions(options: DeveloperOptions, feedback: string): DeveloperOptions {
  if (!feedback) return options;
  const next: DeveloperOptions = { ...options, siteFeatures: [...options.siteFeatures] };
  if (/зел[её]н|lime/i.test(feedback)) next.siteColor = "lime";
  else if (/син|голуб|blue/i.test(feedback)) next.siteColor = "blue";
  else if (/фиолет|violet|purple/i.test(feedback)) next.siteColor = "violet";
  else if (/оранж|orange/i.test(feedback)) next.siteColor = "orange";
  if (/пиксел|pixel/i.test(feedback)) next.style = "pixel";
  else if (/мульт|cartoon/i.test(feedback)) next.style = "cartoon";
  else if (/реалист|realistic/i.test(feedback)) next.style = "realistic";
  else if (/неон|neon/i.test(feedback)) next.style = "neon";
  else if (/минимал|minimal/i.test(feedback)) next.style = "minimal";
  if (/преми|premium/i.test(feedback)) next.siteStyle = "premium";
  else if (/ярк|bright/i.test(feedback)) next.siteStyle = "bright";
  else if (/минимал|minimal/i.test(feedback)) next.siteStyle = "minimal";
  else if (/соврем|modern/i.test(feedback)) next.siteStyle = "modern";
  if (/магазин|каталог товар|shop|store/i.test(feedback)) next.siteType = "store";
  else if (/портфолио|portfolio/i.test(feedback)) next.siteType = "portfolio";
  else if (/блог|blog/i.test(feedback)) next.siteType = "blog";
  else if (/обуч|школ|курс|education/i.test(feedback)) next.siteType = "education";
  if (/3\s*d|тр[её]хмер/i.test(feedback)) next.dimension = "3d";
  else if (/2\s*d|двухмер/i.test(feedback)) next.dimension = "2d";
  if (/л[её]гк|easy/i.test(feedback)) next.difficulty = "easy";
  else if (/сложн|hard/i.test(feedback)) next.difficulty = "hard";
  if (/два игрок|2 игрок|two player/i.test(feedback)) next.players = "2";
  else if (/один игрок|1 игрок|single player/i.test(feedback)) next.players = "1";
  const genreRules: Array<[RegExp, DeveloperOptions["genre"]]> = [[/гонк|racing/i, "racing"], [/платформ|platform/i, "platformer"], [/головол|пазл|puzzle/i, "puzzle"], [/шут|стрел|shooter/i, "shooter"], [/стратег|strategy/i, "strategy"], [/аркад|arcade/i, "arcade"]];
  for (const [pattern, genre] of genreRules) if (pattern.test(feedback)) { next.genre = genre; break; }
  const featureRules: Array<[RegExp, DeveloperOptions["siteFeatures"][number]]> = [[/форм.{0,8}(связ|заяв|заказ)|contact/i, "contact"], [/цен|тариф|pricing/i, "pricing"], [/галер|фото|gallery/i, "gallery"], [/вопрос.{0,8}ответ|faq/i, "faq"]];
  for (const [pattern, feature] of featureRules) if (pattern.test(feedback) && !next.siteFeatures.includes(feature)) next.siteFeatures.push(feature);
  return next;
}

function fallbackGenerate(prompt: string, mode: Mode, options: DeveloperOptions) {
  const resolved = resolveMode(prompt, mode);
  if (resolved === "site") return siteTemplate(prompt, options);
  if (resolved === "game") {
    if (/змейк|snake/i.test(prompt)) return snakeGame(prompt, options);
    if (/кликер|clicker/i.test(prompt)) return clickerGame(prompt, options);
    if (options.dimension === "3d" || options.genre === "racing") return perspectiveGame(prompt, options);
    if (options.genre === "puzzle") return memoryGame(prompt, options);
    if (options.genre === "strategy") return strategyGame(prompt, options);
    if (options.genre === "platformer") return platformGame(prompt, options);
    return arenaGame(prompt, options);
  }
  return codeTemplate(prompt, options);
}

function delimiterIssue(code: string) {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  let quote = "", escaped = false, lineComment = false, blockComment = false;
  for (let index = 0; index < code.length; index++) {
    const char = code[index], next = code[index + 1];
    if (lineComment) { if (char === "\n") lineComment = false; continue; }
    if (blockComment) { if (char === "*" && next === "/") { blockComment = false; index++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
      if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") { lineComment = true; index++; continue; }
    if (char === "/" && next === "*") { blockComment = true; index++; continue; }
    if (char === "'" || char === '"' || char === "`") { quote = char; continue; }
    if (char === "(" || char === "[" || char === "{") stack.push(char);
    else if (pairs[char] && stack.pop() !== pairs[char]) return `Нарушен баланс символов возле «${char}»`;
  }
  if (quote) return "Обнаружена незакрытая строка";
  if (blockComment) return "Обнаружен незакрытый комментарий";
  if (stack.length) return `Не закрыт символ «${stack.at(-1)}»`;
  return "";
}

function analyzeCode(result: DeveloperResult) {
  const code = result.code.trim();
  const issues: string[] = [];
  const checks = ["структура", "баланс синтаксиса", "завершённость"];
  const isHtml = result.previewable || /html/i.test(result.language) || /\.html?$/i.test(result.filename) || /<!doctype html/i.test(code);
  if (code.length < 120) issues.push("Код слишком короткий для законченного решения");
  if (/\bTODO\b|\bFIXME\b|заглушк|добавьте здесь|замените тело|здесь вызовите/iu.test(code)) issues.push("В коде остались незавершённые места или подсказки вместо реализации");
  const balance = delimiterIssue(code);
  if (balance) issues.push(balance);
  if (isHtml) {
    checks.push("HTML-каркас", "интерактивные элементы");
    if (!/<!doctype html/i.test(code)) issues.push("Отсутствует декларация HTML-документа");
    if (!/<html[\s>]/i.test(code) || !/<body[\s>]/i.test(code) || !/<\/body>/i.test(code) || !/<\/html>/i.test(code)) issues.push("HTML-каркас не закрыт полностью");
    const scripts = code.match(/<script\b/gi)?.length || 0;
    const scriptEnds = code.match(/<\/script>/gi)?.length || 0;
    if (scripts !== scriptEnds) issues.push("Один из блоков script не закрыт");
    if (/href=["']#["']/i.test(code)) issues.push("Найдена пустая ссылка без действия");
    if (/<form\b/i.test(code) && !/addEventListener\s*\(\s*["']submit|onsubmit\s*=|action\s*=/i.test(code)) issues.push("Форма не имеет логики отправки");
    if (/<button\b/i.test(code) && !/onclick\s*=|\.onclick\s*=|addEventListener\s*\(/i.test(code) && !/<form\b/i.test(code)) issues.push("Кнопки не связаны с действиями");
  }
  return { issues: [...new Set(issues)], checks };
}

function applySafeRepairs(result: DeveloperResult) {
  let code = result.code.trim();
  const original = code;
  code = code.replace(/^```[a-z0-9_-]*\s*/i, "").replace(/\s*```$/, "").trim();
  const isHtml = result.previewable || /html/i.test(result.language) || /\.html?$/i.test(result.filename) || /<html[\s>]/i.test(code);
  if (isHtml) {
    if (!/<!doctype html/i.test(code)) code = `<!doctype html>\n${code}`;
    code = code.replace(/href=["']#["']/gi, 'href="#top"');
    if (/<body[\s>]/i.test(code) && !/<\/body>/i.test(code)) code += "\n</body>";
    if (/<html[\s>]/i.test(code) && !/<\/html>/i.test(code)) code += "\n</html>";
  }
  return { result: { ...result, code }, changed: code !== original };
}

async function validateAndRepair(result: DeveloperResult, prompt: string, mode: Exclude<Mode, "auto">, apiKey: string | undefined, language: SiteLanguage, options: DeveloperOptions) {
  let current = result;
  let attempts = 1;
  let repaired = false;
  const safe = applySafeRepairs(current);
  current = safe.result;
  repaired = safe.changed;
  let analysis = analyzeCode(current);
  while (analysis.issues.length > 0 && apiKey && attempts < 3) {
    try {
      current = await aiGenerate(prompt, mode, apiKey, language, options, `Исправь все найденные проверкой ошибки, сохрани назначение проекта и не добавляй заглушки: ${analysis.issues.join("; ")}`, current.code);
      attempts++;
      const next = applySafeRepairs(current);
      current = next.result;
      repaired = true;
      analysis = analyzeCode(current);
    } catch { break; }
  }
  current.validation = {
    status: analysis.issues.length ? "needs_review" : repaired ? "repaired" : "passed",
    attempts,
    checks: analysis.checks,
    issues: analysis.issues,
  };
  return current;
}

function localizeGeneratedCode(code: string, language: Exclude<SiteLanguage, "ru">) {
  const replacements: Array<[string, string]> = language === "tr" ? [
    ["Проверьте обязательные поля.", "Zorunlu alanları kontrol edin."], ["Введите непустой текст.", "Boş olmayan bir metin girin."],
    ["Результат появится здесь.", "Sonuç burada görünecek."], ["Игра окончена.", "Oyun bitti."], ["Попробуйте ещё раз.", "Tekrar deneyin."],
    ["Посмотреть возможности", "Özellikleri incele"], ["Отправить заявку", "Talep gönder"], ["О проекте", "Proje hakkında"],
    ["Связаться", "İletişime geç"], ["Контакты", "İletişim"], ["Галерея", "Galeri"], ["Цены", "Fiyatlar"],
    ["Введите текст", "Metin girin"], ["Выполнить", "Çalıştır"], ["Символов", "Karakter"], ["слов", "kelime"],
    ["Новая игра", "Yeni oyun"], ["Заново", "Yeniden"], ["Старт", "Başlat"], ["Счёт", "Puan"], ["Жизни", "Can"],
    ["Победа", "Kazandınız"], ["Пауза", "Duraklatıldı"], ["Меню", "Menü"], ["Игрок", "Oyuncu"],
  ] : [
    ["Проверьте обязательные поля.", "Check the required fields."], ["Введите непустой текст.", "Enter non-empty text."],
    ["Результат появится здесь.", "The result will appear here."], ["Игра окончена.", "Game over."], ["Попробуйте ещё раз.", "Try again."],
    ["Посмотреть возможности", "Explore features"], ["Отправить заявку", "Send request"], ["О проекте", "About"],
    ["Связаться", "Contact us"], ["Контакты", "Contacts"], ["Галерея", "Gallery"], ["Цены", "Pricing"],
    ["Введите текст", "Enter text"], ["Выполнить", "Run"], ["Символов", "Characters"], ["слов", "words"],
    ["Новая игра", "New game"], ["Заново", "Restart"], ["Старт", "Start"], ["Счёт", "Score"], ["Жизни", "Lives"],
    ["Победа", "Victory"], ["Пауза", "Paused"], ["Меню", "Menu"], ["Игрок", "Player"],
  ];
  let localized = code.replace(/<html lang=["']ru["']/gi, `<html lang="${language}"`);
  for (const [source, target] of replacements) localized = localized.split(source).join(target);
  return localized;
}

function localizeResult(result: DeveloperResult, language: SiteLanguage): DeveloperResult {
  if (language === "ru") return result;
  const titleMap: Record<string, { tr: string; en: string }> = {
    "Новый проект": { tr: "Yeni proje", en: "New project" }, "Моё портфолио": { tr: "Portföyüm", en: "My portfolio" },
    "Вкусное место": { tr: "Lezzetli mekân", en: "A delicious place" }, "Неоновая змейка": { tr: "Neon yılan", en: "Neon Snake" },
    "Космический кликер": { tr: "Uzay tıklayıcı", en: "Space Clicker" }, "Python-заготовка": { tr: "Python başlangıç kodu", en: "Python starter" },
    "JavaScript-заготовка": { tr: "JavaScript başlangıç kodu", en: "JavaScript starter" },
  };
  const localizedTitle = titleMap[result.title]?.[language] || result.title;
  const explanation = language === "tr"
    ? (result.previewable ? "Tek dosyada çalışan hazır proje. Kodu düzenleyebilir, hemen çalıştırabilir ve indirebilirsiniz." : "Girdi doğrulaması ve hata işleme içeren düzenlenebilir, hazır kod.")
    : (result.previewable ? "A working project in one file. You can edit the code, run it immediately, and download it." : "Ready-to-edit code with input validation and error handling.");
  return { ...result, title: localizedTitle, explanation, code: localizeGeneratedCode(result.code, language) };
}

async function aiGenerate(prompt: string, mode: Exclude<Mode, "auto">, apiKey: string, language: SiteLanguage, options: DeveloperOptions, feedback: string, existingCode: string): Promise<DeveloperResult> {
  const languageName = language === "tr" ? "Turkish" : language === "en" ? "English" : "Russian";
  const qualityRules = mode === "game"
    ? "Сделай законченную игру: понятная цель, старт и перезапуск, полноценный игровой цикл, очки или прогресс, победа/проигрыш, пауза, инструкции, выбранное управление, адаптация к телефону и устойчивое ограничение частоты кадров. Для 3D используй настоящий WebGL или качественную перспективную сцену, для 2D — Canvas. Все элементы обязаны работать."
    : mode === "site"
      ? "Сделай законченный адаптивный сайт: семантическая разметка, доступность, мобильная версия, рабочая навигация и кнопки, реальные состояния форм, валидация, сообщения об ошибке и успехе. Не оставляй пустые ссылки, TODO, заглушки и неработающие действия."
      : "Сделай законченный инструмент: точные типы или контракты, проверка входных данных, обработка ошибок, безопасные значения по умолчанию, ясная структура, пример запуска и отсутствие TODO или пропущенных частей.";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_CODING_MODEL || process.env.OPENAI_MODEL || "gpt-5.6",
      reasoning: { effort: "medium" },
      max_output_tokens: 16000,
      input: `${feedback ? `Переделай существующий проект, не заменяя его другим. Исходная задача: ${prompt}\nТочные изменения пользователя: ${feedback}\nСуществующий код:\n${existingCode}` : `Создай рабочее решение строго для запроса пользователя: ${prompt}`}\nРежим: ${mode}. ${configurationText(mode, options)}\n${qualityRules}\nСначала мысленно составь список всех требований пользователя и проверь, что каждое выполнено. Не подменяй выбранный жанр, тип сайта, название, стиль или действия кнопок более простым шаблоном. Если это сайт или мини-игра, верни полностью самодостаточный HTML в одном файле без сборки и без обязательных внешних зависимостей. Для другого кода строго соблюдай выбранную технологию или выбери наиболее надёжную. Пользовательский текст и explanation должны быть на языке ${languageName}. Ответь ТОЛЬКО JSON-объектом с полями title, explanation, language, code, filename, previewable. В explanation кратко перечисли реализованные требования. Код должен запускаться как есть, быть безопасным и не содержать Markdown-ограждений.`,
    }),
    signal: AbortSignal.timeout(50000),
  });
  if (!response.ok) throw new Error("AI coding unavailable");
  const data = await response.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const raw = (data.output || []).flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text || "").join("\n");
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("Invalid coding response");
  const parsed = JSON.parse(json) as Partial<DeveloperResult>;
  if (!parsed.code || !parsed.title || !parsed.language) throw new Error("Incomplete coding response");
  return { title: cleanLabel(parsed.title), explanation: String(parsed.explanation || "Готовое решение по вашему запросу."), language: cleanLabel(parsed.language), code: String(parsed.code), filename: cleanLabel(parsed.filename || "result.txt"), previewable: Boolean(parsed.previewable && /html/i.test(parsed.language)), engine: "ai" };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action === "analyze" ? "analyze" : "generate";
    const prompt = String(body.prompt || "").trim().slice(0, 2400);
    const mode = (["auto", "code", "game", "site"].includes(body.mode) ? body.mode : "auto") as Mode;
    const uiLanguage: SiteLanguage = body.language === "tr" || body.language === "en" ? body.language : "ru";
    const outputLanguage: SiteLanguage = body.outputLanguage === "tr" || body.outputLanguage === "en" ? body.outputLanguage : "ru";
    const feedback = String(body.feedback || "").trim().slice(0, 1200);
    const existingCode = String(body.existingCode || "").slice(0, 50000);
    const options = applyFeedbackOptions(readOptions(body.options), `${prompt}\n${feedback}`);
    const resolvedMode = resolveMode(`${prompt}\n${feedback}`, mode);
    const effectivePrompt = feedback ? `${prompt}\nИзменения: ${feedback}` : prompt;
    const apiKey = process.env.OPENAI_API_KEY;

    if (action === "analyze") {
      if (existingCode.trim().length < 20) return NextResponse.json({ error: uiLanguage === "tr" ? "Önce kontrol edilecek kodu oluşturun." : uiLanguage === "en" ? "Create the code to check first." : "Сначала создайте код для проверки." }, { status: 400 });
      const base: DeveloperResult = {
        title: cleanLabel(String(body.title || "Проверенный проект")),
        explanation: outputLanguage === "tr" ? "Kod yeniden analiz edildi ve bulunan sorunlar düzeltildi." : outputLanguage === "en" ? "The code was analyzed again and detected issues were repaired." : "Код повторно проанализирован, найденные проблемы исправлены.",
        language: cleanLabel(String(body.resultLanguage || options.stack || "text")),
        code: existingCode,
        filename: cleanLabel(String(body.filename || "result.txt")),
        previewable: Boolean(body.previewable),
        engine: body.engine === "ai" ? "ai" : "template",
      };
      return NextResponse.json(await validateAndRepair(base, prompt || base.title, resolvedMode, apiKey, outputLanguage, options));
    }

    if (prompt.length < 4) return NextResponse.json({ error: uiLanguage === "tr" ? "Görevi biraz daha ayrıntılı açıklayın." : uiLanguage === "en" ? "Please describe the task in a little more detail." : "Опишите задачу чуть подробнее." }, { status: 400 });
    if (apiKey) {
      try {
        const generated = await aiGenerate(prompt, resolvedMode, apiKey, outputLanguage, options, feedback, existingCode);
        return NextResponse.json(await validateAndRepair(generated, prompt, resolvedMode, apiKey, outputLanguage, options));
      }
      catch { /* Надёжный встроенный генератор ниже. */ }
    }
    const result = localizeResult(fallbackGenerate(effectivePrompt, resolvedMode, options), outputLanguage);
    if (feedback) result.explanation = `${result.explanation} Учтены изменения: ${feedback.slice(0, 180)}.`;
    return NextResponse.json(await validateAndRepair(result, prompt, resolvedMode, undefined, outputLanguage, options));
  } catch {
    return NextResponse.json({ error: "Не удалось создать код. Уточните язык, цель и желаемый результат." }, { status: 503 });
  }
}
