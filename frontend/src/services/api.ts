import type { YujinMapValue } from "../types";

export type ControlCommandStatus = {
  id: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  error?: string | null;
};

export type MapWrite = {
  key?: string;
  address?: number;
  high_addr?: number;
  low_addr?: number;
  length?: number;
  value?: number;
  data_hex?: string;
};

export class ControlStatusUnsupportedError extends Error {
  constructor() {
    super("명령 상태 조회 API가 없습니다. backend 이미지를 최신으로 갱신해주세요.");
  }
}

export class ControlStatusDelayedError extends Error {
  constructor(public commandId: number) {
    super("명령은 등록됐지만 완료 상태 확인이 지연되고 있습니다");
  }
}

export function apiBase() {
  return import.meta.env.VITE_API_BASE || "/api";
}

export function wsUrl() {
  const configuredPath = import.meta.env.VITE_WS_PATH || "/ws/dashboard";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${configuredPath}`;
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (isAbortError(error)) throw new Error("backend 응답 시간 초과");
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function postJson<TResponse>(url: string, body: unknown, timeoutMs = 3000): Promise<TResponse> {
  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as TResponse;
}

export async function fetchYujinMapValues(limit: number, timeoutMs: number) {
  const response = await fetchWithTimeout(`${apiBase()}/yujin/map-values?limit=${limit}`, { cache: "no-store" }, timeoutMs);
  if (!response.ok) throw new Error(`map-values ${response.status}`);
  return (await response.json()) as YujinMapValue[];
}

export async function enqueueMapWriteBatch(source: string, writes: MapWrite[]) {
  return postJson<{ id: number }>(`${apiBase()}/control/map-write-batch`, { source, writes });
}

export async function enqueueRawUart4Command(source: string, payload: number[], waitResponse = false) {
  return postJson<{ id: number }>(`${apiBase()}/control/raw-uart4`, {
    source,
    payload_hex: bytesToHex(payload),
    append_crc: true,
    wait_response: waitResponse,
  });
}

export async function enqueueGroupOperation(action: "run" | "stop") {
  return postJson<{ id: number }>(`${apiBase()}/control/group-operation`, { action });
}

export function bytesToHex(bytes: number[]) {
  return bytes.map((byte) => (byte & 0xff).toString(16).padStart(2, "0").toUpperCase()).join("");
}

export function asciiBytes(value: string) {
  return Array.from(value, (char) => char.charCodeAt(0) & 0xff);
}

export async function fetchControlCommandStatus(commandId: number, timeoutMs = 1200): Promise<ControlCommandStatus | null> {
  const controller = new AbortController();
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = window.setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });
  const requestPromise = fetch(`${apiBase()}/control/commands/${commandId}`, { signal: controller.signal })
    .then(async (response) => {
      if (response.status === 404) throw new ControlStatusUnsupportedError();
      if (!response.ok) throw new Error(`status HTTP ${response.status}`);
      return (await response.json()) as ControlCommandStatus;
    })
    .catch((error) => {
      if (isAbortError(error)) return null;
      throw error;
    })
    .finally(() => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    });

  return Promise.race([requestPromise, timeoutPromise]);
}

export async function waitForControlCommand(commandId: number, onStatus: (status: ControlCommandStatus) => void) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const status = await fetchControlCommandStatus(commandId);
    if (status) {
      onStatus(status);
      if (status.status === "completed") return status;
      if (status.status === "failed") throw new Error(status.error || "collector command failed");
    }
    await sleep(250);
  }
  throw new ControlStatusDelayedError(commandId);
}
