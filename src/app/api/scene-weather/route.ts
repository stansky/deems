import { z } from "zod";
import { sceneWeatherSchema, type SceneWeather } from "@/contracts/scene-weather";

// A fixed public location keeps personal location and workspace data out of this request.
const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=37.799&longitude=-122.459&current=weather_code&daily=sunrise,sunset&timezone=America%2FLos_Angeles&timeformat=unixtime&forecast_days=1";
const knownCodes = new Set([0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 97, 99]);
const timestamp = z.number().int().positive();
const providerSchema = z.object({
  current: z.object({ time: timestamp, weather_code: z.number().int().refine(code => knownCodes.has(code)) }),
  daily: z.object({ sunrise: z.array(timestamp).length(1), sunset: z.array(timestamp).length(1) }),
});

export async function GET() {
  const common = { version: 1 as const, location: "San Francisco" as const, timeZone: "America/Los_Angeles" as const, fetchedAt: new Date().toISOString() };
  let result: SceneWeather;
  try {
    const response = await fetch(weatherUrl, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(3500),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Weather unavailable");
    const text = await response.text();
    if (text.length > 16_000) throw new Error("Unexpected weather response");
    const data = providerSchema.parse(JSON.parse(text));
    if (Math.abs(Date.now() - data.current.time * 1000) > 90 * 60_000) throw new Error("Weather data is stale");
    result = sceneWeatherSchema.parse({
      ...common, source: "open-meteo", weatherCode: data.current.weather_code,
      validAt: new Date(data.current.time * 1000).toISOString(),
      sunriseAt: new Date(data.daily.sunrise[0] * 1000).toISOString(),
      sunsetAt: new Date(data.daily.sunset[0] * 1000).toISOString(),
    });
  } catch {
    result = { ...common, source: "time-only", weatherCode: null, validAt: null, sunriseAt: null, sunsetAt: null };
  }
  return Response.json(result, {
    headers: { "Cache-Control": result.source === "open-meteo" ? "public, max-age=120, s-maxage=900, stale-while-revalidate=900" : "public, max-age=30, s-maxage=60" },
  });
}
