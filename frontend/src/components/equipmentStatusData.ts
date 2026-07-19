import type { YujinMapValue } from "../types";

const LIVE_VALUE_MAX_AGE_MS = 30_000;
const INVALID_DISPLAY_RAW_VALUE = 32767;

export type EquipmentStatusSource = {
  id: number;
  model: string;
  inverter: boolean;
  isOilfree?: boolean;
};

export type EquipmentStatusItem = {
  label: string;
  value: string;
  alarm?: boolean;
};

export function buildEquipmentStatusItems(
  compressor: EquipmentStatusSource,
  values: Record<string, YujinMapValue>,
): EquipmentStatusItem[] {
  return compressor.isOilfree
    ? buildOilfreeStatusItems(compressor, values)
    : buildInjectionStatusItems(compressor, values);
}

function buildOilfreeStatusItems(
  compressor: EquipmentStatusSource,
  values: Record<string, YujinMapValue>,
) {
  const read = statusReader(compressor, values);
  const alarmWord = read(0x28, 0);
  const rows: Array<[string, number, number, string, number[]?]> = [
    ["서비스 압력", 0x00, 100, "bar"],
    ["에어필터 교환시간 설정값", 0x72, 1, "hr"],
    ["에어필터 차압", 0x02, 1, "mbar", [4, 9]],
    ["오일필터 교환시간 설정값", 0x74, 1, "hr"],
    ["2단 흡입 압력", 0x04, 100, "bar"],
    ["오일 교환시간 설정값", 0x76, 1, "hr"],
    ["오일 압력", 0x06, 100, "bar", [12]],
    ["그리스 교환시간 설정값", 0x78, 1, "hr"],
    ["서비스 온도", 0x0c, 1, "℃"],
    ["에어필터 사용시간", 0x8a, 1, "hr", [0]],
    ["1단 토출 온도", 0x0e, 1, "℃", [5]],
    ["오일필터 사용시간", 0x8c, 1, "hr", [1]],
    ["2단 흡입 온도", 0x10, 1, "℃"],
    ["오일 사용시간", 0x8e, 1, "hr", [2]],
    ["2단 토출 온도", 0x12, 1, "℃", [6]],
    ["그리스 사용시간", 0x90, 1, "hr", [3]],
    ["오일 온도", 0x14, 1, "℃", [7, 10]],
    ["부하 시간", 0x94, 1, "hr"],
    ["모터 권선 온도 R", 0x1e, 1, "℃"],
    ["무부하 시간", 0x92, 1, "hr"],
    ["모터 권선 온도 S", 0x20, 1, "℃"],
    ["자동 정지 시간", 0x96, 1, "hr"],
    ["모터 권선 온도 T", 0x22, 1, "℃"],
    ["정지 시간", 0x98, 1, "hr"],
    ["모터 베어링 온도 DE", 0x24, 1, "℃"],
    ["총 운전시간", 0x9a, 1, "hr"],
    ["모터 베어링 온도 NDE", 0x26, 1, "℃"],
  ];

  return [
    ...rows.map(([label, offset, divisor, unit, alarmBits]) => ({
      label,
      value: formatStatusValue(read(offset), divisor, unit),
      alarm: alarmBits?.some((bit) => bitEnabled(alarmWord, bit)) ?? false,
    })),
    {
      label: "운전횟수",
      value: formatIntegerValue(combineWords(read(0xa0), read(0x9e)), "nu"),
    },
  ];
}

function buildInjectionStatusItems(
  compressor: EquipmentStatusSource,
  values: Record<string, YujinMapValue>,
) {
  const read = statusReader(compressor, values);
  const alarmWord = read(0x0a, 0);
  const pressureItems = compressor.inverter
    ? [
        statusItem("제어 압력", read(0x20), 10, "bar"),
        statusItem("상세 제어 압력", read(0x22), 10, "bar"),
        statusItem("압력 제어", read(0x24), 10, "bar"),
        statusItem("자동 정지시간", read(0x2a), 1, "min"),
      ]
    : [
        statusItem("무부하 압력", read(0x26), 10, "bar"),
        statusItem("부하 압력", read(0x28), 10, "bar"),
        statusItem("자동정지 시간", read(0x2a), 1, "min"),
        { label: "메뉴얼 무부하", value: formatOnOff(read(0x38)) },
      ];
  const modelCode = read(0x74);
  const greaseTime = modelCode > 4 && modelCode < 26
    ? formatIntegerValue(read(0x78), "hr")
    : "---";

  return [
    {
      label: "총 운전 시간",
      value: formatIntegerValue(combineWords(read(0x6a), read(0x68)), "hr"),
    },
    {
      label: "모델",
      value: compressor.model === "-" ? "Micos" : compressor.model,
    },
    {
      label: "모터 기동 횟수",
      value: formatIntegerValue(combineWords(read(0x6e), read(0x6c)), "nu"),
    },
    { label: "장비 번호", value: formatIntegerValue(read(0x70), "nu") },
    statusItem("부하 운전 시간", read(0x60), 1, "hr"),
    pressureItems[0],
    statusItem("무부하 운전 시간", read(0x62), 1, "hr"),
    pressureItems[1],
    statusItem("자동 정지 시간", read(0x64), 1, "hr"),
    pressureItems[2],
    statusItem("정지 시간", read(0x66), 1, "hr"),
    pressureItems[3],
    usageItem("에어필터 사용 시간", read(0x50), read(0x58), bitEnabled(alarmWord, 0)),
    statusItem("팬 가동 온도", read(0x3e), 1, "℃"),
    usageItem("오일필터 사용 시간", read(0x52), read(0x5a), bitEnabled(alarmWord, 1)),
    statusItem("팬 정지 온도", read(0x40), 1, "℃"),
    usageItem("세퍼레이터 사용 시간", read(0x54), read(0x5c), bitEnabled(alarmWord, 2)),
    statusItem("부하 운전 온도", read(0x3c), 1, "℃"),
    usageItem("오일 사용 시간", read(0x56), read(0x5e), bitEnabled(alarmWord, 3)),
    statusItem("오일 알람 온도", read(0x42), 1, "℃"),
    {
      label: `구리스 사용 시간 (${formatPlainValue(read(0x48))})`,
      value: greaseTime,
      alarm: bitEnabled(alarmWord, 5),
    },
    {
      ...statusItem("오일 과온 정지 온도", read(0x44), 1, "℃"),
      alarm: bitEnabled(alarmWord, 4),
    },
    { label: "Fan on/off 운전", value: formatOnOff(read(0x3a)) },
  ];
}

function usageItem(label: string, limit: number, used: number, alarm: boolean) {
  return {
    label: `${label} (${formatPlainValue(limit)})`,
    value: formatIntegerValue(used, "hr"),
    alarm,
  };
}

function statusItem(label: string, raw: number, divisor: number, unit: string) {
  return { label, value: formatStatusValue(raw, divisor, unit) };
}

function statusReader(
  compressor: EquipmentStatusSource,
  values: Record<string, YujinMapValue>,
) {
  const prefix = `${compressor.isOilfree ? "2" : "1"}${compressor.id.toString(16).toUpperCase()}`;
  return (offset: number, fallback = Number.NaN) =>
    liveMapNumber(
      values,
      `${prefix}${offset.toString(16).padStart(2, "0")}`,
      fallback,
    );
}

function bitEnabled(word: number, bit: number) {
  return Number.isFinite(word) && Boolean(Math.trunc(word) & (1 << bit));
}

function combineWords(high: number, low: number) {
  if (!Number.isFinite(high) || !Number.isFinite(low)) return Number.NaN;
  return (Math.trunc(high) & 0xffff) * 65536 + (Math.trunc(low) & 0xffff);
}

function formatStatusValue(raw: number, divisor: number, unit: string) {
  if (!Number.isFinite(raw) || raw === INVALID_DISPLAY_RAW_VALUE) return "---";
  const signedRaw = ["bar", "mbar", "℃"].includes(unit) && raw > 32767 ? raw - 65536 : raw;
  const value = signedRaw / divisor;
  const formatted = divisor === 1
    ? Math.trunc(value).toLocaleString("ko-KR")
    : value.toFixed(divisor === 100 ? 2 : 1);
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatIntegerValue(value: number, unit = "") {
  if (!Number.isFinite(value) || value === INVALID_DISPLAY_RAW_VALUE) return "---";
  const formatted = Math.trunc(value).toLocaleString("ko-KR");
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatPlainValue(value: number) {
  return Number.isFinite(value) ? Math.trunc(value).toLocaleString("ko-KR") : "---";
}

function formatOnOff(value: number) {
  if (!Number.isFinite(value)) return "---";
  return Math.trunc(value) === 0 ? "OFF" : "ON";
}

function liveMapNumber(
  values: Record<string, YujinMapValue>,
  key: string,
  fallback = 0,
) {
  const item = values[key.toUpperCase()];
  if (!isLiveMapValue(item)) return fallback;
  const raw = item.value;
  if (raw === undefined || raw === null || raw === "") return fallback;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function isLiveMapValue(
  value: YujinMapValue | undefined,
  maxAgeMs = LIVE_VALUE_MAX_AGE_MS,
) {
  if (!value?.updated_at || value.source === "seed") return false;
  return Date.now() - new Date(value.updated_at).getTime() <= maxAgeMs;
}
