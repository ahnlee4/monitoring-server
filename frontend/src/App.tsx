import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
    runUnits: number;
    changeHours: number;
    remainMinutes: number;
  };
  options: Array<{ label: string; checked: boolean; visible?: boolean }>;
  compressors: CompressorState[];
};

const LIVE_VALUE_MAX_AGE_MS = 30_000;
const BUILD_MARKER = "LIVE MAP ONLY / no mock data";

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
  appVersion: "-",
  firmwareVersion: "-",
  lowPressureAlarm: "none",
  sortMode: "setting",
  control: {
    noLoadPressure: 0,
    loadPressure: 0,
    pressureGap: 0,
    runUnits: 0,
    changeHours: 0,
    remainMinutes: 0,
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
      reloadTimer = window.setTimeout(loadMapValues, 120);
    };

    loadMapValues();
    pollTimer = window.setInterval(loadMapValues, 3000);
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

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-black text-black">
      <section className="h-[800px] w-[1280px] overflow-hidden bg-white">
        <div className="grid h-full grid-rows-[74px_578px_148px]">
          <TopBar dashboard={dashboard} now={now} />

          <section className="relative min-h-0">
            <div className="grid h-full grid-cols-4 grid-rows-2 gap-[3px]">
              {dashboard.compressors.map((compressor) => (
                <CompressorCard key={compressor.id} compressor={compressor} />
              ))}
            </div>
            <div className="absolute right-[6px] top-[4px] z-20 rounded bg-white/80 px-[6px] py-[2px] text-[11px] font-bold text-[#0d4da5]">
              {BUILD_MARKER}
            </div>
            {lowPressureText ? <AlarmStrip tone={dashboard.lowPressureAlarm} text={lowPressureText} /> : null}
          </section>

          <Footer dashboard={dashboard} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
      </section>
    </main>
  );
}

function buildDashboardFromMap(values: Record<string, YujinMapValue>): DashboardState {
  const compressors = Array.from({ length: 8 }, (_, index) => buildCompressorFromMap(values, index));
  const connectedMask = liveMapNumber(values, "0002", maskFromCompressors(compressors));
  const compQty = clamp(Math.trunc(liveMapNumber(values, "004E", 0)), 0, 8);
  const mainPressure = scale10(liveMapNumber(values, "0000", 0));
  const optionDevice = liveMapNumber(values, "004A", 0);
  const lowAlarmStep = liveMapNumber(values, "0054", 0);

  return {
    ...emptyDashboard,
    integratedRun: (liveMapNumber(values, "0050", 0) & 0x0001) === 0x0001,
    mainPressure,
    lowPressureAlarm: lowAlarmStep > 0 ? "warning" : "none",
    control: {
      noLoadPressure: scale10(liveMapNumber(values, "0016", 0)),
      loadPressure: scale10(liveMapNumber(values, "0018", 0)),
      pressureGap: scale10(liveMapNumber(values, "001A", 0)),
      runUnits: Math.trunc(liveMapNumber(values, "0026", 0)),
      changeHours: Math.trunc(liveMapNumber(values, "0046", 0)),
      remainMinutes: Math.trunc(liveMapNumber(values, "0048", 0)),
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

function buildCompressorFromMap(values: Record<string, YujinMapValue>, index: number): CompressorState {
  const compNo = index + 1;
  const oilPrefix = `2${compNo.toString(16).toUpperCase()}`;
  const injectionPrefix = `1${compNo.toString(16).toUpperCase()}`;
  const read = (oilOffset: string, injectionOffset: string = oilOffset, fallbackValue = 0) =>
    liveMapNumber(values, `${oilPrefix}${oilOffset}`, liveMapNumber(values, `${injectionPrefix}${injectionOffset}`, fallbackValue));

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
  const runHoursLow = read("9A", "68", 0);
  const runHoursHigh = read("9C", "6A", 0);

  return {
    ...emptyCompressor(index),
    pressure,
    temperature,
    noLoadPressure,
    loadPressure,
    controlPressure,
    rpm,
    local: extRunStop === 0,
    running: runMode !== 0 || cpStatus !== 0,
    connected: hasRecentValue(values, `${oilPrefix}00`) || hasRecentValue(values, `${injectionPrefix}00`),
    alarm: alarm !== 0,
    fault: faultLow !== 0 || faultHigh !== 0 || faultInv !== 0,
    inverter: rpm > 0 || controlPressure > 0,
    totalHours: Math.trunc(runHoursHigh * 65536 + runHoursLow),
  };
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
  return Math.round((value / 10) * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function apiBase() {
  return import.meta.env.VITE_API_BASE || "/api";
}

function wsUrl() {
  const configuredPath = import.meta.env.VITE_WS_PATH || "/ws/dashboard";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${configuredPath}`;
}

function TopBar({ dashboard, now }: { dashboard: DashboardState; now: Date }) {
  return (
    <header className="grid min-h-0 grid-cols-[241px_241px_241px_65px_241px_241px] gap-[2px]">
      <TopPanel tone={dashboard.integratedRun ? "run" : "stop"}>
        {dashboard.integratedRun ? "통합 운전 중" : "통합 운전 정지"}
      </TopPanel>
      <TopPanel tone="pressure">압력 : {dashboard.mainPressure.toFixed(1)} bar</TopPanel>
      <TopPanel tone="date">
        <span>{formatDateTime(now)}</span>
        <small>App Ver.{dashboard.appVersion} / Fw Ver.{dashboard.firmwareVersion}</small>
      </TopPanel>
      <TopPanel tone="lock">
        <img src="/unlock.png" alt="unlock" className="h-[58px] w-[58px] object-contain" />
      </TopPanel>
      <TopPanel tone="title">
        <span>컴프레샤</span>
        <span>통합제어 시스템</span>
      </TopPanel>
      <div className="flex min-h-0 items-center justify-center overflow-hidden px-[3px]">
        <img src="/grid_logo3.png" alt="GRID" className="h-[72px] w-full object-contain" />
      </div>
    </header>
  );
}

function TopPanel({
  tone,
  children,
}: {
  tone: "run" | "stop" | "pressure" | "date" | "lock" | "title";
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
      className={`flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-[4px] border px-[4px] text-center text-[23px] font-bold leading-tight text-white ${toneClass}`}
    >
      {children}
    </div>
  );
}

function CompressorCard({ compressor }: { compressor: CompressorState }) {
  const pressureLabel = compressor.inverter ? "설정압력" : "무부하/부하";
  const secondValue = compressor.inverter
    ? `${compressor.controlPressure?.toFixed(1) ?? "0.0"} bar`
    : `${compressor.noLoadPressure.toFixed(1)} bar`;
  const thirdValue = compressor.inverter ? `${compressor.rpm ?? 0} rpm` : `${compressor.loadPressure.toFixed(1)} bar`;

  return (
    <article className="relative min-h-0 overflow-hidden bg-white p-[2px]">
      <div className="grid h-full grid-rows-[46px_1fr_1fr_1fr_1fr_1fr] gap-[2px] border border-[#8ec3f5] bg-white">
        <div className="flex items-center justify-center border border-[#8ec3f5] bg-[#b3d4ff] px-[4px] text-center text-[21px] font-bold text-[#0d4da5] shadow-[2px_2px_1px_#ababab]">
          {compressor.name} ({compressor.model})
        </div>
        <MetricRow label="압력" value={`${compressor.pressure.toFixed(1)} bar`} size="large" />
        <TripleRow label={pressureLabel} valueA={secondValue} valueB={thirdValue} />
        <MetricRow label="온도" value={`${compressor.temperature.toFixed(1)} ℃`} size="large" />
        <div className="grid grid-cols-2 gap-[2px]">
          <StatusCell tone={compressor.local ? "local" : "remote"}>{compressor.local ? "로 컬" : "리모트"}</StatusCell>
          <StatusCell tone={compressor.running ? "running" : "stop"}>{compressor.running ? "부 하" : "정 지"}</StatusCell>
        </div>
        <MetricRow label="총 운전시간" value={`${compressor.totalHours.toLocaleString("ko-KR")} hr`} />
        {compressor.alarm || compressor.fault ? (
          <div className="absolute bottom-[52px] left-[2px] right-[2px] grid h-[34px] grid-cols-2 gap-[2px]">
            {compressor.alarm ? <FlagCell tone="alarm">알 람</FlagCell> : <span />}
            {compressor.fault ? <FlagCell tone="fault">고 장</FlagCell> : <span />}
          </div>
        ) : null}
      </div>
      {!compressor.connected ? (
        <div className="absolute inset-[2px] flex items-center justify-center bg-white">
          <img src="/close_color.png" alt="disconnected" className="h-[140px] w-[140px] object-contain" />
        </div>
      ) : null}
    </article>
  );
}

function MetricRow({ label, value, size = "normal" }: { label: string; value: string; size?: "normal" | "large" }) {
  return (
    <div className="grid grid-cols-[0.82fr_1.18fr] gap-[2px]">
      <MetricLabel>{label}</MetricLabel>
      <MetricValue large={size === "large"}>{value}</MetricValue>
    </div>
  );
}

function TripleRow({ label, valueA, valueB }: { label: string; valueA: string; valueB: string }) {
  return (
    <div className="grid grid-cols-[0.95fr_1fr_1fr] gap-[2px]">
      <MetricLabel>{label}</MetricLabel>
      <MetricValue>{valueA}</MetricValue>
      <MetricValue>{valueB}</MetricValue>
    </div>
  );
}

function MetricLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 items-center justify-center overflow-hidden border border-[#8ec3f5] bg-[#b0d2ff] px-[3px] text-center text-[18px] font-bold leading-tight">
      {children}
    </div>
  );
}

function MetricValue({ children, large = false }: { children: ReactNode; large?: boolean }) {
  return (
    <div
      className={`flex min-h-0 items-center justify-center overflow-hidden border border-[#8ec3f5] bg-white px-[3px] text-center font-bold leading-tight ${
        large ? "text-[22px]" : "text-[17px]"
      }`}
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
    <div className={`flex min-h-0 items-center justify-center overflow-hidden px-[3px] text-center text-[22px] font-bold ${toneClass}`}>
      {children}
    </div>
  );
}

function FlagCell({ tone, children }: { tone: "alarm" | "fault"; children: ReactNode }) {
  const activeClass = tone === "alarm" ? "bg-[#ffff00] text-black" : "bg-[#ff6565] text-black";

  return (
    <div className={`flex min-h-0 animate-pulse items-center justify-center overflow-hidden px-[3px] text-center text-[18px] font-bold ${activeClass}`}>
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
  dashboard,
  menuOpen,
  setMenuOpen,
}: {
  dashboard: DashboardState;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}) {
  return (
    <footer className="relative grid min-h-0 grid-cols-[47px_220px_47px_286px_47px_566px_67px] gap-[0px]">
      <VerticalTitle>모드</VerticalTitle>
      <ModePanel active={dashboard.sortMode} />
      <VerticalTitle>통합제어</VerticalTitle>
      <ControlPanel control={dashboard.control} />
      <VerticalTitle>옵션</VerticalTitle>
      <OptionPanel options={dashboard.options} />
      <QuickButtons menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
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
    <div className="grid min-h-0 grid-rows-2 gap-[3px]">
      <div className="grid grid-cols-2 gap-[3px]">
        <ModeButton active={active === "setting"}>설정순</ModeButton>
        <ModeButton active={active === "time"}>시간순</ModeButton>
      </div>
      <div className="grid grid-cols-3 gap-[3px]">
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
      className={`rounded-[8px] border text-[22px] font-bold ${
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
      className="flex items-center justify-center rounded-[8px] border border-[#d6e8ff] bg-white"
      type="button"
    >
      <img src={src} alt="" className="h-[42px] w-[42px] object-contain" />
    </button>
  );
}

function ControlPanel({ control }: { control: DashboardState["control"] }) {
  const items = [
    { label: "무부하", value: `${control.noLoadPressure.toFixed(1)} bar` },
    { label: "부하", value: `${control.loadPressure.toFixed(1)} bar` },
    { label: "압력차", value: `${control.pressureGap.toFixed(1)} bar` },
    { label: "가동대수", value: `${control.runUnits} ea` },
    { label: "교환운전", value: `${control.changeHours} hr` },
    { label: "남은시간", value: `${control.remainMinutes} min` },
  ];

  return (
    <div className="grid min-h-0 grid-cols-3 grid-rows-2 gap-[3px]">
      {items.map((item) => (
        <div key={item.label} className="grid min-h-0 grid-rows-[34px_1fr]">
          <div className="flex items-center justify-center bg-[#8ec3f5] text-center text-[17px] font-bold text-white">
            {item.label}
          </div>
          <div className="flex items-center justify-center border border-[#8ec3f5] bg-white text-center text-[22px] font-bold">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function OptionPanel({ options }: { options: DashboardState["options"] }) {
  return (
    <div className="grid min-h-0 grid-cols-3 grid-rows-5 gap-x-[4px] gap-y-[1px] overflow-hidden border border-[#9fc9fa] bg-white p-[3px]">
      {options
        .filter((option) => option.visible !== false)
        .map((option) => (
          <label key={option.label} className="flex min-h-0 items-center gap-[3px] overflow-hidden text-[12px] font-semibold leading-tight">
            <input checked={option.checked} className="h-[13px] w-[13px] shrink-0 accent-[#3175ce]" readOnly type="checkbox" />
            <span className="line-clamp-2">{option.label}</span>
          </label>
        ))}
    </div>
  );
}

function QuickButtons({
  menuOpen,
  setMenuOpen,
}: {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}) {
  return (
    <div className="relative grid min-h-0 grid-rows-2 gap-[3px]">
      <button className="flex items-center justify-center bg-transparent" type="button" aria-label="장비">
        <img src="/device.png" alt="" className="h-[64px] w-[64px] object-contain" />
      </button>
      <button
        className="flex items-center justify-center bg-transparent"
        onClick={() => setMenuOpen(!menuOpen)}
        type="button"
        aria-label="메뉴"
      >
        <img src="/menu.png" alt="" className="h-[64px] w-[64px] object-contain" />
      </button>
      {menuOpen ? (
        <div className="absolute bottom-[70px] right-0 z-20 grid w-[180px] gap-[3px]">
          {["CCTV", "로그 파일", "설정", "그룹운전 설정", "LOG"].map((item) => (
            <button key={item} className="rounded-[5px] border border-[#25b9f5] bg-white px-[10px] py-[6px] text-right text-[17px] font-bold text-[#303f9f]" type="button">
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
