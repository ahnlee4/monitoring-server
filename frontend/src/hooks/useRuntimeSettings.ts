import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProductSettings } from "../services/api";
import type { ProductSettings } from "../services/api";

const DEFAULT_RUNTIME_SETTINGS = {
  alarmVisible: true,
  alarmSoundEnabled: true,
  backlightPercent: 50,
  screenSaverSeconds: 300,
};

type RuntimeSettings = typeof DEFAULT_RUNTIME_SETTINGS;

function toRuntimeSettings(settings: ProductSettings): RuntimeSettings {
  return {
    alarmVisible: settings.alarm_visible,
    alarmSoundEnabled: settings.alarm_sound_enabled,
    backlightPercent: Math.min(100, Math.max(0, settings.backlight_percent)),
    screenSaverSeconds: Math.max(0, settings.screen_saver_seconds),
  };
}

export function useRuntimeSettings(alarmActive: boolean) {
  const [settings, setSettings] = useState<RuntimeSettings>(DEFAULT_RUNTIME_SETTINGS);
  const [dimmed, setDimmed] = useState(false);
  const [alarmMuted, setAlarmMuted] = useState(false);
  const idleTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scheduleDim = useCallback((seconds: number) => {
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
    if (seconds <= 0) return;
    idleTimerRef.current = window.setTimeout(() => setDimmed(true), seconds * 1000);
  }, []);

  const wake = useCallback(() => {
    setDimmed(false);
    scheduleDim(settings.screenSaverSeconds);
    if (settings.alarmSoundEnabled) {
      const context = audioContextRef.current ?? new window.AudioContext();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume().catch(() => undefined);
    }
  }, [scheduleDim, settings.alarmSoundEnabled, settings.screenSaverSeconds]);

  useEffect(() => {
    let alive = true;
    fetchProductSettings()
      .then((product) => {
        if (alive) setSettings(toRuntimeSettings(product));
      })
      .catch((error) => console.error("failed to load product runtime settings", error));
    const handleSettingsUpdate = (event: Event) => {
      const product = (event as CustomEvent<ProductSettings>).detail;
      if (product) setSettings(toRuntimeSettings(product));
    };
    window.addEventListener("product-settings-updated", handleSettingsUpdate);
    return () => {
      alive = false;
      window.removeEventListener("product-settings-updated", handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    scheduleDim(settings.screenSaverSeconds);
    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "mousemove", "keydown", "touchstart"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, wake, { passive: true }));
    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, wake));
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    };
  }, [scheduleDim, settings.screenSaverSeconds, wake]);

  useEffect(() => {
    if (!alarmActive || !settings.alarmSoundEnabled || alarmMuted) return;
    const beep = () => {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) return;
      const context = audioContextRef.current ?? new AudioContextConstructor();
      audioContextRef.current = context;
      if (context.state !== "running") return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
    };
    beep();
    const timer = window.setInterval(beep, 5_000);
    return () => window.clearInterval(timer);
  }, [alarmActive, alarmMuted, settings.alarmSoundEnabled]);

  useEffect(() => () => {
    if (audioContextRef.current) void audioContextRef.current.close();
  }, []);

  return {
    alarmMuted,
    alarmVisible: settings.alarmVisible,
    dimmed,
    dimOpacity: Math.max(0.02, 1 - settings.backlightPercent / 100),
    toggleAlarmMuted: () => setAlarmMuted((current) => !current),
    wake,
  };
}
