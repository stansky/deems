"use client";

import { useEffect, useState, type ReactNode } from "react";
import "./scene-art.css";
import { sceneWeatherSchema, type SceneWeather } from "@/contracts/scene-weather";
import { conditionLabels, hasCurrentWeather, parseSceneId, periodLabels, sceneImage, selectScene, weatherLabel, type SceneId, type ScenePeriod, type SceneCondition } from "@/lib/login-scene";

export function SceneArt({ className = "", children }: { className?: string; children?: ReactNode }) {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<SceneWeather | null>(null);
  const [preview, setPreview] = useState<SceneId | null>(null);
  const [visible, setVisible] = useState<SceneId>("day-clear");
  const [outgoing, setOutgoing] = useState<SceneId | null>(null);

  useEffect(() => {
    setNow(new Date());
    const requested = parseSceneId(new URLSearchParams(window.location.search).get("scene"));
    if (requested) { setPreview(requested); return; }
    let active = true;
    let controller: AbortController | null = null;
    let lastRequest = 0;
    async function refreshWeather() {
      if (document.hidden || Date.now() - lastRequest < 5 * 60_000) return;
      lastRequest = Date.now();
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/scene-weather", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6000)]) });
        if (!response.ok) return;
        const data = sceneWeatherSchema.parse(await response.json());
        if (active) setWeather(current => data.source === "time-only" && current?.source === "open-meteo" ? current : data);
      } catch { /* The time-based scene remains usable offline. */ }
    }
    function onVisible() {
      if (!document.hidden) { setNow(new Date()); void refreshWeather(); }
    }
    void refreshWeather();
    const clock = window.setInterval(() => { if (!document.hidden) setNow(new Date()); }, 60_000);
    const refresh = window.setInterval(() => { void refreshWeather(); }, 15 * 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; controller?.abort(); window.clearInterval(clock); window.clearInterval(refresh); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const requested = preview ?? (now ? selectScene(now, weather) : "day-clear");
  useEffect(() => {
    if (requested === visible) return;
    let active = true;
    const image = new Image();
    image.onload = () => { if (active) { setOutgoing(visible); setVisible(requested); } };
    image.src = sceneImage(requested);
    return () => { active = false; image.onload = null; };
  }, [requested, visible]);

  useEffect(() => {
    if (!outgoing) return;
    const timer = window.setTimeout(() => setOutgoing(null), 750);
    return () => window.clearTimeout(timer);
  }, [outgoing, visible]);

  const [period, condition] = visible.split("-") as [ScenePeriod, SceneCondition];
  const currentWeather = now && hasCurrentWeather(weather, now) ? weather : null;
  const label = preview ? `Preview · ${periodLabels[period]} · ${conditionLabels[condition]}` : `San Francisco · ${periodLabels[period]}${currentWeather ? ` · ${weatherLabel(currentWeather.weatherCode)}` : ""}`;

  return <aside className={`scene-art ${className}`} aria-label="An illustrated San Francisco apartment study space" data-scene={visible} data-weather-source={preview ? "preview" : currentWeather ? "open-meteo" : "time-only"}>
    {outgoing && <img className="scene-art-image" src={sceneImage(outgoing)} alt="" aria-hidden="true" width="1024" height="1536" />}
    <img key={visible} className={`scene-art-image${outgoing ? " scene-art-image-enter" : ""}`} src={sceneImage(visible)} alt="" aria-hidden="true" width="1024" height="1536" fetchPriority="high" />
    {children}
    <div className="scene-art-meta"><span>{label}</span>{!preview && currentWeather && <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" title={`Weather model valid at ${new Date(currentWeather.validAt).toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" })} Pacific time`}>Weather: Open-Meteo</a>}</div>
  </aside>;
}
