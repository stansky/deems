import type { SceneWeather } from "@/contracts/scene-weather";

export const SCENE_TIME_ZONE = "America/Los_Angeles";
export const scenePeriods = ["dawn", "day", "dusk", "night"] as const;
export const sceneConditions = ["clear", "cloudy", "rain"] as const;
export type ScenePeriod = typeof scenePeriods[number];
export type SceneCondition = typeof sceneConditions[number];
export type SceneId = `${ScenePeriod}-${SceneCondition}`;
export const sceneIds: SceneId[] = scenePeriods.flatMap(period => sceneConditions.map(condition => `${period}-${condition}` as SceneId));

export const periodLabels: Record<ScenePeriod, string> = { dawn: "Dawn", day: "Daytime", dusk: "Dusk", night: "Night" };
export const conditionLabels: Record<SceneCondition, string> = { clear: "Clear", cloudy: "Clouds / fog", rain: "Rain" };

export function parseSceneId(value: string | null): SceneId | null {
  return sceneIds.find(id => id === value) ?? null;
}

export function sceneImage(id: SceneId): string {
  return `/brand/scenes/${id}.webp`;
}

export function weatherCondition(code: number): SceneCondition {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3 || code === 45 || code === 48) return "cloudy";
  return "rain";
}

export function weatherLabel(code: number): string {
  if (code === 0 || code === 1) return "Clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if (code >= 95) return "Thunderstorms";
  if (code < 60) return "Drizzle";
  return "Rain";
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: SCENE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFormatter = new Intl.DateTimeFormat("en-US", { timeZone: SCENE_TIME_ZONE, hour: "numeric", hourCycle: "h23" });

export function hasCurrentWeather(weather: SceneWeather | null, now: Date): weather is Extract<SceneWeather, { source: "open-meteo" }> {
  if (!weather || weather.source !== "open-meteo") return false;
  const valid = new Date(weather.validAt);
  const sunrise = new Date(weather.sunriseAt);
  const sunset = new Date(weather.sunsetAt);
  return Math.abs(now.getTime() - valid.getTime()) <= 90 * 60_000 &&
    dateFormatter.format(sunrise) === dateFormatter.format(now) &&
    sunset.getTime() > sunrise.getTime() && sunset.getTime() - sunrise.getTime() < 24 * 60 * 60_000;
}

export function scenePeriod(now: Date, weather: SceneWeather | null = null): ScenePeriod {
  if (hasCurrentWeather(weather, now)) {
    const sunrise = Date.parse(weather.sunriseAt);
    const sunset = Date.parse(weather.sunsetAt);
    const time = now.getTime();
    if (time >= sunrise - 45 * 60_000 && time < sunrise + 75 * 60_000) return "dawn";
    if (time >= sunset - 75 * 60_000 && time < sunset + 45 * 60_000) return "dusk";
    return time > sunrise && time < sunset ? "day" : "night";
  }
  const hour = Number(hourFormatter.format(now));
  if (hour >= 6 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

export function selectScene(now: Date, weather: SceneWeather | null = null): SceneId {
  const period = scenePeriod(now, weather);
  return `${period}-${hasCurrentWeather(weather, now) ? weatherCondition(weather.weatherCode) : "clear"}`;
}
