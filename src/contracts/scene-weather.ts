import { z } from "zod";

const common = {
  version: z.literal(1),
  location: z.literal("San Francisco"),
  timeZone: z.literal("America/Los_Angeles"),
  fetchedAt: z.iso.datetime(),
};

export const sceneWeatherSchema = z.discriminatedUnion("source", [
  z.object({
    ...common,
    source: z.literal("open-meteo"),
    weatherCode: z.number().int().min(0).max(99),
    validAt: z.iso.datetime(),
    sunriseAt: z.iso.datetime(),
    sunsetAt: z.iso.datetime(),
  }).strict(),
  z.object({
    ...common,
    source: z.literal("time-only"),
    weatherCode: z.null(),
    validAt: z.null(),
    sunriseAt: z.null(),
    sunsetAt: z.null(),
  }).strict(),
]);

export type SceneWeather = z.infer<typeof sceneWeatherSchema>;
