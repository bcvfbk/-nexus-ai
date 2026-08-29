"use client";
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Bot, BookOpen, Check, Code2, Copy, Download, ExternalLink, FileQuestion, Gamepad2, Globe2,
  GraduationCap, Headphones, ImageIcon, MapPin, MessageSquareText, PackageSearch, Play,
  Navigation, Radar, Search, Send, ShieldCheck, Sparkles, Tags, Upload, UserRound, X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

type MessageSource = { title: string; url: string; domain: string };
type Message = { id: string; role: "bot" | "user"; text: string; time: string; blocked?: boolean; sources?: MessageSource[] };
type ModerationEvent = { id: string; text: string; result: "Разрешено" | "Заблокировано"; reason: string; time: string };
type SearchSource = { title: string; url: string; snippet: string; domain: string; price?: string; area?: string };
type SearchResult = { answer: string; sources: SearchSource[]; searchedAt: string; mode: string; location: string };
type ProductOffer = { title: string; url: string; domain: string; price: string; area?: string; details: string; marketplace: string };
type ProductSearchResult = { summary: string; offers: ProductOffer[]; searchedAt: string; country: string };
type HomeworkMode = "solve" | "edit" | "create";
type HomeworkResult = { answer: string; sources: SearchSource[]; searchedAt: string; subject: string; recognizedText: string; confidence: number; mode?: HomeworkMode };
type DeveloperMode = "auto" | "code" | "game" | "site";
type DeveloperValidation = { status: "passed" | "repaired" | "needs_review"; attempts: number; checks: string[]; issues: string[] };
type DeveloperResult = { title: string; explanation: string; language: string; code: string; filename: string; previewable: boolean; engine: "ai" | "template"; validation?: DeveloperValidation };
type SiteLanguage = "ru" | "tr" | "en";
type ChatMode = "assistant" | "casual";

const SUBJECTS = ["Математика", "Русский язык", "Литература", "Английский язык", "Турецкий язык", "Физика", "Химия", "Биология", "История", "География", "Информатика", "Другой предмет"];
const GRADES = Array.from({ length: 11 }, (_, index) => String(index + 1));
const UI_TEXT: Array<{ ru: string; tr: string; en: string }> = [
  { ru: "Помощник при любых делах", tr: "Her iş için yardımcı", en: "Assistant for every task" },
  { ru: "Чат", tr: "Sohbet", en: "Chat" }, { ru: "Ищейка", tr: "Web araştırma", en: "Web search" },
  { ru: "Программист", tr: "Programcı", en: "Programmer" }, { ru: "Помощь с уроками", tr: "Ders yardımı", en: "Homework help" },
  { ru: "Модерация", tr: "Moderasyon", en: "Moderation" }, { ru: "Нехус онлайн", tr: "Nehus çevrimiçi", en: "Nehus online" },
  { ru: "Чем я могу помочь?", tr: "Nasıl yardımcı olabilirim?", en: "How can I help?" },
  { ru: "Подходящие источники", tr: "İlgili kaynaklar", en: "Relevant sources" },
  { ru: "Напишите сообщение…", tr: "Mesajınızı yazın…", en: "Write a message…" },
  { ru: "Помоги составить план", tr: "Bir plan hazırlamama yardım et", en: "Help me make a plan" },
  { ru: "Проанализируй тему", tr: "Konuyu analiz et", en: "Analyze a topic" }, { ru: "Создай мини-игру", tr: "Mini oyun oluştur", en: "Create a mini-game" },
  { ru: "Один помощник.", tr: "Tek yardımcı.", en: "One assistant." }, { ru: "Для любых дел.", tr: "Her iş için.", en: "For every task." },
  { ru: "Ответы по существу", tr: "Doğrudan yanıtlar", en: "Direct answers" }, { ru: "Учитывает вопрос и контекст", tr: "Soruyu ve bağlamı dikkate alır", en: "Understands the question and context" },
  { ru: "Проверяемый интернет", tr: "Doğrulanabilir web", en: "Verifiable web" }, { ru: "Читает страницы и показывает ссылки", tr: "Sayfaları okur ve bağlantıları gösterir", en: "Reads pages and shows links" },
  { ru: "Режим программиста", tr: "Programcı modu", en: "Programmer mode" }, { ru: "Код, сайты и мини-игры", tr: "Kod, siteler ve mini oyunlar", en: "Code, sites, and mini-games" },
  { ru: "Поддержка 24/7", tr: "7/24 destek", en: "24/7 support" }, { ru: "Средний ответ — 2 секунды", tr: "Ortalama yanıt — 2 saniye", en: "Average response — 2 seconds" },
  { ru: "Анализировать интернет", tr: "İnterneti analiz et", en: "Analyze the web" }, { ru: "Найти конкретный товар", tr: "Belirli bir ürün bul", en: "Find a specific item" },
  { ru: "Где анализировать", tr: "Analiz konumu", en: "Analysis location" }, { ru: "Где искать товар", tr: "Ürün arama konumu", en: "Product search location" },
  { ru: "Страна", tr: "Ülke", en: "Country" }, { ru: "Город / регион", tr: "Şehir / bölge", en: "City / region" },
  { ru: "Район / населённый пункт", tr: "İlçe / yerleşim", en: "District / locality" }, { ru: "Выберите", tr: "Seçin", en: "Select" },
  { ru: "Введите город", tr: "Şehir girin", en: "Enter a city" }, { ru: "Введите район", tr: "İlçe girin", en: "Enter a district" }, { ru: "Сначала город", tr: "Önce şehir", en: "Choose a city first" },
  { ru: "Нехус исследует открытый интернет", tr: "Nehus açık interneti araştırır", en: "Nehus researches the open web" },
  { ru: "МОЩНЫЙ АНАЛИЗ", tr: "GÜÇLÜ ANALİZ", en: "POWERFUL ANALYSIS" }, { ru: "ПОИСК ТОВАРА", tr: "ÜRÜN ARAMA", en: "PRODUCT SEARCH" },
  { ru: "Что нужно глубоко исследовать?", tr: "Neyi ayrıntılı araştırmak istiyorsunuz?", en: "What should be researched in depth?" },
  { ru: "Точное название товара или модель", tr: "Tam ürün adı veya modeli", en: "Exact product name or model" },
  { ru: "Исследовать", tr: "Araştır", en: "Research" }, { ru: "Найти товар", tr: "Ürünü bul", en: "Find item" },
  { ru: "Анализирую…", tr: "Analiz ediliyor…", en: "Analyzing…" }, { ru: "Ищу…", tr: "Aranıyor…", en: "Searching…" },
  { ru: "Например:", tr: "Örneğin:", en: "For example:" }, { ru: "Запрос принят", tr: "İstek alındı", en: "Request received" },
  { ru: "Сканирование сети", tr: "Web taraması", en: "Scanning the web" }, { ru: "Поиск магазинов", tr: "Mağaza araması", en: "Searching stores" },
  { ru: "Проверка результатов", tr: "Sonuçlar kontrol ediliyor", en: "Checking results" }, { ru: "Поиск не завершён", tr: "Arama tamamlanamadı", en: "Search was not completed" },
  { ru: "Повторить", tr: "Tekrar dene", en: "Try again" }, { ru: "Анализ найденного", tr: "Bulunanların analizi", en: "Analysis of findings" },
  { ru: "Поиск выполнен", tr: "Arama tamamlandı", en: "Search completed" }, { ru: "Обновить поиск", tr: "Aramayı yenile", en: "Refresh search" },
  { ru: "Проверяемые ссылки и GPS", tr: "Doğrulanabilir bağlantılar ve GPS", en: "Verifiable links and GPS" }, { ru: "Источники", tr: "Kaynaklar", en: "Sources" },
  { ru: "Откройте страницу или найдите место на карте", tr: "Sayfayı açın veya haritada yeri bulun", en: "Open the page or find the place on the map" },
  { ru: "Ссылка", tr: "Bağlantı", en: "Link" }, { ru: "Карта / GPS", tr: "Harita / GPS", en: "Map / GPS" },
  { ru: "Нехус сравнил предложения", tr: "Nehus teklifleri karşılaştırdı", en: "Nehus compared offers" }, { ru: "Предложения в сети", tr: "Çevrimiçi teklifler", en: "Online offers" },
  { ru: "Обновить данные", tr: "Verileri yenile", en: "Refresh data" }, { ru: "Найдено для:", tr: "Şunun için bulundu:", en: "Found for:" },
  { ru: "Опишите задачу — получите готовый код", tr: "Görevi açıklayın — hazır kod alın", en: "Describe the task — get ready code" },
  { ru: "Определить самому", tr: "Otomatik belirle", en: "Detect automatically" }, { ru: "Код / инструмент", tr: "Kod / araç", en: "Code / tool" },
  { ru: "Мини-игра", tr: "Mini oyun", en: "Mini-game" }, { ru: "Сайт", tr: "Web sitesi", en: "Website" },
  { ru: "Создать проект", tr: "Proje oluştur", en: "Create project" }, { ru: "Создаю…", tr: "Oluşturuluyor…", en: "Creating…" },
  { ru: "Попробовать:", tr: "Deneyin:", en: "Try:" }, { ru: "Проект не создан", tr: "Proje oluşturulamadı", en: "Project was not created" },
  { ru: "Копировать код", tr: "Kodu kopyala", en: "Copy code" }, { ru: "Скачать", tr: "İndir", en: "Download" }, { ru: "Новая задача", tr: "Yeni görev", en: "New task" },
  { ru: "Живой запуск", tr: "Canlı önizleme", en: "Live preview" }, { ru: "Изменения обновляются сразу", tr: "Değişiklikler anında güncellenir", en: "Changes update instantly" },
  { ru: "Нехус · бесплатный помощник", tr: "Nehus · ücretsiz yardımcı", en: "Nehus · free assistant" },
  { ru: "Бесплатно · без карты и подписки", tr: "Ücretsiz · kart ve abonelik yok", en: "Free · no card or subscription" },
  { ru: "Загрузите фото", tr: "Fotoğraf yükleyin", en: "Upload a photo" }, { ru: "Выберите предмет", tr: "Dersi seçin", en: "Choose a subject" }, { ru: "Задайте вопрос", tr: "Sorunuzu yazın", en: "Ask a question" },
  { ru: "Шаг 1", tr: "Adım 1", en: "Step 1" }, { ru: "Фотография задания", tr: "Ödev fotoğrafı", en: "Assignment photo" },
  { ru: "Нажмите и выберите фотографию", tr: "Tıklayın ve bir fotoğraf seçin", en: "Click and choose a photo" }, { ru: "Выбрать изображение", tr: "Görsel seç", en: "Choose image" },
  { ru: "Шаги 2–3", tr: "Adımlar 2–3", en: "Steps 2–3" }, { ru: "Предмет и вопрос", tr: "Ders ve soru", en: "Subject and question" },
  { ru: "Учебный предмет", tr: "Ders", en: "Subject" }, { ru: "Класс", tr: "Sınıf", en: "Grade" }, { ru: "Выберите класс", tr: "Sınıfı seçin", en: "Choose grade" },
  { ru: "Класс ученика", tr: "Öğrencinin sınıfı", en: "Student grade" }, { ru: "Сначала выберите класс — ответ будет подходить возрасту ученика.", tr: "Önce sınıfı seçin; yanıt öğrencinin yaşına uygun olur.", en: "Choose the grade first so the answer matches the student's age." },
  { ru: "Решить задание", tr: "Ödevi çöz", en: "Solve assignment" }, { ru: "Отредактировать текст", tr: "Metni düzenle", en: "Edit text" }, { ru: "Создать текст", tr: "Metin oluştur", en: "Create text" },
  { ru: "Выберите, что нужно сделать", tr: "Ne yapmak istediğinizi seçin", en: "Choose what you need" }, { ru: "Фото задания", tr: "Ödev fotoğrafı", en: "Assignment photo" },
  { ru: "Текст для редактирования", tr: "Düzenlenecek metin", en: "Text to edit" }, { ru: "Тема будущего текста", tr: "Yeni metnin konusu", en: "Topic for the new text" },
  { ru: "Вставьте текст, который нужно исправить…", tr: "Düzenlenecek metni buraya yapıştırın…", en: "Paste the text that needs editing…" },
  { ru: "Напишите тему, например: «Почему важно беречь природу»", tr: "Konuyu yazın, örneğin: “Doğayı korumak neden önemlidir?”", en: "Enter a topic, for example: “Why protecting nature matters”" },
  { ru: "Что изменить?", tr: "Ne değiştirilsin?", en: "What should change?" }, { ru: "Дополнительные пожелания", tr: "Ek istekler", en: "Additional instructions" },
  { ru: "Например: исправь ошибки и сделай текст понятнее", tr: "Örneğin: hataları düzelt ve metni daha anlaşılır yap", en: "For example: fix errors and make the text clearer" },
  { ru: "Например: 10 предложений, простой язык, с заголовком", tr: "Örneğin: 10 cümle, sade dil ve başlık", en: "For example: 10 sentences, simple language, with a title" },
  { ru: "Редактирую текст…", tr: "Metin düzenleniyor…", en: "Editing text…" }, { ru: "Создаю текст…", tr: "Metin oluşturuluyor…", en: "Creating text…" },
  { ru: "Исходный текст", tr: "Kaynak metin", en: "Original text" }, { ru: "Готовый текст", tr: "Hazır metin", en: "Finished text" },
  { ru: "Текст можно скопировать и дополнительно изменить.", tr: "Metni kopyalayabilir ve yeniden düzenleyebilirsiniz.", en: "You can copy and edit the text further." },
  { ru: "Что нужно объяснить?", tr: "Neyin açıklanması gerekiyor?", en: "What needs explaining?" }, { ru: "Разобрать бесплатно", tr: "Ücretsiz açıkla", en: "Explain for free" },
  { ru: "Изучаю задание…", tr: "Ödev inceleniyor…", en: "Studying assignment…" }, { ru: "Не удалось подготовить ответ", tr: "Yanıt hazırlanamadı", en: "Could not prepare an answer" },
  { ru: "Ответ Нехуса", tr: "Nehus'un yanıtı", en: "Nehus answer" }, { ru: "Проверено по источникам", tr: "Kaynaklarla kontrol edildi", en: "Checked against sources" },
  { ru: "Новый вопрос", tr: "Yeni soru", en: "New question" }, { ru: "Материалы для проверки", tr: "Kontrol materyalleri", en: "Verification materials" },
  { ru: "Защита диалогов", tr: "Sohbet koruması", en: "Conversation protection" }, { ru: "Умная модерация", tr: "Akıllı moderasyon", en: "Smart moderation" },
  { ru: "Правила защиты", tr: "Koruma kuralları", en: "Protection rules" }, { ru: "Активно", tr: "Etkin", en: "Active" },
  { ru: "Проверить сообщение", tr: "Mesajı kontrol et", en: "Check message" }, { ru: "Проверить", tr: "Kontrol et", en: "Check" },
  { ru: "Журнал событий", tr: "Olay günlüğü", en: "Event log" }, { ru: "Сообщение", tr: "Mesaj", en: "Message" }, { ru: "Результат", tr: "Sonuç", en: "Result" }, { ru: "Время", tr: "Saat", en: "Time" },
  { ru: "Математика", tr: "Matematik", en: "Mathematics" }, { ru: "Русский язык", tr: "Rusça", en: "Russian" }, { ru: "Литература", tr: "Edebiyat", en: "Literature" },
  { ru: "Английский язык", tr: "İngilizce", en: "English" }, { ru: "Турецкий язык", tr: "Türkçe", en: "Turkish" }, { ru: "Физика", tr: "Fizik", en: "Physics" },
  { ru: "Химия", tr: "Kimya", en: "Chemistry" }, { ru: "Биология", tr: "Biyoloji", en: "Biology" }, { ru: "История", tr: "Tarih", en: "History" },
  { ru: "География", tr: "Coğrafya", en: "Geography" }, { ru: "Информатика", tr: "Bilgisayar bilimi", en: "Computer science" }, { ru: "Другой предмет", tr: "Diğer ders", en: "Other subject" },
  { ru: "Язык сайта", tr: "Site dili", en: "Site language" }, { ru: "Русский", tr: "Rusça", en: "Russian" },
  { ru: "сейчас", tr: "şimdi", en: "now" }, { ru: "Проверяемые ссылки", tr: "Doğrulanabilir bağlantılar", en: "Verifiable links" },
  { ru: "Откройте объявление или найдите место на карте", tr: "İlanı açın veya haritada konumu bulun", en: "Open the listing or find the location on the map" },
  { ru: "Откройте источник и проверьте сведения", tr: "Kaynağı açın ve bilgileri kontrol edin", en: "Open the source and verify the details" },
  { ru: "Цены, площади, ссылки и GPS", tr: "Fiyatlar, alanlar, bağlantılar ve GPS", en: "Prices, areas, links, and GPS" },
  { ru: "Цены и прямые ссылки", tr: "Fiyatlar ve doğrudan bağlantılar", en: "Prices and direct links" },
  { ru: "Карта ищет объект в выбранном районе", tr: "Harita seçilen bölgedeki konumu arar", en: "The map searches in the selected area" },
  { ru: "Откройте карточку товара у продавца", tr: "Satıcının ürün sayfasını açın", en: "Open the seller's product page" },
  { ru: "Разбивает вопрос на несколько поисковых направлений, изучает до 16 источников, сравнивает факты и собирает подробный ответ со ссылками.", tr: "Soruyu farklı arama yönlerine ayırır, 16 kaynağa kadar inceler, bilgileri karşılaştırır ve bağlantılı ayrıntılı bir yanıt hazırlar.", en: "Splits the question into search directions, reviews up to 16 sources, compares facts, and builds a detailed answer with links." },
  { ru: "Ищет конкретный товар в интернет-магазинах, показывает названия, найденные цены, характеристики, продавцов и прямые ссылки.", tr: "Çevrimiçi mağazalarda belirli bir ürünü arar; adları, bulunan fiyatları, özellikleri, satıcıları ve doğrudan bağlantıları gösterir.", en: "Searches online stores for a specific item and shows names, found prices, specifications, sellers, and direct links." },
  { ru: "Нехус глубоко исследует интернет", tr: "Nehus interneti ayrıntılı araştırıyor", en: "Nehus is researching the web" },
  { ru: "Нехус ищет предложения магазинов", tr: "Nehus mağaza tekliflerini arıyor", en: "Nehus is searching store offers" },
  { ru: "Запускает несколько поисков, читает результаты и сравнивает источники…", tr: "Birden fazla arama yapıyor, sonuçları okuyor ve kaynakları karşılaştırıyor…", en: "Running several searches, reading results, and comparing sources…" },
  { ru: "Собирает названия, цены, детали и прямые ссылки на товары…", tr: "Ürün adlarını, fiyatları, ayrıntıları ve doğrudan bağlantıları topluyor…", en: "Collecting product names, prices, details, and direct links…" },
  { ru: "Нехус · помощь программисту", tr: "Nehus · programlama yardımı", en: "Nehus · programming help" },
  { ru: "Нехус помогает с функциями и инструментами, пишет код, создаёт одностраничные сайты и рабочие мини-игры. Результат можно изменить, запустить, скопировать или скачать.", tr: "Nehus işlevler ve araçlar konusunda yardımcı olur, kod yazar, tek sayfalık siteler ve çalışan mini oyunlar oluşturur. Sonucu düzenleyebilir, çalıştırabilir, kopyalayabilir veya indirebilirsiniz.", en: "Nehus helps with functions and tools, writes code, and creates one-page sites and working mini-games. You can edit, run, copy, or download the result." },
  { ru: "Код можно проверить и изменить до скачивания", tr: "Kodu indirmeden önce kontrol edip düzenleyebilirsiniz", en: "You can review and edit the code before downloading" },
  { ru: "Нехус собирает рабочий проект", tr: "Nehus çalışan projeyi hazırlıyor", en: "Nehus is building a working project" },
  { ru: "Продумывает структуру, пишет код и проверяет, можно ли его сразу запустить…", tr: "Yapıyı planlıyor, kodu yazıyor ve hemen çalıştırılıp çalıştırılamayacağını kontrol ediyor…", en: "Planning the structure, writing code, and checking whether it can run immediately…" },
  { ru: "Сфотографируйте задание, выберите предмет и спросите, что непонятно. Нехус бесплатно распознает печатный текст прямо в вашем браузере, найдёт подходящие материалы в интернете и соберёт понятное объяснение.", tr: "Ödevin fotoğrafını çekin, dersi seçin ve anlamadığınız kısmı sorun. Nehus basılı metni tarayıcınızda ücretsiz tanır, internette uygun kaynakları bulur ve anlaşılır bir açıklama hazırlar.", en: "Photograph the assignment, choose a subject, and ask what is unclear. Nehus recognizes printed text in your browser for free, finds relevant web materials, and builds a clear explanation." },
  { ru: "Чёткий снимок целиком, размером до 8 МБ", tr: "Tam ve net fotoğraf, en fazla 8 MB", en: "A clear full photo, up to 8 MB" },
  { ru: "Например: реши задачу и объясни каждый шаг простыми словами", tr: "Örneğin: soruyu çöz ve her adımı basitçe açıkla", en: "For example: solve the problem and explain each step simply" },
  { ru: "Печатный текст распознаётся лучше почерка и сложных формул.", tr: "Basılı metin, el yazısı ve karmaşık formüllerden daha iyi tanınır.", en: "Printed text is recognized better than handwriting and complex formulas." },
  { ru: "Распознаю текст на фотографии…", tr: "Fotoğraftaki metin tanınıyor…", en: "Recognizing text in the photo…" },
  { ru: "Загружаю бесплатный распознаватель текста…", tr: "Ücretsiz metin tanıma aracı yükleniyor…", en: "Loading the free text recognizer…" },
  { ru: "Подготавливаю распознавание…", tr: "Metin tanıma hazırlanıyor…", en: "Preparing text recognition…" },
  { ru: "Ищу правила и объяснения в интернете…", tr: "İnternette kurallar ve açıklamalar aranıyor…", en: "Searching the web for rules and explanations…" },
  { ru: "Это может занять до минуты при первом запуске.", tr: "İlk çalıştırmada bu işlem bir dakika sürebilir.", en: "This may take up to a minute on the first run." },
  { ru: "Подробный разбор", tr: "Ayrıntılı çözüm", en: "Detailed explanation" }, { ru: "Разбор выполнен", tr: "Açıklama tamamlandı", en: "Explanation completed" },
  { ru: "Как Нехус прочитал фотографию", tr: "Nehus fotoğrafı nasıl okudu", en: "How Nehus read the photo" },
  { ru: "Фильтры работают до того, как нежелательное сообщение попадёт в чат.", tr: "Filtreler istenmeyen mesaj sohbete ulaşmadan önce çalışır.", en: "Filters act before an unwanted message reaches the chat." },
  { ru: "точность защиты", tr: "koruma doğruluğu", en: "protection accuracy" }, { ru: "Включайте только нужные фильтры.", tr: "Yalnızca gerekli filtreleri açın.", en: "Enable only the filters you need." },
  { ru: "Последние проверки системы.", tr: "Son sistem kontrolleri.", en: "Latest system checks." },
  { ru: "Привет! Я Нехус — помощник при любых делах. Могу объяснить сложное, придумать идею, составить план, проанализировать интернет или найти конкретный товар. С чего начнём?", tr: "Merhaba! Ben Nehus, her iş için yardımcınızım. Karmaşık bir konuyu açıklayabilir, fikir üretebilir, plan hazırlayabilir, interneti araştırabilir veya belirli bir ürün bulabilirim. Nereden başlayalım?", en: "Hi! I'm Nehus, your assistant for every task. I can explain complex topics, develop ideas, make plans, research the web, or find a specific item. Where should we start?" },
  { ru: "Готовый проект ·", tr: "Hazır proje ·", en: "Ready project ·" }, { ru: "Создано ИИ", tr: "Yapay zekâ ile oluşturuldu", en: "Created by AI" },
  { ru: "Проверенный шаблон", tr: "Doğrulanmış şablon", en: "Verified template" }, { ru: "символов", tr: "karakter", en: "characters" },
  { ru: "Три шага", tr: "Üç adım", en: "Three steps" }, { ru: "Город или регион", tr: "Şehir veya bölge", en: "City or region" },
  { ru: "Название товара", tr: "Ürün adı", en: "Product name" }, { ru: "Тип проекта", tr: "Proje türü", en: "Project type" },
  { ru: "Задание программисту", tr: "Programlama görevi", en: "Programming task" }, { ru: "Редактор кода", tr: "Kod düzenleyici", en: "Code editor" },
  { ru: "Разрешено", tr: "İzin verildi", en: "Allowed" }, { ru: "Заблокировано", tr: "Engellendi", en: "Blocked" },
  { ru: "Нарушений не найдено", tr: "İhlal bulunamadı", en: "No violations found" }, { ru: "Похожее на спам сообщение", tr: "Spam benzeri mesaj", en: "Spam-like message" },
  { ru: "Токсичная лексика", tr: "Zararlı dil", en: "Toxic language" }, { ru: "Внешняя ссылка", tr: "Harici bağlantı", en: "External link" },
  { ru: "Рабочий помощник", tr: "Çalışma asistanı", en: "Work assistant" }, { ru: "Просто поболтать", tr: "Sadece sohbet", en: "Just chat" },
  { ru: "Поболтаем?", tr: "Sohbet edelim mi?", en: "Want to chat?" }, { ru: "Напишите, о чём хочется поговорить…", tr: "Ne hakkında konuşmak istediğinizi yazın…", en: "Write what you'd like to talk about…" },
  { ru: "Как у тебя дела?", tr: "Nasılsın?", en: "How are you?" }, { ru: "Расскажи что-нибудь интересное", tr: "İlginç bir şey anlat", en: "Tell me something interesting" },
  { ru: "Давай просто поговорим", tr: "Biraz sohbet edelim", en: "Let's just talk" }, { ru: "Разговор без поиска в интернете", tr: "İnternet araması olmadan sohbet", en: "Conversation without web search" },
  { ru: "Конструктор игры", tr: "Oyun oluşturucu", en: "Game builder" }, { ru: "Выберите характеристики — Нехус учтёт их в механике, графике и управлении.", tr: "Özellikleri seçin; Nehus bunları mekaniklere, grafiklere ve kontrollere uygular.", en: "Choose the details and Nehus will apply them to mechanics, visuals, and controls." },
  { ru: "Размерность", tr: "Boyut", en: "Dimension" }, { ru: "Стиль игры", tr: "Oyun stili", en: "Game style" }, { ru: "Жанр", tr: "Tür", en: "Genre" },
  { ru: "Сложность", tr: "Zorluk", en: "Difficulty" }, { ru: "Управление", tr: "Kontroller", en: "Controls" }, { ru: "Игроки", tr: "Oyuncular", en: "Players" },
  { ru: "Пиксельный", tr: "Piksel", en: "Pixel art" }, { ru: "Мультяшный", tr: "Çizgi film", en: "Cartoon" }, { ru: "Реалистичный", tr: "Gerçekçi", en: "Realistic" },
  { ru: "Неоновый", tr: "Neon", en: "Neon" }, { ru: "Минималистичный", tr: "Minimal", en: "Minimal" }, { ru: "Аркада", tr: "Arcade", en: "Arcade" },
  { ru: "Платформер", tr: "Platform", en: "Platformer" }, { ru: "Гонки", tr: "Yarış", en: "Racing" }, { ru: "Головоломка", tr: "Bulmaca", en: "Puzzle" },
  { ru: "Шутер", tr: "Nişancı", en: "Shooter" }, { ru: "Стратегия", tr: "Strateji", en: "Strategy" }, { ru: "Лёгкая", tr: "Kolay", en: "Easy" },
  { ru: "Средняя", tr: "Orta", en: "Medium" }, { ru: "Сложная", tr: "Zor", en: "Hard" }, { ru: "Клавиатура", tr: "Klavye", en: "Keyboard" },
  { ru: "Сенсорный экран", tr: "Dokunmatik ekran", en: "Touch screen" }, { ru: "Клавиатура и экран", tr: "Klavye ve dokunmatik", en: "Keyboard and touch" },
  { ru: "Один игрок", tr: "Tek oyuncu", en: "Single player" }, { ru: "Два игрока", tr: "İki oyuncu", en: "Two players" },
  { ru: "Настройки качества", tr: "Kalite ayarları", en: "Quality settings" }, { ru: "Технология", tr: "Teknoloji", en: "Technology" },
  { ru: "Уровень готовности", tr: "Hazırlık düzeyi", en: "Readiness level" }, { ru: "Выбрать автоматически", tr: "Otomatik seç", en: "Choose automatically" },
  { ru: "Готово к использованию", tr: "Kullanıma hazır", en: "Ready to use" }, { ru: "Быстрый прототип", tr: "Hızlı prototip", en: "Quick prototype" },
  { ru: "Адаптивность", tr: "Uyarlanabilir tasarım", en: "Responsive" }, { ru: "Проверка данных", tr: "Veri doğrulama", en: "Input validation" },
  { ru: "Обработка ошибок", tr: "Hata yönetimi", en: "Error handling" }, { ru: "Рабочие кнопки", tr: "Çalışan düğmeler", en: "Working buttons" },
  { ru: "Нехус создаст адаптивный сайт с рабочими кнопками и проверкой форм.", tr: "Nehus çalışan düğmeler ve form doğrulaması olan uyarlanabilir bir site oluşturur.", en: "Nehus will create a responsive site with working buttons and form validation." },
  { ru: "Нехус добавит проверку данных, обработку ошибок и пример запуска.", tr: "Nehus veri doğrulama, hata yönetimi ve çalıştırma örneği ekler.", en: "Nehus will add input validation, error handling, and a usage example." },
  { ru: "Режим чата", tr: "Sohbet modu", en: "Chat mode" }, { ru: "Размерность игры", tr: "Oyun boyutu", en: "Game dimension" },
  { ru: "Жанр игры", tr: "Oyun türü", en: "Game genre" }, { ru: "Сложность игры", tr: "Oyun zorluğu", en: "Game difficulty" },
  { ru: "Управление игрой", tr: "Oyun kontrolleri", en: "Game controls" }, { ru: "Количество игроков", tr: "Oyuncu sayısı", en: "Number of players" },
  { ru: "Технология проекта", tr: "Proje teknolojisi", en: "Project technology" },
  { ru: "Выберите класс ученика и нужный режим: Нехус может решить задание по фотографии, исправить готовый текст или создать новый текст по теме.", tr: "Öğrencinin sınıfını ve gerekli modu seçin: Nehus fotoğraftaki ödevi çözebilir, hazır metni düzeltebilir veya konuya göre yeni bir metin oluşturabilir.", en: "Choose the student's grade and a mode: Nehus can solve an assignment from a photo, edit an existing text, or create a new text from a topic." },
  { ru: "Четыре шага", tr: "Dört adım", en: "Four steps" }, { ru: "Добавьте фото или текст", tr: "Fotoğraf veya metin ekleyin", en: "Add a photo or text" },
  { ru: "Получите готовый ответ", tr: "Hazır yanıtı alın", en: "Get the finished answer" }, { ru: "Режим помощи с уроками", tr: "Ders yardımı modu", en: "Homework help mode" },
  { ru: "По фотографии", tr: "Fotoğraftan", en: "From a photo" }, { ru: "Исправить ошибки и стиль", tr: "Hataları ve üslubu düzelt", en: "Fix errors and style" },
  { ru: "По теме и требованиям", tr: "Konu ve isteklere göre", en: "From a topic and instructions" }, { ru: "Класс, предмет и пожелания", tr: "Sınıf, ders ve istekler", en: "Grade, subject, and instructions" },
  { ru: "Шаги 2–4", tr: "Adımlar 2–4", en: "Steps 2–4" }, { ru: "Пожелания к результату", tr: "Sonuç için istekler", en: "Result instructions" },
  { ru: "Нехус учитывает класс, предмет и ваши пожелания.", tr: "Nehus sınıfı, dersi ve isteklerinizi dikkate alır.", en: "Nehus considers the grade, subject, and your instructions." },
  { ru: "Редактирование текста", tr: "Metin düzenleme", en: "Text editing" }, { ru: "Создание текста", tr: "Metin oluşturma", en: "Text creation" },
];
const UI_LOOKUP = new Map<string, { ru: string; tr: string; en: string }>();
for (const entry of UI_TEXT) for (const value of Object.values(entry)) UI_LOOKUP.set(value, entry);

function translateUiValue(value: string, language: SiteLanguage) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const entry = UI_LOOKUP.get(trimmed);
  let translated = entry?.[language] || trimmed;
  const sourceCount = trimmed.match(/^(\d+) источников$/);
  if (sourceCount) translated = language === "tr" ? `${sourceCount[1]} kaynak` : language === "en" ? `${sourceCount[1]} sources` : trimmed;
  const optionCount = trimmed.match(/^(\d+) вариантов$/);
  if (optionCount) translated = language === "tr" ? `${optionCount[1]} seçenek` : language === "en" ? `${optionCount[1]} options` : trimmed;
  const grade = trimmed.match(/^(\d+) класс$/);
  if (grade) translated = language === "tr" ? `${grade[1]}. sınıf` : language === "en" ? `Grade ${grade[1]}` : trimmed;
  return value.replace(trimmed, translated);
}

function translateUiTree(root: ParentNode, language: SiteLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE && !["SCRIPT", "STYLE"].includes(node.parentElement?.tagName || "")) {
      const current = node.nodeValue || "";
      const translated = translateUiValue(current, language);
      if (translated !== current) node.nodeValue = translated;
    } else if (node instanceof HTMLElement) {
      for (const attribute of ["placeholder", "aria-label", "title"]) {
        const current = node.getAttribute(attribute);
        if (!current) continue;
        const translated = translateUiValue(current, language);
        if (translated !== current) node.setAttribute(attribute, translated);
      }
    }
    node = walker.nextNode();
  }
}

const INITIAL_MESSAGES: Message[] = [{
  id: "hello", role: "bot", time: "сейчас",
  text: "Привет! Я Нехус — помощник при любых делах. Могу объяснить сложное, придумать идею, составить план, проанализировать интернет или найти конкретный товар. С чего начнём?",
}];
const QUICK_PROMPTS = ["Помоги составить план", "Проанализируй тему", "Создай мини-игру"];
const CASUAL_PROMPTS = ["Как у тебя дела?", "Расскажи что-нибудь интересное", "Давай просто поговорим"];
const DEVELOPER_STAGES = ["Разбираю требования", "Строю алгоритм", "Создаю проект", "Проверяю и исправляю код"];
const DEVELOPER_HELPERS: Array<{ mode: DeveloperMode; label: string; description: string; prompt: string }> = [
  { mode: "game", label: "Создать игру", description: "Подготовить механику, цель и управление", prompt: "Создай законченную игру с понятной целью, стартом, победой или проигрышем, счётом, паузой и перезапуском." },
  { mode: "site", label: "Создать сайт", description: "Настроить структуру и рабочие кнопки", prompt: "Создай качественный адаптивный сайт. Все кнопки, навигация и выбранные формы должны работать." },
  { mode: "code", label: "Проверить код", description: "Найти ошибки и объяснить исправления", prompt: "Проанализируй следующий код, найди синтаксические и логические ошибки, исправь их и верни полностью рабочую версию:\n\n" },
  { mode: "code", label: "Создать инструмент", description: "Собрать готовую функцию или программу", prompt: "Создай законченный программный инструмент по моему описанию с проверкой входных данных, обработкой ошибок и примером запуска." },
];
const COUNTRY_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(" ");
const COUNTRY_API_NAMES: Record<string, string> = {
  BO: "Bolivia", BN: "Brunei", CD: "Democratic Republic of the Congo", CG: "Republic of the Congo",
  CI: "Ivory Coast", CZ: "Czech Republic", GB: "United Kingdom", IR: "Iran", KR: "South Korea",
  KP: "North Korea", LA: "Laos", MD: "Moldova", PS: "Palestine", RU: "Russia", SY: "Syria",
  TR: "Turkey", TW: "Taiwan", TZ: "Tanzania", US: "United States", VA: "Vatican City",
  VE: "Venezuela", VN: "Vietnam",
};

function uid(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function localeFor(language: SiteLanguage) { return language === "tr" ? "tr-TR" : language === "en" ? "en-US" : "ru-RU"; }
function mapSearchUrl(title: string, location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([title, location].filter(Boolean).join(", "))}`;
}

function checkMessage(text: string, settings: { toxicity: boolean; spam: boolean; links: boolean }) {
  const normalized = text.toLowerCase();
  const toxicWords = ["дурак", "идиот", "тупой", "ненавижу", "заткнись"];
  if (settings.toxicity && toxicWords.some((word) => normalized.includes(word))) return { blocked: true, reason: "Токсичная лексика" };
  const links = text.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (settings.links && links > 0) return { blocked: true, reason: "Внешняя ссылка" };
  if (settings.spam && /(.)\1{6,}/i.test(text)) return { blocked: true, reason: "Похожее на спам сообщение" };
  return { blocked: false, reason: "Нарушений не найдено" };
}

function localReply(text: string, language: SiteLanguage, chatMode: ChatMode = "assistant") {
  const query = text.toLowerCase();
  if (chatMode === "casual") {
    if (language === "tr") return "Buradayım ve seni dinliyorum. Gününden, fikirlerinden veya aklına gelen herhangi bir şeyden konuşabiliriz. Bugün nasıl hissediyorsun?";
    if (language === "en") return "I'm here and listening. We can talk about your day, your ideas, or anything else on your mind. How are you feeling today?";
    return "Я рядом и слушаю. Можем поговорить о вашем дне, мыслях или вообще о чём угодно. Как вы сегодня себя чувствуете?";
  }
  if (language === "tr") {
    if (query.includes("ödev") || query.includes("ders") || query.includes("soru")) return "Ders Yardımı bölümünü açın: ödev fotoğrafını yükleyin, sınıfı ve dersi seçin, ardından sorunuzu yazın. Koşulu inceleyip çözümü adım adım açıklayacağım.";
    if (query.includes("internet") || query.includes("araştır")) return "Ayrıntılı araştırma için Web Araştırma bölümünü açın. Birden fazla aramayı karşılaştırır ve doğrulanabilir bağlantılar gösteririm.";
    return "Ben Nehus'um. Bir konuyu açıklayabilir, yazabilir, hesaplayabilir, planlayabilir, interneti araştırabilir veya alışverişte yardımcı olabilirim. Ne yapmak istediğinizi yazın.";
  }
  if (language === "en") {
    if (query.includes("homework") || query.includes("lesson") || query.includes("problem")) return "Open Homework Help: upload a photo, choose the grade and subject, then write your question. I'll examine it and explain the solution step by step.";
    if (query.includes("internet") || query.includes("research")) return "Open Web Search for in-depth research. I compare several searches and show verifiable links.";
    return "I'm Nehus. I can explain, write, calculate, plan, research the web, or help with a purchase. Tell me what you need.";
  }
  if (query.includes("урок") || query.includes("задач") || query.includes("домаш")) return "Откройте вкладку «Помощь с уроками»: загрузите фотографию задания, выберите предмет и напишите вопрос. Я разберу условие и подробно объясню решение.";
  if (query.includes("привет") || query.includes("здрав")) return "Здравствуйте! Я на связи. Могу объяснить тему, помочь с уроками, составить план, исследовать интернет или найти товар в сети.";
  if (query.includes("план")) return "Конечно. Напишите цель и срок — я разобью задачу на понятные шаги, расставлю приоритеты и помогу начать с первого действия.";
  if (query.includes("интернет") || query.includes("анализ")) return "Для глубокого исследования откройте вкладку «Ищейка». Там я просматриваю несколько поисковых направлений, сравниваю источники и показываю ссылки.";
  return "Я Нехус — помощник при любых делах. Могу объяснить, написать, посчитать, придумать, спланировать, проанализировать информацию или помочь с покупкой. Расскажите, что нужно сделать.";
}

export default function Home() {
  const [siteLanguage, setSiteLanguage] = useState<SiteLanguage>("ru");
  const [activeTab, setActiveTab] = useState("chat");
  const [chatMode, setChatMode] = useState<ChatMode>("assistant");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [moderationLog, setModerationLog] = useState<ModerationEvent[]>([
    { id: "mod-1", text: "Подскажите срок доставки", result: "Разрешено", reason: "Нарушений не найдено", time: "10:32" },
    { id: "mod-2", text: "КУПИ СЕЙЧАС АААААААА", result: "Заблокировано", reason: "Похожее на спам сообщение", time: "10:28" },
  ]);
  const [moderationSettings, setModerationSettings] = useState({ toxicity: true, spam: false, links: false });
  const [testMessage, setTestMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"analysis" | "product">("analysis");
  const [searchCountryCode, setSearchCountryCode] = useState("TR");
  const [searchCity, setSearchCity] = useState("");
  const [searchDistrict, setSearchDistrict] = useState("");
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [productResult, setProductResult] = useState<ProductSearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [homeworkMode, setHomeworkMode] = useState<HomeworkMode>("solve");
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null);
  const [homeworkPreview, setHomeworkPreview] = useState("");
  const [homeworkSourceText, setHomeworkSourceText] = useState("");
  const [homeworkSubject, setHomeworkSubject] = useState("Математика");
  const [homeworkGrade, setHomeworkGrade] = useState("5");
  const [homeworkQuestion, setHomeworkQuestion] = useState("");
  const [homeworkResult, setHomeworkResult] = useState<HomeworkResult | null>(null);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [homeworkError, setHomeworkError] = useState("");
  const [homeworkStage, setHomeworkStage] = useState("Распознаю текст на фотографии…");
  const [homeworkProgress, setHomeworkProgress] = useState(0);
  const [developerMode, setDeveloperMode] = useState<DeveloperMode>("auto");
  const [developerPrompt, setDeveloperPrompt] = useState("");
  const [gameName, setGameName] = useState("");
  const [gameDimension, setGameDimension] = useState("2d");
  const [gameStyle, setGameStyle] = useState("neon");
  const [gameGenre, setGameGenre] = useState("arcade");
  const [gameDifficulty, setGameDifficulty] = useState("medium");
  const [gameControls, setGameControls] = useState("both");
  const [gamePlayers, setGamePlayers] = useState("1");
  const [developerStack, setDeveloperStack] = useState("auto");
  const [developerOutputLanguage, setDeveloperOutputLanguage] = useState<SiteLanguage>("ru");
  const [developerQuality, setDeveloperQuality] = useState("production");
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState("business");
  const [siteStyle, setSiteStyle] = useState("modern");
  const [siteColor, setSiteColor] = useState("lime");
  const [siteFeatures, setSiteFeatures] = useState<string[]>(["contact", "faq"]);
  const [developerResult, setDeveloperResult] = useState<DeveloperResult | null>(null);
  const [developerCode, setDeveloperCode] = useState("");
  const [developerRevision, setDeveloperRevision] = useState("");
  const [developerLoading, setDeveloperLoading] = useState(false);
  const [developerStageIndex, setDeveloperStageIndex] = useState(0);
  const [developerError, setDeveloperError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const countryOptions = useMemo(() => {
    const localizedNames = new Intl.DisplayNames([siteLanguage], { type: "region" });
    const englishNames = new Intl.DisplayNames(["en"], { type: "region" });
    return COUNTRY_CODES.map((code) => ({
      code,
      label: localizedNames.of(code) || code,
      apiName: COUNTRY_API_NAMES[code] || englishNames.of(code) || code,
    })).sort((a, b) => a.label.localeCompare(b.label, siteLanguage));
  }, [siteLanguage]);
  const selectedCountry = countryOptions.find((country) => country.code === searchCountryCode) || countryOptions[0];
  const searchLocation = [selectedCountry?.label, searchCity, searchDistrict].filter(Boolean).join(", ");
  const propertySearch = /дом|жиль|квартир|недвиж|коттедж|вилл|house|home|apartment|property|kiralık|аренд|снять/i.test(searchQuery);
  const homeworkCanSubmit = homeworkMode === "solve"
    ? Boolean(homeworkFile && homeworkPreview && homeworkQuestion.trim())
    : homeworkSourceText.trim().length >= 3;
  const developerBrief = developerMode === "game"
    ? `${gameName.trim() || "Без названия"} · ${gameDimension.toUpperCase()} · ${gameGenre} · ${gameStyle} · ${gameDifficulty} · ${gamePlayers === "2" ? "2 игрока" : "1 игрок"} · ${developerStack}`
    : developerMode === "site"
      ? `${siteName.trim() || "Без названия"} · ${siteType} · ${siteStyle} · ${siteColor} · ${siteFeatures.length ? siteFeatures.join(", ") : "без дополнительных блоков"} · ${developerStack}`
      : `${developerStack} · ${developerQuality === "production" ? "готово к использованию" : "прототип"}`;

  useEffect(() => {
    const saved = window.localStorage.getItem("nehus-language");
    if (saved === "ru" || saved === "tr" || saved === "en") setSiteLanguage(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = siteLanguage;
    window.localStorage.setItem("nehus-language", siteLanguage);
    const root = document.querySelector(".app-shell");
    if (!root) return;
    translateUiTree(root, siteLanguage);
    const observer = new MutationObserver((records) => records.forEach((record) => {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) translateUiTree(node as Element, siteLanguage);
        else if (node.nodeType === Node.TEXT_NODE && node.parentNode) translateUiTree(node.parentNode, siteLanguage);
      }
    }));
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [siteLanguage, activeTab, searchResult, productResult, homeworkResult, developerResult]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, isTyping]);
  useEffect(() => {
    if (activeTab !== "search" || !selectedCountry) return;
    const controller = new AbortController();
    setSearchCity(""); setSearchDistrict(""); setCityOptions([]); setDistrictOptions([]); setCitiesLoading(true);
    fetch(`/api/locations?country=${encodeURIComponent(selectedCountry.apiName)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setCityOptions(Array.isArray(data.items) ? data.items : []))
      .catch(() => setCityOptions([]))
      .finally(() => { if (!controller.signal.aborted) setCitiesLoading(false); });
    return () => controller.abort();
  }, [activeTab, selectedCountry]);

  useEffect(() => {
    if (activeTab !== "search" || !selectedCountry || !searchCity || !cityOptions.includes(searchCity)) {
      setDistrictOptions([]); setSearchDistrict(""); return;
    }
    const controller = new AbortController();
    setSearchDistrict(""); setDistrictOptions([]); setDistrictsLoading(true);
    fetch(`/api/locations?country=${encodeURIComponent(selectedCountry.apiName)}&state=${encodeURIComponent(searchCity)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setDistrictOptions(Array.isArray(data.items) ? data.items : []))
      .catch(() => setDistrictOptions([]))
      .finally(() => { if (!controller.signal.aborted) setDistrictsLoading(false); });
    return () => controller.abort();
  }, [activeTab, selectedCountry, searchCity, cityOptions]);
  function logModeration(text: string, result: ReturnType<typeof checkMessage>) {
    const event: ModerationEvent = {
      id: uid("mod"), text, result: result.blocked ? "Заблокировано" : "Разрешено", reason: result.reason,
      time: new Date().toLocaleTimeString(localeFor(siteLanguage), { hour: "2-digit", minute: "2-digit" }),
    };
    setModerationLog((current) => [event, ...current].slice(0, 12));
  }

  async function sendMessage(text = message) {
    const clean = text.trim();
    if (!clean || isTyping) return;
    const result = checkMessage(clean, moderationSettings);
    logModeration(clean, result);
    setMessages((current) => [...current, { id: uid("user"), role: "user", text: clean, time: "сейчас", blocked: result.blocked }]);
    setMessage("");
    if (result.blocked) {
      setMessages((current) => [...current, { id: uid("bot"), role: "bot", text: `Сообщение остановлено системой защиты: ${result.reason}. Переформулируйте его, пожалуйста.`, time: "сейчас" }]);
      toast.error("Сообщение заблокировано модератором");
      return;
    }
    setIsTyping(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, language: siteLanguage, chatMode, history: messages.slice(-8).map(({ role, text: content }) => ({ role: role === "bot" ? "assistant" : "user", content })) }),
      });
      const data = await response.json();
      setMessages((current) => [...current, { id: uid("bot"), role: "bot", text: data.reply || localReply(clean, siteLanguage, chatMode), time: "сейчас", sources: Array.isArray(data.sources) ? data.sources : [] }]);
    } catch {
      setMessages((current) => [...current, { id: uid("bot"), role: "bot", text: localReply(clean, siteLanguage, chatMode), time: "сейчас" }]);
    } finally { setIsTyping(false); }
  }

  function testModeration() {
    const clean = testMessage.trim();
    if (!clean) return;
    const result = checkMessage(clean, moderationSettings);
    logModeration(clean, result);
    toast[result.blocked ? "error" : "success"](result.blocked ? `Заблокировано: ${result.reason}` : "Сообщение безопасно");
    setTestMessage("");
  }
  async function runWebSearch(event?: FormEvent<HTMLFormElement>, suggestedQuery?: string) {
    event?.preventDefault();
    const query = (suggestedQuery ?? searchQuery).trim();
    if (!query || searchLoading) return;
    setSearchQuery(query); setSearchLoading(true); setSearchError(""); setSearchResult(null); setProductResult(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, language: siteLanguage, location: { country: selectedCountry?.label, city: searchCity, district: searchDistrict } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Поиск временно недоступен");
      setSearchResult(data);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Не удалось выполнить поиск");
    } finally {
      setSearchLoading(false);
    }
  }

  async function runProductSearch(event?: FormEvent<HTMLFormElement>, suggestedQuery?: string) {
    event?.preventDefault();
    const query = (suggestedQuery ?? searchQuery).trim();
    if (!query || searchLoading) return;
    setSearchQuery(query); setSearchLoading(true); setSearchError(""); setSearchResult(null); setProductResult(null);
    try {
      const response = await fetch("/api/product-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, language: siteLanguage, country: selectedCountry?.label, city: searchCity, district: searchDistrict }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось найти товар");
      setProductResult(data);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Поиск товара временно недоступен");
    } finally {
      setSearchLoading(false);
    }
  }

  function chooseSearchMode(mode: "analysis" | "product") {
    setSearchMode(mode); setSearchResult(null); setProductResult(null); setSearchError(""); setSearchQuery("");
  }

  function chooseHomeworkImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Выберите фотографию или изображение"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Размер изображения должен быть не больше 8 МБ"); return; }
    setHomeworkFile(file);
    setHomeworkResult(null);
    setHomeworkError("");
    const reader = new FileReader();
    reader.onload = () => setHomeworkPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function clearHomeworkImage() {
    setHomeworkFile(null); setHomeworkPreview(""); setHomeworkResult(null); setHomeworkError(""); setHomeworkProgress(0);
  }

  function chooseHomeworkMode(mode: HomeworkMode) {
    setHomeworkMode(mode); setHomeworkResult(null); setHomeworkError(""); setHomeworkProgress(0); setHomeworkQuestion(""); setHomeworkSourceText("");
  }

  async function solveHomework(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!homeworkCanSubmit || homeworkLoading) return;
    setHomeworkLoading(true); setHomeworkError(""); setHomeworkResult(null); setHomeworkProgress(0);
    setHomeworkStage(homeworkMode === "solve" ? "Загружаю бесплатный распознаватель текста…" : homeworkMode === "edit" ? "Редактирую текст…" : "Создаю текст…");
    let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | null = null;
    try {
      let extractedText = homeworkSourceText.trim();
      let confidence = 100;
      if (homeworkMode === "solve") {
        const { createWorker } = await import("tesseract.js");
        worker = await createWorker(siteLanguage === "tr" ? "tur+eng" : siteLanguage === "en" ? "eng" : "rus+eng", undefined, {
          logger: (event) => {
            if (event.status === "recognizing text") {
              setHomeworkStage("Распознаю текст на фотографии…");
              setHomeworkProgress(Math.max(1, Math.round((event.progress || 0) * 100)));
            } else if (event.status) {
              setHomeworkStage("Подготавливаю распознавание…");
            }
          },
        });
        const recognition = await worker.recognize(homeworkPreview);
        extractedText = recognition.data.text.replace(/\s+/g, " ").trim();
        confidence = Math.round(recognition.data.confidence || 0);
        if (extractedText.length < 3) throw new Error("Текст на фотографии не распознан. Сделайте более чёткий снимок или напишите условие в поле вопроса.");
        setHomeworkStage("Ищу правила и объяснения в интернете…");
      }
      setHomeworkProgress(100);
      const response = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: homeworkMode, extractedText, confidence, subject: homeworkSubject, grade: homeworkGrade, language: siteLanguage, question: homeworkQuestion.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (homeworkMode === "solve" ? "Не удалось разобрать задание" : "Не удалось подготовить текст"));
      setHomeworkResult(data);
    } catch (error) {
      setHomeworkError(error instanceof Error ? error.message : homeworkMode === "solve" ? "Не удалось разобрать задание" : "Не удалось подготовить текст");
    } finally {
      await worker?.terminate();
      setHomeworkLoading(false);
    }
  }

  function toggleSiteFeature(feature: string) {
    setSiteFeatures((current) => current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]);
  }

  function applyDeveloperHelper(helper: (typeof DEVELOPER_HELPERS)[number]) {
    setDeveloperMode(helper.mode);
    setDeveloperPrompt(helper.prompt);
    setDeveloperResult(null); setDeveloperCode(""); setDeveloperRevision(""); setDeveloperError("");
    if (helper.mode === "game") { setGameGenre("arcade"); setGameDimension("2d"); setDeveloperStack("html"); }
    if (helper.mode === "site") { setDeveloperStack("html"); setSiteFeatures(["contact", "faq"]); }
    if (helper.mode === "code") setDeveloperStack("auto");
    toast.success(`Режим «${helper.label}» настроен — дополните задание`);
  }

  async function generateDeveloperProject(event?: FormEvent<HTMLFormElement>, suggestedPrompt?: string, revision?: string) {
    event?.preventDefault();
    const prompt = (suggestedPrompt ?? developerPrompt).trim();
    if (!prompt || developerLoading) return;
    const feedback = (revision || "").trim();
    setDeveloperPrompt(prompt); setDeveloperLoading(true); setDeveloperStageIndex(feedback ? 2 : 0); setDeveloperError("");
    if (!feedback) { setDeveloperResult(null); setDeveloperCode(""); }
    const stageTimer = window.setInterval(() => setDeveloperStageIndex((current) => Math.min(current + 1, DEVELOPER_STAGES.length - 1)), 950);
    try {
      const response = await fetch("/api/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate", prompt, mode: developerMode, language: siteLanguage, outputLanguage: developerOutputLanguage,
          feedback,
          existingCode: feedback ? developerCode : "",
          options: {
            gameName, dimension: gameDimension, style: gameStyle, genre: gameGenre, difficulty: gameDifficulty,
            controls: gameControls, players: gamePlayers, stack: developerStack, quality: developerQuality,
            siteName, siteType, siteStyle, siteColor, siteFeatures,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось создать проект");
      setDeveloperResult(data); setDeveloperCode(data.code || ""); setDeveloperRevision("");
    } catch (error) {
      setDeveloperError(error instanceof Error ? error.message : "Не удалось создать проект");
    } finally {
      window.clearInterval(stageTimer);
      setDeveloperLoading(false);
    }
  }

  async function analyzeDeveloperCode() {
    if (!developerResult || !developerCode.trim() || developerLoading) return;
    setDeveloperLoading(true); setDeveloperStageIndex(DEVELOPER_STAGES.length - 1); setDeveloperError("");
    try {
      const response = await fetch("/api/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze", prompt: developerPrompt, mode: developerMode, language: siteLanguage, outputLanguage: developerOutputLanguage,
          existingCode: developerCode, title: developerResult.title, filename: developerResult.filename, engine: developerResult.engine,
          resultLanguage: developerResult.language, previewable: developerResult.previewable,
          options: {
            gameName, dimension: gameDimension, style: gameStyle, genre: gameGenre, difficulty: gameDifficulty,
            controls: gameControls, players: gamePlayers, stack: developerStack, quality: developerQuality,
            siteName, siteType, siteStyle, siteColor, siteFeatures,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось проверить код");
      setDeveloperResult(data); setDeveloperCode(data.code || developerCode);
      toast.success(data.validation?.status === "needs_review" ? "Проверка завершена: остались замечания" : "Код проверен — критических ошибок нет");
    } catch (error) {
      setDeveloperError(error instanceof Error ? error.message : "Не удалось проверить код");
    } finally {
      setDeveloperLoading(false);
    }
  }

  async function copyDeveloperCode() {
    try {
      await navigator.clipboard.writeText(developerCode);
      toast.success("Код скопирован");
    } catch { toast.error("Не удалось скопировать код"); }
  }

  function downloadDeveloperCode() {
    if (!developerResult || !developerCode) return;
    const blob = new Blob([developerCode], { type: developerResult.previewable ? "text/html;charset=utf-8" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = developerResult.filename || "project.txt"; link.click();
    URL.revokeObjectURL(url);
    toast.success("Файл скачан");
  }

  return (
    <main className="app-shell">
      <Toaster position="top-center" richColors />
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10 min-h-screen">
        <header className="topbar">
          <button className="brand" onClick={() => setActiveTab("chat")} aria-label="Открыть помощника Нехус">
            <span className="brand-mark logo-mark"><img src="/nexus-logo.png" alt="" /></span><span className="brand-copy"><b>НЕХУС</b><small>Помощник при любых делах</small></span><Badge className="beta-badge">AI</Badge>
          </button>
          <TabsList className="nav-tabs">
            <TabsTrigger value="chat"><MessageSquareText size={16} /> Чат</TabsTrigger>
            <TabsTrigger value="search"><Search size={16} /> Ищейка</TabsTrigger>
            <TabsTrigger value="developer"><Code2 size={16} /> Программист</TabsTrigger>
            <TabsTrigger value="homework"><GraduationCap size={16} /> Помощь с уроками</TabsTrigger>
            <TabsTrigger value="moderation"><ShieldCheck size={16} /> Модерация</TabsTrigger>
          </TabsList>
          <div className="top-actions">
            <Select value={siteLanguage} onValueChange={(value) => setSiteLanguage(value as SiteLanguage)}>
              <SelectTrigger className="language-switch" aria-label="Язык сайта"><Globe2 size={15} /><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ru">Русский</SelectItem><SelectItem value="tr">Türkçe</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
            </Select>
            <div className="live-pill"><span /> Нехус онлайн</div>
          </div>
        </header>
        <div className="mobile-nav"><TabsList className="mobile-tabs"><TabsTrigger value="chat" aria-label="Чат"><MessageSquareText size={18} /></TabsTrigger><TabsTrigger value="search" aria-label="Ищейка"><Search size={18} /></TabsTrigger><TabsTrigger value="developer" aria-label="Программист"><Code2 size={18} /></TabsTrigger><TabsTrigger value="homework" aria-label="Помощь с уроками"><GraduationCap size={18} /></TabsTrigger><TabsTrigger value="moderation" aria-label="Модерация"><ShieldCheck size={18} /></TabsTrigger></TabsList></div>

        <TabsContent value="chat" className="page-frame chat-page">
          <section className="chat-card">
            <div className="chat-heading"><div className="chat-heading-copy"><span className="eyebrow">Нехус · помощник при любых делах</span><h1>{chatMode === "casual" ? "Поболтаем?" : "Чем я могу помочь?"}</h1><div className="chat-mode-switch" role="group" aria-label="Режим чата"><button type="button" className={chatMode === "assistant" ? "active" : ""} onClick={() => setChatMode("assistant")}><Sparkles size={13} /> Рабочий помощник</button><button type="button" className={chatMode === "casual" ? "active" : ""} onClick={() => setChatMode("casual")}><MessageSquareText size={13} /> Просто поболтать</button></div></div><div className="bot-avatar logo-avatar"><img src="/nexus-logo.png" alt="Логотип Нехус" /></div></div>
            <div className="message-stream" ref={scrollRef} aria-live="polite">
              {messages.map((item) => <div key={item.id} className={`message-row ${item.role === "user" ? "message-user" : "message-bot"}`}><div className="message-icon">{item.role === "bot" ? <Bot size={17} /> : <UserRound size={17} />}</div><div className={`message-bubble ${item.blocked ? "blocked" : ""}`}><p>{item.text}</p>{item.sources && item.sources.length > 0 && <div className="chat-sources"><b>Подходящие источники</b>{item.sources.map((source, index) => <a href={source.url} target="_blank" rel="noreferrer" key={`${source.url}-${index}`}><span>{index + 1}</span><div><strong>{source.title}</strong><small>{source.domain}</small></div><ExternalLink size={13} /></a>)}</div>}<span>{item.time}</span></div></div>)}
              {isTyping && <div className="message-row message-bot"><div className="message-icon"><Bot size={17} /></div><div className="typing"><i /><i /><i /></div></div>}
            </div>
            <div className="quick-prompts">{(chatMode === "casual" ? CASUAL_PROMPTS : QUICK_PROMPTS).map((prompt) => <button key={prompt} onClick={() => sendMessage(prompt)}>{prompt}<ArrowRight size={14} /></button>)}</div>
            <form className="composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}><Textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder={chatMode === "casual" ? "Напишите, о чём хочется поговорить…" : "Напишите сообщение…"} aria-label="Сообщение боту" /><Button type="submit" size="icon" disabled={!message.trim() || isTyping} aria-label="Отправить"><Send size={18} /></Button></form>
          </section>
          <aside className="chat-sidebar">
            <div className="side-card glow-card"><div className="side-logo-full"><img src="/nexus-logo.png" alt="Логотип Нехус" /></div><span className="eyebrow">НЕХУС AI</span><h2>Один помощник.<br />Для любых дел.</h2><div className="power-list"><div><Check size={15} /><span><b>Ответы по существу</b><small>Учитывает вопрос и контекст</small></span></div><div><Check size={15} /><span><b>Проверяемый интернет</b><small>Читает страницы и показывает ссылки</small></span></div><div><Check size={15} /><span><b>Режим программиста</b><small>Код, сайты и мини-игры</small></span></div></div></div>
            <div className="side-card compact-card"><div className="pulse-ring"><Headphones size={19} /></div><div><b>Поддержка 24/7</b><span>Средний ответ — 2 секунды</span></div></div>
          </aside>
        </TabsContent>

        <TabsContent value="search" className="page-frame search-page">
          <section className="search-hero">
            <div className="search-orbit brand-orbit" aria-hidden="true"><img src="/nexus-logo.png" alt="" /><i /><i /><i /></div>
            <div className="search-mode-switch" role="group" aria-label="Режим поиска">
              <button className={searchMode === "analysis" ? "active" : ""} onClick={() => chooseSearchMode("analysis")}><Radar size={15} /> Анализировать интернет</button>
              <button className={searchMode === "product" ? "active" : ""} onClick={() => chooseSearchMode("product")}><PackageSearch size={15} /> Найти конкретный товар</button>
            </div>
            <div className="location-picker" aria-label="Место поиска">
              <div className="location-picker-title"><MapPin size={15} /><span>{searchMode === "analysis" ? "Где анализировать" : "Где искать товар"}</span><Badge variant="outline">{searchLocation}</Badge></div>
              <div className="location-fields">
                <label><span>Страна</span><Select value={searchCountryCode} onValueChange={setSearchCountryCode}><SelectTrigger aria-label="Страна поиска"><SelectValue /></SelectTrigger><SelectContent className="country-list">{countryOptions.map((country) => <SelectItem value={country.code} key={country.code}>{country.label}</SelectItem>)}</SelectContent></Select></label>
                <label><span>Город / регион</span>{citiesLoading || cityOptions.length > 0 ? <Select value={searchCity} onValueChange={setSearchCity} disabled={citiesLoading}><SelectTrigger aria-label="Город или регион"><SelectValue placeholder={citiesLoading ? "Загружаю…" : "Выберите"} /></SelectTrigger><SelectContent>{cityOptions.map((city) => <SelectItem value={city} key={city}>{city}</SelectItem>)}</SelectContent></Select> : <Input value={searchCity} onChange={(event) => setSearchCity(event.target.value)} placeholder="Введите город" aria-label="Город или регион" />}</label>
                <label><span>Район / населённый пункт</span>{districtsLoading || districtOptions.length > 0 ? <Select value={searchDistrict} onValueChange={setSearchDistrict} disabled={districtsLoading}><SelectTrigger aria-label="Район или населённый пункт"><SelectValue placeholder={districtsLoading ? "Загружаю…" : "Выберите"} /></SelectTrigger><SelectContent>{districtOptions.map((district) => <SelectItem value={district} key={district}>{district}</SelectItem>)}</SelectContent></Select> : <Input value={searchDistrict} onChange={(event) => setSearchDistrict(event.target.value)} placeholder={searchCity ? "Введите район" : "Сначала город"} disabled={!searchCity} aria-label="Район или населённый пункт" />}</label>
              </div>
            </div>
            <Badge className="search-badge"><Radar size={13} /> Нехус исследует открытый интернет</Badge>
            <h1>{searchMode === "analysis" ? "МОЩНЫЙ АНАЛИЗ" : "ПОИСК ТОВАРА"}</h1>
            <p>{searchMode === "analysis" ? "Разбивает вопрос на несколько поисковых направлений, изучает до 16 источников, сравнивает факты и собирает подробный ответ со ссылками." : "Ищет конкретный товар в интернет-магазинах, показывает названия, найденные цены, характеристики, продавцов и прямые ссылки."}</p>
            {searchMode === "analysis" ? <form className="web-search-form" onSubmit={(event) => runWebSearch(event)}>
              <Search size={22} /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Что нужно глубоко исследовать?" aria-label="Запрос для глубокого анализа интернета" />
              <Button type="submit" disabled={!searchQuery.trim() || searchLoading}>{searchLoading ? "Анализирую…" : "Исследовать"}<ArrowRight size={17} /></Button>
            </form> : <form className="web-search-form product-search-form" onSubmit={(event) => runProductSearch(event)}>
              <PackageSearch size={22} /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Точное название товара или модель" aria-label="Название товара" />
              <Button type="submit" disabled={!searchQuery.trim() || searchLoading}>{searchLoading ? "Ищу…" : "Найти товар"}<ArrowRight size={17} /></Button>
            </form>}
            {!searchResult && !productResult && !searchLoading && !searchError && <div className="search-suggestions"><span>Например:</span>{(searchMode === "analysis" ? ["Новости технологий сегодня", "Лучшие электромобили 2026", "Как работает искусственный интеллект"] : ["iPhone 16 Pro 256 GB", "Xiaomi Electric Scooter 4 Ultra", "LEGO Technic Range Rover"]).map((item) => <button key={item} onClick={() => searchMode === "analysis" ? runWebSearch(undefined, item) : runProductSearch(undefined, item)}>{item}</button>)}</div>}
          </section>

          {searchLoading && <section className="search-progress" aria-live="polite"><div className="scanner"><span /></div><div><b>{searchMode === "analysis" ? "Нехус глубоко исследует интернет" : "Нехус ищет предложения магазинов"}</b><p>{searchMode === "analysis" ? "Запускает несколько поисков, читает результаты и сравнивает источники…" : "Собирает названия, цены, детали и прямые ссылки на товары…"}</p></div><div className="progress-steps"><span className="done"><Check size={13} /> Запрос принят</span><span className="active"><Radar size={13} /> {searchMode === "analysis" ? "Сканирование сети" : "Поиск магазинов"}</span><span><Sparkles size={13} /> Проверка результатов</span></div></section>}

          {searchError && <section className="search-error"><Globe2 size={25} /><div><b>Поиск не завершён</b><p>{searchError}</p></div><Button variant="outline" onClick={() => searchMode === "analysis" ? runWebSearch() : runProductSearch()}>Повторить</Button></section>}

          {searchResult && !searchLoading && <div className="search-results">
            <section className="analysis-card">
              <div className="analysis-heading"><div className="analysis-icon"><Sparkles size={20} /></div><div><span className="eyebrow">Анализ найденного</span><h2>{searchQuery}</h2></div><Badge variant="outline">{searchResult.sources.length} источников</Badge></div>
              <div className="analysis-copy">{searchResult.answer.split("\n").filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
              <div className="analysis-footer"><span><Globe2 size={14} /> Поиск выполнен {searchResult.searchedAt}</span><Button variant="outline" size="sm" onClick={() => runWebSearch()}>Обновить поиск</Button></div>
            </section>
            <section className="sources-section"><div className="sources-heading"><div><span className="eyebrow">{propertySearch ? "Проверяемые ссылки и GPS" : "Проверяемые ссылки"}</span><h2>Источники</h2></div><span>{propertySearch ? "Откройте объявление или найдите место на карте" : "Откройте источник и проверьте сведения"}</span></div><div className="source-grid">{searchResult.sources.map((source, index) => <article className="source-card source-result-card" key={`${source.url}-${index}`}><div className="source-number">{String(index + 1).padStart(2, "0")}</div><div className="source-copy"><span>{source.domain}</span><h3>{source.title}</h3>{(source.price || source.area) && <div className="fact-badges">{source.price && <Badge>{source.price}</Badge>}{source.area && <Badge variant="outline">{source.area}</Badge>}</div>}<p>{source.snippet}</p></div><div className="source-actions"><Button asChild size="sm"><a href={source.url} target="_blank" rel="noreferrer">Ссылка <ExternalLink size={14} /></a></Button>{propertySearch && <Button asChild size="sm" variant="outline"><a href={mapSearchUrl(source.title, searchResult.location)} target="_blank" rel="noreferrer">Карта / GPS <Navigation size={14} /></a></Button>}</div></article>)}</div></section>
          </div>}

          {productResult && !searchLoading && <div className="product-search-results">
            <section className="product-summary"><div className="analysis-icon"><PackageSearch size={21} /></div><div><span className="eyebrow">Нехус сравнил предложения</span><h2>{searchQuery}</h2><p>{productResult.summary}</p></div><Badge variant="outline">{productResult.offers.length} вариантов</Badge></section>
            <section className="offers-section"><div className="sources-heading"><div><span className="eyebrow">{propertySearch ? "Цены, площади, ссылки и GPS" : "Цены и прямые ссылки"}</span><h2>Предложения в сети</h2></div><span>{propertySearch ? "Карта ищет объект в выбранном районе" : "Откройте карточку товара у продавца"}</span></div><div className="offers-grid">{productResult.offers.map((offer, index) => <article className="offer-card" key={`${offer.url}-${index}`}><div className="offer-top"><div className="offer-store"><span>{String(index + 1).padStart(2, "0")}</span><div><b>{offer.marketplace}</b><small>{offer.domain}</small></div></div><div className="offer-facts"><Badge className={/^(Цена|Fiyat|Price)/.test(offer.price) ? "price-badge muted-price" : "price-badge"}>{offer.price}</Badge>{offer.area && <Badge variant="outline" className="area-badge">{offer.area}</Badge>}</div></div><h3>{offer.title}</h3><p>{offer.details}</p><div className="offer-footer"><span><Tags size={14} /> Найдено для: {productResult.country}</span><div className="offer-actions"><Button asChild><a href={offer.url} target="_blank" rel="noreferrer">Ссылка <ExternalLink size={15} /></a></Button>{propertySearch && <Button asChild variant="outline"><a href={mapSearchUrl(offer.title, productResult.country)} target="_blank" rel="noreferrer">Карта / GPS <Navigation size={15} /></a></Button>}</div></div></article>)}</div><div className="product-result-footer"><span><Globe2 size={14} /> Поиск выполнен {productResult.searchedAt}</span><Button variant="outline" size="sm" onClick={() => runProductSearch()}>Обновить данные</Button></div></section>
          </div>}
        </TabsContent>

        <TabsContent value="developer" className="page-frame developer-page">
          <section className="developer-hero">
            <div className="developer-heading">
              <div className="developer-mark"><Code2 size={28} /></div>
              <div><span className="eyebrow">Нехус · помощь программисту</span><h1>Опишите задачу — получите готовый код</h1><p>Нехус помогает с функциями и инструментами, пишет код, создаёт одностраничные сайты и рабочие мини-игры. Результат можно изменить, запустить, скопировать или скачать.</p></div>
            </div>
            <form className="developer-form" onSubmit={(event) => generateDeveloperProject(event)}>
              <div className="developer-mode" role="group" aria-label="Тип проекта">
                {([[
                  "auto", "Определить самому", Sparkles,
                ], ["code", "Код / инструмент", Code2], ["game", "Мини-игра", Gamepad2], ["site", "Сайт", Globe2]] as const).map(([value, label, Icon]) => <button type="button" className={developerMode === value ? "active" : ""} onClick={() => { setDeveloperMode(value); if ((value === "site" || value === "game") && !["auto", "html"].includes(developerStack)) setDeveloperStack("html"); }} key={value}><Icon size={16} /> {label}</button>)}
              </div>
              <section className="developer-config developer-language-config">
                <div className="developer-config-heading"><Code2 size={18} /><div><b>Язык и среда реализации</b><span>Выберите технологию кода и язык всех надписей внутри будущего проекта.</span></div></div>
                <div className="developer-config-grid compact-grid">
                  <label><span>Язык кода / технология</span><Select value={developerStack} onValueChange={setDeveloperStack}><SelectTrigger aria-label="Язык программирования"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Выбрать автоматически</SelectItem><SelectItem value="html">HTML / CSS / JavaScript</SelectItem>{(developerMode === "code" || developerMode === "auto") && <><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="typescript">TypeScript</SelectItem><SelectItem value="python">Python</SelectItem></>}</SelectContent></Select></label>
                  <label><span>Язык текста проекта</span><Select value={developerOutputLanguage} onValueChange={(value) => setDeveloperOutputLanguage(value as SiteLanguage)}><SelectTrigger aria-label="Язык текста проекта"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ru">Русский</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="tr">Türkçe</SelectItem></SelectContent></Select></label>
                </div>
                {(developerMode === "site" || developerMode === "game") && <p className="language-hint">Игры и сайты запускаются прямо в браузере, поэтому для них используется HTML, CSS и JavaScript.</p>}
              </section>
              {developerMode === "game" && <section className="developer-config game-config">
                <div className="developer-config-heading"><Gamepad2 size={18} /><div><b>Конструктор игры</b><span>Выберите характеристики — Нехус учтёт их в механике, графике и управлении.</span></div></div>
                <div className="developer-config-grid">
                  <label><span>Название игры</span><Input value={gameName} onChange={(event) => setGameName(event.target.value)} placeholder="Например: Звёздный гонщик" aria-label="Название игры" /></label>
                  <label><span>Размерность</span><Select value={gameDimension} onValueChange={setGameDimension}><SelectTrigger aria-label="Размерность игры"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2d">2D</SelectItem><SelectItem value="3d">3D</SelectItem></SelectContent></Select></label>
                  <label><span>Стиль игры</span><Select value={gameStyle} onValueChange={setGameStyle}><SelectTrigger aria-label="Стиль игры"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pixel">Пиксельный</SelectItem><SelectItem value="cartoon">Мультяшный</SelectItem><SelectItem value="realistic">Реалистичный</SelectItem><SelectItem value="neon">Неоновый</SelectItem><SelectItem value="minimal">Минималистичный</SelectItem></SelectContent></Select></label>
                  <label><span>Жанр</span><Select value={gameGenre} onValueChange={setGameGenre}><SelectTrigger aria-label="Жанр игры"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="arcade">Аркада</SelectItem><SelectItem value="platformer">Платформер</SelectItem><SelectItem value="racing">Гонки</SelectItem><SelectItem value="puzzle">Головоломка</SelectItem><SelectItem value="shooter">Шутер</SelectItem><SelectItem value="strategy">Стратегия</SelectItem></SelectContent></Select></label>
                  <label><span>Сложность</span><Select value={gameDifficulty} onValueChange={setGameDifficulty}><SelectTrigger aria-label="Сложность игры"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="easy">Лёгкая</SelectItem><SelectItem value="medium">Средняя</SelectItem><SelectItem value="hard">Сложная</SelectItem></SelectContent></Select></label>
                  <label><span>Управление</span><Select value={gameControls} onValueChange={setGameControls}><SelectTrigger aria-label="Управление игрой"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="keyboard">Клавиатура</SelectItem><SelectItem value="touch">Сенсорный экран</SelectItem><SelectItem value="both">Клавиатура и экран</SelectItem></SelectContent></Select></label>
                  <label><span>Игроки</span><Select value={gamePlayers} onValueChange={setGamePlayers}><SelectTrigger aria-label="Количество игроков"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Один игрок</SelectItem><SelectItem value="2">Два игрока</SelectItem></SelectContent></Select></label>
                </div>
              </section>}
              {developerMode === "site" && <section className="developer-config site-config">
                <div className="developer-config-heading"><Globe2 size={18} /><div><b>Конструктор сайта</b><span>Задайте название, назначение и оформление. Нехус использует именно эти параметры.</span></div></div>
                <div className="developer-config-grid site-config-grid">
                  <label><span>Название сайта</span><Input value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="Например: Green House" aria-label="Название сайта" /></label>
                  <label><span>Тип сайта</span><Select value={siteType} onValueChange={setSiteType}><SelectTrigger aria-label="Тип сайта"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="business">Бизнес / услуги</SelectItem><SelectItem value="portfolio">Портфолио</SelectItem><SelectItem value="store">Каталог товаров</SelectItem><SelectItem value="blog">Блог</SelectItem><SelectItem value="education">Обучение</SelectItem></SelectContent></Select></label>
                  <label><span>Стиль</span><Select value={siteStyle} onValueChange={setSiteStyle}><SelectTrigger aria-label="Стиль сайта"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="modern">Современный</SelectItem><SelectItem value="premium">Премиальный</SelectItem><SelectItem value="bright">Яркий</SelectItem><SelectItem value="minimal">Минималистичный</SelectItem></SelectContent></Select></label>
                  <label><span>Основной цвет</span><Select value={siteColor} onValueChange={setSiteColor}><SelectTrigger aria-label="Основной цвет сайта"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lime">Зелёный</SelectItem><SelectItem value="blue">Синий</SelectItem><SelectItem value="violet">Фиолетовый</SelectItem><SelectItem value="orange">Оранжевый</SelectItem></SelectContent></Select></label>
                </div>
                <div className="site-feature-picker"><span>Рабочие блоки</span><div>{[["contact", "Форма связи"], ["pricing", "Цены"], ["gallery", "Галерея"], ["faq", "Вопросы и ответы"]].map(([value, label]) => <button type="button" className={siteFeatures.includes(value) ? "active" : ""} onClick={() => toggleSiteFeature(value)} key={value}><Check size={12} /> {label}</button>)}</div></div>
              </section>}
              {(developerMode === "code" || developerMode === "site") && <section className="developer-config quality-config">
                <div className="developer-config-heading"><ShieldCheck size={18} /><div><b>Настройки качества</b><span>{developerMode === "site" ? "Нехус создаст адаптивный сайт с рабочими кнопками и проверкой форм." : "Нехус добавит проверку данных, обработку ошибок и пример запуска."}</span></div></div>
                <div className="developer-config-grid quality-grid">
                  <label><span>Уровень готовности</span><Select value={developerQuality} onValueChange={setDeveloperQuality}><SelectTrigger aria-label="Уровень готовности"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="production">Готово к использованию</SelectItem><SelectItem value="prototype">Быстрый прототип</SelectItem></SelectContent></Select></label>
                </div>
                <div className="quality-points"><span><Check size={12} /> Адаптивность</span><span><Check size={12} /> Проверка данных</span><span><Check size={12} /> Обработка ошибок</span><span><Check size={12} /> Рабочие кнопки</span></div>
              </section>}
              <label className="developer-task"><span>Что проект должен делать</span><Textarea value={developerPrompt} onChange={(event) => setDeveloperPrompt(event.target.value)} placeholder="Опишите цель, поведение кнопок, правила игры, нужные тексты и всё, что обязательно должно работать" aria-label="Задание программисту" /></label>
              <div className="brief-check"><div><Check size={15} /><span><b>Нехус получил настройки</b><small>{developerBrief}</small></span></div><em>Сначала выполняется ваше описание, затем выбранные параметры.</em></div>
              <div className="developer-submit"><span><ShieldCheck size={14} /> Код можно проверить и изменить до скачивания</span><Button type="submit" size="lg" disabled={!developerPrompt.trim() || developerLoading}>{developerLoading ? "Создаю…" : "Создать проект"}<Sparkles size={17} /></Button></div>
            </form>
            {!developerResult && !developerLoading && !developerError && <div className="developer-suggestions"><span>Вспомогательные сценарии</span><div>{DEVELOPER_HELPERS.map((helper) => <button type="button" key={helper.label} onClick={() => applyDeveloperHelper(helper)}><div><b>{helper.label}</b><small>{helper.description}</small></div><ArrowRight size={14} /></button>)}</div></div>}
          </section>

          {developerLoading && <section className="developer-loading" aria-live="polite"><div className="scanner"><span /></div><div className="developer-stage-copy"><b>{DEVELOPER_STAGES[developerStageIndex]}</b><p>Нехус последовательно выполняет требования и не пропускает проверку.</p><div className="developer-stage-list">{DEVELOPER_STAGES.map((stage, index) => <span className={index < developerStageIndex ? "done" : index === developerStageIndex ? "active" : ""} key={stage}><b>{index + 1}</b>{stage}</span>)}</div></div></section>}
          {developerError && <section className="search-error"><Code2 size={25} /><div><b>Проект не создан</b><p>{developerError}</p></div><Button variant="outline" onClick={() => generateDeveloperProject()}>Повторить</Button></section>}

          {developerResult && !developerLoading && <section className="developer-result">
            <div className="developer-result-head"><div><span className="eyebrow">Готовый проект · {developerResult.language}</span><h2>{developerResult.title}</h2><p>{developerResult.explanation}</p></div><Badge variant="outline">{developerResult.engine === "ai" ? "Создано ИИ" : "Проверенный шаблон"}</Badge></div>
            <div className={`developer-workspace ${developerResult.previewable ? "with-preview" : ""}`}>
              <div className="code-panel">
                <div className="code-toolbar"><div><span className="code-dot red" /><span className="code-dot yellow" /><span className="code-dot green" /><b>{developerResult.filename}</b></div><span>{developerCode.length.toLocaleString("ru-RU")} символов</span></div>
                <Textarea value={developerCode} onChange={(event) => setDeveloperCode(event.target.value)} spellCheck={false} aria-label="Редактор кода" />
              </div>
              {developerResult.previewable && <div className="preview-panel"><div className="preview-toolbar"><span><Play size={14} /> Живой запуск</span><b>Изменения обновляются сразу</b></div><iframe srcDoc={developerCode} title={`Предпросмотр ${developerResult.title}`} sandbox="allow-scripts" /></div>}
            </div>
            {developerResult.validation && <div className={`code-validation ${developerResult.validation.status}`}><div><ShieldCheck size={19} /><span><b>{developerResult.validation.status === "needs_review" ? "Нужна дополнительная проверка" : developerResult.validation.status === "repaired" ? "Ошибки найдены и исправлены" : "Код прошёл проверку"}</b><small>{developerResult.validation.checks.join(" · ")} · циклов проверки: {developerResult.validation.attempts}</small></span></div>{developerResult.validation.issues.length > 0 && <ul>{developerResult.validation.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}<Button variant="outline" onClick={analyzeDeveloperCode} disabled={developerLoading}><ShieldCheck size={15} /> Проверить и исправить ещё раз</Button></div>}
            <div className="developer-revision"><div><Sparkles size={18} /><span><b>Что нужно исправить в готовом проекте?</b><small>Например: «сделай героя быстрее», «добавь форму заказа» или «измени цвет на зелёный».</small></span></div><Textarea value={developerRevision} onChange={(event) => setDeveloperRevision(event.target.value)} placeholder="Напишите точные изменения — Нехус пересоберёт этот проект, сохранив исходную задачу" aria-label="Изменения готового проекта" /><Button onClick={() => generateDeveloperProject(undefined, developerPrompt, developerRevision)} disabled={developerRevision.trim().length < 3 || developerLoading}>{developerLoading ? "Переделываю…" : "Применить изменения"}<ArrowRight size={15} /></Button></div>
            <div className="developer-actions"><Button variant="outline" onClick={copyDeveloperCode}><Copy size={16} /> Копировать код</Button><Button onClick={downloadDeveloperCode}><Download size={16} /> Скачать {developerResult.filename}</Button><Button variant="ghost" onClick={() => { setDeveloperResult(null); setDeveloperCode(""); setDeveloperPrompt(""); }}>Новая задача</Button></div>
          </section>}
        </TabsContent>

        <TabsContent value="homework" className="page-frame homework-page">
          <section className="homework-hero">
            <div className="homework-title">
              <div className="homework-icon"><GraduationCap size={27} /></div>
              <div><span className="eyebrow">Нехус · бесплатный помощник</span><h1>Помощь с уроками</h1><p>Выберите класс ученика и нужный режим: Нехус может решить задание по фотографии, исправить готовый текст или создать новый текст по теме.</p></div>
            </div>
            <Badge className="free-badge"><Check size={14} /> Бесплатно · без карты и подписки</Badge>
            <div className="homework-steps" aria-label="Четыре шага">
              <span><b>1</b> Выберите, что нужно сделать</span><span><b>2</b> Выберите класс</span><span><b>3</b> Добавьте фото или текст</span><span><b>4</b> Получите готовый ответ</span>
            </div>
          </section>

          <div className="homework-mode-switch" role="group" aria-label="Режим помощи с уроками">
            <button type="button" className={homeworkMode === "solve" ? "active" : ""} onClick={() => chooseHomeworkMode("solve")}><BookOpen size={17} /><span><b>Решить задание</b><small>По фотографии</small></span></button>
            <button type="button" className={homeworkMode === "edit" ? "active" : ""} onClick={() => chooseHomeworkMode("edit")}><FileQuestion size={17} /><span><b>Отредактировать текст</b><small>Исправить ошибки и стиль</small></span></button>
            <button type="button" className={homeworkMode === "create" ? "active" : ""} onClick={() => chooseHomeworkMode("create")}><Sparkles size={17} /><span><b>Создать текст</b><small>По теме и требованиям</small></span></button>
          </div>

          <form className="homework-workspace" onSubmit={solveHomework}>
            {homeworkMode === "solve" ? <section className="upload-card">
              <div className="homework-card-heading"><div><span className="eyebrow">Шаг 1</span><h2>Фотография задания</h2></div><Badge variant="outline">PNG · JPG · WEBP</Badge></div>
              {homeworkPreview ? <div className="homework-preview"><img src={homeworkPreview} alt="Загруженное школьное задание" /><button type="button" onClick={clearHomeworkImage} aria-label="Удалить изображение"><X size={18} /></button><span><ImageIcon size={15} /> {homeworkFile?.name}</span></div> : <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseHomeworkImage} /><div className="upload-symbol"><Upload size={25} /></div><b>Нажмите и выберите фотографию</b><span>Чёткий снимок целиком, размером до 8 МБ</span><em>Выбрать изображение</em></label>}
            </section> : <section className="upload-card text-task-card">
              <div className="homework-card-heading"><div><span className="eyebrow">Шаг 1</span><h2>{homeworkMode === "edit" ? "Текст для редактирования" : "Тема будущего текста"}</h2></div>{homeworkMode === "edit" ? <FileQuestion size={22} /> : <Sparkles size={22} />}</div>
              <Textarea className="homework-source-text" value={homeworkSourceText} onChange={(event) => setHomeworkSourceText(event.target.value)} placeholder={homeworkMode === "edit" ? "Вставьте текст, который нужно исправить…" : "Напишите тему, например: «Почему важно беречь природу»"} aria-label={homeworkMode === "edit" ? "Текст для редактирования" : "Тема будущего текста"} />
              <span className="text-length">{homeworkSourceText.length} / 4000</span>
            </section>}

            <section className="question-card">
              <div className="homework-card-heading"><div><span className="eyebrow">Шаги 2–4</span><h2>Класс, предмет и пожелания</h2></div><FileQuestion size={22} /></div>
              <div className="grade-selector"><div><GraduationCap size={19} /><span><b>Класс ученика</b><small>Сначала выберите класс — ответ будет подходить возрасту ученика.</small></span></div><Select value={homeworkGrade} onValueChange={setHomeworkGrade}><SelectTrigger aria-label="Выберите класс"><SelectValue /></SelectTrigger><SelectContent>{GRADES.map((grade) => <SelectItem value={grade} key={grade}>{grade} класс</SelectItem>)}</SelectContent></Select></div>
              <label className="field-label"><span>Учебный предмет</span><Select value={homeworkSubject} onValueChange={setHomeworkSubject}><SelectTrigger aria-label="Выберите предмет"><SelectValue /></SelectTrigger><SelectContent>{SUBJECTS.map((subject) => <SelectItem value={subject} key={subject}>{subject}</SelectItem>)}</SelectContent></Select></label>
              <label className="field-label"><span>{homeworkMode === "solve" ? "Что нужно объяснить?" : homeworkMode === "edit" ? "Что изменить?" : "Дополнительные пожелания"}</span><Textarea value={homeworkQuestion} onChange={(event) => setHomeworkQuestion(event.target.value)} placeholder={homeworkMode === "solve" ? "Например: реши задачу и объясни каждый шаг простыми словами" : homeworkMode === "edit" ? "Например: исправь ошибки и сделай текст понятнее" : "Например: 10 предложений, простой язык, с заголовком"} aria-label="Пожелания к результату" /></label>
              <Button type="submit" size="lg" disabled={!homeworkCanSubmit || homeworkLoading}>{homeworkLoading ? homeworkMode === "solve" ? "Изучаю задание…" : homeworkMode === "edit" ? "Редактирую текст…" : "Создаю текст…" : homeworkMode === "solve" ? "Разобрать бесплатно" : homeworkMode === "edit" ? "Отредактировать текст" : "Создать текст"}<Sparkles size={17} /></Button>
              <p className="homework-note"><ShieldCheck size={14} /> {homeworkMode === "solve" ? "Печатный текст распознаётся лучше почерка и сложных формул." : "Текст можно скопировать и дополнительно изменить."}</p>
            </section>
          </form>

          {homeworkLoading && <section className="homework-progress" aria-live="polite"><div className="scanner"><span /></div><div><b>{homeworkStage}</b><p>{homeworkMode === "solve" ? homeworkProgress > 0 && homeworkProgress < 100 ? `Распознано ${homeworkProgress}%` : "Это может занять до минуты при первом запуске." : "Нехус учитывает класс, предмет и ваши пожелания."}</p><div className="ocr-progress"><i style={{ width: `${homeworkProgress}%` }} /></div></div></section>}
          {homeworkError && <section className="search-error"><BookOpen size={25} /><div><b>Не удалось подготовить ответ</b><p>{homeworkError}</p></div><Button variant="outline" onClick={() => homeworkCanSubmit && solveHomework()}>Повторить</Button></section>}
          {homeworkResult && !homeworkLoading && <section className="homework-answer">
            <div className="analysis-heading"><div className="analysis-icon"><GraduationCap size={21} /></div><div><span className="eyebrow">{homeworkMode === "solve" ? "Подробный разбор" : homeworkMode === "edit" ? "Редактирование текста" : "Создание текста"} · {homeworkResult.subject}</span><h2>{homeworkMode === "solve" ? "Ответ Нехуса" : "Готовый текст"}</h2></div><Badge variant="outline">{homeworkMode === "solve" ? "Проверено по источникам" : `${homeworkGrade} класс`}</Badge></div>
            {(homeworkMode === "solve" || homeworkMode === "edit") && <details className="recognized-text"><summary>{homeworkMode === "solve" ? `Как Нехус прочитал фотографию · точность ${homeworkResult.confidence}%` : "Исходный текст"}</summary><p>{homeworkResult.recognizedText}</p></details>}
            <div className="analysis-copy">{homeworkResult.answer.split("\n").filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
            <div className="analysis-footer"><span><Globe2 size={14} /> Разбор выполнен {homeworkResult.searchedAt}</span><Button variant="outline" size="sm" onClick={() => { setHomeworkResult(null); setHomeworkQuestion(""); setHomeworkSourceText(""); }}>Новая задача</Button></div>
            {homeworkMode === "solve" && homeworkResult.sources.length > 0 && <div className="homework-sources"><div className="sources-heading"><div><span className="eyebrow">Материалы для проверки</span><h2>Источники</h2></div></div><div className="source-grid">{homeworkResult.sources.map((source, index) => <a href={source.url} target="_blank" rel="noreferrer" className="source-card" key={`${source.url}-${index}`}><div className="source-number">{String(index + 1).padStart(2, "0")}</div><div className="source-copy"><span>{source.domain}</span><h3>{source.title}</h3><p>{source.snippet}</p></div><ExternalLink size={16} /></a>)}</div></div>}
          </section>}
        </TabsContent>

        <TabsContent value="moderation" className="page-frame section-page">
          <div className="section-heading"><div><span className="eyebrow">Защита диалогов</span><h1>Умная модерация</h1><p>Фильтры работают до того, как нежелательное сообщение попадёт в чат.</p></div><div className="security-score"><ShieldCheck size={23} /><div><b>98,7%</b><span>точность защиты</span></div></div></div>
          <div className="moderation-layout">
            <section className="settings-card"><div className="card-title"><div><h2>Правила защиты</h2><p>Включайте только нужные фильтры.</p></div><Badge className="active-badge">Активно</Badge></div>
              {[["toxicity", "Токсичная лексика", "Оскорбления и агрессивные выражения"], ["spam", "Спам и повторения", "Капслок, повторы и рекламный шум"], ["links", "Внешние ссылки", "Блокировка неизвестных адресов"]].map(([key, title, description]) => <div className="setting-row" key={key}><div><b>{title}</b><span>{description}</span></div><Switch checked={moderationSettings[key as keyof typeof moderationSettings]} onCheckedChange={(checked) => setModerationSettings((current) => ({ ...current, [key]: checked }))} aria-label={title} /></div>)}
              <div className="moderation-test"><span>Проверить сообщение</span><div><Input value={testMessage} onChange={(event) => setTestMessage(event.target.value)} placeholder="Введите текст для проверки" /><Button onClick={testModeration}>Проверить</Button></div></div>
            </section>
            <section className="log-card"><div className="card-title"><div><h2>Журнал событий</h2><p>Последние проверки системы.</p></div></div><div className="table-wrap"><Table><TableHeader><TableRow><TableHead>Сообщение</TableHead><TableHead>Результат</TableHead><TableHead>Время</TableHead></TableRow></TableHeader><TableBody>{moderationLog.slice(0, 7).map((item) => <TableRow key={item.id}><TableCell><b>{item.text.length > 28 ? item.text.slice(0, 28) + "…" : item.text}</b><small>{item.reason}</small></TableCell><TableCell><Badge variant="outline" className={item.result === "Разрешено" ? "allowed" : "denied"}>{item.result}</Badge></TableCell><TableCell>{item.time}</TableCell></TableRow>)}</TableBody></Table></div></section>
          </div>
        </TabsContent>

      </Tabs>
    </main>
  );
}
