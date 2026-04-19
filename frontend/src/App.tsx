import { useEffect, useMemo, useState } from "react";
import type { UpdateEvent, YujinMapValue } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const WS_PATH = import.meta.env.VITE_WS_PATH || "/ws/dashboard";

type MapValueRecord = Record<string, YujinMapValue>;

type MainDevice = {
  key: string;
  title: string;
  titleTone: string;
  pressure: string;
  temperature: string;
  unloadLabel: string;
  unloadValue: string;
  loadValue: string;
  mode: string;
  modeClass: string;
  status: string;
  statusClass: string;
  runtime: string;
  commError: boolean;
};

export default function App() {
  const [mapValues, setMapValues] = useState<MapValueRecord>({});
  const [connectionState, setConnectionState] = useState("connecting");
  const [now, setNow] = useState(new Date());
  const [fabOpen, setFabOpen] = useState(false);
  const [optionChecks, setOptionChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`${API_BASE}/yujin/map-values?limit=2000`);
      const data = (await response.json()) as YujinMapValue[];
      const nextMap: MapValueRecord = {};
      for (const item of data) nextMap[item.key] = item;
      setMapValues(nextMap);
    };

    load().catch((error) => {
      console.error("Failed to load yujin main values", error);
    });

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}${WS_PATH}`);
    socket.onopen = () => setConnectionState("live");
    socket.onclose = () => setConnectionState("disconnected");
    socket.onerror = () => setConnectionState("error");
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as UpdateEvent;
      if (message.type === "yujin_map_update" || message.type === "telemetry_update") {
        load().catch((error) => {
          console.error("Failed to refresh yujin main values", error);
        });
      }
    };

    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearInterval(timer);
      socket.close();
    };
  }, []);

  useEffect(() => {
    setOptionChecks(buildOptionChecks(mapValues));
  }, [mapValues]);

  const devices = useMemo(() => buildMainDevices(mapValues), [mapValues]);
  const servicePressure = formatScaledValue(readText(mapValues, "0000"), 10, "bar");
  const mainModeText = readText(mapValues, "0022") === "1" ? "개별" : "전체";
  const sideItems = [
    { label: "압력", value: servicePressure },
    { label: "기동대수", value: `${devices.filter((device) => device.status === "운전").length}` },
    { label: "접속", value: connectionState === "live" ? "정상" : "점검" },
  ];
  const optionItems = buildOptionItems(optionChecks);

  return (
    <main className="h-screen overflow-hidden bg-white text-black">
      <div className="mx-auto h-screen min-w-[1400px] max-w-[1920px] overflow-hidden p-[5px]">
        <div className="relative grid h-[calc(100vh-10px)] grid-rows-[112px_minmax(0,1fr)_172px] gap-[5px] overflow-hidden">
          <div className="min-h-0">
            <TopRow
              now={now}
              servicePressure={servicePressure}
              totalText={"컴프레샤\n통합제어 시스템"}
            />
          </div>

          <section className="min-h-0 overflow-hidden">
            <div className="grid h-full auto-rows-fr grid-cols-3 gap-[5px] overflow-hidden">
              {devices.map((device, index) => (
                <EquipmentCard key={device.key} device={device} index={index} />
              ))}
            </div>
          </section>

          <section className="min-h-0 overflow-hidden">
            <div className="grid h-full grid-cols-[70px_1.1fr_70px_1fr_70px_1fr] gap-[5px]">
              <VerticalTitle text={"모\n드"} />
              <ModePanel />
              <VerticalTitle text={"통\n합\n제\n어"} />
              <BottomList items={sideItems} />
              <VerticalTitle text={"옵\n션"} />
              <OptionList items={optionItems} onToggle={(key) => {
                  setOptionChecks((prev) => ({ ...prev, [key]: !prev[key] }));
                }} />
            </div>
          </section>

          <FloatingActions fabOpen={fabOpen} setFabOpen={setFabOpen} />
          {connectionState !== "live" ? (
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center bg-[#80bdbdbd] py-[20px] text-center text-[72px] font-bold text-[#303f9f]">
              TCP DISCONNECT
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function TopRow({
  now,
  servicePressure,
  totalText,
}: {
  now: Date;
  servicePressure: string;
  totalText: string;
}) {
  return (
    <header className="grid h-[112px] flex-none grid-cols-[220px_180px_180px_84px_1fr_270px] gap-[3px] overflow-hidden">
      <TopBox className="border border-[#6599dd] bg-[#6599dd] text-white" value="통합운전 정지" />
      <MetricBox title="압력" value={servicePressure} className="bg-[#8dc3f5]" />
      <TimeBox now={now} />
      <div className="flex items-center justify-center rounded-[5px] border border-[#6599dd] bg-[#6599dd] text-[38px] text-white">
        🔒
      </div>
      <TopBox className="border border-[#003d8d] bg-[#003d8d] text-white" value={totalText} multiline />
      <div className="flex items-center justify-center rounded-[5px] border border-[#d7e8ff] bg-white px-4">
        <img src="/grid_logo3.png" alt="grid logo" className="max-h-[78px] w-auto object-contain" />
      </div>
    </header>
  );
}

function TopBox({
  value,
  className,
  multiline = false,
}: {
  value: string;
  className: string;
  multiline?: boolean;
}) {
  return (
    <div className={`flex h-full items-center justify-center overflow-hidden rounded-[5px] px-[6px] text-center text-[34px] font-bold leading-[1.05] ${className}`}>
      <span className={multiline ? "whitespace-pre-line" : ""}>{value}</span>
    </div>
  );
}

function MetricBox({ title, value, className }: { title: string; value: string; className: string }) {
  return (
    <div className={`relative flex h-full flex-col overflow-hidden rounded-[5px] border border-[#8dc3f5] px-[10px] py-[8px] text-white ${className}`}>
      <div className="text-[20px] font-bold">{title}</div>
      <div className="mt-[6px] text-center text-[34px] font-bold leading-none">{value}</div>
    </div>
  );
}

function TimeBox({ now }: { now: Date }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[5px] border border-[#3175ce] bg-[#3175ce] px-[10px] py-[8px] text-white">
      <div className="text-center text-[34px] font-bold leading-none">
        {now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="mt-[6px] text-center text-[16px] font-bold">
        {now.toLocaleDateString("ko-KR")}
      </div>
    </div>
  );
}

function EquipmentCard({ device, index }: { device: MainDevice; index: number }) {
  return (
    <article className="relative h-full min-h-0 overflow-hidden border border-[#b3d4ff] bg-white p-[5px]">
      <div className={`px-[12px] py-[12px] text-center text-[32px] font-bold text-[#303f9f] shadow-[3px_3px_1.5px_#ababab] ${device.titleTone || cardTone(index)}`}>
        {device.title}
      </div>
      <ValueRow label="압력" value={device.pressure} large />
      <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-[5px]">
        <MiniValueRow label={device.unloadLabel} value={device.unloadValue} />
        <MiniValueCell value="부하" title />
        <MiniValueCell value={device.loadValue} />
      </div>
      <ValueRow label="온도" value={device.temperature} large />
      <div className="mt-[5px] grid grid-cols-2 gap-[3px]">
        <div className={`flex min-h-[58px] items-center justify-center text-[32px] font-bold text-white ${device.modeClass}`}>
          {device.mode}
        </div>
        <div className={`flex min-h-[58px] items-center justify-center text-[32px] font-bold ${device.statusClass}`}>
          {device.status}
        </div>
      </div>
      <ValueRow label="총 운전시간" value={device.runtime} />
      {device.commError ? (
        <div className="absolute inset-[5px] flex items-center justify-center bg-[#80bdbdbd] text-[160px] font-bold text-[#303f9f]">
          X
        </div>
      ) : null}
    </article>
  );
}

function ValueRow({ label, value, large = false }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="mt-[5px] grid grid-cols-[1fr_2.5fr]">
      <div className={`border border-[#b3d4ff] bg-[#b3d4ff] px-[8px] py-[8px] text-center font-bold ${large ? "text-[32px]" : "text-[22px]"}`}>
        {label}
      </div>
      <div className={`border border-[#b3d4ff] bg-white px-[8px] py-[8px] text-center font-bold ${large ? "text-[32px]" : "text-[22px]"}`}>
        {value}
      </div>
    </div>
  );
}

function MiniValueRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <MiniValueCell value={label} title />
      <MiniValueCell value={value} />
    </>
  );
}

function MiniValueCell({ value, title = false }: { value: string; title?: boolean }) {
  return (
    <div className={`mt-[5px] border border-[#b3d4ff] px-[4px] py-[8px] text-center font-bold ${title ? "bg-[#ddedff] text-[18px]" : "bg-white text-[22px]"}`}>
      {value}
    </div>
  );
}

function VerticalTitle({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-[5px] border border-[#6599dd] bg-[#6599dd] text-center text-[32px] font-bold leading-tight text-white whitespace-pre-line">
      {text}
    </div>
  );
}

function ModePanel() {
  return (
    <div className="grid grid-rows-[1fr_58px] gap-[5px]">
      <div className="grid grid-cols-2 gap-[5px]">
        <RadioLike active text="설정순" />
        <RadioLike text="시간순" />
      </div>
      <div className="grid grid-cols-3 gap-[5px]">
        <IconSquare text="◀" />
        <IconSquare text="⟳" />
        <IconSquare text="▶" />
      </div>
    </div>
  );
}

function RadioLike({ text, active = false }: { text: string; active?: boolean }) {
  return (
    <div className={`flex items-center justify-center rounded-[5px] border px-[10px] text-[26px] font-bold ${active ? "border-[#3175ce] bg-[#3175ce] text-white" : "border-[#b3d4ff] bg-white text-[#303f9f]"}`}>
      {text}
    </div>
  );
}

function IconSquare({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-[5px] border border-[#d6e8ff] bg-white text-[30px] font-bold text-[#303f9f]">
      {text}
    </div>
  );
}

function BottomList({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid h-full grid-cols-3 gap-[5px]">
      {items.map((item) => (
        <div key={item.label} className="grid h-full grid-rows-[38px_minmax(0,1fr)] border border-[#b3d4ff] bg-white">
          <div className="bg-[#8dc3f5] px-[8px] py-[6px] text-center text-[18px] font-bold text-white">{item.label}</div>
          <div className="flex min-h-0 items-center justify-center px-[8px] text-center text-[28px] font-bold text-black">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function OptionList({
  items,
  onToggle,
}: {
  items: Array<{ key: string; label: string; checked: boolean }>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="grid h-full grid-cols-3 gap-[4px] overflow-hidden border border-[#b3d4ff] bg-white p-[4px]">
      {items.map((item) => (
        <label
          key={item.key}
          className="flex min-h-0 items-center gap-[4px] overflow-hidden bg-white px-[2px] py-[1px] text-[13px] font-medium leading-tight text-black"
        >
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => onToggle(item.key)}
            className="h-[14px] w-[14px] shrink-0 accent-[#3175ce]"
          />
          <span className="line-clamp-2 leading-tight">{item.label}</span>
        </label>
      ))}
    </div>
  );
}

function FloatingActions({
  fabOpen,
  setFabOpen,
}: {
  fabOpen: boolean;
  setFabOpen: (value: boolean) => void;
}) {
  const buttons = [
    { label: "CCTV", icon: "🎥" },
    { label: "로그 파일", icon: "📄" },
    { label: "설정", icon: "⚙" },
    { label: "그룹운전 설정", icon: "🛠" },
    { label: "LOG", icon: "📝" },
    { label: "상세 화면", icon: "🏷" },
  ];

  return (
    <div className="pointer-events-none absolute bottom-[10px] right-[10px] z-20 flex flex-col items-end gap-[10px]">
      {buttons.map((button) => (
        <div key={`${button.label}-${button.icon}`} className="pointer-events-auto flex items-center gap-[5px]">
          {fabOpen ? (
            <div className="rounded-[5px] border border-transparent bg-[#a025b9f5] px-[15px] py-[5px] text-[32px] font-bold text-[#303f9f]">
              {button.label}
            </div>
          ) : null}
          <button
            className={`flex h-[98px] w-[98px] items-center justify-center rounded-full bg-[#25B9F5] text-[34px] font-bold text-white shadow-[0_10px_18px_rgba(0,61,141,0.16)] transition-all duration-300 ${
              fabOpen ? "scale-100 opacity-100" : "pointer-events-none scale-0 opacity-0"
            }`}
          >
            {button.icon}
          </button>
        </div>
      ))}
      <button
        onClick={() => setFabOpen(!fabOpen)}
        className="pointer-events-auto flex h-[98px] w-[98px] items-center justify-center rounded-full bg-[#25B9F5] text-[42px] font-bold text-white shadow-[0_10px_18px_rgba(0,61,141,0.16)] transition-transform duration-500"
        style={{ transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)" }}
      >
        +
      </button>
    </div>
  );
}

function buildMainDevices(mapValues: MapValueRecord): MainDevice[] {
  const count = Math.max(1, readNumber(mapValues, "004E", 3));
  const devices: MainDevice[] = [];

  for (let index = 0; index < count; index += 1) {
    const isOilfree = checkBit(readNumber(mapValues, "0006", 0), index);
    const prefix = `${isOilfree ? "2" : "1"}${(index + 1).toString(16).toUpperCase()}`;
    const cpState = readText(mapValues, `${prefix}${isOilfree ? "30" : "16"}`);
    const modeState = readText(mapValues, `${prefix}${isOilfree ? "3A" : "18"}`);
    const modelKey = `${prefix}${isOilfree ? "7C" : "72"}`;
    const modelText = readText(mapValues, modelKey) || `${index + 1}호기`;

    devices.push({
      key: prefix,
      title: modelText,
      titleTone: cardTone(index),
      pressure: formatScaledValue(readText(mapValues, `${prefix}00`), 10, "bar"),
      temperature: formatScaledValue(readText(mapValues, `${prefix}${isOilfree ? "0C" : "02"}`), 1, "°C"),
      unloadLabel: isOilfree ? "무부하" : "무부하",
      unloadValue: formatScaledValue(readText(mapValues, `${prefix}${isOilfree ? "4E" : "26"}`), 10, "bar"),
      loadValue: isOilfree
        ? formatIntegerValue(readText(mapValues, `${prefix}50`), "rpm")
        : formatScaledValue(readText(mapValues, `${prefix}28`), 10, "bar"),
      mode: modeState === "1" ? "REMOTE" : "LOCAL",
      modeClass: modeState === "1" ? "bg-[#54b871] text-white" : "bg-[#00ffff] text-black",
      status: cpState === "1" ? "운전" : cpState === "2" ? "경고" : "정지",
      statusClass:
        cpState === "1"
          ? "bg-[#ef0000] text-white"
          : cpState === "2"
            ? "bg-[#fff600] text-black"
            : "bg-[#c2c2c2] text-black",
      runtime: formatRuntime(
        readText(mapValues, `${prefix}${isOilfree ? "9A" : "68"}`),
        readText(mapValues, `${prefix}${isOilfree ? "9C" : "6A"}`),
      ),
      alarm: readNumber(mapValues, `${prefix}${isOilfree ? "28" : "0A"}`, 0) > 0,
      commError: false,
    });
  }

  return devices;
}

function readText(mapValues: MapValueRecord, key: string): string {
  return mapValues[key]?.value ?? "";
}

function readNumber(mapValues: MapValueRecord, key: string, fallback = 0): number {
  const raw = mapValues[key]?.value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function checkBit(value: number, position: number): boolean {
  return ((value >> position) & 1) === 1;
}

function formatScaledValue(raw: string, divisor: number, unit: string): string {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return `0 ${unit}`;
  const decimals = divisor === 1 ? 0 : 1;
  return `${(parsed / divisor).toFixed(decimals)} ${unit}`;
}

function formatIntegerValue(raw: string, unit: string): string {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return `0 ${unit}`;
  return `${parsed.toFixed(0)} ${unit}`;
}

function formatRuntime(lowText: string, highText: string): string {
  const low = Number(lowText || "0");
  const high = Number(highText || "0");
  const total = (Number.isFinite(high) ? high : 0) * 65536 + (Number.isFinite(low) ? low : 0);
  return `${total.toLocaleString("ko-KR")} hr`;
}

function cardTone(index: number): string {
  const tones = [
    "bg-[#b3d4ff]",
    "bg-[#b3f4ff]",
    "bg-[#b3ffee]",
    "bg-[#b3ffd7]",
    "bg-[#ccffb2]",
    "bg-[#b29bfe]",
    "bg-[#9bacfe]",
    "bg-[#bbb3fe]",
    "bg-[#ffc6f9]",
    "bg-[#fec6c5]",
    "bg-[#fee0c5]",
    "bg-[#fef4c5]",
  ];
  return tones[index % tones.length];
}

function buildOptionChecks(mapValues: MapValueRecord): Record<string, boolean> {
  const optionValue = readNumber(mapValues, "004A", 0);
  const checks: Record<string, boolean> = {};
  for (const item of OPTION_ITEMS) {
    if (item.kind === "bit") {
      checks[item.key] = checkBit(optionValue, item.bit);
    } else {
      const inverterValue = readNumber(mapValues, "0036", 0);
      checks[item.key] = Math.floor(inverterValue / 256) === 1;
    }
  }
  return checks;
}

function buildOptionItems(optionChecks: Record<string, boolean>) {
  return OPTION_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    checked: optionChecks[item.key] ?? false,
  }));
}

const OPTION_ITEMS: Array<
  | { key: string; label: string; kind: "bit"; bit: number }
  | { key: string; label: string; kind: "inverter_mode" }
> = [
  { key: "opt_2", label: "고장발생시 모드 변경", kind: "bit", bit: 2 },
  { key: "opt_3", label: "인버터 주도 절약운전 기능", kind: "bit", bit: 3 },
  { key: "opt_4", label: "교환운전 기능", kind: "bit", bit: 4 },
  { key: "opt_5", label: "메인압력모듈 적용", kind: "bit", bit: 5 },
  { key: "opt_6", label: "통합운전 제어시 기타 기기 제어", kind: "bit", bit: 6 },
  { key: "opt_8", label: "저압경보 적용", kind: "bit", bit: 8 },
  { key: "opt_9", label: "저압경보시 예비기 가동 유무", kind: "bit", bit: 9 },
  { key: "opt_10", label: "고장발생시 예비기 가동 유무", kind: "bit", bit: 10 },
  { key: "opt_11", label: "리모트 모드일때만 쓰기", kind: "bit", bit: 11 },
  { key: "opt_12", label: "로그인 했을때만 쓰기", kind: "bit", bit: 12 },
  { key: "opt_13", label: "데이터 저장 유무", kind: "bit", bit: 13 },
  { key: "opt_14", label: "통합제어 정지시 컴프레샤 정지안함", kind: "bit", bit: 14 },
  { key: "opt_15", label: "교환운전 테스트", kind: "bit", bit: 15 },
  { key: "opt_16", label: "인버터 컨트롤 에너지 절약모드", kind: "inverter_mode" },
];
