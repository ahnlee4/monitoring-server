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

type ActiveDialog = "factory" | "settings" | "control" | null;
type ActiveScreen = "main" | "detail";

const LIVE_VALUE_MAX_AGE_MS = 30_000;
const APP_VERSION = "0.1.15";
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
                <div className="grid h-full grid-cols-4 grid-rows-2 gap-[3px]">
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
  const model1 = Math.trunc(read("7C", "7C", 0));
  const version1 = Math.trunc(read("7E", "7E", 0));
  const version2 = Math.trunc(read("80", "80", 0));
  const runHoursLow = read("9A", "68", 0);
  const runHoursHigh = read("9C", "6A", 0);
  const connected = hasRecentValue(values, `${oilPrefix}00`) || hasRecentValue(values, `${injectionPrefix}00`);
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
    <article className="relative min-h-0 overflow-hidden bg-white p-[3px]">
      <div className="grid h-full grid-rows-[44px_1fr_1fr_1fr_1fr_1fr] gap-[3px] border border-[#75b4ee] bg-[#d8ecff] p-[3px] shadow-[inset_0_0_0_1px_#ffffff]">
        <div className="flex items-center justify-center overflow-hidden border border-[#75b4ee] bg-[#b3d4ff] px-[6px] text-center text-[20px] font-bold leading-none text-[#0d4da5] shadow-[2px_2px_1px_#ababab]">
          {compressor.name} ({compressor.model})
        </div>
        <MetricRow label="압력" value={`${compressor.pressure.toFixed(1)} bar`} size="large" />
        <TripleRow label={pressureLabel} valueA={secondValue} valueB={thirdValue} />
        <MetricRow label="온도" value={`${compressor.temperature.toFixed(1)} ℃`} size="large" />
        <div className="grid grid-cols-2 gap-[3px]">
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
    <div className={`flex min-h-0 items-center justify-center overflow-hidden border border-[#75b4ee] px-[3px] text-center text-[22px] font-bold ${toneClass}`}>
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
  const menuItems: Array<{ label: string; icon: string; action: () => void }> = [
    { label: "공장 변경", icon: "/factory.png", action: () => onOpenDialog("factory") },
    { label: "설정", icon: "/setting.png", action: () => onOpenDialog("settings") },
    { label: "통합운전 설정", icon: "/control.png", action: () => onOpenDialog("control") },
    { label: activeScreen === "detail" ? "메인 화면" : "상세 화면", icon: activeScreen === "detail" ? "/device_back.png" : "/device.png", action: onToggleDetail },
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
        <div className="absolute bottom-[68px] right-0 z-20 w-[256px] overflow-hidden rounded-[14px] border border-[#9fc8ea] bg-[#f4f8fc] p-[8px] shadow-[0_12px_26px_rgba(9,45,88,0.28)]">
          <div className="mb-[7px] flex h-[30px] items-center justify-between border-b border-[#c5dced] px-[4px] pb-[6px]">
            <span className="text-[13px] font-black tracking-[0.18em] text-[#245d94]">QUICK MENU</span>
            <button className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#dcebf7] text-[15px] font-black text-[#245d94]" onClick={() => setMenuOpen(false)} type="button">
              ×
            </button>
          </div>
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="group mb-[6px] grid h-[48px] w-full grid-cols-[48px_1fr] items-center gap-[8px] rounded-[10px] border border-[#c9dfef] bg-white px-[7px] text-left shadow-[0_2px_5px_rgba(31,93,151,0.08)] transition-colors hover:bg-[#eef7ff]"
              onClick={() => handleMenuAction(item.action)}
              type="button"
            >
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] bg-[#e4f0fa] shadow-[inset_0_0_0_1px_#c7dceb]">
                <img src={item.icon} alt="" className="h-[29px] w-[29px] object-contain" />
              </span>
              <span className="flex min-w-0 items-center">
                <span className="text-[18px] font-black leading-none text-[#163d69]">{item.label}</span>
              </span>
            </button>
          ))}
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
      <section className={`${wide ? "w-[1040px]" : "w-[560px]"} overflow-hidden rounded-[16px] border border-[#9fc8ea] bg-[#f4f8fc] shadow-[0_16px_34px_rgba(4,31,69,0.34)]`}>
        <div className="grid h-[56px] grid-cols-[1fr_112px] border-b border-[#b9d5ea] bg-[#256fb4]">
          <div className="flex items-center justify-center text-[24px] font-bold text-white">{title}</div>
          <button className="bg-[#1d5f9d] text-[20px] font-bold text-white" onClick={onClose} type="button">
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
  const [selectedFactory, setSelectedFactory] = useState(0);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-[24px]">
      <section className="w-[620px] overflow-hidden rounded-[18px] border border-[#9fc8ea] bg-[#f4f8fc] shadow-[0_16px_34px_rgba(4,31,69,0.34)]">
        <div className="grid h-[82px] grid-cols-[74px_1fr_84px] items-center border-b border-[#b7d8f4] bg-[#256fb4] px-[14px]">
          <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[16px] bg-[#e8f2fb]">
            <img src="/factory.png" alt="" className="h-[38px] w-[38px] object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-[25px] font-black leading-none text-white">공장 변경</div>
            <div className="mt-[7px] text-[14px] font-bold tracking-[0.08em] text-[#d7efff]">SELECT ACTIVE FACTORY</div>
          </div>
          <button className="h-[42px] rounded-[12px] bg-[#1d5f9d] text-[18px] font-black text-white" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        <div className="grid gap-[9px] p-[14px]">
          <div className="flex h-[44px] items-center justify-between rounded-[12px] border border-[#c8e0f5] bg-white px-[16px]">
            <span className="text-[16px] font-black text-[#1c4f82]">현재 선택</span>
            <span className="text-[20px] font-black text-[#0d4da5]">{factories[selectedFactory]}</span>
          </div>
        {factories.map((factory, index) => (
          <button
            key={factory}
            className={`grid h-[58px] grid-cols-[54px_1fr_84px] items-center rounded-[13px] border px-[10px] text-left transition-colors ${
              selectedFactory === index
                ? "border-[#2e86d3] bg-[#e5f4ff] shadow-[0_7px_16px_rgba(40,115,190,0.18)]"
                : "border-[#cfe4f7] bg-white hover:bg-[#eef7ff]"
            }`}
            onClick={() => setSelectedFactory(index)}
            type="button"
          >
            <span className={`flex h-[36px] w-[36px] items-center justify-center rounded-full text-[17px] font-black ${selectedFactory === index ? "bg-[#237bd0] text-white" : "bg-[#e4edf6] text-[#5d748c]"}`}>
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-col justify-center">
              <span className="text-[22px] font-black leading-none text-[#163d69]">{factory}</span>
              <span className="mt-[5px] text-[12px] font-bold tracking-[0.12em] text-[#7c97b0]">FACTORY {String(index + 1).padStart(2, "0")}</span>
            </span>
            <span className={`flex h-[30px] items-center justify-center rounded-full text-[13px] font-black ${selectedFactory === index ? "bg-[#237bd0] text-white" : "bg-[#edf4fa] text-[#7590aa]"}`}>
              {selectedFactory === index ? "선택됨" : "선택"}
            </span>
          </button>
        ))}
        <div className="mt-[3px] grid h-[54px] grid-cols-[1fr_1.3fr] gap-[9px]">
          <button className="rounded-[13px] border border-[#b8d5ee] bg-white text-[20px] font-black text-[#315f8a]" onClick={onClose} type="button">취소</button>
          <button className="rounded-[13px] bg-[#237bd0] text-[20px] font-black text-white shadow-[0_6px_14px_rgba(33,117,199,0.22)]" onClick={onClose} type="button">적용</button>
        </div>
        </div>
      </section>
    </div>
  );
}

function ControlDialog({ dashboard, onClose }: { dashboard: DashboardState; onClose: () => void }) {
  const [sortMode, setSortMode] = useState<"setting" | "time">("setting");
  const [operationMode, setOperationMode] = useState<"local" | "remote">("remote");
  const [controlMode, setControlMode] = useState<"single" | "group">("group");
  const controls = [
    ["무부하 압력", dashboard.control.noLoadPressure.toFixed(1), "bar"],
    ["부하 압력", dashboard.control.loadPressure.toFixed(1), "bar"],
    ["장비별 압력차", dashboard.control.pressureGap.toFixed(1), "bar"],
    ["저압경보 압력 설정", "0.0", "bar"],
    ["교환 운전 시간", String(dashboard.control.changeHours), "hr"],
    ["가동 대수", String(dashboard.control.runUnits), "ea"],
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-[24px]">
      <section className="w-[1040px] overflow-hidden rounded-[18px] border border-[#9fc8ea] bg-[#f4f8fc] shadow-[0_16px_34px_rgba(4,31,69,0.34)]">
        <div className="grid h-[78px] grid-cols-[74px_1fr_92px] items-center border-b border-[#b7d8f4] bg-[#256fb4] px-[14px]">
          <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[16px] bg-[#e8f2fb]">
            <img src="/control.png" alt="" className="h-[38px] w-[38px] object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-[25px] font-black leading-none text-white">통합운전 설정</div>
            <div className="mt-[7px] text-[14px] font-bold tracking-[0.08em] text-[#d7efff]">GROUP OPERATION CONTROL</div>
          </div>
          <button className="h-[42px] rounded-[12px] bg-[#1d5f9d] text-[18px] font-black text-white" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        <div className="grid grid-cols-[430px_1fr_205px] gap-[12px] p-[14px]">
          <div className="rounded-[15px] border border-[#c4ddf4] bg-white p-[12px] shadow-[0_4px_12px_rgba(30,93,151,0.08)]">
            <PanelHeading eyebrow="PRESSURE / COUNT">제어 기준값</PanelHeading>
            <div className="mt-[10px] grid gap-[8px]">
              {controls.map(([label, value, unit]) => (
                <div key={label} className="grid h-[48px] grid-cols-[1fr_120px_48px] items-center rounded-[11px] border border-[#d3e7f8] bg-[#f8fcff] px-[10px]">
                  <div className="text-[16px] font-black text-[#244c75]">{label}</div>
                  <div className="flex items-center justify-center rounded-[8px] bg-white text-[22px] font-black text-[#0d4da5] shadow-[inset_0_0_0_1px_#d7e8f6]">{value}</div>
                  <div className="text-center text-[15px] font-black text-[#5f7f9c]">{unit}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid content-start gap-[12px] rounded-[15px] border border-[#c4ddf4] bg-white p-[12px] shadow-[0_4px_12px_rgba(30,93,151,0.08)]">
            <PanelHeading eyebrow="MODE / INVERTER">운전 조건</PanelHeading>
            <div className="grid gap-[8px]">
              <SegmentedOption
                items={[
                  ["setting", "설정순"],
                  ["time", "시간순"],
                ]}
                selected={sortMode}
                onSelect={(value) => setSortMode(value as "setting" | "time")}
              />
              <label className="flex h-[46px] items-center justify-between rounded-[11px] border border-[#d3e7f8] bg-[#f8fcff] px-[14px] text-[16px] font-black text-[#244c75]">
                <span>절약모드</span>
                <input readOnly className="h-[22px] w-[22px] accent-[#237bd0]" type="checkbox" />
              </label>
              <div className="grid h-[48px] grid-cols-[1fr_92px_46px] items-center rounded-[11px] border border-[#d3e7f8] bg-[#f8fcff] px-[10px]">
                <span className="text-[16px] font-black text-[#244c75]">인버터 메인 호기</span>
                <span className="flex h-[32px] items-center justify-center rounded-[8px] bg-white text-[20px] font-black text-[#0d4da5] shadow-[inset_0_0_0_1px_#d7e8f6]">0</span>
                <span className="text-center text-[14px] font-black text-[#5f7f9c]">호기</span>
              </div>
              <div className="grid h-[48px] grid-cols-[1fr_92px_46px] items-center rounded-[11px] border border-[#d3e7f8] bg-[#f8fcff] px-[10px]">
                <span className="text-[16px] font-black text-[#244c75]">인버터 제어압력 설정</span>
                <span className="flex h-[32px] items-center justify-center rounded-[8px] bg-white text-[20px] font-black text-[#0d4da5] shadow-[inset_0_0_0_1px_#d7e8f6]">0.0</span>
                <span className="text-center text-[14px] font-black text-[#5f7f9c]">bar</span>
              </div>
            </div>
            <PanelHeading eyebrow="OPERATION MODE">운전 모드</PanelHeading>
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
                ["single", "개별 운전"],
                ["group", "통합 운전"],
              ]}
              selected={controlMode}
              onSelect={(value) => setControlMode(value as "single" | "group")}
            />
          </div>
          <div className="grid content-start gap-[12px] rounded-[15px] border border-[#c4ddf4] bg-white p-[12px] shadow-[0_4px_12px_rgba(30,93,151,0.08)]">
            <PanelHeading eyebrow="ACTION">통합운전</PanelHeading>
            <div className="rounded-[14px] border border-[#d3e7f8] bg-[#f8fcff] p-[10px] text-center">
              <div className="text-[13px] font-black tracking-[0.12em] text-[#7c97b0]">CURRENT MODE</div>
              <div className="mt-[6px] text-[24px] font-black text-[#0d4da5]">{operationMode.toUpperCase()}</div>
            </div>
            <button className="h-[82px] rounded-[16px] bg-[#d92525] text-[32px] font-black text-white shadow-[0_7px_15px_rgba(208,31,38,0.22)]" type="button">운전</button>
            <button className="h-[82px] rounded-[16px] bg-[#667380] text-[32px] font-black text-white shadow-[0_7px_15px_rgba(70,82,94,0.18)]" type="button">정지</button>
            <button className="h-[52px] rounded-[14px] bg-[#237bd0] text-[20px] font-black text-white shadow-[0_6px_14px_rgba(33,117,199,0.22)]" type="button">저장</button>
          </div>
        </div>
      </section>
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
    <div className="grid h-[48px] grid-cols-2 rounded-[12px] border border-[#d3e7f8] bg-[#edf6fe] p-[4px]">
      {items.map(([value, label]) => (
        <button
          key={value}
          className={`rounded-[9px] text-[18px] font-black transition-colors ${
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

  return (
    <DialogShell onClose={onClose} title="설정" wide>
      <div className="grid max-h-[690px] gap-[8px] overflow-y-auto bg-[#f4f8fc] p-[10px]">
        <div className="grid grid-cols-2 gap-[6px] rounded-[13px] border border-[#c4ddf4] bg-white p-[8px] shadow-[0_3px_10px_rgba(30,93,151,0.07)]">
          <PlainSettingRow label="Connect IP Setting" value="121.164.120.200" />
          <PlainSettingRow label="Port Setting" value="1502" />
          <PlainSettingRow label="Login Pw Setting" value="1234" />
          <PlainSettingRow label="Setting Pw Setting" value="471112" />
        </div>
        <div className="grid gap-[5px] rounded-[13px] border border-[#c4ddf4] bg-white p-[8px] shadow-[0_3px_10px_rgba(30,93,151,0.07)]">
          <SectionTitle>사용모드 / 정렬 설정</SectionTitle>
          {modes.map(([no, a, b, c, index]) => (
            <div key={no} className="grid h-[32px] grid-cols-[44px_1fr_1fr_1fr_80px] gap-[3px]">
              <div className="flex items-center justify-center rounded-[7px] border border-[#d2e8ff] bg-[#f8fcff] font-bold text-[#244c75]">{no}</div>
              {[a, b, c, index].map((value, idx) => (
                <div key={idx} className="flex items-center justify-center rounded-[7px] border border-[#d2e8ff] bg-[#fbfdff] text-[16px] font-bold">{value}</div>
              ))}
            </div>
          ))}
          <div className="grid h-[38px] grid-cols-[1fr_56px_70px_56px_110px] gap-[4px]">
            <div className="flex items-center justify-center text-[17px] font-bold text-[#0d4da5]">사용모드 개수 설정</div>
            <ChoiceButton>-</ChoiceButton>
            <div className="flex items-center justify-center rounded-[8px] border border-[#9fc8ea] bg-white text-[20px] font-bold">1</div>
            <ChoiceButton>+</ChoiceButton>
            <button className="rounded-[8px] bg-[#237bd0] text-[18px] font-bold text-white" type="button">저장</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[8px]">
          <div className="grid gap-[5px] rounded-[13px] border border-[#c4ddf4] bg-white p-[8px] shadow-[0_3px_10px_rgba(30,93,151,0.07)]">
            <SectionTitle>공장 정보</SectionTitle>
            {factories.map((factory) => (
              <div key={factory} className="grid h-[32px] grid-cols-[120px_1fr] gap-[3px]">
                <div className="flex items-center justify-center rounded-[7px] border border-[#d2e8ff] bg-[#f8fcff] font-bold text-[#244c75]">{factory}</div>
                <div className="flex items-center rounded-[7px] border border-[#d2e8ff] px-[8px]">192.168.0.10</div>
              </div>
            ))}
          </div>
          <div className="grid content-start gap-[6px] rounded-[13px] border border-[#c4ddf4] bg-white p-[8px] shadow-[0_3px_10px_rgba(30,93,151,0.07)]">
            <SectionTitle>DIO BIT 설정</SectionTitle>
            <PlainSettingRow label="BIT0" value="운전" />
            <PlainSettingRow label="BIT4" value="고장" />
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

function SettingRow({ label, unit = "", value }: { label: string; unit?: string; value: string }) {
  return (
    <div className="grid min-h-[42px] grid-cols-[1fr_170px_54px] overflow-hidden rounded-[9px] border border-[#d2e8ff] bg-white">
      <div className="flex items-center justify-center bg-[#f8fcff] px-[6px] text-center text-[16px] font-bold">{label}</div>
      <div className="flex items-center justify-center border-x border-[#d2e8ff] text-[20px] font-bold text-[#0d4da5]">{value}</div>
      <div className="flex items-center justify-center text-[16px] font-bold text-[#0d4da5]">{unit}</div>
    </div>
  );
}

function PlainSettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-[36px] grid-cols-[1fr_210px] overflow-hidden rounded-[9px] border border-[#d2e8ff] bg-white">
      <div className="flex items-center justify-center bg-[#f8fcff] px-[6px] text-center text-[15px] font-bold text-[#244c75]">{label}</div>
      <div className="flex items-center justify-center border-l border-[#d2e8ff] px-[8px] text-center text-[18px] font-bold text-[#0d4da5]">{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="flex h-[32px] items-center justify-center rounded-[8px] bg-[#dcecf9] text-[17px] font-bold text-[#245d94]">{children}</div>;
}

function ChoiceButton({ active = false, children }: { active?: boolean; children: ReactNode }) {
  return (
    <button
      className={`rounded-[8px] border text-[19px] font-bold ${active ? "border-[#237bd0] bg-[#237bd0] text-white" : "border-[#9fc8ea] bg-white text-[#237bd0]"}`}
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
