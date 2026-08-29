import { NextRequest, NextResponse } from "next/server";
import { domainOf, groundedAnswer, researchWeb, safeUrl, type WebSource } from "../_lib/web-research";

type SiteLanguage = "ru" | "tr" | "en";

async function openAIWebSearch(query: string, location: string, apiKey: string, language: SiteLanguage) {
  const languageName = language === "tr" ? "турецком" : language === "en" ? "английском" : "русском";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_SEARCH_MODEL || process.env.OPENAI_MODEL || "gpt-5.6",
      reasoning: { effort: "medium" },
      tools: [{ type: "web_search", external_web_access: true }],
      tool_choice: "required",
      include: ["web_search_call.action.sources"],
      input: `Исследуй запрос «${query}» для места «${location}». Ответь на ${languageName} языке. Сначала дай короткий прямой ответ, затем ключевые факты, расхождения и практический вывод. Если запрос относится к аренде жилья, используй только настоящие объявления о недвижимости и исключи фильмы, видео, энциклопедии и развлекательные страницы. Проверяй даты. Для цены, товара, услуги или объявления приводи только реально найденные сведения и прямые ссылки. Не выдумывай отсутствующие данные.`,
    }),
    signal: AbortSignal.timeout(50000),
  });
  if (!response.ok) throw new Error("AI search unavailable");
  const data = await response.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string; annotations?: Array<{ url?: string; title?: string }> }> }> };
  const contents = (data.output || []).flatMap((item) => item.content || []);
  const answer = contents.filter((item) => item.type === "output_text").map((item) => item.text || "").join("\n\n").trim();
  const seen = new Set<string>();
  const sources: WebSource[] = contents.flatMap((item) => item.annotations || []).map((item) => {
    const url = item.url ? safeUrl(item.url) : "";
    return { title: item.title || domainOf(url), url, snippet: "Источник использован при подготовке ответа.", domain: domainOf(url), checked: true };
  }).filter((source) => source.url && !seen.has(source.url) && seen.add(source.url)).slice(0, 16);
  if (!answer) throw new Error("Empty AI result");
  return { answer, sources };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = String(body.query || "").trim().slice(0, 500);
    const country = String(body.location?.country || "Весь мир").trim().slice(0, 80);
    const city = String(body.location?.city || "").trim().slice(0, 100);
    const district = String(body.location?.district || "").trim().slice(0, 100);
    const language: SiteLanguage = body.language === "tr" || body.language === "en" ? body.language : "ru";
    const location = [country, city, district].filter(Boolean).join(", ");
    if (query.length < 2) return NextResponse.json({ error: "Введите более точный запрос." }, { status: 400 });

    let result: { answer: string; sources: WebSource[] };
    let mode = "verified-web";
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        result = await openAIWebSearch(query, location, apiKey, language);
        mode = "ai-web";
      } catch {
        const sources = await researchWeb(query, location, 16);
        result = { answer: groundedAnswer(query, sources, language), sources };
      }
    } else {
      const sources = await researchWeb(query, location, 16);
      result = { answer: groundedAnswer(query, sources, language), sources };
    }
    return NextResponse.json({ ...result, location, searchedAt: new Date().toLocaleTimeString(language === "tr" ? "tr-TR" : language === "en" ? "en-US" : "ru-RU", { hour: "2-digit", minute: "2-digit" }), mode });
  } catch {
    return NextResponse.json({ error: "Интернет временно не ответил. Повторите поиск через минуту — Нехус не будет подставлять выдуманные данные." }, { status: 503 });
  }
}
