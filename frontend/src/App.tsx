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

type ActiveDialog = "factory" | "settings" | "control" | null;
type ActiveScreen = "main" | "detail";

const LIVE_VALUE_MAX_AGE_MS = 30_000;
const APP_VERSION = "0.1.23";
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
  const showMainScreen = activeScreen === "main";

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-black text-black">
      <section className="relative h-[800px] w-[1280px] overflow-hidden bg-white">
        <div className="grid h-full grid-rows-[74px_578px_148px]">
          <TopBar dashboard={dashboard} now={now} />

          <section className="relative min-h-0">
            {showMainScreen ? (
              <>
                <div className="grid h-full grid-cols-4 grid-rows-2 gap-0">
                  {dashboard.compressors.map((compressor) => (
                    <CompressorCard key={compressor.id} compressor={compressor} />
                  ))}
                </div>
                {lowPressureText ? <AlarmStrip tone={dashboard.lowPressureAlarm} text={lowPressureText} /> : null}
              </>
            ) : (
              <DetailScreen dashboard={dashboard} />
            )}
          </section>

          <Footer
            activeScreen={activeScreen}
            dashboard={dashboard}
            menuOpen={menuOpen}
            onOpenDialog={setActiveDialog}
            onToggleDetail={() => setActiveScreen((screen) => (screen === "detail" ? "main" : "detail"))}
            setMenuOpen={setMenuOpen}
          />
        </div>
        {activeDialog === "factory" ? <FactoryDialog onClose={() => setActiveDialog(null)} /> : null}
        {activeDialog === "settings" ? <SettingsDialog onClose={() => setActiveDialog(null)} /> : null}
        {activeDialog === "control" ? <ControlDialog dashboard={dashboard} onClose={() => setActiveDialog(null)} /> : null}
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

  return {
    ...emptyDashboard,
    integratedRun: (liveMapNumber(values, "0050", 0) & 0x0001) === 0x0001,
    mainPressure,
    lowPressureAlarm: lowAlarmStep > 0 ? "warning" : "none",
    control: {
      noLoadPressure: scale10(liveMapNumber(values, "0016", 0)),
      loadPressure: scale10(liveMapNumber(values, "0018", 0)),
      pressureGap: scale10(liveMapNumber(values, "001A", 0)),
      lowAlarmPressure: scale10(liveMapNumber(values, "0054", 0)),
      runUnits: Math.trunc(liveMapNumber(values, "0026", 0)),
      changeHours: Math.trunc(liveMapNumber(values, "0046", 0)),
      remainMinutes: Math.trunc(liveMapNumber(values, "0048", 0)),
      controlModeWord: Math.trunc(liveMapNumber(values, "0034", 0)),
      sortModeWord: Math.trunc(liveMapNumber(values, "0036", 0)),
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

function TopBar({ dashboard, now }: { dashboard: DashboardState; now: Date }) {
  return (
    <header className="grid min-h-0 grid-cols-[241px_241px_241px_65px_241px_241px] gap-[2px]">
      <TopPanel tone={dashboard.integratedRun ? "run" : "stop"}>
        {dashboard.integratedRun ? "통합 운전 중" : "통합 운전 정지"}
      </TopPanel>
      <TopPanel tone="pressure">압력 : {dashboard.mainPressure.toFixed(1)} bar</TopPanel>
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
    <article className="relative min-h-0 overflow-hidden bg-white">
      <div className="grid h-full grid-rows-[42px_1fr_1fr_1fr_1fr_1fr] gap-[2px] border border-[#75b4ee] bg-[#d8ecff] p-[2px] shadow-[inset_0_0_0_1px_#ffffff]">
        <div className="flex items-center justify-center overflow-hidden border border-[#75b4ee] bg-[#b3d4ff] px-[6px] text-center text-[20px] font-bold leading-none text-[#0d4da5] shadow-[2px_2px_1px_#ababab]">
          {compressor.name} ({compressor.model})
        </div>
        <MetricRow label="압력" value={`${compressor.pressure.toFixed(1)} bar`} size="large" />
        <TripleRow label={pressureLabel} valueA={secondValue} valueB={thirdValue} />
        <MetricRow label="온도" value={`${compressor.temperature.toFixed(1)} ℃`} size="large" />
        <div className="relative grid grid-cols-2 gap-[2px]">
          <StatusCell tone={compressor.local ? "local" : "remote"}>{compressor.local ? "로 컬" : "리모트"}</StatusCell>
          <StatusCell tone={compressor.running ? "running" : "stop"}>{compressor.running ? "부 하" : "정 지"}</StatusCell>
          {compressor.alarm || compressor.fault ? (
            <div className="absolute inset-0 grid grid-cols-2 gap-[2px]">
              {compressor.alarm ? <FlagCell tone="alarm">알 림</FlagCell> : <span />}
              {compressor.fault ? <FlagCell tone="fault">고 장</FlagCell> : <span />}
            </div>
          ) : null}
        </div>
        <MetricRow label="총 운전시간" value={`${compressor.totalHours.toLocaleString("ko-KR")} hr`} />
      </div>
      {!compressor.connected ? (
        <DisconnectedOverlay />
      ) : null}
    </article>
  );
}

function DisconnectedOverlay() {
  return (
    <div className="absolute inset-[2px] flex items-center justify-center border border-[#9fc9fa] bg-[#f6fbff]/95">
      <div className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(45deg,#d7eafa_25%,transparent_25%,transparent_50%,#d7eafa_50%,#d7eafa_75%,transparent_75%,transparent)] [background-size:14px_14px]" />
      <div className="relative flex w-[148px] flex-col items-center justify-center rounded-[10px] border border-[#b8d8f4] bg-white/90 px-[14px] py-[16px] shadow-[0_6px_16px_rgba(42,92,135,0.12)]">
        <div className="relative h-[58px] w-[58px] rounded-full border-[3px] border-[#9fbad2] bg-[#eef6fd]">
          <span className="absolute left-[14px] top-[26px] h-[3px] w-[30px] rotate-45 rounded-full bg-[#6e879d]" />
          <span className="absolute left-[14px] top-[26px] h-[3px] w-[30px] -rotate-45 rounded-full bg-[#6e879d]" />
        </div>
        <div className="mt-[12px] text-center text-[19px] font-black leading-none text-[#244c75]">통신 대기</div>
        <div className="mt-[6px] text-center text-[12px] font-bold text-[#6f879d]">장비 연결 없음</div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, size = "normal" }: { label: string; value: string; size?: "normal" | "large" }) {
  return (
    <div className="grid min-h-0 grid-cols-[96px_1fr_1fr] gap-[3px]">
      <MetricLabel>{label}</MetricLabel>
      <MetricValue className="col-span-2" large={size === "large"}>
        {value}
      </MetricValue>
    </div>
  );
}

function TripleRow({ label, valueA, valueB }: { label: string; valueA: string; valueB: string }) {
  return (
    <div className="grid min-h-0 grid-cols-[96px_1fr_1fr] gap-[3px]">
      <MetricLabel>{label}</MetricLabel>
      <MetricValue>{valueA}</MetricValue>
      <MetricValue>{valueB}</MetricValue>
    </div>
  );
}

function MetricLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 items-center justify-center overflow-hidden border border-[#75b4ee] bg-[#b0d2ff] px-[4px] text-center text-[17px] font-bold leading-tight text-[#13243a]">
      {children}
    </div>
  );
}

function MetricValue({
  children,
  large = false,
  className = "",
}: {
  children: ReactNode;
  large?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-0 items-center justify-end overflow-hidden border border-[#75b4ee] bg-white px-[10px] text-right font-bold leading-tight tracking-[-0.01em] ${
        large ? "text-[23px]" : "text-[18px]"
      } ${className}`}
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
    <div className={`flex min-h-0 items-center justify-center overflow-hidden border border-[#75b4ee] px-[2px] text-center text-[19px] font-bold leading-none ${toneClass}`}>
      {children}
    </div>
  );
}

function FlagCell({ tone, children }: { tone: "alarm" | "fault"; children: ReactNode }) {
  const activeClass = tone === "alarm" ? "bg-[#ffff00] brightness-105 text-black" : "bg-[#ff4f4f] brightness-105 text-black";

  return (
    <div className={`flex min-h-0 animate-pulse items-center justify-center overflow-hidden border border-[#75b4ee] px-[2px] text-center text-[19px] font-black leading-none ${activeClass}`}>
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
    <footer className="relative grid min-h-0 grid-cols-[45px_216px_45px_282px_45px_558px_66px] gap-[2px] bg-white p-[3px]">
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
    { label: "무부하", value: `${control.noLoadPressure.toFixed(1)} bar` },
    { label: "부하", value: `${control.loadPressure.toFixed(1)} bar` },
    { label: "압력차", value: `${control.pressureGap.toFixed(1)} bar` },
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

function QuickButtons({
  activeScreen,
  menuOpen,
  onOpenDialog,
  onToggleDetail,
  setMenuOpen,
}: {
  activeScreen: ActiveScreen;
  menuOpen: boolean;
  onOpenDialog: (dialog: ActiveDialog) => void;
  onToggleDetail: () => void;
  setMenuOpen: (open: boolean) => void;
}) {
  const menuItems: Array<{ label: string; description: string; icon: string; action: () => void }> = [
    { label: "공장 변경", description: "사용 공장 선택", icon: "/factory.png", action: () => onOpenDialog("factory") },
    { label: "설정", description: "통신 / 화면 설정", icon: "/setting.png", action: () => onOpenDialog("settings") },
    { label: "통합운전", description: "운전 조건 제어", icon: "/control.png", action: () => onOpenDialog("control") },
    { label: activeScreen === "detail" ? "메인 화면" : "상세 화면", description: "화면 전환", icon: activeScreen === "detail" ? "/device_back.png" : "/device.png", action: onToggleDetail },
  ];
  const handleMenuAction = (action: () => void) => {
    action();
    setMenuOpen(false);
  };

  return (
    <div className="relative grid min-h-0 grid-rows-2 gap-[4px]">
      <button className="flex items-center justify-center bg-transparent p-0" onClick={onToggleDetail} type="button" aria-label="상세 화면">
        <img src={activeScreen === "detail" ? "/device_back.png" : "/device.png"} alt="" className="h-[56px] w-[56px] object-contain" />
      </button>
      <button
        className="flex items-center justify-center bg-transparent p-0"
        onClick={() => setMenuOpen(!menuOpen)}
        type="button"
        aria-label="메뉴"
      >
        <img src="/menu.png" alt="" className="h-[56px] w-[56px] object-contain" />
      </button>
      {menuOpen ? (
        <div className="absolute bottom-[68px] right-0 z-20 w-[300px] overflow-hidden rounded-[10px] border border-[#cfdde8] bg-white p-[10px] shadow-[0_12px_28px_rgba(15,43,72,0.26)]">
          <div className="mb-[8px] flex items-center justify-between border-b border-[#e2ebf2] pb-[8px]">
            <div>
              <div className="text-[19px] font-black leading-none text-[#173f69]">메뉴</div>
              <div className="mt-[4px] text-[12px] font-bold text-[#6f879d]">작업 선택</div>
            </div>
            <button className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] bg-[#eef3f7] text-[17px] font-black text-[#45657f]" onClick={() => setMenuOpen(false)} type="button">
              ×
            </button>
          </div>
          <div className="grid gap-[6px]">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="group grid h-[58px] grid-cols-[44px_1fr] items-center gap-[10px] rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] px-[10px] text-left transition-colors hover:border-[#9cc7e8] hover:bg-[#eef7ff]"
              onClick={() => handleMenuAction(item.action)}
              type="button"
            >
              <span className="flex h-[36px] w-[36px] items-center justify-center rounded-[7px] bg-white shadow-[0_2px_6px_rgba(38,94,140,0.1)]">
                <img src={item.icon} alt="" className="h-[27px] w-[27px] object-contain" />
              </span>
              <span className="min-w-0">
                <span className="block text-[18px] font-black leading-none text-[#163d69]">{item.label}</span>
                <span className="mt-[4px] block text-[12px] font-bold text-[#6f879d]">{item.description}</span>
              </span>
            </button>
          ))}
          </div>
        </div>
      ) : null}
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
        <HeaderCell>메인압력 {dashboard.mainPressure.toFixed(1)} bar</HeaderCell>
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
    ["압력", `${compressor.pressure.toFixed(1)} bar`],
    ["온도", `${compressor.temperature.toFixed(1)} ℃`],
    ["무부하", `${compressor.noLoadPressure.toFixed(1)} bar`],
    ["부하", `${compressor.loadPressure.toFixed(1)} bar`],
    ["제어압력", `${compressor.controlPressure?.toFixed(1) ?? "0.0"} bar`],
    ["RPM", `${compressor.rpm ?? 0}`],
    ["운전시간", `${compressor.totalHours.toLocaleString("ko-KR")} hr`],
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

function DialogShell({ children, onClose, title, wide = false }: { children: ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-[24px]">
      <section className={`${wide ? "w-[1040px]" : "w-[560px]"} overflow-hidden rounded-[12px] border border-[#d3e0eb] bg-[#f6f9fc] shadow-[0_14px_34px_rgba(15,43,72,0.32)]`}>
        <div className="flex h-[74px] items-center justify-between border-b border-[#dbe7f1] bg-white px-[22px]">
          <div>
            <div className="text-[26px] font-black leading-none text-[#173f69]">{title}</div>
            <div className="mt-[7px] text-[13px] font-bold text-[#6f879d]">설정을 확인하고 필요한 항목을 조정하세요</div>
          </div>
          <button className="h-[40px] rounded-[8px] border border-[#cfdde8] bg-[#f3f7fa] px-[18px] text-[17px] font-black text-[#45657f]" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        {children}
      </section>
    </div>
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
          <button className="h-[40px] rounded-[8px] border border-[#cfdde8] bg-[#f3f7fa] px-[18px] text-[17px] font-black text-[#45657f]" onClick={onClose} type="button">
            닫기
          </button>
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
  const [settings, setSettings] = useState({
    noLoadPressure: dashboard.control.noLoadPressure.toFixed(1),
    loadPressure: dashboard.control.loadPressure.toFixed(1),
    pressureGap: dashboard.control.pressureGap.toFixed(1),
    lowAlarmPressure: dashboard.control.lowAlarmPressure.toFixed(1),
    changeHours: String(dashboard.control.changeHours),
    runUnits: String(dashboard.control.runUnits),
  });
  const [commandStatus, setCommandStatus] = useState("명령 대기 중");
  const [commandBusy, setCommandBusy] = useState(false);
  const controls: Array<[string, keyof typeof settings, string, string]> = [
    ["무부하 압력", "noLoadPressure", "bar", "0.1"],
    ["부하 압력", "loadPressure", "bar", "0.1"],
    ["장비별 압력차", "pressureGap", "bar", "0.1"],
    ["저압경보 압력 설정", "lowAlarmPressure", "bar", "0.1"],
    ["교환 운전 시간", "changeHours", "hr", "1"],
    ["가동 대수", "runUnits", "ea", "1"],
  ];
  const updateSetting = (key: keyof typeof settings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };
  const numberValue = (key: keyof typeof settings) => {
    const value = Number(settings[key]);
    if (!Number.isFinite(value)) throw new Error(`${key} 값이 올바르지 않습니다`);
    return value;
  };

  const sendGroupOperation = async (action: "run" | "stop") => {
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
      setCommandStatus(`명령 대기열 등록 #${result.id}`);
    } catch (error) {
      setCommandStatus(`명령 전송 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCommandBusy(false);
    }
  };

  const saveGroupSettings = async () => {
    setCommandBusy(true);
    setCommandStatus("통합운전 설정 저장 중...");
    try {
      const noLoadPressure = numberValue("noLoadPressure");
      const loadPressure = numberValue("loadPressure");
      const pressureGap = numberValue("pressureGap");
      const lowAlarmPressure = numberValue("lowAlarmPressure");
      const runUnits = Math.trunc(numberValue("runUnits"));
      const changeHours = Math.trunc(numberValue("changeHours"));
      if (noLoadPressure <= 0 && loadPressure <= 0) {
        throw new Error("기준 압력값이 없습니다");
      }
      const response = await fetch(`${apiBase()}/control/group-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          no_load_pressure: noLoadPressure,
          load_pressure: loadPressure,
          pressure_gap: pressureGap,
          low_alarm_pressure: lowAlarmPressure,
          run_units: runUnits,
          change_hours: changeHours,
          sort_mode: sortMode,
          operation_mode: operationMode,
          control_mode: controlMode,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      setCommandStatus(`저장 명령 대기열 등록 #${result.id}`);
    } catch (error) {
      setCommandStatus(`저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCommandBusy(false);
    }
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
          <button className="h-[40px] rounded-[8px] border border-[#cfdde8] bg-[#f3f7fa] px-[18px] text-[17px] font-black text-[#45657f]" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        <div className="grid grid-cols-[1fr_280px] gap-[16px] p-[18px]">
          <div className="grid gap-[14px]">
            <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
              <PanelHeading eyebrow="CONTROL VALUES">제어 기준값</PanelHeading>
              <div className="mt-[12px] grid grid-cols-3 gap-[10px]">
              {controls.map(([label, key, unit, step]) => (
                <div key={label} className="rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[12px]">
                  <div className="text-[14px] font-black text-[#6f879d]">{label}</div>
                  <label className="mt-[8px] flex items-end justify-between gap-[8px]">
                    <input
                      className="min-w-0 flex-1 rounded-[6px] border border-[#c9deef] bg-white px-[8px] py-[5px] text-right text-[25px] font-black leading-none text-[#173f69] outline-none focus:border-[#237bd0]"
                      disabled={commandBusy}
                      inputMode="decimal"
                      onChange={(event) => updateSetting(key, event.target.value)}
                      step={step}
                      type="number"
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
                <PanelHeading eyebrow="SORT / SAVE">운전 조건</PanelHeading>
                <div className="mt-[12px] grid gap-[10px]">
                  <SegmentedOption
                    items={[
                      ["setting", "설정순"],
                      ["time", "시간순"],
                    ]}
                    selected={sortMode}
                    onSelect={(value) => setSortMode(value as "setting" | "time")}
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
              <SegmentedOption
                items={[
                  ["local", "LOCAL"],
                  ["remote", "REMOTE"],
                ]}
                selected={operationMode}
                onSelect={(value) => setOperationMode(value as "local" | "remote")}
              />
              <SegmentedOption
                items={[
                  ["single", "개별"],
                  ["group", "통합"],
                ]}
                selected={controlMode}
                onSelect={(value) => setControlMode(value as "single" | "group")}
              />
              <div className="rounded-[8px] bg-[#eef7ff] p-[14px] text-center">
                <div className="text-[13px] font-black text-[#6f879d]">현재 모드</div>
                <div className="mt-[7px] text-[30px] font-black leading-none text-[#173f69]">{operationMode.toUpperCase()}</div>
              </div>
              <div className="rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] px-[12px] py-[10px] text-center text-[13px] font-black text-[#45657f]">
                {commandStatus}
              </div>
              <button className="h-[72px] rounded-[9px] bg-[#d92525] text-[30px] font-black text-white shadow-[0_6px_13px_rgba(208,31,38,0.2)] disabled:opacity-55" disabled={commandBusy} onClick={() => sendGroupOperation("run")} type="button">운전</button>
              <button className="h-[72px] rounded-[9px] bg-[#667380] text-[30px] font-black text-white shadow-[0_6px_13px_rgba(70,82,94,0.16)] disabled:opacity-55" disabled={commandBusy} onClick={() => sendGroupOperation("stop")} type="button">정지</button>
            </div>
          </aside>
        </div>
        <div className="grid h-[72px] grid-cols-[1fr_180px] border-t border-[#dbe7f1] bg-white px-[18px] py-[12px]">
          <span />
          <button className="rounded-[8px] bg-[#237bd0] text-[19px] font-black text-white shadow-[0_5px_12px_rgba(35,123,208,0.2)] disabled:opacity-55" disabled={commandBusy} onClick={saveGroupSettings} type="button">저장</button>
        </div>
      </section>
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
  items,
  onSelect,
  selected,
}: {
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
          onClick={() => onSelect(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const modes = Array.from({ length: 7 }, (_, index) => [`${index + 1}`, "3", "2", "0", "0"]);
  const factories = ["공장 1", "공장 2", "공장 3", "공장 4", "공장 5"];
  const [useModeCount, setUseModeCount] = useState("1");
  const [saveStatus, setSaveStatus] = useState("설정 저장 대기 중");
  const [saving, setSaving] = useState(false);
  const saveUseModeCount = async () => {
    setSaving(true);
    setSaveStatus("설정 저장 명령 전송 중...");
    try {
      const count = Math.trunc(Number(useModeCount));
      if (!Number.isFinite(count) || count < 1 || count > 16) throw new Error("사용모드 개수 범위는 1~16입니다");
      const result = await enqueueMapWriteBatch("settings_use_mode_count", [
        { key: "004E", address: 0x4e, length: 2, value: count },
      ]);
      setSaveStatus(`저장 명령 대기열 등록 #${result.id}`);
    } catch (error) {
      setSaveStatus(`저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell onClose={onClose} title="설정" wide>
      <div className="grid max-h-[690px] grid-cols-[300px_1fr] gap-[14px] overflow-y-auto bg-[#f6f9fc] p-[16px]">
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
        <div className="grid content-start gap-[14px]">
          <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
            <PanelHeading eyebrow="MODE TABLE">사용모드 / 정렬 설정</PanelHeading>
            <div className="mt-[12px] grid gap-[6px]">
              {modes.map(([no, a, b, c, index]) => (
                <div key={no} className="grid h-[38px] grid-cols-[54px_1fr_1fr_1fr_92px] gap-[5px]">
                  <div className="flex items-center justify-center rounded-[6px] bg-[#eef3f7] font-black text-[#45657f]">{no}</div>
                  {[a, b, c, index].map((value, idx) => (
                    <div key={idx} className="flex items-center justify-center rounded-[6px] border border-[#d9e6f0] bg-[#f8fbfd] text-[16px] font-bold">{value}</div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-[12px] grid h-[46px] grid-cols-[1fr_58px_78px_58px_120px] gap-[8px]">
              <div className="flex items-center text-[17px] font-black text-[#173f69]">사용모드 개수 설정</div>
              <ChoiceButton onClick={() => setUseModeCount((value) => String(Math.max(1, Number(value) - 1)))}>-</ChoiceButton>
              <input className="min-w-0 rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] text-center text-[22px] font-black text-[#173f69]" disabled={saving} min={1} max={16} onChange={(event) => setUseModeCount(event.target.value)} type="number" value={useModeCount} />
              <ChoiceButton onClick={() => setUseModeCount((value) => String(Math.min(16, Number(value) + 1)))}>+</ChoiceButton>
              <button className="rounded-[8px] bg-[#237bd0] text-[18px] font-bold text-white disabled:opacity-55" disabled={saving} onClick={saveUseModeCount} type="button">저장</button>
            </div>
            <div className="mt-[8px] rounded-[8px] bg-[#eef7ff] px-[10px] py-[8px] text-[13px] font-black text-[#45657f]">{saveStatus}</div>
          </div>
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
        </div>
      </div>
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
