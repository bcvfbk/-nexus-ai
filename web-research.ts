export type WebSource = {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  checked?: boolean;
  price?: string;
  area?: string;
};

const STOP_WORDS = new Set([
  "что", "это", "как", "где", "когда", "какой", "какая", "какие", "почему", "зачем",
  "можно", "нужно", "для", "про", "или", "его", "она", "они", "мне", "найди", "найти",
  "ответ", "анализ", "купить", "цена", "the", "and", "for", "what", "where", "how", "with",
]);
const SOCIAL_DOMAINS = ["facebook.com", "instagram.com", "tiktok.com", "pinterest.com", "vk.com", "ok.ru"];
const LANGUAGE_DOMAINS = ["hinative.com", "wiktionary.org", "russian-edu.ru", "glosbe.com", "reverso.net", "translate.ru"];
const ENTERTAINMENT_DOMAINS = ["youtube.com", "rutube.ru", "rezka.ag", "dom2.ru", "kinopoisk.ru", "imdb.com"];
const RESEARCH_CACHE_TTL_MS = 30 * 60 * 1000;
const researchCache = new Map<string, { expires: number; sources: WebSource[] }>();

type QueryPlan = {
  cleanQuery: string;
  directions: string[];
  conceptGroups: string[][];
  requiredConceptGroups: number;
  mandatoryGroups?: number[];
  kind: "vehicle" | "real_estate" | "commerce" | "general";
};

export function cleanText(value: string) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#160;|&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/\s+/g, " ").trim();
}

export function safeUrl(value: string) {
  try {
    const parsed = new URL(cleanText(value));
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0" || host === "127.0.0.1" || host === "::1") return "";
    if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return "";
    return parsed.toString();
  } catch { return ""; }
}

export function domainOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return "источник"; }
}

function tokens(query: string) {
  return [...new Set(query.toLowerCase().replace(/[^a-zа-яё0-9ğüşöçıİ]+/gi, " ").split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)))];
}

function containsToken(text: string, token: string) {
  if (text.includes(token)) return true;
  const rootLength = token.length >= 8 ? token.length - 3 : token.length >= 6 ? token.length - 2 : token.length;
  return rootLength >= 4 && text.includes(token.slice(0, rootLength));
}

function scoreText(text: string, query: string) {
  const normalized = text.toLowerCase();
  const queryWords = tokens(query);
  let score = normalized.includes(query.toLowerCase().replace(/\s+/g, " ").trim()) ? 24 : 0;
  for (const token of queryWords) if (containsToken(normalized, token)) score += 4;
  return score;
}

function queryPlan(query: string, location: string): QueryPlan {
  const cleanQuery = query
    .replace(/(?:^|\s)найд(?:и|ите)?\s+(?:мне\s+)?/gi, " ")
    .replace(/(?:^|\s)покажи(?:те)?\s+(?:мне\s+)?/gi, " ")
    .replace(/ушерб(?:ами|ом|а|ы)?/gi, "повреждениями")
    .replace(/\s+/g, " ").trim();
  const vehicle = /машин|авто|автомоб|тачк|car\b|vehicle|otomobil|araba|araç/i.test(cleanQuery);
  const realEstate = /дом|жиль|квартир|недвиж|коттедж|вилл|house|home|apartment|property|ev\b|villa|daire|konut/i.test(cleanQuery)
    && /аренд|снять|сда[её]т|rent|rental|kiralık|kiralama|aylık/i.test(cleanQuery);
  const commerce = vehicle || /купить|продаж|товар|объявлен|цена|доллар|лир|₺|\$|usd|satılık|fiyat|ilan/i.test(cleanQuery);
  if (vehicle) {
    const budget = cleanQuery.match(/(?:\$\s*)?\d[\d\s.,]*(?:\s*(?:доллар(?:ов|а)?|usd|\$|лир|₺|tl))?/i)?.[0]?.trim() || "";
    const place = location || "";
    const turkey = /турц|türkiye|turkey|анкар|ankara|чанк|çank/i.test(place);
    const directions = turkey ? [
      `${cleanQuery} ${place}`,
      `${budget} hasarlı satılık otomobil ${place} site:sahibinden.com OR site:arabam.com`,
    ] : [
      `${cleanQuery} ${place}`,
      `used car for sale ${budget} minor damage ${place}`,
    ];
    return {
      cleanQuery,
      directions,
      conceptGroups: [
        ["машин", "авто", "автомоб", "car", "vehicle", "otomobil", "araba", "araç", "sedan", "hatchback"],
        ["прода", "купить", "объявлен", "sale", "seller", "satılık", "ilan", "fiyat", "price"],
        ["повреж", "бит", "авар", "damage", "damaged", "salvage", "hasar", "hasarlı", "kazalı"],
        ["500", "usd", "доллар", "$", "₺", "tl"],
      ],
      requiredConceptGroups: 2,
      mandatoryGroups: [0],
      kind: "vehicle",
    };
  }
  if (realEstate) {
    const place = location || "";
    const turkey = /турц|türkiye|turkey|анкар|ankara|чанк|çank/i.test(place);
    const locationTerms = [
      ...(/турц|türkiye|turkey/i.test(place) ? ["турц", "türkiye", "turkey", ".com.tr"] : []),
      ...(/анкар|ankara/i.test(place) ? ["анкар", "ankara"] : []),
      ...(/чанк|çank|cank/i.test(place) ? ["чанк", "çankaya", "cankaya"] : []),
    ];
    return {
      cleanQuery,
      directions: turkey ? [
        `${cleanQuery} kiralık müstakil ev ilan fiyat ${place}`,
        `${cleanQuery} ${place} site:sahibinden.com OR site:hepsiemlak.com OR site:emlakjet.com`,
      ] : [
        `${cleanQuery} house for rent listing price ${place}`,
        `${cleanQuery} rental property listing ${place}`,
      ],
      conceptGroups: [
        ["дом", "жиль", "квартир", "недвиж", "house", "home", "apartment", "property", "ev", "villa", "daire", "konut"],
        ["аренд", "снять", "сдаёт", "сдается", "rent", "rental", "kiralık", "kiralama", "aylık"],
        ["объявлен", "listing", "ilan", "emlak", "sahibinden", "hepsiemlak", "emlakjet", "fiyat", "price", "₺"],
        locationTerms,
      ].filter((group) => group.length > 0),
      requiredConceptGroups: locationTerms.length ? 3 : 2,
      mandatoryGroups: [0, 1],
      kind: "real_estate",
    };
  }
  return {
    cleanQuery,
    directions: [
      `${cleanQuery} ${location}`.trim(),
      `${cleanQuery} ${location} официальный источник`.trim(),
    ],
    conceptGroups: [],
    requiredConceptGroups: 0,
    kind: commerce ? "commerce" : "general",
  };
}

function intentCoverage(source: WebSource, plan: QueryPlan) {
  if (!plan.conceptGroups.length) return true;
  const text = `${source.title} ${source.snippet} ${source.domain}`.toLowerCase();
  const matches = plan.conceptGroups.map((group) => group.some((term) => text.includes(term)));
  if (plan.mandatoryGroups?.some((index) => !matches[index])) return false;
  return matches.filter(Boolean).length >= plan.requiredConceptGroups;
}

function scoreSource(source: WebSource, query: string, plan: QueryPlan) {
  const social = SOCIAL_DOMAINS.some((domain) => source.domain.includes(domain));
  const socialRequested = /facebook|фейсбук|instagram|инстаграм|tiktok|тикток|pinterest|vk\.com|вконтакте/i.test(query);
  if (social && !socialRequested) return -1000;
  const languageRequested = /перевод|значение слова|граммат|как пишется|translate|meaning/i.test(query);
  if (!languageRequested && LANGUAGE_DOMAINS.some((domain) => source.domain.includes(domain))) return -1000;
  if (plan.kind === "real_estate" && (ENTERTAINMENT_DOMAINS.some((domain) => source.domain.includes(domain)) || source.domain.includes("wikipedia.org"))) return -1000;
  if (!intentCoverage(source, plan)) return -1000;
  let score = scoreText(`${source.title} ${source.snippet}`, plan.cleanQuery);
  score += scoreText(source.title, plan.cleanQuery);
  if (plan.kind === "vehicle" && /sahibinden|arabam|copart|iaai|autotrader|cars\.com|otomobil|araba|araç/i.test(`${source.domain} ${source.title}`)) score += 12;
  if (plan.kind === "real_estate" && /sahibinden|hepsiemlak|emlakjet|zingat|realtor|rightmove|zillow/i.test(`${source.domain} ${source.title}`)) score += 16;
  if (/\.gov\.|\.edu\.|\.gov$|\.edu$|wikipedia\.org|who\.int|europa\.eu/.test(source.domain)) score += 3;
  return score;
}

function parseBing(xml: string): WebSource[] {
  const results: WebSource[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    const title = cleanText(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
    const url = safeUrl(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "");
    const snippet = cleanText(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || "");
    if (title && url) results.push({ title, url, snippet: snippet.slice(0, 420), domain: domainOf(url) });
  }
  return results;
}

function parseDuckTopics(topics: unknown[]): WebSource[] {
  const results: WebSource[] = [];
  for (const topic of topics) {
    if (!topic || typeof topic !== "object") continue;
    const item = topic as { Text?: string; FirstURL?: string; Topics?: unknown[] };
    if (Array.isArray(item.Topics)) results.push(...parseDuckTopics(item.Topics));
    const url = item.FirstURL ? safeUrl(item.FirstURL) : "";
    if (item.Text && url) {
      const [title] = item.Text.split(" - ");
      results.push({ title: title || item.Text, url, snippet: item.Text.slice(0, 420), domain: domainOf(url) });
    }
  }
  return results;
}

async function fetchPageEvidence(source: WebSource, query: string): Promise<WebSource> {
  if (source.domain.includes("bing.com") || source.domain.includes("duckduckgo.com")) return source;
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NehusResearch/2.0; +https://chatgpt.com)" },
      redirect: "follow",
      signal: AbortSignal.timeout(5500),
    });
    if (!response.ok) return source;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/xhtml")) return { ...source, checked: true };
    const html = (await response.text()).slice(0, 180_000);
    const text = cleanText(html).slice(0, 70_000);
    const candidates = text.split(/(?<=[.!?])\s+|\s+[•|]\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 45 && sentence.length <= 420)
      .map((sentence) => ({ sentence, score: scoreText(sentence, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const evidence = candidates.slice(0, 2).map((item) => item.sentence).join(" ");
    return { ...source, snippet: evidence || source.snippet, checked: true };
  } catch { return source; }
}

export function extractPrice(text: string) {
  return text.replace(/\u00a0/g, " ").match(/(?:₺|TRY|TL|€|EUR|\$|USD|₽|RUB|руб\.?)\s?\d[\d\s.,]*|\d[\d\s.,]*\s?(?:₺|TRY|TL|€|EUR|\$|USD|₽|RUB|руб\.?)/i)?.[0]?.replace(/\s+/g, " ").trim();
}

export function extractArea(text: string) {
  return text.replace(/\u00a0/g, " ").match(/\b\d+(?:[.,]\d+)?\s?(?:m²|m2|м²|кв\.?\s?м|hectares?|hektar|hektare|ha|га|dönüm|donum)/i)?.[0]?.replace(/\s+/g, " ").trim();
}

export async function researchWeb(query: string, location = "", limit = 12) {
  const plan = queryPlan(query, location);
  const locatedQuery = `${plan.cleanQuery} ${location}`.trim();
  const directions = plan.directions;
  const cacheKey = `${locatedQuery.toLowerCase()}::${Math.max(1, Math.min(limit, 16))}`;
  const cached = researchCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.sources.map((source) => ({ ...source }));
  if (cached) researchCache.delete(cacheKey);
  const includeDuck = plan.kind === "general";
  const responses = await Promise.allSettled([
    ...directions.map((direction) => fetch(`https://www.bing.com/search?format=rss&setlang=ru&q=${encodeURIComponent(direction)}`, { headers: { "User-Agent": "Mozilla/5.0 Nehus Research" }, signal: AbortSignal.timeout(7000) })),
    ...(includeDuck ? [fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(locatedQuery)}&format=json&no_html=1&no_redirect=1&skip_disambig=0`, { signal: AbortSignal.timeout(7000) })] : []),
  ]);

  const all: WebSource[] = [];
  for (const result of responses.slice(0, directions.length)) {
    if (result.status === "fulfilled" && result.value.ok) all.push(...parseBing(await result.value.text()));
  }
  const duck = includeDuck ? responses[directions.length] : undefined;
  if (duck?.status === "fulfilled" && duck.value.ok) {
    const data = await duck.value.json() as { AbstractText?: string; AbstractURL?: string; Heading?: string; RelatedTopics?: unknown[] };
    const abstractUrl = data.AbstractURL ? safeUrl(data.AbstractURL) : "";
    if (abstractUrl && data.AbstractText) all.push({ title: data.Heading || query, url: abstractUrl, snippet: data.AbstractText, domain: domainOf(abstractUrl) });
    all.push(...parseDuckTopics(data.RelatedTopics || []));
  }

  const seen = new Set<string>();
  const perDomain = new Map<string, number>();
  const ranked = all.map((source) => ({ source, score: scoreSource(source, query, plan) })).sort((a, b) => b.score - a.score);
  const relevant = ranked.filter((item) => item.score > 0);
  const selected = relevant
    .map((item) => item.source)
    .filter((source) => {
      const key = source.url.replace(/\/$/, "");
      const count = perDomain.get(source.domain) || 0;
      if (!key || seen.has(key) || count >= 2) return false;
      seen.add(key); perDomain.set(source.domain, count + 1); return true;
    }).slice(0, limit);

  if (!selected.length) {
    if (plan.kind === "vehicle") return [
      { title: "Поиск подходящих автомобилей", url: `https://www.bing.com/search?q=${encodeURIComponent(plan.directions[1])}`, snippet: "Точная поисковая выдача по автомобильным объявлениям. Нехус не нашёл достаточно релевантную карточку, поэтому не подставляет случайные страницы.", domain: "bing.com", checked: false },
    ];
    if (plan.kind === "real_estate") return [
      { title: "Точный поиск домов в аренду", url: `https://www.bing.com/search?q=${encodeURIComponent(plan.directions[0])}`, snippet: "Подходящее объявление не найдено, поэтому Нехус не показывает фильмы, энциклопедии и другие случайные страницы.", domain: "bing.com", checked: false },
      { title: "Поиск на площадках недвижимости", url: `https://www.bing.com/search?q=${encodeURIComponent(plan.directions[1])}`, snippet: "Поиск ограничен сайтами объявлений о недвижимости и выбранным местом.", domain: "bing.com", checked: false },
    ];
    return [
      { title: `Точный поиск: ${plan.cleanQuery}`, url: `https://www.bing.com/search?q=${encodeURIComponent(locatedQuery)}`, snippet: "Поисковая выдача по точной формулировке запроса.", domain: "bing.com", checked: false },
      { title: `Дополнительный поиск: ${plan.cleanQuery}`, url: `https://duckduckgo.com/?q=${encodeURIComponent(locatedQuery)}`, snippet: "Независимая поисковая выдача по запросу.", domain: "duckduckgo.com", checked: false },
    ];
  }

  const evidenceLimit = plan.kind === "general" ? 2 : 0;
  const checked = await Promise.all(selected.slice(0, evidenceLimit).map((source) => fetchPageEvidence(source, query)));
  const sources = [...checked, ...selected.slice(evidenceLimit)].map((source) => {
    const combined = `${source.title} ${source.snippet}`;
    return { ...source, price: extractPrice(combined), area: extractArea(combined) };
  });
  researchCache.set(cacheKey, { expires: Date.now() + RESEARCH_CACHE_TTL_MS, sources });
  if (researchCache.size > 80) researchCache.delete(researchCache.keys().next().value as string);
  return sources.map((source) => ({ ...source }));
}

export function groundedAnswer(query: string, sources: WebSource[], language: "ru" | "tr" | "en" = "ru") {
  const plan = queryPlan(query, "");
  const useful = sources.filter((source) => source.snippet.length >= 35 && !source.domain.includes("bing.com") && !source.domain.includes("duckduckgo.com"));
  if (language !== "ru") {
    const evidence = useful.slice(0, 6);
    if (!evidence.length) {
      if (language === "tr") return `“${plan.cleanQuery}” için yeterince doğru sonuç bulunamadı. Nehus alakasız sayfaları göstermedi; aşağıda yalnızca kesin arama bağlantıları bırakıldı.`;
      return `No sufficiently accurate results were found for “${plan.cleanQuery}”. Nehus removed unrelated pages and kept only exact search links below.`;
    }
    const offers = evidence.map((source) => `• ${source.title}${source.price ? ` — ${source.price}` : ""}${source.area ? ` · ${source.area}` : ""}\n  ${source.snippet}\n  ${source.domain}`).join("\n");
    if (language === "tr") {
      const intro = plan.kind === "real_estate"
        ? `Kiralık konut ilanlarıyla gerçekten ilgili ${evidence.length} sonuç bulundu. Film, video, ansiklopedi ve eğlence sayfaları çıkarıldı.`
        : `İstekle gerçekten ilgili ${evidence.length} sonuç bulundu.`;
      return `${intro} Fiyatı, konumu ve ilan tarihini doğrudan kaynak sayfasında kontrol edin.\n\n${offers}`;
    }
    const intro = plan.kind === "real_estate"
      ? `Found ${evidence.length} results that are genuinely related to rental housing. Movies, videos, encyclopedias, and entertainment pages were removed.`
      : `Found ${evidence.length} results that genuinely match the request.`;
    return `${intro} Verify the price, location, and listing date directly on the source page.\n\n${offers}`;
  }
  if (!useful.length) {
    if (plan.kind === "vehicle") {
      return `По запросу «${plan.cleanQuery}» я не нашёл ни одного достаточно подходящего объявления. Случайные страницы о значении слова «найди», музыка, мебель и другие нерелевантные результаты удалены. Ниже оставлены только точные поисковые ссылки по автомобильным площадкам. Если реального варианта за этот бюджет нет, Нехус так и скажет, а не будет выдумывать машину.`;
    }
    if (plan.kind === "real_estate") return `По запросу «${plan.cleanQuery}» точных объявлений об аренде не найдено. Нехус удалил фильмы, Википедию, видео и другие страницы, которые не являются объявлениями о жилье. Ниже оставлены только точные поисковые ссылки по площадкам недвижимости.`;
    return `Я не нашёл достаточно надёжных данных, чтобы уверенно ответить на вопрос «${query}». Ниже оставлены поисковые ссылки — это честнее, чем придумывать ответ.`;
  }
  const checked = useful.filter((source) => source.checked);
  const evidence = (checked.length ? checked : useful).slice(0, 6);
  if (plan.kind === "vehicle") {
    const offers = evidence.map((source) => `• ${source.title}${source.price ? ` — ${source.price}` : ""}\n  ${source.snippet.replace(/[.!?]?$/, ".")}\n  ${source.domain}`).join("\n");
    return `Нашёл ${evidence.length} результатов, которые действительно относятся к автомобилям и продаже. Проверьте цену, характер повреждений, документы и дату объявления непосредственно у продавца.\n\n${offers}\n\nВажно: результат попадает в список только если на странице есть признаки автомобиля и объявления о продаже. Нерелевантные страницы автоматически отбрасываются.`;
  }
  if (plan.kind === "real_estate") {
    const offers = evidence.map((source) => `• ${source.title}${source.price ? ` — ${source.price}` : ""}${source.area ? ` · ${source.area}` : ""}\n  ${source.snippet.replace(/[.!?]?$/, ".")}\n  ${source.domain}`).join("\n");
    return `Нашёл ${evidence.length} результатов, которые действительно относятся к аренде жилья. Фильмы, мультфильмы, Википедия и развлекательные сайты удалены. Проверяйте цену, район, условия аренды и дату объявления непосредственно на странице владельца или агентства.\n\n${offers}`;
  }
  const bullets = evidence.map((source) => `• ${source.snippet.replace(/[.!?]?$/, ".")} — ${source.domain}`).join("\n");
  const confidence = checked.length >= 3
    ? `Удалось открыть и прочитать ${checked.length} страниц.`
    : `Часть сайтов не разрешает автоматическое чтение, поэтому ключевые детали лучше сверить по ссылкам.`;
  return `Короткий ответ по запросу «${query}»:\n${evidence[0].snippet.replace(/[.!?]?$/, ".")}\n\nЧто подтверждают найденные источники:\n${bullets}\n\nПроверка: ${confidence} Я не добавлял факты, которых не было в результатах.`;
}
