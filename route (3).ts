import { NextRequest, NextResponse } from "next/server";

type CountriesNowResponse = {
  error?: boolean;
  data?: { states?: Array<{ name?: string }> } | string[];
};
const LOCATION_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const locationCache = new Map<string, { expires: number; items: string[] }>();

export async function GET(request: NextRequest) {
  const country = String(request.nextUrl.searchParams.get("country") || "").trim().slice(0, 100);
  const state = String(request.nextUrl.searchParams.get("state") || "").trim().slice(0, 120);
  if (!country) return NextResponse.json({ items: [] });
  const cacheKey = `${country.toLowerCase()}::${state.toLowerCase()}`;
  const cached = locationCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return NextResponse.json({ items: cached.items });
  if (cached) locationCache.delete(cacheKey);

  try {
    const response = await fetch(state
      ? "https://countriesnow.space/api/v0.1/countries/state/cities"
      : "https://countriesnow.space/api/v0.1/countries/states", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Nehus Location Picker" },
      body: JSON.stringify(state ? { country, state } : { country }),
    });
    if (!response.ok) return NextResponse.json({ items: [] });
    const data = await response.json() as CountriesNowResponse;
    const rawItems = state
      ? (Array.isArray(data.data) ? data.data : [])
      : (!Array.isArray(data.data) ? data.data?.states?.map((item) => item.name || "") || [] : []);
    const items = [...new Set(rawItems.map((item) => String(item).trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "ru"));
    locationCache.set(cacheKey, { expires: Date.now() + LOCATION_CACHE_TTL_MS, items });
    if (locationCache.size > 160) locationCache.delete(locationCache.keys().next().value as string);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
