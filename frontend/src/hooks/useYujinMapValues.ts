import { startTransition, useEffect, useRef, useState } from "react";
import { fetchYujinMapValues, wsUrl } from "../services/api";
import type { UpdateEvent, YujinMapValue, YujinMapValuePatch } from "../types";

const MAP_VALUES_LIMIT = 1000;
const MAP_REFRESH_INTERVAL_MS = 1000;
const MAP_REFRESH_MIN_INTERVAL_MS = 800;
const MAP_REFRESH_TIMEOUT_MS = 1200;

export function useYujinMapValues() {
  const [mapValues, setMapValues] = useState<Record<string, YujinMapValue>>({});
  const mapValuesRef = useRef<Record<string, YujinMapValue>>({});

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
          const nextValues = mergeFetchedMapValues(values, mapValuesRef.current);
          mapValuesRef.current = nextValues;
          startTransition(() => setMapValues(nextValues));
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

    const applyMapPatches = (patches: YujinMapValuePatch[]) => {
      if (!patches.length) return false;
      let changed = false;
      const next = { ...mapValuesRef.current };
      for (const patch of patches) {
        const key = patch.key.toUpperCase();
        const previous = next[key];
        if (!previous) return false;
        if (previous.value === patch.value && previous.updated_at === patch.updated_at && previous.source === patch.source) {
          continue;
        }
        changed = true;
        next[key] = {
          ...previous,
          value: patch.value,
          updated_at: patch.updated_at ?? previous.updated_at,
          source: patch.source ?? previous.source,
        };
      }
      if (changed) {
        mapValuesRef.current = next;
        startTransition(() => setMapValues(next));
      }
      return true;
    };

    const applyHeartbeat = (keys: string[] | undefined, recordedAt: string | undefined, source: string | null | undefined) => {
      if (!keys?.length || !recordedAt) return false;
      let changed = false;
      const next = { ...mapValuesRef.current };
      for (const rawKey of keys) {
        const key = rawKey.toUpperCase();
        const previous = next[key];
        if (!previous) continue;
        const nextSource = source ?? previous.source;
        if (previous.updated_at === recordedAt && previous.source === nextSource) continue;
        changed = true;
        next[key] = {
          ...previous,
          updated_at: recordedAt,
          source: nextSource,
        };
      }
      if (changed) {
        mapValuesRef.current = next;
        startTransition(() => setMapValues(next));
      }
      return changed;
    };

    loadMapValues();
    scheduleLoop();
    const socket = new WebSocket(wsUrl());
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as UpdateEvent;
      if (message.type !== "yujin_map_update") return;
      const patched = message.values?.length ? applyMapPatches(message.values) : false;
      const heartbeat = applyHeartbeat(message.keys, message.recorded_at, message.source);
      if (!patched && !heartbeat) scheduleReload();
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

function mergeFetchedMapValues(values: YujinMapValue[], currentValues: Record<string, YujinMapValue>) {
  const fetched = toMapRecord(values);
  const next = { ...fetched };

  for (const [key, current] of Object.entries(currentValues)) {
    const fetchedValue = next[key];
    if (!fetchedValue) {
      next[key] = current;
      continue;
    }

    if (isNewerTimestamp(current.updated_at, fetchedValue.updated_at)) {
      next[key] = {
        ...fetchedValue,
        updated_at: current.updated_at,
        source: current.source ?? fetchedValue.source,
      };
    }
  }

  return next;
}

function isNewerTimestamp(candidate: string | null, baseline: string | null) {
  if (!candidate) return false;
  if (!baseline) return true;
  return new Date(candidate).getTime() > new Date(baseline).getTime();
}
