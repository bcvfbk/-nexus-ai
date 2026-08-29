import { NextRequest, NextResponse } from "next/server";

type RawOffer = { title: string; url: string; details: string; domain: string };
type Offer = RawOffer & { price: string; area?: string; marketplace: string; relevance?: number };
type ProductPayload = {
  offers: Offer[];
  summary: string;
  country: string;
  searchedAt: string;
  economical: true;
};
type SiteLanguage = "ru" | "tr" | "en";

const PRODUCT_STOP_WORDS = new Set([
  "купить", "найти", "найди", "покажи", "показать", "цена", "для", "или", "мне", "нужен",
  "нужна", "нужно", "хочу", "такой", "такая", "такое", "прям", "пожалуйста", "дешево", "дешевый",
  "the", "and", "for", "buy", "price", "find", "show", "please", "want", "need",
]);
const BLOCKED_DOMAINS = [
  "facebook.com", "instagram.com", "tiktok.com", "pinterest.com", "vk.com", "ok.ru", "youtube.com",
  "hinative.com", "wiktionary.org", "russian-edu.ru", "glosbe.com", "reverso.net", "translate.ru",
];
const MARKETPLACE_DOMAINS: Array<[string, string]> = [
  ["sahibinden", "Sahibinden"], ["hepsiemlak", "Hepsiemlak"], ["emlakjet", "Emlakjet"],
  ["zingat", "Zingat"], ["arabam", "Arabam"], ["trendyol", "Trendyol"],
  ["hepsiburada", "Hepsiburada"], ["amazon", "Amazon"], ["n11", "N11"],
  ["mediamarkt", "MediaMarkt"], ["teknosa", "Teknosa"], ["vatanbilgisayar", "Vatan Bilgisayar"],
  ["ebay", "eBay"], ["aliexpress", "AliExpress"], ["walmart", "Walmart"], ["etsy", "Etsy"],
  ["ozon", "Ozon"], ["wildberries", "Wildberries"], ["autotrader", "AutoTrader"],
  ["cars.com", "Cars.com"], ["copart", "Copart"], ["iaai", "IAA"],
];
const SALE_TERMS = /цена|купить|продаж|объявлен|товар|магазин|в наличии|₺|\btl\b|\btry\b|\busd\b|\beur\b|\$|€|₽|fiyat|satılık|satın al|ilan|ürün|stok|sepet|price|sale|seller|listing|shop|store/i;
const VEHICLE_TERMS = /машин|авто|автомоб|тачк|car\b|vehicle|otomobil|araba|araç|sedan|hatchback|suv|van\b/i;
const PROPERTY_TERMS = /дом|жиль|квартир|недвиж|коттедж|вилл|house|home|apartment|property|ev\b|villa|daire|konut/i;
const RENT_TERMS = /аренд|снять|сда[её]т|rent|rental|kiralık|kiralama|aylık/i;
const DAMAGE_TERMS = /повреж|бит|авар|damage|damaged|salvage|hasar|hasarlı|kazalı/i;
const PRODUCT_CACHE_TTL_MS = 30 * 60 * 1000;
const productCache = new Map<string, { expires: number; payload: ProductPayload }>();

function cleanText(value: string) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#160;|&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/\s+/g, " ").trim();
}

function safeUrl(value: string) {
  try {
    const parsed = new URL(cleanText(value));
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0" || host === "127.0.0.1" || host === "::1") return "";
    if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return "";
    return parsed.toString();
  } catch { return ""; }
}

function domainOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return "магазин"; }
}

function normalizeQuery(query: string) {
  return query
    .replace(/(?:^|\s)найд(?:и|ите)?\s+(?:мне\s+)?/gi, " ")
    .replace(/(?:^|\s)покажи(?:те)?\s+(?:мне\s+)?/gi, " ")
    .replace(/ушерб(?:ами|ом|а|ы)?/gi, "повреждениями")
    .replace(/\s+/g, " ").trim();
}

function productTokens(query: string) {
  return [...new Set(query.toLowerCase().replace(/[^a-zа-яё0-9ğüşöçıİ]+/gi, " ").split(/\s+/)
    .filter((word) => word.length >= 2 && !PRODUCT_STOP_WORDS.has(word)))];
}

function includesProductToken(text: string, token: string) {
  if (text.includes(token)) return true;
  const rootLength = token.length >= 8 ? token.length - 3 : token.length >= 6 ? token.length - 2 : token.length;
  return rootLength >= 4 && text.includes(token.slice(0, rootLength));
}

function marketplaceFrom(domain: string) {
  return MARKETPLACE_DOMAINS.find(([needle]) => domain.includes(needle))?.[1]
    || domain.split(".")[0].replace(/^./, (letter) => letter.toUpperCase());
}

function extractPrice(text: string) {
  const normalized = text.replace(/\u00a0/g, " ");
  const patterns = [
    /(?:₺|TRY|TL)\s?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?/i,
    /\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?\s?(?:₺|TRY|TL)/i,
    /(?:€|EUR)\s?\d{1,6}(?:[.,]\d{1,2})?/i,
    /\d{1,6}(?:[.,]\d{1,2})?\s?(?:€|EUR)/i,
    /(?:\$|USD)\s?\d{1,7}(?:[.,]\d{1,2})?/i,
    /\d{1,7}(?:[.,]\d{1,2})?\s?(?:\$|USD)/i,
    /\d{1,3}(?:[\s.]\d{3})*(?:,\d{1,2})?\s?(?:₽|руб\.?)/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern)?.[0];
    if (match) return match.replace(/\s+/g, " ").trim();
  }
  return "Цена на сайте";
}

function extractArea(text: string) {
  const match = text.replace(/\u00a0/g, " ").match(/\b\d+(?:[.,]\d+)?\s?(?:m²|m2|м²|кв\.?\s?м|hectares?|hektar|hektare|ha|га|dönüm|donum)/i)?.[0];
  return match?.replace(/\s+/g, " ").trim();
}

function parseRss(xml: string): RawOffer[] {
  const offers: RawOffer[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    const title = cleanText(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
    const url = safeUrl(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "");
    const details = cleanText(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || "");
    if (title && url) offers.push({ title, url, details: details.slice(0, 420), domain: domainOf(url) });
  }
  return offers;
}

type SearchKind = "vehicle" | "rental" | "product";

function offerScore(offer: RawOffer, cleanQuery: string, kind: SearchKind) {
  if (BLOCKED_DOMAINS.some((domain) => offer.domain.includes(domain))) return -1000;
  const text = `${offer.title} ${offer.details} ${offer.domain}`.toLowerCase();
  const tokens = productTokens(cleanQuery);
  const matched = tokens.filter((token) => includesProductToken(text, token));
  const knownMarketplace = MARKETPLACE_DOMAINS.some(([domain]) => offer.domain.includes(domain));
  const commerceSignal = knownMarketplace || SALE_TERMS.test(text) || extractPrice(text) !== "Цена на сайте";
  if (!commerceSignal) return -1000;
  if (kind === "vehicle" && !VEHICLE_TERMS.test(text)) return -1000;
  if (kind === "rental" && (!PROPERTY_TERMS.test(text) || !RENT_TERMS.test(text))) return -1000;
  const requiredMatches = kind === "product" ? Math.min(2, Math.max(1, Math.ceil(tokens.length / 2))) : 1;
  if (tokens.length && matched.length < requiredMatches) return -1000;

  let score = matched.length * 8;
  if (text.includes(cleanQuery.toLowerCase())) score += 24;
  if (knownMarketplace) score += 10;
  if (extractPrice(text) !== "Цена на сайте") score += 6;
  if (kind === "vehicle" && DAMAGE_TERMS.test(cleanQuery) && DAMAGE_TERMS.test(text)) score += 8;
  if (kind === "rental" && /sahibinden|hepsiemlak|emlakjet|zingat/i.test(offer.domain)) score += 12;
  return score;
}

function searchPlan(cleanQuery: string, location: string) {
  const vehicle = VEHICLE_TERMS.test(cleanQuery);
  const rental = PROPERTY_TERMS.test(cleanQuery) && RENT_TERMS.test(cleanQuery);
  const turkey = /турц|türkiye|turkey|анкар|ankara|чанк|çank/i.test(location);
  if (vehicle && turkey) return {
    kind: "vehicle" as const,
    primary: `${cleanQuery} satılık otomobil ilan fiyat ${location}`,
    fallback: `${cleanQuery} ${location} site:sahibinden.com OR site:arabam.com`,
  };
  if (vehicle) return {
    kind: "vehicle" as const,
    primary: `${cleanQuery} used car for sale price ${location}`,
    fallback: `${cleanQuery} vehicle listing seller ${location}`,
  };
  if (rental && turkey) return {
    kind: "rental" as const,
    primary: `${cleanQuery} kiralık müstakil ev ilan fiyat ${location}`,
    fallback: `${cleanQuery} ${location} site:sahibinden.com OR site:hepsiemlak.com OR site:emlakjet.com`,
  };
  if (rental) return {
    kind: "rental" as const,
    primary: `${cleanQuery} house for rent listing price ${location}`,
    fallback: `${cleanQuery} rental property listing ${location}`,
  };
  if (turkey) return {
    kind: "product" as const,
    primary: `${cleanQuery} fiyat satın al ${location}`,
    fallback: `${cleanQuery} ${location} site:trendyol.com OR site:hepsiburada.com OR site:n11.com`,
  };
  return {
    kind: "product" as const,
    primary: `${cleanQuery} купить цена ${location}`,
    fallback: `${cleanQuery} online shop price ${location}`,
  };
}

async function runSearch(search: string) {
  const response = await fetch(`https://www.bing.com/search?format=rss&setlang=ru&q=${encodeURIComponent(search)}`, {
    headers: { "User-Agent": "Mozilla/5.0 Nehus Economical Product Finder" },
    signal: AbortSignal.timeout(6500),
  });
  return response.ok ? parseRss(await response.text()) : [];
}

function selectOffers(raw: RawOffer[], cleanQuery: string, kind: SearchKind) {
  const seen = new Set<string>();
  return raw
    .map((offer) => ({ ...offer, relevance: offerScore(offer, cleanQuery, kind) }))
    .filter((offer) => offer.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .filter((offer) => {
      const key = offer.url.replace(/\/$/, "");
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    })
    .map((offer) => ({
      title: offer.title,
      url: offer.url,
      details: offer.details,
      domain: offer.domain,
      price: extractPrice(`${offer.title} ${offer.details}`),
      area: extractArea(`${offer.title} ${offer.details}`),
      marketplace: marketplaceFrom(offer.domain),
      relevance: offer.relevance,
    }))
    .sort((a, b) => b.relevance - a.relevance || Number(a.price === "Цена на сайте") - Number(b.price === "Цена на сайте"))
    .slice(0, 10)
    .map((offer) => ({
      title: offer.title, url: offer.url, details: offer.details, domain: offer.domain,
      price: offer.price, area: offer.area, marketplace: offer.marketplace,
    }));
}

function json(payload: ProductPayload) {
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=900" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = String(body.query || "").trim().slice(0, 220);
    const cleanQuery = normalizeQuery(query);
    const language: SiteLanguage = body.language === "tr" || body.language === "en" ? body.language : "ru";
    const country = String(body.country || "Турция").trim().slice(0, 80) || "Турция";
    const city = String(body.city || "").trim().slice(0, 100);
    const district = String(body.district || "").trim().slice(0, 100);
    const location = [country, city, district].filter(Boolean).join(", ");
    if (cleanQuery.length < 2) return NextResponse.json({ error: "Введите точное название товара или модель." }, { status: 400 });

    const cacheKey = `${language}::${cleanQuery.toLowerCase()}::${location.toLowerCase()}`;
    const cached = productCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return json(cached.payload);
    if (cached) productCache.delete(cacheKey);

    const plan = searchPlan(cleanQuery, location);
    let raw = await runSearch(plan.primary);
    let offers = selectOffers(raw, cleanQuery, plan.kind);
    if (!offers.length) {
      raw = await runSearch(plan.fallback);
      offers = selectOffers(raw, cleanQuery, plan.kind);
    }

    let summary: string;
    if (offers.length) {
      const withPrices = offers.filter((offer) => offer.price !== "Цена на сайте").length;
      const withAreas = offers.filter((offer) => offer.area).length;
      summary = language === "tr"
        ? `“${location}” için ${offers.length} doğru ilan bulundu. ${withPrices} sonuçta fiyat, ${withAreas} sonuçta alan bilgisi var. Alakasız sayfalar, sosyal ağlar ve sözlükler kaldırıldı.`
        : language === "en"
          ? `Found ${offers.length} accurate offers for “${location}”. ${withPrices} show a price and ${withAreas} show an area. Unrelated pages, social networks, and dictionaries were removed.`
          : `Найдено ${offers.length} точных предложений для места «${location}». Цена видна в ${withPrices}, площадь — в ${withAreas}. Случайные страницы, соцсети и словари удалены; отсутствующие данные Нехус не выдумывает.`;
      if (language !== "ru") offers = offers.map((offer) => ({
        ...offer,
        price: offer.price === "Цена на сайте" ? (language === "tr" ? "Fiyat sitede" : "Price on site") : offer.price,
      }));
    } else {
      const exactTitle = language === "tr" ? `Kesin arama: ${cleanQuery}` : language === "en" ? `Exact search: ${cleanQuery}` : `Точный поиск: ${cleanQuery}`;
      const extraTitle = language === "tr" ? `Ek arama: ${cleanQuery}` : language === "en" ? `Additional search: ${cleanQuery}` : `Дополнительный поиск: ${cleanQuery}`;
      const priceLabel = language === "tr" ? "Sonuçlardaki fiyat" : language === "en" ? "Price in results" : "Цена в результатах";
      offers = [
        { title: exactTitle, url: `https://www.bing.com/search?q=${encodeURIComponent(plan.primary)}`, details: language === "tr" ? "Doğru bir ürün kartı bulunamadığı için Nehus rastgele sayfalar göstermedi." : language === "en" ? "No accurate product card was found, so Nehus did not show random pages." : "Подходящая карточка товара не найдена, поэтому Нехус не показывает случайные страницы.", domain: "bing.com", price: priceLabel, marketplace: "Bing" },
        { title: extraTitle, url: `https://duckduckgo.com/?q=${encodeURIComponent(plan.fallback)}`, details: language === "tr" ? "Tam ürün ve seçilen konum için bağımsız arama." : language === "en" ? "Independent search for the exact item and selected location." : "Независимая поисковая выдача по точному товару и выбранному месту.", domain: "duckduckgo.com", price: priceLabel, marketplace: "DuckDuckGo" },
      ];
      summary = language === "tr"
        ? `“${cleanQuery}” için doğru ürün kartı bulunamadı. Nehus alakasız sayfaları eklemedi; aşağıda yalnızca kesin arama bağlantıları var.`
        : language === "en"
          ? `No accurate product cards were found for “${cleanQuery}”. Nehus did not add unrelated pages; only exact search links remain below.`
          : `Точных карточек товара для «${cleanQuery}» не найдено. Нехус не подставил нерелевантные страницы: ниже оставлены только точные поисковые ссылки.`;
    }

    const payload: ProductPayload = {
      offers,
      summary,
      country: location,
      searchedAt: new Date().toLocaleTimeString(language === "tr" ? "tr-TR" : language === "en" ? "en-US" : "ru-RU", { hour: "2-digit", minute: "2-digit" }),
      economical: true,
    };
    productCache.set(cacheKey, { expires: Date.now() + PRODUCT_CACHE_TTL_MS, payload });
    if (productCache.size > 120) productCache.delete(productCache.keys().next().value as string);
    return json(payload);
  } catch {
    return NextResponse.json({ error: "Поиск временно не ответил. Повторите позже — Нехус не будет подставлять случайные товары." }, { status: 503 });
  }
}
