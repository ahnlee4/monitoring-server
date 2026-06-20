import { startTransition, useEffect, useState } from "react";
import { fetchYujinMapValues, wsUrl } from "../services/api";
import type { UpdateEvent, YujinMapValue } from "../types";

const MAP_VALUES_LIMIT = 300;
const MAP_REFRESH_INTERVAL_MS = 1000;
const MAP_REFRESH_MIN_INTERVAL_MS = 800;
const MAP_REFRESH_TIMEOUT_MS = 1200;

export function useYujinMapValues() {
  const [mapValues, setMapValues] = useState<Record<string, YujinMapValue>>({});

  useEffect(() => {
    let cancelled = false;
    let reloadTimer: number | undefined;
    let loopTimer: number | undefined;
    let inFlight = false;
    let dirty = false;
    let lastLoadedAt = 0;

    const loadMapValues = async () => {
      if (cancelled) return;
      if (inFlight) {
        dirty = true;
        return;
      }

      const elapsed = Date.now() - lastLoadedAt;
      if (lastLoadedAt > 0 && elapsed < MAP_REFRESH_MIN_INTERVAL_MS) {
        dirty = true;
        scheduleReload(MAP_REFRESH_MIN_INTERVAL_MS - elapsed);
        return;
      }

      inFlight = true;
      dirty = false;
      try {
        const values = await fetchYujinMapValues(MAP_VALUES_LIMIT, MAP_REFRESH_TIMEOUT_MS);
        if (!cancelled) {
          startTransition(() => setMapValues(toMapRecord(values)));
        }
      } catch (error) {
        console.error("failed to load map values", error);
      } finally {
        lastLoadedAt = Date.now();
        inFlight = false;
        if (dirty && !cancelled) scheduleReload(MAP_REFRESH_MIN_INTERVAL_MS);
      }
    };

    function scheduleReload(delay = MAP_REFRESH_MIN_INTERVAL_MS) {
      window.clearTimeout(reloadTimer);
      reloadTimer = window.setTimeout(loadMapValues, delay);
    }

    const scheduleLoop = () => {
      loopTimer = window.setTimeout(async () => {
        await loadMapValues();
        if (!cancelled) scheduleLoop();
      }, MAP_REFRESH_INTERVAL_MS);
    };

    loadMapValues();
    scheduleLoop();
    const socket = new WebSocket(wsUrl());
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as UpdateEvent;
      if (message.type === "yujin_map_update") scheduleReload();
    };
    socket.onerror = () => socket.close();

    return () => {
      cancelled = true;
      window.clearTimeout(reloadTimer);
      window.clearTimeout(loopTimer);
      socket.close();
    };
  }, []);

  return mapValues;
}

function toMapRecord(values: YujinMapValue[]) {
  return values.reduce<Record<string, YujinMapValue>>((record, item) => {
    record[item.key.toUpperCase()] = item;
    return record;
  }, {});
}
