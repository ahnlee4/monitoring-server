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
  delay_after_seconds?: number;
  continue_on_verification_failure?: boolean;
};

export type RawUart4Frame = {
  payload_hex: string;
  append_crc?: boolean;
  wait_response?: boolean;
  delay_after_seconds?: number;
};

export type ModeSettings = {
  rows: Array<{ no: string; values: string[] }>;
  selected_mode_index: number;
  use_mode_count: number;
  hidden_mask: number;
  exclude_mask: number;
  updated_at?: string | null;
};

export type CollectorSettings = {
  serial_port: "/dev/ttyUSB0" | "/dev/ttyS7" | null;
  updated_at?: string | null;
};

export type PressureGapSettings = {
  pressure_gap: number | null;
  updated_at?: string | null;
};

export type ControlProfile = {
  pressure_gap: number;
  equipment_gaps: number[];
  inverter_pressure_offset: number;
  main_inverter_unit: number;
  updated_at?: string | null;
};

export type ScheduleSlot = {
  enabled: boolean;
  time: string;
  run_units: number;
};

export type ScheduleSettings = {
  days: Array<{
    day: number;
    run_slots: ScheduleSlot[];
    stop_slots: ScheduleSlot[];
  }>;
  holidays: string[];
  updated_at?: string | null;
};

export type ProductSettings = {
  factory_password: string;
  admin_password: string;
  user_password: string;
  login_id: string;
  login_password: string;
  save_cycle_seconds: number;
  save_period_days: number;
  backlight_percent: number;
  screen_saver_seconds: number;
  alarm_sound_enabled: boolean;
  alarm_visible: boolean;
  camera1_ip: string;
  camera1_port: number;
  camera2_ip: string;
  camera2_port: number;
  updated_at?: string | null;
};

export type GsTechSettings = {
  dio_bit0: number;
  dio_bit4: number;
  tcp_mode: 0 | 1;
  cctv_enabled: boolean;
  updated_at?: string | null;
};

export type EquipmentLogSnapshot = {
  equipment_no: number;
  pressure: number | null;
  temperature: number | null;
  operation_status: number | null;
  rpm: number | null;
  alarm_word: number | null;
  error_word: number | null;
  recorded_at: string;
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

export async function putJson<TResponse>(url: string, body: unknown, timeoutMs = 3000): Promise<TResponse> {
  const response = await fetchWithTimeout(
    url,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as TResponse;
}

export async function fetchYujinMapValues(limit: number, timeoutMs: number) {
  const response = await fetchWithTimeout(`${apiBase()}/yujin/live-map?limit=${limit}`, { cache: "no-store" }, timeoutMs);
  if (!response.ok) throw new Error(`live-map ${response.status}`);
  return (await response.json()) as YujinMapValue[];
}

export async function fetchEquipmentLogs(equipmentNo: number, limit = 300) {
  const response = await fetchWithTimeout(
    `${apiBase()}/yujin/equipment/${equipmentNo}/logs?limit=${limit}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error(`equipment logs ${response.status}`);
  return (await response.json()) as EquipmentLogSnapshot[];
}

export async function fetchModeSettings() {
  const response = await fetchWithTimeout(`${apiBase()}/app-settings/mode-settings`, { cache: "no-store" });
  if (!response.ok) throw new Error(`mode-settings ${response.status}`);
  return (await response.json()) as ModeSettings;
}

export async function updateModeSettings(settings: ModeSettings) {
  return putJson<ModeSettings>(`${apiBase()}/app-settings/mode-settings`, settings);
}

export async function fetchCollectorSettings() {
  const response = await fetchWithTimeout(`${apiBase()}/app-settings/collector-settings`, { cache: "no-store" });
  if (!response.ok) throw new Error(`collector-settings ${response.status}`);
  return (await response.json()) as CollectorSettings;
}

export async function updateCollectorSettings(settings: { serial_port: "/dev/ttyUSB0" | "/dev/ttyS7" }) {
  return putJson<CollectorSettings>(`${apiBase()}/app-settings/collector-settings`, settings);
}

export async function fetchPressureGapSettings() {
  const response = await fetchWithTimeout(`${apiBase()}/app-settings/pressure-gap`, { cache: "no-store" });
  if (!response.ok) throw new Error(`pressure-gap ${response.status}`);
  return (await response.json()) as PressureGapSettings;
}

export async function updatePressureGapSettings(pressureGap: number) {
  return putJson<PressureGapSettings>(`${apiBase()}/app-settings/pressure-gap`, { pressure_gap: pressureGap });
}

export async function fetchControlProfile() {
  const response = await fetchWithTimeout(`${apiBase()}/app-settings/control-profile`, { cache: "no-store" });
  if (!response.ok) throw new Error(`control-profile ${response.status}`);
  return (await response.json()) as ControlProfile;
}

export async function updateControlProfile(settings: ControlProfile) {
  return putJson<ControlProfile>(`${apiBase()}/app-settings/control-profile`, settings);
}

export async function fetchScheduleSettings() {
  const response = await fetchWithTimeout(`${apiBase()}/app-settings/schedule-settings`, { cache: "no-store" });
  if (!response.ok) throw new Error(`schedule-settings ${response.status}`);
  return (await response.json()) as ScheduleSettings;
}

export async function updateScheduleSettings(settings: ScheduleSettings) {
  return putJson<ScheduleSettings>(`${apiBase()}/app-settings/schedule-settings`, settings);
}

export async function fetchProductSettings() {
  const response = await fetchWithTimeout(`${apiBase()}/app-settings/product-settings`, { cache: "no-store" });
  if (!response.ok) throw new Error(`product-settings ${response.status}`);
  return (await response.json()) as ProductSettings;
}

export async function updateProductSettings(settings: ProductSettings) {
  return putJson<ProductSettings>(`${apiBase()}/app-settings/product-settings`, settings);
}

export async function fetchGsTechSettings() {
  const response = await fetchWithTimeout(`${apiBase()}/app-settings/gstech-settings`, { cache: "no-store" });
  if (!response.ok) throw new Error(`gstech-settings ${response.status}`);
  return (await response.json()) as GsTechSettings;
}

export async function updateGsTechSettings(settings: GsTechSettings) {
  return putJson<GsTechSettings>(`${apiBase()}/app-settings/gstech-settings`, settings);
}

export async function enqueueMapWriteBatch(source: string, writes: MapWrite[]) {
  return postJson<{ id: number }>(`${apiBase()}/control/map-write-batch`, { source, writes });
}

export async function enqueueRawUart4Command(source: string, payload: number[], waitResponse = false, appendCrc = true) {
  return postJson<{ id: number }>(`${apiBase()}/control/raw-uart4`, {
    source,
    payload_hex: bytesToHex(payload),
    append_crc: appendCrc,
    wait_response: waitResponse,
  });
}

export async function enqueueRawUart4BatchCommand(source: string, frames: RawUart4Frame[]) {
  return postJson<{ id: number }>(`${apiBase()}/control/raw-uart4-batch`, { source, frames });
}

export async function enqueueGroupOperation(action: "run" | "stop", stopEquipment = true) {
  return postJson<{ id: number }>(`${apiBase()}/control/group-operation`, { action, stop_equipment: stopEquipment });
}

export function bytesToHex(bytes: number[]) {
  return bytes.map((byte) => (byte & 0xff).toString(16).padStart(2, "0").toUpperCase()).join("");
}

export function asciiBytes(value: string) {
  return Array.from(value, (char) => char.charCodeAt(0) & 0xff);
}

export function appendCrcLowFirst(payload: number[]) {
  const crc = crc16(payload);
  return [...payload, crc & 0xff, (crc >> 8) & 0xff];
}

function crc16(payload: number[]) {
  let crc = 0xffff;
  for (const byte of payload) {
    crc ^= byte & 0xff;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
  }
  return crc & 0xffff;
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

export async function waitForControlCommand(
  commandId: number,
  onStatus: (status: ControlCommandStatus) => void,
  timeoutMs = 15_000,
) {
  const deadline = Date.now() + timeoutMs;
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
