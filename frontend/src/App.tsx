import { useEffect, useMemo, useState } from "react";
import type { FormEvent, PointerEvent, ReactNode } from "react";
import { QuickButtons } from "./components/QuickButtons";
import type { UpdateEvent, YujinMapValue } from "./types";

type CompressorState = {
  id: number;
  name: string;
  model: string;
  pressure: number;
  temperature: number;
  noLoadPressure: number;
  loadPressure: number;
  controlPressure?: number;
  rpm?: number;
  local: boolean;
  running: boolean;
  connected: boolean;
  alarm: boolean;
  fault: boolean;
  inverter: boolean;
  totalHours: number;
};

type DashboardState = {
  integratedRun: boolean;
  mainPressure: number;
  appVersion: string;
  firmwareVersion: string;
  lowPressureAlarm: "none" | "warning" | "reserve";
  sortMode: "setting" | "time";
  control: {
    noLoadPressure: number;
    loadPressure: number;
    pressureGap: number;
    lowAlarmPressure: number;
    runUnits: number;
    changeHours: number;
    remainMinutes: number;
    controlModeWord: number;
    sortModeWord: number;
    operationModeWord: number;
  };
  options: Array<{ label: string; checked: boolean; visible?: boolean }>;
  compressors: CompressorState[];
};

type ActiveDialog = "factory" | "settings" | "control" | "password" | null;
type ActiveScreen = "main" | "detail";
type UserLevel = 0 | 1 | 2;

const LIVE_VALUE_MAX_AGE_MS = 30_000;
const APP_VERSION = "0.1.64";
const INVALID_DISPLAY_RAW_VALUE = 32767;
const ADMIN_LOGO_CLICK_WINDOW_MS = 5_000;
const ADMIN_LOGO_CLICK_COUNT = 5;
const USER_LEVELS = {
  admin: 0,
  manager: 1,
  user: 2,
} as const;
const USER_PASSWORDS: Record<UserLevel, string> = {
  [USER_LEVELS.admin]: "btfss0510",
  [USER_LEVELS.manager]: "471112",
  [USER_LEVELS.user]: "1234",
};
const USER_LEVEL_LABELS: Record<UserLevel, string> = {
  [USER_LEVELS.admin]: "관리자",
  [USER_LEVELS.manager]: "매니저",
  [USER_LEVELS.user]: "일반",
};
const OPTION_LABELS = [
  "고장발생시 모드 변경",
  "인버터 주도 절약운전 기능",
  "교환운전 기능",
  "메인압력모듈 적용",
  "통합운전 제어시 기타 기기 제어",
  "저압경보 적용",
  "저압경보시 예비기 가동유무",
  "고장발생시 예비기 가동유무",
  "리모트 모드일때만 쓰기",
  "로그인 했을때만 쓰기",
  "데이터 저장유무",
  "통합제어 정지시 컴프레샤 정지안함",
  "교환운전 테스트",
  "인버터 컨트롤 에너지 절약모드",
];

const emptyDashboard: DashboardState = {
  integratedRun: false,
  mainPressure: 0,
  appVersion: APP_VERSION,
  firmwareVersion: "-",
  lowPressureAlarm: "none",
  sortMode: "setting",
  control: {
    noLoadPressure: 0,
    loadPressure: 0,
    pressureGap: 0,
    lowAlarmPressure: 0,
    runUnits: 0,
    changeHours: 0,
    remainMinutes: 0,
    controlModeWord: 0,
    sortModeWord: 0,
    operationModeWord: 0,
  },
  options: OPTION_LABELS.map((label) => ({ label, checked: false })),
  compressors: Array.from({ length: 8 }, (_, index) => emptyCompressor(index)),
};

function emptyCompressor(index: number): CompressorState {
  return {
    id: index + 1,
    name: `${index + 1}호기`,
    model: "-",
    pressure: 0,
    temperature: 0,
    noLoadPressure: 0,
    loadPressure: 0,
    controlPressure: 0,
    rpm: 0,
    local: false,
    running: false,
    connected: false,
    alarm: false,
    fault: false,
    inverter: false,
    totalHours: 0,
  };
}

export default function App() {
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("main");
  const [settingsLevel, setSettingsLevel] = useState<UserLevel>(USER_LEVELS.user);
  const [adminLogoClicks, setAdminLogoClicks] = useState({ count: 0, lastAt: 0 });
  const [mapValues, setMapValues] = useState<Record<string, YujinMapValue>>({});

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let reloadTimer: number | undefined;
    let pollTimer: number | undefined;

    const loadMapValues = async () => {
      try {
        const response = await fetch(`${apiBase()}/yujin/map-values?limit=2000`, { cache: "no-store" });
        if (!response.ok) throw new Error(`map-values ${response.status}`);
        const values = (await response.json()) as YujinMapValue[];
        if (!cancelled) setMapValues(toMapRecord(values));
      } catch (error) {
        console.error("failed to load map values", error);
      }
    };

    const scheduleReload = () => {
      window.clearTimeout(reloadTimer);
      reloadTimer = window.setTimeout(loadMapValues, 50);
    };

    loadMapValues();
    pollTimer = window.setInterval(loadMapValues, 500);
    const socket = new WebSocket(wsUrl());
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as UpdateEvent;
      if (message.type === "yujin_map_update") scheduleReload();
    };
    socket.onerror = () => socket.close();

    return () => {
      cancelled = true;
      window.clearTimeout(reloadTimer);
      window.clearInterval(pollTimer);
      socket.close();
    };
  }, []);

  const dashboard = useMemo(() => buildDashboardFromMap(mapValues), [mapValues]);
  const lowPressureText = getLowPressureText(dashboard.lowPressureAlarm);
  const showMainScreen = activeScreen === "main";
  const visibleCompressors = dashboard.compressors.filter((compressor) => compressor.connected);
  const mainColumnCount = clamp(visibleCompressors.length, 2, 4);
  const openDialog = (dialog: ActiveDialog) => {
    if (dialog === "settings") setSettingsLevel(USER_LEVELS.user);
    setActiveDialog(dialog);
  };
  const handleLogoClick = () => {
    const nowMs = Date.now();
    const nextCount = nowMs - adminLogoClicks.lastAt > ADMIN_LOGO_CLICK_WINDOW_MS ? 1 : adminLogoClicks.count + 1;

    if (nextCount >= ADMIN_LOGO_CLICK_COUNT) {
      setAdminLogoClicks({ count: 0, lastAt: 0 });
      setMenuOpen(false);
      setActiveDialog("password");
      return;
    }

    setAdminLogoClicks({ count: nextCount, lastAt: nowMs });
  };

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-black text-black">
      <section className="relative h-[800px] w-[1280px] overflow-hidden bg-white">
        <div className="grid h-full grid-rows-[74px_578px_148px]">
          <TopBar dashboard={dashboard} now={now} onLogoClick={handleLogoClick} />

          <section className="relative min-h-0">
            {showMainScreen ? (
              <>
                {visibleCompressors.length > 0 ? (
                  <div
                    className="grid h-full gap-0"
                    style={{
                      gridTemplateColumns: `repeat(${mainColumnCount}, minmax(0, 1fr))`,
                      gridTemplateRows: "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    {visibleCompressors.map((compressor) => (
                      <CompressorCard key={compressor.id} compressor={compressor} />
                    ))}
                  </div>
                ) : (
                  <DisconnectBanner />
                )}
                {visibleCompressors.length > 0 && lowPressureText ? (
                  <AlarmStrip tone={dashboard.lowPressureAlarm} text={lowPressureText} />
                ) : null}
              </>
            ) : (
              <DetailScreen dashboard={dashboard} />
            )}
          </section>

          <Footer
            activeScreen={activeScreen}
            dashboard={dashboard}
            menuOpen={menuOpen}
            onOpenDialog={openDialog}
            onToggleDetail={() => setActiveScreen((screen) => (screen === "detail" ? "main" : "detail"))}
            setMenuOpen={setMenuOpen}
          />
        </div>
        {activeDialog === "factory" ? <FactoryDialog onClose={() => setActiveDialog(null)} /> : null}
        {activeDialog === "settings" ? <SettingsDialog level={settingsLevel} onClose={() => setActiveDialog(null)} /> : null}
        {activeDialog === "control" ? <ControlDialog dashboard={dashboard} onClose={() => setActiveDialog(null)} /> : null}
        {activeDialog === "password" ? (
          <PasswordDialog
            onClose={() => setActiveDialog(null)}
            onSuccess={(level) => {
              setSettingsLevel(level);
              setActiveDialog("settings");
            }}
          />
        ) : null}
      </section>
    </main>
  );
}

function buildDashboardFromMap(values: Record<string, YujinMapValue>): DashboardState {
  const oilfreeSelector = liveMapNumber(values, "0006", 0);
  const compressors = Array.from({ length: 8 }, (_, index) => buildCompressorFromMap(values, index, oilfreeSelector));
  const connectedMask = liveMapNumber(values, "0002", maskFromCompressors(compressors));
  const compQty = clamp(Math.trunc(liveMapNumber(values, "004E", 0)), 0, 8);
  const mainPressure = scale10(liveMapNumber(values, "0000", 0));
  const optionDevice = liveMapNumber(values, "004A", 0);
  const lowAlarmStep = liveMapNumber(values, "0054", 0);
  const sortModeWord = Math.trunc(liveMapNumber(values, "0024", 0));

  return {
    ...emptyDashboard,
    integratedRun: (liveMapNumber(values, "0050", 0) & 0x0001) === 0x0001,
    mainPressure,
    lowPressureAlarm: lowAlarmStep > 0 ? "warning" : "none",
    sortMode: (sortModeWord & 0x0001) === 0x0001 ? "time" : "setting",
    control: {
      noLoadPressure: scale10(liveMapNumber(values, "0016", 0)),
      loadPressure: scale10(liveMapNumber(values, "0018", 0)),
      pressureGap: scale10(liveMapNumber(values, "001A", 0)),
      lowAlarmPressure: scale10(liveMapNumber(values, "0054", 0)),
      runUnits: Math.trunc(liveMapNumber(values, "0026", 0)),
      changeHours: Math.trunc(liveMapNumber(values, "0046", 0)),
      remainMinutes: Math.trunc(liveMapNumber(values, "0048", 0)),
      controlModeWord: Math.trunc(liveMapNumber(values, "0034", 0)),
      sortModeWord,
      operationModeWord: Math.trunc(liveMapNumber(values, "0080", 0)),
    },
    options: buildOptions(optionDevice),
    compressors: compressors.map((compressor, index) => ({
      ...compressor,
      connected: Boolean(connectedMask & (1 << index)),
      name: `${index + 1}호기`,
      model: compressor.model,
      pressure: index < compQty ? compressor.pressure : 0,
    })),
  };
}

function buildCompressorFromMap(
  values: Record<string, YujinMapValue>,
  index: number,
  oilfreeSelector: number,
): CompressorState {
  const compNo = index + 1;
  const oilPrefix = `2${compNo.toString(16).toUpperCase()}`;
  const injectionPrefix = `1${compNo.toString(16).toUpperCase()}`;
  const isOilfree = Boolean(oilfreeSelector & (1 << index));
  const primaryPrefix = isOilfree ? oilPrefix : injectionPrefix;
  const fallbackPrefix = isOilfree ? injectionPrefix : oilPrefix;
  const read = (oilOffset: string, injectionOffset: string = oilOffset, fallbackValue = 0) => {
    const primaryOffset = isOilfree ? oilOffset : injectionOffset;
    const fallbackOffset = isOilfree ? injectionOffset : oilOffset;
    return liveMapNumber(
      values,
      `${primaryPrefix}${primaryOffset}`,
      liveMapNumber(values, `${fallbackPrefix}${fallbackOffset}`, fallbackValue),
    );
  };

  const pressure = scale10(read("00", "00", 0));
  const temperature = scale10(read("0C", "02", 0));
  const noLoadPressure = scale10(read("4E", "26", 0));
  const loadPressure = scale10(read("50", "28", 0));
  const controlPressure = scale10(read("46", "20", 0));
  const rpm = Math.trunc(read("38", "04", 0));
  const alarm = read("28", "0A", 0);
  const faultLow = read("2A", "0C", 0);
  const faultHigh = read("2C", "0C", 0);
  const faultInv = read("2E", "0E", 0);
  const runMode = read("3A", "18", 0);
  const cpStatus = read("30", "16", 0);
  const extRunStop = read("44", "1A", 0);
  const model1 = Math.trunc(read("7C", "7C", 0));
  const version1 = Math.trunc(read("7E", "7E", 0));
  const version2 = Math.trunc(read("80", "80", 0));
  const runHoursLow = read("9A", "68", 0);
  const runHoursHigh = read("9C", "6A", 0);
  const connected = hasRecentValue(values, `${primaryPrefix}00`) || hasRecentValue(values, `${fallbackPrefix}00`);
  const modelName = connected ? getOilfreeModelName(model1, version1, version2) : "-";
  const isInverter = version1 === 3 || rpm > 0 || controlPressure > 0;

  return {
    ...emptyCompressor(index),
    model: modelName,
    pressure,
    temperature,
    noLoadPressure,
    loadPressure,
    controlPressure,
    rpm,
    local: extRunStop === 0,
    running: runMode !== 0 || cpStatus !== 0,
    connected,
    alarm: alarm !== 0,
    fault: faultLow !== 0 || faultHigh !== 0 || faultInv !== 0,
    inverter: isInverter,
    totalHours: Math.trunc(runHoursHigh * 65536 + runHoursLow),
  };
}

function getOilfreeModelName(model1: number, version1: number, version2: number) {
  const modelMap = ["55F", "75F", "90F", "110F", "132F", "160F", "190F", "225F", "260F", "135F"];
  const model = modelMap[model1] ?? "";
  if (!model) return "-";

  const cooling = version2 === 1 ? "W" : "A";
  const version = version1 === 1 ? "R" : version1 === 2 ? "S" : version1 === 3 ? "V" : "-";
  return `Micos ${model}${cooling}${version}`;
}

function buildOptions(optionDevice: number) {
  const base = emptyDashboard.options;
  const bit = (position: number) => Boolean(optionDevice & (1 << position));

  return base.map((option, index) => {
    const mappedBits = [0, 1, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 7];
    return { ...option, checked: optionDevice ? bit(mappedBits[index] ?? index) : false };
  });
}

function toMapRecord(values: YujinMapValue[]) {
  return values.reduce<Record<string, YujinMapValue>>((record, item) => {
    record[item.key.toUpperCase()] = item;
    return record;
  }, {});
}

function liveMapNumber(values: Record<string, YujinMapValue>, key: string, fallback = 0) {
  const item = values[key.toUpperCase()];
  if (!isLiveMapValue(item)) return fallback;
  const raw = item.value;
  if (raw === undefined || raw === null || raw === "") return fallback;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function hasRecentValue(values: Record<string, YujinMapValue>, key: string) {
  const value = values[key.toUpperCase()];
  return isLiveMapValue(value);
}

function isLiveMapValue(value: YujinMapValue | undefined) {
  if (!value?.updated_at || value.source === "seed") return false;
  return Date.now() - new Date(value.updated_at).getTime() <= LIVE_VALUE_MAX_AGE_MS;
}

function maskFromCompressors(compressors: CompressorState[]) {
  return compressors.reduce((mask, compressor, index) => (compressor.connected ? mask | (1 << index) : mask), 0);
}

function scale10(value: number) {
  if (value === INVALID_DISPLAY_RAW_VALUE) return Number.NaN;
  return Math.round((value / 10) * 10) / 10;
}

function formatScaledValue(value: number | undefined, unit: string) {
  if (value === undefined || !Number.isFinite(value)) return "---";
  return `${value.toFixed(1)} ${unit}`;
}

function formatIntegerValue(value: number | undefined, unit = "") {
  if (value === undefined || !Number.isFinite(value) || value === INVALID_DISPLAY_RAW_VALUE) return "---";
  const formatted = Math.trunc(value).toLocaleString("ko-KR");
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatEditableScaledValue(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function setWordLowByte(word: number, lowByte: number) {
  return (Math.trunc(word) & 0xff00) | (lowByte & 0xff);
}

function setWordHighByte(word: number, highByte: number) {
  return ((highByte & 0xff) << 8) | (Math.trunc(word) & 0x00ff);
}

function apiBase() {
  return import.meta.env.VITE_API_BASE || "/api";
}

function wsUrl() {
  const configuredPath = import.meta.env.VITE_WS_PATH || "/ws/dashboard";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${configuredPath}`;
}

async function enqueueMapWriteBatch(
  source: string,
  writes: Array<{ key?: string; address?: number; high_addr?: number; low_addr?: number; length?: number; value?: number; data_hex?: string }>,
) {
  const response = await fetch(`${apiBase()}/control/map-write-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, writes }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function enqueueRawUart4Command(source: string, payload: number[], waitResponse = false) {
  const response = await fetch(`${apiBase()}/control/raw-uart4`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source,
      payload_hex: bytesToHex(payload),
      append_crc: true,
      wait_response: waitResponse,
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function bytesToHex(bytes: number[]) {
  return bytes.map((byte) => (byte & 0xff).toString(16).padStart(2, "0").toUpperCase()).join("");
}

function asciiBytes(value: string) {
  return Array.from(value, (char) => char.charCodeAt(0) & 0xff);
}

type ControlCommandStatus = {
  id: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  error?: string | null;
};

class ControlStatusUnsupportedError extends Error {
  constructor() {
    super("명령 상태 조회 API가 없습니다. backend 이미지를 최신으로 갱신해주세요.");
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function waitForControlCommand(commandId: number, onStatus: (status: ControlCommandStatus) => void) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${apiBase()}/control/commands/${commandId}`, { signal: controller.signal });
      if (response.status === 404) throw new ControlStatusUnsupportedError();
      if (!response.ok) throw new Error(`status HTTP ${response.status}`);
      const status = (await response.json()) as ControlCommandStatus;
      onStatus(status);
      if (status.status === "completed") return status;
      if (status.status === "failed") throw new Error(status.error || "collector command failed");
    } catch (error) {
      if (!isAbortError(error)) throw error;
      onStatus({ id: commandId, status: "pending" });
    } finally {
      window.clearTimeout(timeoutId);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  throw new Error("명령 응답 시간 초과");
}

function TopBar({ dashboard, now, onLogoClick }: { dashboard: DashboardState; now: Date; onLogoClick: () => void }) {
  return (
    <header className="grid min-h-0 grid-cols-[241px_241px_241px_65px_241px_241px] gap-[2px]">
      <TopRunPanel running={dashboard.integratedRun} />
      <TopPressurePanel value={dashboard.mainPressure} />
      <TopPanel tone="date">
        <span>{formatDateTime(now)}</span>
        <small>App {dashboard.appVersion} / Fw {dashboard.firmwareVersion}</small>
      </TopPanel>
      <TopPanel tone="lock">
        <img src="/unlock.png" alt="unlock" className="h-[58px] w-[58px] object-contain" />
      </TopPanel>
      <TopPanel tone="title">
        <span>컴프레샤</span>
        <span>통합제어 시스템</span>
      </TopPanel>
      <button
        aria-label="관리자 비밀번호 화면"
        className="flex min-h-0 items-center justify-center overflow-hidden bg-white px-[3px]"
        onClick={onLogoClick}
        type="button"
      >
        <img src="/grid_logo3.png" alt="GRID" className="h-[72px] w-full object-contain" />
      </button>
    </header>
  );
}

function TopRunPanel({ running }: { running: boolean }) {
  return (
    <TopPanel tone={running ? "run" : "stop"} emphasis>
      <span className="block w-full text-center text-[13px] font-black leading-none tracking-[0.12em] text-white/90">통합 운전</span>
      <span className="mt-[5px] block w-full text-center text-[31px] font-black leading-none tracking-[-0.04em] text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.16)]">
        {running ? "운전 중" : "정 지"}
      </span>
    </TopPanel>
  );
}

function TopPressurePanel({ value }: { value: number }) {
  const hasValue = Number.isFinite(value);

  return (
    <TopPanel tone="pressure" emphasis>
      <span className="block w-full text-center text-[13px] font-black leading-none tracking-[0.14em] text-[#1b5c96]">메인 압력</span>
      <span className="mt-[3px] grid w-full grid-cols-[42px_1fr_42px] items-end leading-none text-[#083f73] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]">
        <span />
        <strong className="text-center font-black tabular-nums tracking-[-0.07em] text-[38px]">{hasValue ? value.toFixed(1) : "---"}</strong>
        <small className="pb-[5px] text-left text-[17px] font-black tracking-[-0.03em]">{hasValue ? "bar" : ""}</small>
      </span>
    </TopPanel>
  );
}

function TopPanel({
  tone,
  emphasis = false,
  children,
}: {
  tone: "run" | "stop" | "pressure" | "date" | "lock" | "title";
  emphasis?: boolean;
  children: ReactNode;
}) {
  const toneClass = {
    run: "border-[#ff7900] bg-[#ff7900]",
    stop: "border-[#6698dd] bg-[#6698dd]",
    pressure: "border-[#8ec3f5] bg-[#8ec3f5]",
    date: "border-[#3374ce] bg-[#3374ce]",
    lock: "border-[#6698dd] bg-[#6698dd]",
    title: "border-[#0d4da5] bg-[#0d4da5]",
  }[tone];

  return (
    <div
      className={`flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-[4px] border px-[4px] text-center font-bold leading-tight text-white ${emphasis ? "text-[21px]" : "text-[23px]"} ${toneClass}`}
    >
      {children}
    </div>
  );
}

function CompressorCard({ compressor }: { compressor: CompressorState }) {
  const pressureLabel = compressor.inverter ? "설정압력" : "무부하/부하";
  const secondValue = compressor.inverter
    ? formatScaledValue(compressor.controlPressure, "bar")
    : formatScaledValue(compressor.noLoadPressure, "bar");
  const thirdValue = compressor.inverter ? formatIntegerValue(compressor.rpm, "rpm") : formatScaledValue(compressor.loadPressure, "bar");
  const titleTone = compressorTitleTone(compressor.id);

  return (
    <article className="relative min-h-0 overflow-hidden bg-white">
      <div className="grid h-full grid-rows-[42px_1fr_1fr_1fr_1fr_1fr] gap-[2px] border border-[#75b4ee] bg-[#d8ecff] p-[2px] shadow-[inset_0_0_0_1px_#ffffff]">
        <div
          className="flex items-center justify-center overflow-hidden border border-[#75b4ee] px-[6px] text-center text-[20px] font-bold leading-none shadow-[2px_2px_1px_#ababab]"
          style={{ backgroundColor: titleTone.background, color: titleTone.color }}
        >
          {compressor.name} ({compressor.model})
        </div>
        <MetricRow label="압력" value={formatScaledValue(compressor.pressure, "bar")} />
        <TripleRow label={pressureLabel} valueA={secondValue} valueB={thirdValue} />
        <MetricRow label="온도" value={formatScaledValue(compressor.temperature, "℃")} />
        <div className="relative grid grid-cols-2 gap-[2px]">
          <StatusCell tone={compressor.local ? "local" : "remote"}>{compressor.local ? "로 컬" : "리모트"}</StatusCell>
          <StatusCell tone={compressor.running ? "running" : "stop"}>{compressor.running ? "부 하" : "정 지"}</StatusCell>
          <StatusFlagOverlay alarm={compressor.alarm} fault={compressor.fault} />
        </div>
        <MetricRow label="총 운전시간" value={formatIntegerValue(compressor.totalHours, "hr")} />
      </div>
    </article>
  );
}

function DisconnectBanner() {
  return (
    <div className="flex h-full items-center justify-center bg-[#f1f3f5]">
      <div className="flex h-[76px] w-full items-center justify-center border-y border-[#b8c0c7] bg-[#9aa2aa] text-[38px] font-black leading-none tracking-[0.28em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
        DISCONNECT
      </div>
    </div>
  );
}

function compressorTitleTone(id: number) {
  const tones = [
    { background: "#b9dcff", color: "#0d4da5" },
    { background: "#9fcbf7", color: "#083f7d" },
    { background: "#82b8ec", color: "#063a74" },
    { background: "#66a4df", color: "#ffffff" },
    { background: "#4f91d2", color: "#ffffff" },
    { background: "#3c7fc5", color: "#ffffff" },
    { background: "#2c6bb0", color: "#ffffff" },
    { background: "#205895", color: "#ffffff" },
  ];
  return tones[(Math.max(1, id) - 1) % tones.length];
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-0 grid-cols-[96px_1fr_1fr] gap-[3px]">
      <MetricLabel>{label}</MetricLabel>
      <MetricValue className="col-span-2">
        {value}
      </MetricValue>
    </div>
  );
}

function TripleRow({ label, valueA, valueB }: { label: string; valueA: string; valueB: string }) {
  return (
    <div className="grid min-h-0 grid-cols-[96px_1fr_1fr] gap-[3px]">
      <MetricLabel>{label}</MetricLabel>
      <MetricValue compact>{valueA}</MetricValue>
      <MetricValue compact>{valueB}</MetricValue>
    </div>
  );
}

function MetricLabel({ children }: { children: string }) {
  return (
    <div className="flex min-h-0 items-center justify-center overflow-hidden border border-[#75b4ee] bg-[#b0d2ff] px-[4px] text-center text-[17px] font-bold leading-tight text-[#13243a]">
      <MetricLabelText label={children} />
    </div>
  );
}

function MetricLabelText({ label }: { label: string }) {
  const compactLabel = label.replace(/\s+/g, "");
  const shouldDistribute = compactLabel.length <= 5 && !compactLabel.includes("/");

  if (!shouldDistribute) {
    return <span className="text-[15px] tracking-[-0.04em]">{label}</span>;
  }

  return (
    <span aria-label={label} className="flex w-[72px] items-center justify-between whitespace-pre">
      {compactLabel.split("").map((char, index) => (
        <span key={`${char}-${index}`}>{char}</span>
      ))}
    </span>
  );
}

function MetricValue({
  children,
  compact = false,
  className = "",
}: {
  children: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-0 items-center justify-end overflow-hidden border border-[#75b4ee] bg-white px-[10px] text-right font-bold leading-tight tracking-[-0.01em] ${compact ? "text-[18px]" : "text-[23px]"} ${className}`}
    >
      {children}
    </div>
  );
}

function StatusCell({ tone, children }: { tone: "local" | "remote" | "running" | "stop"; children: ReactNode }) {
  const toneClass = {
    local: "bg-[#4caa70] text-white",
    remote: "bg-[#4caa70] text-white",
    running: "bg-[#e42222] text-white",
    stop: "bg-[#bdbdbd] text-black",
  }[tone];

  return (
    <div className={`flex min-h-0 items-center justify-center overflow-hidden border border-[#75b4ee] px-[2px] text-center text-[23px] font-bold leading-none tracking-[-0.04em] ${toneClass}`}>
      {children}
    </div>
  );
}

function StatusFlagOverlay({ alarm, fault }: { alarm: boolean; fault: boolean }) {
  if (!alarm && !fault) return null;
  if (alarm && fault) {
    return (
      <div className="status-flag-blink absolute inset-0 z-20 grid grid-cols-2 gap-[2px] bg-[#d8ecff]">
        <FlagCell tone="alarm">알 림</FlagCell>
        <FlagCell tone="fault">고 장</FlagCell>
      </div>
    );
  }

  return (
    <div className="status-flag-blink absolute inset-0 z-20 grid bg-[#d8ecff]">
      <FlagCell tone={alarm ? "alarm" : "fault"}>{alarm ? "알 림" : "고 장"}</FlagCell>
    </div>
  );
}

function FlagCell({ tone, children }: { tone: "alarm" | "fault"; children: ReactNode }) {
  const activeClass = tone === "alarm" ? "bg-[#ffff00] text-black" : "bg-[#ff4f4f] text-black";

  return (
    <div className={`flex min-h-0 items-center justify-center overflow-hidden border border-[#75b4ee] px-[2px] text-center text-[23px] font-black leading-none tracking-[-0.04em] ${activeClass}`}>
      {children}
    </div>
  );
}

function AlarmStrip({ tone, text }: { tone: DashboardState["lowPressureAlarm"]; text: string }) {
  const toneClass = tone === "reserve" ? "text-[#1c55cc]" : "text-[#d90000]";

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-10 h-[44px] bg-[#c1c1c1] text-center text-[30px] font-black leading-[44px] ${toneClass}`}>
      {text}
    </div>
  );
}

function Footer({
  activeScreen,
  dashboard,
  menuOpen,
  onOpenDialog,
  onToggleDetail,
  setMenuOpen,
}: {
  activeScreen: ActiveScreen;
  dashboard: DashboardState;
  menuOpen: boolean;
  onOpenDialog: (dialog: ActiveDialog) => void;
  onToggleDetail: () => void;
  setMenuOpen: (open: boolean) => void;
}) {
  return (
    <footer className="relative z-40 grid min-h-0 grid-cols-[45px_216px_45px_282px_45px_558px_66px] gap-[2px] overflow-visible bg-white p-[3px]">
      <VerticalTitle>모드</VerticalTitle>
      <ModePanel active={dashboard.sortMode} />
      <VerticalTitle>통합제어</VerticalTitle>
      <ControlPanel control={dashboard.control} />
      <VerticalTitle>옵션</VerticalTitle>
      <OptionPanel options={dashboard.options} />
      <QuickButtons
        activeScreen={activeScreen}
        menuOpen={menuOpen}
        onOpenDialog={onOpenDialog}
        onToggleDetail={onToggleDetail}
        setMenuOpen={setMenuOpen}
      />
    </footer>
  );
}

function VerticalTitle({ children }: { children: string }) {
  return (
    <div className="flex min-h-0 items-center justify-center whitespace-pre-line rounded-[5px] border border-[#6698dd] bg-[#6698dd] text-center text-[24px] font-bold leading-tight text-white">
      {children.split("").join("\n")}
    </div>
  );
}

function ModePanel({ active }: { active: DashboardState["sortMode"] }) {
  return (
    <div className="grid min-h-0 grid-rows-2 gap-[4px] border border-[#9fc9fa] bg-[#eef7ff] p-[3px]">
      <div className="grid grid-cols-2 gap-[4px]">
        <ModeButton active={active === "setting"}>설정순</ModeButton>
        <ModeButton active={active === "time"}>시간순</ModeButton>
      </div>
      <div className="grid grid-cols-3 gap-[4px]">
        <IconButton label="이전" src="/arrow_back_ios_new_24dp.png" />
        <IconButton label="새로고침" src="/refresh_24dp.png" />
        <IconButton label="다음" src="/arrow_forward_ios_24dp.png" />
      </div>
    </div>
  );
}

function ModeButton({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <button
      className={`rounded-[6px] border text-[22px] font-bold shadow-[1px_1px_1px_#c2c2c2] ${
        active ? "border-[#3374ce] bg-[#3374ce] text-white" : "border-[#3374ce] bg-white text-[#3374ce]"
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

function IconButton({ label, src }: { label: string; src: string }) {
  return (
    <button
      aria-label={label}
      className="flex items-center justify-center rounded-[6px] border border-[#9fc9fa] bg-white shadow-[1px_1px_1px_#c2c2c2]"
      type="button"
    >
      <img src={src} alt="" className="h-[42px] w-[42px] object-contain" />
    </button>
  );
}

function ControlPanel({ control }: { control: DashboardState["control"] }) {
  const items = [
    { label: "무부하", value: formatScaledValue(control.noLoadPressure, "bar") },
    { label: "부하", value: formatScaledValue(control.loadPressure, "bar") },
    { label: "압력차", value: formatScaledValue(control.pressureGap, "bar") },
    { label: "가동대수", value: `${control.runUnits} ea` },
    { label: "교환운전", value: `${control.changeHours} hr` },
    { label: "남은시간", value: `${control.remainMinutes} min` },
  ];

  return (
    <div className="grid min-h-0 grid-cols-3 grid-rows-2 gap-0 border border-[#75b4ee] bg-white">
      {items.map((item) => (
        <div key={item.label} className="grid min-h-0 grid-rows-[32px_1fr] border border-[#75b4ee]">
          <div className="flex items-center justify-center border-b border-[#75b4ee] bg-[#8ec3f5] text-center text-[16px] font-bold text-white">
            {item.label}
          </div>
          <div className="flex items-center justify-center bg-white px-[6px] text-center text-[22px] font-bold">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function OptionPanel({ options }: { options: DashboardState["options"] }) {
  return (
    <div className="grid min-h-0 grid-cols-3 grid-rows-5 gap-x-[6px] gap-y-[2px] overflow-hidden border border-[#9fc9fa] bg-[#fbfdff] px-[7px] py-[5px]">
      {options
        .filter((option) => option.visible !== false)
        .map((option) => (
          <label key={option.label} className="flex min-h-0 items-center gap-[4px] overflow-hidden text-[12px] font-semibold leading-tight">
            <input checked={option.checked} className="h-[14px] w-[14px] shrink-0 accent-[#3175ce]" readOnly type="checkbox" />
            <span className="line-clamp-2">{option.label}</span>
          </label>
        ))}
    </div>
  );
}

function DetailScreen({ dashboard }: { dashboard: DashboardState }) {
  const connectedCount = dashboard.compressors.filter((compressor) => compressor.connected).length;

  return (
    <div className="grid h-full grid-rows-[46px_1fr] gap-[3px] bg-[#eef7ff] p-[3px]">
      <div className="grid grid-cols-[220px_1fr_190px_190px] gap-[3px]">
        <HeaderCell>상세 화면</HeaderCell>
        <HeaderCell>컴프레샤 / DIO / AIO 상태 통합 보기</HeaderCell>
        <HeaderCell>연결 {connectedCount} / {dashboard.compressors.length}</HeaderCell>
        <HeaderCell>메인압력 {formatScaledValue(dashboard.mainPressure, "bar")}</HeaderCell>
      </div>
      <div className="grid min-h-0 grid-cols-4 grid-rows-2 gap-[3px]">
        {dashboard.compressors.map((compressor) => (
          <DetailDeviceCard key={compressor.id} compressor={compressor} />
        ))}
      </div>
    </div>
  );
}

function DetailDeviceCard({ compressor }: { compressor: CompressorState }) {
  const imageSrc = getDetailDeviceImage(compressor);
  const statusText = compressor.connected ? (compressor.fault ? "FAULT" : compressor.running ? "RUN" : "RDY") : "FAIL";
  const statusImage = !compressor.connected ? "/failure.png" : compressor.fault ? "/fault.png" : null;
  const rows = [
    ["압력", formatScaledValue(compressor.pressure, "bar")],
    ["온도", formatScaledValue(compressor.temperature, "℃")],
    ["무부하", formatScaledValue(compressor.noLoadPressure, "bar")],
    ["부하", formatScaledValue(compressor.loadPressure, "bar")],
    ["제어압력", formatScaledValue(compressor.controlPressure, "bar")],
    ["RPM", formatIntegerValue(compressor.rpm)],
    ["운전시간", formatIntegerValue(compressor.totalHours, "hr")],
  ];

  return (
    <article className="grid min-h-0 grid-rows-[38px_1fr_40px] overflow-hidden border border-[#75b4ee] bg-white">
      <div className="flex items-center justify-center bg-[#b3d4ff] px-[6px] text-center text-[19px] font-bold leading-none text-[#0d4da5]">
        {compressor.name} ({compressor.model})
      </div>
      <div className="grid min-h-0 grid-cols-[152px_1fr] gap-[3px] bg-[#f5fbff] p-[3px]">
        <div className="grid min-h-0 grid-rows-[1fr_28px] overflow-hidden border border-[#d2e8ff] bg-white">
          <div className="relative flex min-h-0 items-center justify-center p-[4px]">
            <img src={imageSrc} alt={compressor.model} className="max-h-full max-w-full object-contain" />
            {statusImage ? <img src={statusImage} alt={statusText} className="absolute inset-x-[6px] top-[50%] h-[34px] -translate-y-1/2 object-fill" /> : null}
          </div>
          <div className="flex items-center justify-center bg-[#eef7ff] text-[15px] font-black text-[#0d4da5]">{compressor.inverter ? "INVERTER" : "STANDARD"}</div>
        </div>
        <div className="grid min-h-0 grid-cols-2 content-start gap-[2px]">
          {rows.map(([label, value]) => (
            <div key={label} className="grid min-h-[30px] grid-cols-[76px_1fr] overflow-hidden border border-[#d2e8ff] bg-white">
              <div className="flex items-center justify-center bg-[#eef7ff] text-[13px] font-bold">{label}</div>
              <div className="flex items-center justify-center text-[15px] font-bold">{value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-[2px] p-[2px]">
        <MiniLamp active={compressor.connected} danger={!compressor.connected} label={compressor.connected ? "통신" : "끊김"} />
        <MiniLamp active={compressor.local} label={compressor.local ? "LOCAL" : "REMOTE"} />
        <MiniLamp active={compressor.running} label={compressor.running ? "운전" : "정지"} />
        <MiniLamp active={compressor.fault || compressor.alarm} danger label={compressor.fault ? "고장" : compressor.alarm ? "알람" : "정상"} />
      </div>
    </article>
  );
}

function getDetailDeviceImage(compressor: CompressorState) {
  if (compressor.model !== "-" && !compressor.model.includes("Micos")) {
    return compressor.inverter ? "/injection_v_mini.png" : "/injection_mini.png";
  }
  return compressor.inverter ? "/equip_mini.png" : "/equip_n_mini.png";
}

function MiniLamp({ active, danger = false, label }: { active: boolean; danger?: boolean; label: string }) {
  const className = active ? (danger ? "bg-[#ff6565] text-black" : "bg-[#4caa70] text-white") : "bg-[#d5d5d5] text-black";
  return <div className={`flex items-center justify-center text-[13px] font-bold ${className}`}>{label}</div>;
}

function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center border border-[#75b4ee] bg-[#3374ce] px-[6px] text-center text-[20px] font-bold text-white">
      {children}
    </div>
  );
}

function DialogShell({
  children,
  onClose,
  subtitle = "설정을 확인하고 필요한 항목을 조정하세요",
  title,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
  wide?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-[24px]">
      <section className={`${wide ? "w-[1040px]" : "w-[560px]"} overflow-hidden rounded-[12px] border border-[#d3e0eb] bg-[#f6f9fc] shadow-[0_14px_34px_rgba(15,43,72,0.32)]`}>
        <div className="flex h-[74px] items-center justify-between border-b border-[#dbe7f1] bg-white px-[22px]">
          <div>
            <div className="text-[26px] font-black leading-none text-[#173f69]">{title}</div>
            <div className="mt-[7px] text-[13px] font-bold text-[#6f879d]">{subtitle}</div>
          </div>
          <DialogCloseButton onClick={onClose} />
        </div>
        {children}
      </section>
    </div>
  );
}

function DialogCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="닫기"
      className="flex h-[42px] w-[42px] items-center justify-center rounded-[8px] border border-[#cfdde8] bg-[#f3f7fa] text-[28px] font-black leading-none text-[#45657f] transition-colors hover:bg-[#e8f0f6]"
      onClick={onClick}
      type="button"
    >
      ×
    </button>
  );
}

function FactoryDialog({ onClose }: { onClose: () => void }) {
  const factories = ["공장 1", "공장 2", "공장 3", "공장 4", "공장 5"];
  const [selectedFactory, setSelectedFactory] = useState(() => Number(window.localStorage.getItem("selectedFactory") ?? 0) || 0);
  const [saveStatus, setSaveStatus] = useState("공장 선택 대기 중");
  const applyFactory = () => {
    window.localStorage.setItem("selectedFactory", String(selectedFactory));
    setSaveStatus(`${factories[selectedFactory]} 저장 완료`);
    window.setTimeout(onClose, 250);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-[24px]">
      <section className="w-[720px] overflow-hidden rounded-[12px] border border-[#d3e0eb] bg-[#f6f9fc] shadow-[0_14px_34px_rgba(15,43,72,0.32)]">
        <div className="flex h-[86px] items-center justify-between border-b border-[#dbe7f1] bg-white px-[22px]">
          <div className="flex items-center gap-[14px]">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-[#eaf4fc]">
              <img src="/factory.png" alt="" className="h-[36px] w-[36px] object-contain" />
            </span>
            <span>
              <span className="block text-[27px] font-black leading-none text-[#173f69]">공장 변경</span>
              <span className="mt-[7px] block text-[14px] font-bold text-[#6f879d]">운영할 공장을 선택한 뒤 적용하세요</span>
            </span>
          </div>
          <DialogCloseButton onClick={onClose} />
        </div>
        <div className="grid grid-cols-[190px_1fr] gap-[12px] p-[14px]">
          <aside className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
            <div className="text-[14px] font-black text-[#6f879d]">현재 선택</div>
            <div className="mt-[10px] text-[32px] font-black leading-none text-[#173f69]">{factories[selectedFactory]}</div>
            <div className="mt-[12px] rounded-[8px] bg-[#eef7ff] px-[10px] py-[8px] text-[13px] font-black text-[#45657f]">{saveStatus}</div>
          </aside>
          <div className="grid grid-cols-2 gap-[8px]">
        {factories.map((factory, index) => (
          <button
            key={factory}
            className={`grid h-[76px] grid-cols-[44px_1fr] items-center rounded-[9px] border p-[10px] text-left transition-colors ${
              selectedFactory === index
                ? "border-[#237bd0] bg-[#eef7ff] shadow-[0_8px_18px_rgba(35,123,208,0.14)]"
                : "border-[#d9e6f0] bg-white hover:border-[#9cc7e8]"
            }`}
            onClick={() => setSelectedFactory(index)}
            type="button"
          >
            <span className={`flex h-[36px] w-[36px] items-center justify-center rounded-[7px] text-[17px] font-black ${selectedFactory === index ? "bg-[#237bd0] text-white" : "bg-[#eef3f7] text-[#5d748c]"}`}>
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-col justify-center">
              <span className="text-[22px] font-black leading-none text-[#173f69]">{factory}</span>
              <span className="mt-[7px] text-[13px] font-bold text-[#6f879d]">{selectedFactory === index ? "선택됨" : "선택 가능"}</span>
            </span>
          </button>
        ))}
          </div>
        </div>
        <div className="grid h-[72px] grid-cols-[1fr_160px_180px] gap-[10px] border-t border-[#dbe7f1] bg-white px-[18px] py-[12px]">
          <span />
          <button className="rounded-[8px] border border-[#cfdde8] bg-[#f8fbfd] text-[19px] font-black text-[#45657f]" onClick={onClose} type="button">취소</button>
          <button className="rounded-[8px] bg-[#237bd0] text-[19px] font-black text-white shadow-[0_5px_12px_rgba(35,123,208,0.2)]" onClick={applyFactory} type="button">적용</button>
        </div>
      </section>
    </div>
  );
}

function ControlDialog({ dashboard, onClose }: { dashboard: DashboardState; onClose: () => void }) {
  const [sortMode, setSortMode] = useState<"setting" | "time">((dashboard.control.sortModeWord & 0x00ff) === 1 ? "time" : "setting");
  const [operationMode, setOperationMode] = useState<"local" | "remote">(((dashboard.control.operationModeWord >> 8) & 0xff) === 0 ? "local" : "remote");
  const [controlMode, setControlMode] = useState<"single" | "group">(dashboard.control.controlModeWord === 1 ? "group" : "single");
  const initialSettings = {
    noLoadPressure: formatEditableScaledValue(dashboard.control.noLoadPressure),
    loadPressure: formatEditableScaledValue(dashboard.control.loadPressure),
    pressureGap: formatEditableScaledValue(dashboard.control.pressureGap),
    lowAlarmPressure: formatEditableScaledValue(dashboard.control.lowAlarmPressure),
    changeHours: String(dashboard.control.changeHours),
    runUnits: String(dashboard.control.runUnits),
  };
  const [settings, setSettings] = useState(initialSettings);
  const [appliedSettings, setAppliedSettings] = useState(initialSettings);
  const [commandStatus, setCommandStatus] = useState("명령 대기 중");
  const [commandBusy, setCommandBusy] = useState(false);
  const [activeControlKey, setActiveControlKey] = useState<keyof typeof settings | null>(null);
  const controls: Array<{
    address: number;
    key: keyof typeof settings;
    label: string;
    scale: number;
    step: string;
    unit: string;
  }> = [
    { label: "무부하 압력", key: "noLoadPressure", unit: "bar", step: "0.1", address: 0x16, scale: 10 },
    { label: "부하 압력", key: "loadPressure", unit: "bar", step: "0.1", address: 0x18, scale: 10 },
    { label: "장비별 압력차", key: "pressureGap", unit: "bar", step: "0.1", address: 0x1a, scale: 10 },
    { label: "저압경보 압력 설정", key: "lowAlarmPressure", unit: "bar", step: "0.1", address: 0x54, scale: 10 },
    { label: "교환 운전 시간", key: "changeHours", unit: "hr", step: "1", address: 0x46, scale: 1 },
    { label: "가동 대수", key: "runUnits", unit: "ea", step: "1", address: 0x26, scale: 1 },
  ];
  const updateSetting = (key: keyof typeof settings, value: string) => {
    const integerOnly = key === "changeHours" || key === "runUnits";
    setSettings((current) => ({ ...current, [key]: sanitizeNumericInput(value, integerOnly) }));
  };
  const activeControl = activeControlKey ? controls.find((item) => item.key === activeControlKey) : undefined;
  const appendKeypadValue = (value: string) => {
    if (!activeControlKey) return;
    const integerOnly = activeControlKey === "changeHours" || activeControlKey === "runUnits";
    setSettings((current) => {
      const nextValue = value === "." && (integerOnly || current[activeControlKey].includes("."))
        ? current[activeControlKey]
        : `${current[activeControlKey]}${value}`;
      return { ...current, [activeControlKey]: sanitizeNumericInput(nextValue, integerOnly) };
    });
  };
  const backspaceKeypadValue = () => {
    if (!activeControlKey) return;
    setSettings((current) => ({ ...current, [activeControlKey]: current[activeControlKey].slice(0, -1) }));
  };
  const clearKeypadValue = () => {
    if (!activeControlKey) return;
    setSettings((current) => ({ ...current, [activeControlKey]: "" }));
  };
  const confirmKeypadValue = async () => {
    if (!activeControlKey) return;
    const key = activeControlKey;
    setActiveControlKey(null);
    await applySetting(key);
  };
  const numberValue = (key: keyof typeof settings) => {
    if (settings[key].trim() === "") throw new Error(`${key} 값이 비어 있습니다`);
    const value = Number(settings[key]);
    if (!Number.isFinite(value)) throw new Error(`${key} 값이 올바르지 않습니다`);
    return value;
  };

  const sendControlWrites = async (
    label: string,
    source: string,
    writes: Array<{ key?: string; address?: number; length?: number; value?: number; data_hex?: string }>,
  ) => {
    let commandId: number | null = null;
    setCommandBusy(true);
    setCommandStatus(`${label} 명령 전송 중...`);
    try {
      const result = await enqueueMapWriteBatch(source, writes);
      commandId = Number(result.id);
      setCommandStatus(`${label} #${commandId} 전송 대기...`);
      await waitForControlCommand(commandId, (status) => {
        if (status.status === "pending") setCommandStatus(`${label} #${commandId} 대기 중...`);
        if (status.status === "in_progress") setCommandStatus(`${label} #${commandId} 장비 전송 중...`);
        if (status.status === "completed") setCommandStatus(`${label} #${commandId} 전송 완료`);
      });
      return true;
    } catch (error) {
      if (error instanceof ControlStatusUnsupportedError && commandId !== null) {
        setCommandStatus(`${label} #${commandId} 등록됨 / backend 갱신 필요`);
        return true;
      }
      setCommandStatus(`${label} 실패: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      setCommandBusy(false);
    }
  };

  const sendGroupOperation = async (action: "run" | "stop") => {
    let commandId: number | null = null;
    setCommandBusy(true);
    setCommandStatus(action === "run" ? "통합운전 명령 전송 중..." : "통합정지 명령 전송 중...");
    try {
      const response = await fetch(`${apiBase()}/control/group-operation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      commandId = Number(result.id);
      setCommandStatus(`명령 #${commandId} 전송 대기...`);
      await waitForControlCommand(commandId, (status) => {
        if (status.status === "pending") setCommandStatus(`명령 #${commandId} 대기 중...`);
        if (status.status === "in_progress") setCommandStatus(`명령 #${commandId} 장비 전송 중...`);
        if (status.status === "completed") setCommandStatus(`명령 #${commandId} 전송 완료`);
      });
    } catch (error) {
      if (error instanceof ControlStatusUnsupportedError && commandId !== null) setCommandStatus(`명령 #${commandId} 등록됨 / backend 갱신 필요`);
      else setCommandStatus(`명령 전송 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCommandBusy(false);
    }
  };

  const applySetting = async (key: keyof typeof settings) => {
    const control = controls.find((item) => item.key === key);
    if (!control) return;
    if (settings[key] === appliedSettings[key]) return;
    try {
      const value = numberValue(key);
      const packetValue = Math.round(value * control.scale);
      const success = await sendControlWrites(control.label, "control_dialog_setting", [
        {
          key: control.address.toString(16).padStart(4, "0").toUpperCase(),
          address: control.address,
          length: 2,
          value: packetValue,
        },
      ]);
      if (success) {
        setAppliedSettings((current) => ({ ...current, [key]: settings[key] }));
      }
    } catch (error) {
      setCommandStatus(`${control.label} 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const selectSortMode = async (nextMode: "setting" | "time") => {
    if (nextMode === sortMode) return;
    const previous = sortMode;
    setSortMode(nextMode);
    const success = await sendControlWrites("운전 조건", "control_dialog_sort_mode", [
      {
        key: "0024",
        address: 0x24,
        length: 2,
        value: setWordLowByte(dashboard.control.sortModeWord, nextMode === "time" ? 1 : 0),
      },
    ]);
    if (!success) setSortMode(previous);
  };

  const selectOperationMode = async (nextMode: "local" | "remote") => {
    if (nextMode === operationMode) return;
    if (dashboard.integratedRun) {
      setCommandStatus("통합 운전중에는 운전 위치를 변경할 수 없습니다");
      return;
    }

    const previous = operationMode;
    setOperationMode(nextMode);

    const success = await sendControlWrites("운전 위치", "control_dialog_operation_mode", [
      {
        key: "0080",
        address: 0x80,
        length: 2,
        value: setWordHighByte(dashboard.control.operationModeWord, nextMode === "local" ? 0 : 1),
      },
    ]);
    if (!success) setOperationMode(previous);
  };

  const selectControlMode = async (nextMode: "single" | "group") => {
    if (nextMode === controlMode) return;
    if (dashboard.integratedRun) {
      setCommandStatus("통합 운전중에는 제어 모드를 변경할 수 없습니다");
      return;
    }

    const previous = controlMode;
    setControlMode(nextMode);

    const success = await sendControlWrites("제어 모드", "control_dialog_control_mode", [
      {
        key: "0034",
        address: 0x34,
        length: 2,
        value: nextMode === "group" ? 1 : 0,
      },
    ]);
    if (!success) setControlMode(previous);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-[24px]">
      <section className="w-[1080px] overflow-hidden rounded-[12px] border border-[#d3e0eb] bg-[#f6f9fc] shadow-[0_14px_34px_rgba(15,43,72,0.32)]">
        <div className="flex h-[86px] items-center justify-between border-b border-[#dbe7f1] bg-white px-[22px]">
          <div className="flex items-center gap-[14px]">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-[#eaf4fc]">
              <img src="/control.png" alt="" className="h-[36px] w-[36px] object-contain" />
            </span>
            <span>
              <span className="block text-[27px] font-black leading-none text-[#173f69]">통합운전 설정</span>
              <span className="mt-[7px] block text-[14px] font-bold text-[#6f879d]">운전 조건과 그룹 제어를 한 화면에서 관리합니다</span>
            </span>
          </div>
          <DialogCloseButton onClick={onClose} />
        </div>
        <div className="grid grid-cols-[1fr_280px] gap-[16px] p-[18px]">
          <div className="grid gap-[14px]">
            <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
              <PanelHeading eyebrow="CONTROL VALUES">제어 기준값</PanelHeading>
              <div className="mt-[12px] grid grid-cols-3 gap-[10px]">
                {controls.map(({ key, label, unit }) => (
                  <div key={label} className="rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[12px]">
                    <div className="text-[14px] font-black text-[#6f879d]">{label}</div>
                    <label className="mt-[8px] flex items-end justify-between gap-[8px]">
	                      <input
	                        className="min-w-0 flex-1 rounded-[6px] border border-[#c9deef] bg-white px-[8px] py-[5px] text-right text-[25px] font-black leading-none text-[#173f69] outline-none focus:border-[#237bd0]"
	                        autoComplete="off"
	                        disabled={commandBusy}
	                        enterKeyHint="done"
	                        inputMode={key === "changeHours" || key === "runUnits" ? "numeric" : "decimal"}
	                        onBlur={() => {
	                          void applySetting(key);
	                          window.setTimeout(() => {
	                            setActiveControlKey((current) => (current === key ? null : current));
	                          }, 120);
	                        }}
	                        onChange={(event) => updateSetting(key, event.target.value)}
	                        onFocus={(event) => {
	                          setActiveControlKey(key);
	                          event.currentTarget.select();
	                        }}
	                        onKeyDown={(event) => {
	                          if (event.key === "Enter") event.currentTarget.blur();
	                        }}
	                        pattern={key === "changeHours" || key === "runUnits" ? "[0-9]*" : "[0-9.]*"}
	                        type="text"
	                        value={settings[key]}
	                      />
                      <span className="text-[14px] font-black text-[#6f879d]">{unit}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[14px]">
              <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
                <PanelHeading eyebrow="SORT MODE">운전 조건</PanelHeading>
                <div className="mt-[12px] grid gap-[10px]">
                  <SegmentedOption
                    items={[
                      ["setting", "설정순"],
                      ["time", "시간순"],
                    ]}
                    disabled={commandBusy}
                    selected={sortMode}
                    onSelect={(value) => selectSortMode(value as "setting" | "time")}
                  />
                  <label className="flex h-[54px] items-center justify-between rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] px-[16px] text-[17px] font-black text-[#244c75]">
                    <span>절약모드</span>
                    <input readOnly className="h-[24px] w-[24px] accent-[#237bd0]" type="checkbox" />
                  </label>
                </div>
              </div>
              <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
                <PanelHeading eyebrow="INVERTER">인버터 기준</PanelHeading>
                <div className="mt-[12px] grid grid-cols-2 gap-[10px]">
                  <InfoTile label="메인 호기" unit="호기" value="0" />
                  <InfoTile label="제어압력" unit="bar" value="0.0" />
                </div>
              </div>
            </div>
          </div>
          <aside className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
            <PanelHeading eyebrow="ACTION">통합운전</PanelHeading>
            <div className="mt-[12px] grid gap-[10px]">
              <div className="grid">
                <SegmentedOption
                  items={[
                    ["local", "LOCAL"],
                    ["remote", "REMOTE"],
                  ]}
                  disabled={commandBusy}
                  selected={operationMode}
                  onSelect={(value) => selectOperationMode(value as "local" | "remote")}
                />
              </div>
              <div className="grid">
                <SegmentedOption
                  items={[
                    ["single", "개별"],
                    ["group", "통합"],
                  ]}
                  disabled={commandBusy}
                  selected={controlMode}
                  onSelect={(value) => selectControlMode(value as "single" | "group")}
                />
              </div>
              <div className="rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] px-[12px] py-[10px] text-center text-[13px] font-black text-[#45657f]">
                {commandStatus}
              </div>
              <button className="h-[72px] rounded-[9px] bg-[#d92525] text-[30px] font-black text-white shadow-[0_6px_13px_rgba(208,31,38,0.2)] disabled:opacity-55" disabled={commandBusy} onClick={() => sendGroupOperation("run")} type="button">운전</button>
              <button className="h-[72px] rounded-[9px] bg-[#667380] text-[30px] font-black text-white shadow-[0_6px_13px_rgba(70,82,94,0.16)] disabled:opacity-55" disabled={commandBusy} onClick={() => sendGroupOperation("stop")} type="button">정지</button>
            </div>
          </aside>
        </div>
        <div className="flex h-[62px] items-center justify-end border-t border-[#dbe7f1] bg-white px-[18px] text-[14px] font-black text-[#6f879d]">
          입력칸 선택 시 숫자 키패드가 표시되며, 확인 또는 포커스 해제 시 즉시 장비로 전송됩니다
        </div>
      </section>
      {activeControl ? (
        <NumericKeypad
          allowDecimal={activeControl.key !== "changeHours" && activeControl.key !== "runUnits"}
          disabled={commandBusy}
          label={activeControl.label}
          onAppend={appendKeypadValue}
          onBackspace={backspaceKeypadValue}
          onClear={clearKeypadValue}
          onConfirm={confirmKeypadValue}
          unit={activeControl.unit}
          value={settings[activeControl.key]}
        />
      ) : null}
    </div>
  );
}

function sanitizeNumericInput(value: string, integerOnly: boolean) {
  const numeric = value.replace(integerOnly ? /\D/g : /[^0-9.]/g, "");
  if (integerOnly) return numeric;
  const [head, ...tails] = numeric.split(".");
  return tails.length > 0 ? `${head}.${tails.join("")}` : head;
}

function NumericKeypad({
  allowDecimal,
  disabled,
  label,
  onAppend,
  onBackspace,
  onClear,
  onConfirm,
  unit,
  value,
}: {
  allowDecimal: boolean;
  disabled: boolean;
  label: string;
  onAppend: (value: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onConfirm: () => void;
  unit: string;
  value: string;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];
  const preventFocusLoss = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <div className="fixed bottom-[92px] left-1/2 z-[60] w-[360px] -translate-x-1/2 rounded-[14px] border border-[#b8d2e8] bg-white p-[12px] shadow-[0_18px_36px_rgba(15,43,72,0.34)]">
      <div className="mb-[10px] flex items-end justify-between rounded-[10px] bg-[#eef7ff] px-[12px] py-[9px]">
        <span>
          <span className="block text-[12px] font-black tracking-[0.08em] text-[#6f879d]">{label}</span>
          <span className="mt-[3px] block text-[25px] font-black leading-none text-[#173f69]">{value || "0"}</span>
        </span>
        <span className="text-[14px] font-black text-[#6f879d]">{unit}</span>
      </div>
      <div className="grid grid-cols-3 gap-[8px]">
        {keys.map((key) => (
          <button
            key={key}
            className="h-[50px] rounded-[8px] border border-[#d3e4f2] bg-[#f8fbfd] text-[24px] font-black text-[#173f69] active:bg-[#e2f1ff] disabled:opacity-45"
            disabled={disabled || (key === "." && !allowDecimal)}
            onClick={() => onAppend(key)}
            onPointerDown={preventFocusLoss}
            type="button"
          >
            {key}
          </button>
        ))}
        <button
          className="h-[50px] rounded-[8px] border border-[#d3e4f2] bg-[#f8fbfd] text-[18px] font-black text-[#173f69] active:bg-[#e2f1ff] disabled:opacity-45"
          disabled={disabled}
          onClick={onBackspace}
          onPointerDown={preventFocusLoss}
          type="button"
        >
          지움
        </button>
      </div>
      <div className="mt-[8px] grid grid-cols-2 gap-[8px]">
        <button
          className="h-[48px] rounded-[8px] border border-[#d3e4f2] bg-white text-[17px] font-black text-[#45657f] active:bg-[#eef7ff] disabled:opacity-45"
          disabled={disabled}
          onClick={onClear}
          onPointerDown={preventFocusLoss}
          type="button"
        >
          초기화
        </button>
        <button
          className="h-[48px] rounded-[8px] bg-[#237bd0] text-[18px] font-black text-white active:bg-[#1968b3] disabled:opacity-45"
          disabled={disabled}
          onClick={onConfirm}
          onPointerDown={preventFocusLoss}
          type="button"
        >
          확인
        </button>
      </div>
    </div>
  );
}

function InfoTile({ label, unit, value }: { label: string; unit: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[12px]">
      <div className="text-[13px] font-black text-[#6f879d]">{label}</div>
      <div className="mt-[8px] flex items-end justify-between">
        <span className="text-[25px] font-black leading-none text-[#173f69]">{value}</span>
        <span className="text-[13px] font-black text-[#6f879d]">{unit}</span>
      </div>
    </div>
  );
}

function PanelHeading({ children, eyebrow }: { children: ReactNode; eyebrow: string }) {
  return (
    <div className="flex h-[40px] items-center justify-between border-b border-[#c9e1f5]">
      <span className="text-[20px] font-black text-[#173f69]">{children}</span>
      <span className="text-[11px] font-black tracking-[0.12em] text-[#7c97b0]">{eyebrow}</span>
    </div>
  );
}

function SegmentedOption({
  disabled = false,
  items,
  onSelect,
  selected,
}: {
  disabled?: boolean;
  items: Array<[string, string]>;
  onSelect: (value: string) => void;
  selected: string;
}) {
  return (
    <div className="grid h-[48px] grid-cols-2 rounded-[8px] border border-[#d3e7f8] bg-[#edf6fe] p-[4px]">
      {items.map(([value, label]) => (
        <button
          key={value}
          className={`rounded-[6px] text-[18px] font-black transition-colors ${
            selected === value ? "bg-[#237bd0] text-white shadow-[0_4px_10px_rgba(35,123,208,0.28)]" : "text-[#3e6488]"
          }`}
          disabled={disabled}
          onClick={() => onSelect(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PasswordDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: (level: UserLevel) => void }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("상단 로고 관리자 진입 비밀번호를 입력하세요");
  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    const matchedLevel = (Object.entries(USER_PASSWORDS).find(([, expected]) => expected === password)?.[0] ?? "") as `${UserLevel}` | "";

    if (matchedLevel === "") {
      setMessage("비밀번호가 올바르지 않습니다");
      setPassword("");
      return;
    }

    onSuccess(Number(matchedLevel) as UserLevel);
  };

  return (
    <DialogShell onClose={onClose} subtitle="원본 프로그램과 동일하게 권한별 설정 화면을 엽니다" title="비밀번호 입력">
      <form className="grid gap-[14px] bg-[#f6f9fc] p-[18px]" onSubmit={submitPassword}>
        <label className="grid gap-[8px]">
          <span className="text-[16px] font-black text-[#45657f]">관리자 / 매니저 / 일반 비밀번호</span>
          <input
            autoFocus
            className="h-[58px] rounded-[8px] border border-[#c9deef] bg-white px-[16px] text-center text-[28px] font-black tracking-[0.16em] text-[#173f69] outline-none focus:border-[#237bd0]"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        <div className={`rounded-[8px] px-[12px] py-[10px] text-center text-[14px] font-black ${message.includes("올바르지") ? "bg-[#fff0f0] text-[#d92525]" : "bg-[#eef7ff] text-[#45657f]"}`}>
          {message}
        </div>
        <div className="grid h-[54px] grid-cols-2 gap-[10px]">
          <button className="rounded-[8px] border border-[#cfdde8] bg-[#f8fbfd] text-[18px] font-black text-[#45657f]" onClick={onClose} type="button">취소</button>
          <button className="rounded-[8px] bg-[#237bd0] text-[18px] font-black text-white shadow-[0_5px_12px_rgba(35,123,208,0.2)]" type="submit">확인</button>
        </div>
      </form>
    </DialogShell>
  );
}

function SettingsDialog({ level, onClose }: { level: UserLevel; onClose: () => void }) {
  type ModeCellTarget = { rowIndex: number; colIndex: number; kind: "align" | "index" } | { kind: "count" };
  const initialModeRows = Array.from({ length: 7 }, (_, index) => ({
    no: `${index + 1}`,
    values: ["3", "2", "0", "0"],
  }));
  const factories = ["공장 1", "공장 2", "공장 3", "공장 4", "공장 5"];
  const [modeRows, setModeRows] = useState(initialModeRows);
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);
  const [useModeCount, setUseModeCount] = useState("1");
  const [activeModeCell, setActiveModeCell] = useState<ModeCellTarget | null>(null);
  const [saveStatus, setSaveStatus] = useState("설정 저장 대기 중");
  const [saving, setSaving] = useState(false);
  const isAdmin = level === USER_LEVELS.admin;
  const submitRawSetting = async (label: string, source: string, payload: number[]) => {
    setSaving(true);
    setSaveStatus(`${label} 명령 전송 중...`);
    try {
      const result = await enqueueRawUart4Command(source, payload);
      const commandId = Number(result.id);
      setSaveStatus(`${label} #${commandId} 전송 대기...`);
      await waitForControlCommand(commandId, (status) => {
        if (status.status === "pending") setSaveStatus(`${label} #${commandId} 대기 중...`);
        if (status.status === "in_progress") setSaveStatus(`${label} #${commandId} 장비 전송 중...`);
        if (status.status === "completed") setSaveStatus(`${label} #${commandId} 전송 완료`);
      });
    } catch (error) {
      setSaveStatus(`${label} 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };
  const updateModeCell = (rowIndex: number, colIndex: number, value: string) => {
    setModeRows((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? { ...row, values: row.values.map((item, itemIndex) => (itemIndex === colIndex ? sanitizeNumericInput(value, true) : item)) }
          : row,
      ),
    );
  };
  const buildAlignListPayload = () => {
    const alignText = modeRows
      .map((row) => `${row.values[0] || "0"},${row.values[1] || "0"},${row.values[2] || "0"},0,0,0,0,0,0,0,0,0/`)
      .join("");
    return [0xc9, 0x83, 0x00, ...asciiBytes(alignText)];
  };
  const saveModeAlign = async () => {
    await submitRawSetting("정렬표", "settings_mode_align_table", buildAlignListPayload());
  };
  const saveModeIndex = async (rowIndex: number) => {
    const value = Math.trunc(Number(modeRows[rowIndex].values[3] || 0));
    if (!Number.isFinite(value) || value < 0 || value > 0xffff) {
      setSaveStatus("Index 값 범위는 0~65535입니다");
      return;
    }
    const address = 12 + rowIndex * 2;
    await submitRawSetting("Index", "settings_mode_index", [0xc9, 0x82, address, (value >> 8) & 0xff, value & 0xff]);
  };
  const saveUseModeCount = async () => {
    const count = Math.trunc(Number(useModeCount));
    if (!Number.isFinite(count) || count < 1 || count > 12) {
      setSaveStatus("사용모드 개수 범위는 1~12입니다");
      return;
    }
    await submitRawSetting("사용모드 개수", "settings_use_mode_count", [0xc9, 0x80, 0x11, selectedModeIndex, count]);
  };
  const activeModeValue =
    activeModeCell?.kind === "count"
      ? useModeCount
      : activeModeCell
        ? modeRows[activeModeCell.rowIndex].values[activeModeCell.colIndex]
        : "";
  const activeModeLabel =
    activeModeCell?.kind === "count"
      ? "사용모드 개수"
      : activeModeCell
        ? `${activeModeCell.rowIndex + 1}번 ${activeModeCell.kind === "index" ? "Index" : `값 ${activeModeCell.colIndex + 1}`}`
        : "";
  const updateActiveModeValue = (value: string) => {
    if (!activeModeCell) return;
    if (activeModeCell.kind === "count") {
      setUseModeCount(sanitizeNumericInput(value, true));
      return;
    }
    updateModeCell(activeModeCell.rowIndex, activeModeCell.colIndex, value);
  };
  const appendActiveModeValue = (value: string) => {
    updateActiveModeValue(`${activeModeValue}${value}`);
  };
  const backspaceActiveModeValue = () => {
    updateActiveModeValue(activeModeValue.slice(0, -1));
  };
  const clearActiveModeValue = () => {
    updateActiveModeValue("");
  };
  const confirmActiveModeValue = async () => {
    if (!activeModeCell) return;
    const target = activeModeCell;
    setActiveModeCell(null);
    if (target.kind === "count") {
      await saveUseModeCount();
      return;
    }
    if (target.kind === "index") await saveModeIndex(target.rowIndex);
    else await saveModeAlign();
  };

  return (
    <DialogShell onClose={onClose} subtitle={`${USER_LEVEL_LABELS[level]} 권한으로 표시 가능한 항목만 보여줍니다`} title={`설정 - ${USER_LEVEL_LABELS[level]}`} wide>
      <div className={`grid max-h-[690px] ${isAdmin ? "grid-cols-[300px_1fr]" : "grid-cols-1"} gap-[14px] overflow-y-auto bg-[#f6f9fc] p-[16px]`}>
        {isAdmin ? (
          <aside className="grid content-start gap-[12px]">
            <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
              <PanelHeading eyebrow="NETWORK">접속 정보</PanelHeading>
              <div className="mt-[12px] grid gap-[8px]">
                <SettingSummary label="Connect IP" value="121.164.120.200" />
                <SettingSummary label="Port" value="1502" />
                <SettingSummary label="Login PW" value="1234" />
                <SettingSummary label="Setting PW" value="471112" />
              </div>
            </div>
            <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
              <PanelHeading eyebrow="DIO">DIO BIT</PanelHeading>
              <div className="mt-[12px] grid gap-[8px]">
                <SettingSummary label="BIT0" value="운전" />
                <SettingSummary label="BIT4" value="고장" />
              </div>
            </div>
          </aside>
        ) : null}
        <div className="grid content-start gap-[14px]">
	          <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
	            <PanelHeading eyebrow="MODE TABLE">사용모드 / 정렬 설정</PanelHeading>
	            <div className="mt-[12px] grid gap-[6px]">
	              {modeRows.map((row, rowIndex) => (
	                <div key={row.no} className="grid h-[38px] grid-cols-[54px_1fr_1fr_1fr_92px] gap-[5px]">
	                  <button
	                    className={`flex items-center justify-center rounded-[6px] font-black ${
	                      selectedModeIndex === rowIndex ? "bg-[#237bd0] text-white" : "bg-[#eef3f7] text-[#45657f]"
	                    }`}
	                    disabled={saving}
	                    onClick={() => setSelectedModeIndex(rowIndex)}
	                    type="button"
	                  >
	                    {row.no}
	                  </button>
	                  {row.values.map((value, colIndex) => (
	                    <input
	                      key={`${row.no}-${colIndex}`}
	                      className="min-w-0 rounded-[6px] border border-[#d9e6f0] bg-[#f8fbfd] px-0 text-center text-[16px] font-bold text-[#173f69] outline-none focus:border-[#237bd0] focus:bg-white"
	                      disabled={saving}
	                      inputMode="numeric"
	                      onChange={(event) => updateModeCell(rowIndex, colIndex, event.target.value)}
	                      onFocus={(event) => {
	                        setActiveModeCell({ rowIndex, colIndex, kind: colIndex === 3 ? "index" : "align" });
	                        event.currentTarget.select();
	                      }}
	                      onKeyDown={(event) => {
	                        if (event.key !== "Enter") return;
	                        event.currentTarget.blur();
	                        if (colIndex === 3) void saveModeIndex(rowIndex);
	                        else void saveModeAlign();
	                      }}
	                      pattern="[0-9]*"
	                      type="text"
	                      value={value}
	                    />
	                  ))}
	                </div>
	              ))}
	            </div>
	            <div className="mt-[12px] grid h-[46px] grid-cols-[1fr_58px_78px_58px_120px] gap-[8px]">
	              <div className="flex items-center text-[17px] font-black text-[#173f69]">사용모드 개수 설정</div>
	              <ChoiceButton onClick={() => setUseModeCount((value) => String(Math.max(1, Number(value || 1) - 1)))}>-</ChoiceButton>
	              <input
	                className="min-w-0 rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] px-0 text-center text-[22px] font-black leading-none text-[#173f69] outline-none focus:border-[#237bd0] focus:bg-white"
	                disabled={saving}
	                inputMode="numeric"
	                onChange={(event) => setUseModeCount(sanitizeNumericInput(event.target.value, true))}
	                onFocus={(event) => {
	                  setActiveModeCell({ kind: "count" });
	                  event.currentTarget.select();
	                }}
	                onKeyDown={(event) => {
	                  if (event.key === "Enter") {
	                    event.currentTarget.blur();
	                    void saveUseModeCount();
	                  }
	                }}
	                pattern="[0-9]*"
	                type="text"
	                value={useModeCount}
	              />
	              <ChoiceButton onClick={() => setUseModeCount((value) => String(Math.min(12, Number(value || 1) + 1)))}>+</ChoiceButton>
	              <button className="rounded-[8px] bg-[#237bd0] text-[18px] font-bold text-white disabled:opacity-55" disabled={saving} onClick={saveUseModeCount} type="button">저장</button>
	            </div>
            <div className="mt-[8px] rounded-[8px] bg-[#eef7ff] px-[10px] py-[8px] text-[13px] font-black text-[#45657f]">{saveStatus}</div>
          </div>
          {isAdmin ? (
            <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
              <PanelHeading eyebrow="FACTORY">공장 정보</PanelHeading>
              <div className="mt-[12px] grid grid-cols-5 gap-[8px]">
                {factories.map((factory, index) => (
                  <div key={factory} className="rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[10px] text-center">
                    <div className="text-[16px] font-black text-[#173f69]">{factory}</div>
                    <div className="mt-[7px] text-[13px] font-bold text-[#6f879d]">192.168.0.{10 + index}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {activeModeCell ? (
        <NumericKeypad
          allowDecimal={false}
          disabled={saving}
          label={activeModeLabel}
          onAppend={appendActiveModeValue}
          onBackspace={backspaceActiveModeValue}
          onClear={clearActiveModeValue}
          onConfirm={confirmActiveModeValue}
          unit=""
          value={activeModeValue}
        />
      ) : null}
    </DialogShell>
  );
}

function SettingSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[11px]">
      <div className="text-[12px] font-black text-[#6f879d]">{label}</div>
      <div className="mt-[6px] text-[18px] font-black leading-none text-[#173f69]">{value}</div>
    </div>
  );
}

function ChoiceButton({ active = false, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      className={`rounded-[8px] border text-[19px] font-bold ${active ? "border-[#237bd0] bg-[#237bd0] text-white" : "border-[#9fc8ea] bg-white text-[#237bd0]"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function getLowPressureText(tone: DashboardState["lowPressureAlarm"]) {
  if (tone === "none") return "";
  if (tone === "reserve") return "저압 경보로 인하여 예비기 가동중";
  return "저압 경보 알람";
}

function formatDateTime(date: Date) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yy}/${mm}/${dd} ${hh}:${mi}:${ss}`;
}
