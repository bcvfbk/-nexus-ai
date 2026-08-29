import { NextRequest, NextResponse } from "next/server";

type Source = { title: string; url: string; snippet: string; domain: string };
type SiteLanguage = "ru" | "tr" | "en";
type HomeworkMode = "solve" | "edit" | "create";
const HOMEWORK_CACHE_TTL_MS = 30 * 60 * 1000;
const homeworkCache = new Map<string, { expires: number; sources: Source[] }>();

function cleanText(value: string) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#160;|&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

function safeUrl(value: string) {
  try {
    const parsed = new URL(cleanText(value));
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch { return ""; }
}

function domainOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return "источник"; }
}

function parseBingRss(xml: string): Source[] {
  const results: Source[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    const title = cleanText(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
    const url = safeUrl(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "");
    const snippet = cleanText(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || "");
    if (title && url) results.push({ title, url, snippet: snippet.slice(0, 320), domain: domainOf(url) });
  }
  return results;
}

function simpleCalculation(text: string) {
  const match = text.replace(/,/g, ".").match(/(-?\d+(?:\.\d+)?)\s*([+\-×x*÷/:])\s*(-?\d+(?:\.\d+)?)/i);
  if (!match) return "";
  const first = Number(match[1]);
  const second = Number(match[3]);
  const operator = match[2].toLowerCase();
  let result: number | null = null;
  if (operator === "+") result = first + second;
  if (operator === "-") result = first - second;
  if (operator === "×" || operator === "x" || operator === "*") result = first * second;
  if (operator === "÷" || operator === "/" || operator === ":") result = second === 0 ? null : first / second;
  if (result === null || !Number.isFinite(result)) return "";
  return `${match[1]} ${match[2]} ${match[3]} = ${Number(result.toFixed(8))}`;
}

async function searchHomework(subject: string, grade: string, question: string, extractedText: string) {
  const compactText = extractedText.slice(0, 520);
  const cacheKey = `${subject}::${grade}::${question}::${compactText}`.toLowerCase();
  const cached = homeworkCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.sources.map((source) => ({ ...source }));
  if (cached) homeworkCache.delete(cacheKey);
  const query = `${subject} ${grade} класс ${question} ${compactText}`.slice(0, 900);
  const response = await fetch(`https://www.bing.com/search?format=rss&setlang=ru&q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "Mozilla/5.0 Nehus Economical Homework" },
    signal: AbortSignal.timeout(7000),
  });
  const sources = response.ok ? parseBingRss(await response.text()) : [];

  const seen = new Set<string>();
  const selected = sources.filter((source) => {
    const key = source.url.replace(/\/$/, "");
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 8);
  homeworkCache.set(cacheKey, { expires: Date.now() + HOMEWORK_CACHE_TTL_MS, sources: selected });
  if (homeworkCache.size > 80) homeworkCache.delete(homeworkCache.keys().next().value as string);
  return selected.map((source) => ({ ...source }));
}

function basicEdit(text: string, language: SiteLanguage) {
  const cleaned = text.replace(/\s+([,.;!?])/g, "$1").replace(/([.!?])(?=\p{L})/gu, "$1 ").replace(/\s+/g, " ").trim();
  const edited = cleaned.replace(/(^|[.!?]\s+)(\p{L})/gu, (_, start, letter) => `${start}${letter.toUpperCase()}`);
  const finalText = /[.!?]$/.test(edited) ? edited : `${edited}.`;
  return language === "tr" ? `Düzenlenmiş metin:\n\n${finalText}` : language === "en" ? `Edited text:\n\n${finalText}` : `Отредактированный текст:\n\n${finalText}`;
}

function basicCreate(topic: string, instruction: string, grade: string, language: SiteLanguage) {
  if (language === "tr") return `Başlık: ${topic}\n\n${topic}, günlük yaşamımızda düşünmeye değer önemli bir konudur. Bu konuya farklı açılardan bakabilir ve neden önemli olduğunu açıklayabiliriz. Öncelikle ana fikri belirlemek gerekir. Daha sonra örnekler ve gerekçeler bu fikri destekler. Böylece metin anlaşılır ve tutarlı olur.\n\nSonuç olarak ${topic.toLowerCase()} hakkında düşünmek, kendi görüşümüzü geliştirmemize yardımcı olur. Bu taslak ${grade}. sınıf düzeyine göre hazırlanmıştır.${instruction ? `\n\nEk istek: ${instruction}` : ""}`;
  if (language === "en") return `Title: ${topic}\n\n${topic} is an important subject worth considering in everyday life. We can look at it from different perspectives and explain why it matters. First, the main idea should be clear. Examples and reasons can then support that idea. This makes the text easy to understand and logically connected.\n\nIn conclusion, thinking about ${topic.toLowerCase()} helps us develop our own opinion. This draft is written for Grade ${grade}.${instruction ? `\n\nAdditional instruction: ${instruction}` : ""}`;
  return `${topic}\n\n${topic} — важная тема, над которой стоит задуматься. Её можно рассмотреть с разных сторон и объяснить, почему она имеет значение. Сначала нужно сформулировать главную мысль. Затем её следует подтвердить понятными примерами и аргументами. Так текст становится последовательным и убедительным.\n\nВ заключение можно сказать, что размышление на тему «${topic.toLowerCase()}» помогает сформировать собственное мнение. Этот черновик подготовлен для ${grade} класса.${instruction ? `\n\nДополнительное пожелание: ${instruction}` : ""}`;
}

async function generateWritingTask(mode: "edit" | "create", text: string, instruction: string, subject: string, grade: string, language: SiteLanguage, apiKey: string) {
  const languageName = language === "tr" ? "Turkish" : language === "en" ? "English" : "Russian";
  const task = mode === "edit"
    ? `Отредактируй исходный текст. Исправь орфографию, пунктуацию, грамматику и неудачные формулировки, сохранив смысл и факты. Уровень: ${grade} класс. Предмет: ${subject}. Пожелание: ${instruction || "сделать текст грамотным и понятным"}. Исходный текст:\n${text}`
    : `Создай законченный учебный текст по теме: ${text}. Уровень: ${grade} класс. Предмет: ${subject}. Требования: ${instruction || "понятная структура, заголовок, вступление, основная часть и вывод"}. Не выдумывай точные факты, даты или цитаты, если они не даны пользователем.`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      reasoning: { effort: "medium" },
      input: [{ role: "system", content: `Ты Нехус — внимательный школьный редактор. Пиши на языке ${languageName}, учитывай возраст ученика, возвращай только готовый текст без служебных пояснений и без Markdown-ограждений.` }, { role: "user", content: task }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error("Writing unavailable");
  const data = await response.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const answer = (data.output || []).flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text || "").join("\n\n").trim();
  if (!answer) throw new Error("Empty writing result");
  return answer.slice(0, 12000);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const extractedText = cleanText(String(body.extractedText || "")).slice(0, 4000);
    const subject = cleanText(String(body.subject || "Другой предмет")).slice(0, 80);
    const grade = cleanText(String(body.grade || "5")).replace(/[^0-9]/g, "").slice(0, 2) || "5";
    const language: SiteLanguage = body.language === "tr" || body.language === "en" ? body.language : "ru";
    const mode: HomeworkMode = body.mode === "edit" || body.mode === "create" ? body.mode : "solve";
    const question = cleanText(String(body.question || "")).slice(0, 1200);
    const confidence = Math.max(0, Math.min(100, Math.round(Number(body.confidence) || 0)));
    if (extractedText.length < 3) return NextResponse.json({ error: mode === "solve" ? "Текст на фотографии не распознан. Попробуйте более чёткий снимок." : mode === "edit" ? "Вставьте текст, который нужно отредактировать." : "Напишите тему будущего текста." }, { status: 400 });
    if (mode === "solve" && !question) return NextResponse.json({ error: "Напишите, что именно нужно объяснить." }, { status: 400 });

    if (mode === "edit" || mode === "create") {
      let answer = mode === "edit" ? basicEdit(extractedText, language) : basicCreate(extractedText, question, grade, language);
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        try { answer = await generateWritingTask(mode, extractedText, question, subject, grade, language, apiKey); }
        catch { /* Используем надёжный встроенный редактор ниже. */ }
      }
      return NextResponse.json({
        answer, sources: [], recognizedText: extractedText, confidence: 100, subject, grade, mode,
        searchedAt: new Date().toLocaleTimeString(language === "tr" ? "tr-TR" : language === "en" ? "en-US" : "ru-RU", { hour: "2-digit", minute: "2-digit" }),
      });
    }

    const sources = await searchHomework(subject, grade, question, extractedText);
    const useful = sources.filter((source) => source.snippet.length > 45).slice(0, 6);
    const calculation = subject === "Математика" ? simpleCalculation(`${extractedText} ${question}`) : "";
    const evidence = useful.length
      ? useful.map((source, index) => `${index + 1}. ${source.snippet.replace(/[.!?]?$/, ".")}`).join("\n")
      : "По точному условию не нашлось содержательных описаний. Проверьте распознанный текст и уточните вопрос.";
    const confidenceNote = confidence < 60
      ? "Точность распознавания невысокая. Сверьте условие с фотографией: отдельные слова или числа могли определиться неправильно."
      : "Текст распознан достаточно уверенно, но числа и знаки всё равно стоит сверить с фотографией.";
    const calculationBlock = calculation
      ? language === "tr"
        ? `\n\nBasit hesaplama:\n${calculation}. Bu işlemin soruyla ilgili olduğunu kontrol edin.`
        : language === "en"
          ? `\n\nSimple calculation:\n${calculation}. Check that this operation belongs to the problem.`
          : `\n\nПростой вычислительный фрагмент:\n${calculation}. Проверьте, относится ли это действие к вопросу задачи.`
      : "";
    const answer = language === "tr"
      ? `Okunan metin:\n${extractedText.slice(0, 1400)}\n\nÖğrencinin sorusu:\n${question}\n\nSınıf düzeyi:\n${grade}. sınıf\n\nİnternette bulunan materyaller:\n${evidence}\n\nÇözüm adımları:\n1. Fotoğraftaki sayıları, işaretleri ve adları kontrol edin.\n2. ${grade}. sınıf düzeyine uygun kuralı belirleyin.\n3. Verileri sırayla yazın ve ara adımları atlamadan kuralı uygulayın.\n4. Sonucu tam bir cümleyle yazıp soruya göre kontrol edin.${calculationBlock}`
      : language === "en"
        ? `Recognized text:\n${extractedText.slice(0, 1400)}\n\nStudent's question:\n${question}\n\nGrade level:\nGrade ${grade}\n\nMaterials found online:\n${evidence}\n\nSolution steps:\n1. Check the numbers, symbols, and names against the photo.\n2. Choose the rule appropriate for Grade ${grade}.\n3. Write the given data and apply the rule without skipping intermediate steps.\n4. State the final answer in a full sentence and verify it against the question.${calculationBlock}`
        : `Что удалось прочитать:\n${extractedText.slice(0, 1400)}\n\nЧто спрашивает ученик:\n${question}\n\nУровень задания:\n${grade} класс\n\nПроверка фотографии:\n${confidenceNote}\n\nМатериалы, найденные в интернете:\n${evidence}\n\nКак выполнить задание по шагам:\n1. Сверьте распознанное условие с оригинальной фотографией, особенно числа, знаки и имена.\n2. Выберите правило, подходящее для ${grade} класса.\n3. Выпишите данные из условия и примените правило по порядку, не пропуская промежуточные действия.\n4. Сформулируйте итог полным предложением и проверьте его по условию.${calculationBlock}`;

    return NextResponse.json({ answer, sources, recognizedText: extractedText, confidence, subject, grade, mode, searchedAt: new Date().toLocaleTimeString(language === "tr" ? "tr-TR" : language === "en" ? "en-US" : "ru-RU", { hour: "2-digit", minute: "2-digit" }) });
  } catch {
    return NextResponse.json({ error: "Бесплатный поиск временно недоступен. Попробуйте ещё раз." }, { status: 503 });
  }
}
