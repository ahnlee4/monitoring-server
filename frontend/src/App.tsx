import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

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

const mockDashboard: DashboardState = {
  integratedRun: false,
  mainPressure: 7.1,
  appVersion: "240727",
  firmwareVersion: "010024",
  lowPressureAlarm: "warning",
  sortMode: "setting",
  control: {
    noLoadPressure: 8.0,
    loadPressure: 6.5,
    pressureGap: 0.6,
    runUnits: 3,
    changeHours: 22,
    remainMinutes: 37,
  },
  options: [
    { label: "고장발생시 모드 변경", checked: true },
    { label: "인버터 주도 절약운전 기능", checked: true },
    { label: "교환운전 기능", checked: false },
    { label: "메인압력모듈 적용", checked: true },
    { label: "통합운전 제어시 기타 기기 제어", checked: false },
    { label: "저압경보 적용", checked: true },
    { label: "저압경보시 예비기 가동유무", checked: true },
    { label: "고장발생시 예비기 가동유무", checked: false },
    { label: "리모트 모드일때만 쓰기", checked: true },
    { label: "로그인 했을때만 쓰기", checked: false },
    { label: "데이터 저장유무", checked: true },
    { label: "통합제어 정지시 컴프레샤 정지안함", checked: false },
    { label: "교환운전 테스트", checked: false },
    { label: "인버터 컨트롤 에너지 절약모드", checked: true, visible: true },
  ],
  compressors: [
    {
      id: 1,
      name: "1호기",
      model: "Micos 37V",
      pressure: 7.1,
      temperature: 68,
      noLoadPressure: 8.0,
      loadPressure: 6.5,
      controlPressure: 7.2,
      rpm: 1820,
      local: false,
      running: true,
      connected: true,
      alarm: false,
      fault: false,
      inverter: true,
      totalHours: 14820,
    },
    {
      id: 2,
      name: "2호기",
      model: "Micos 55",
      pressure: 6.8,
      temperature: 72,
      noLoadPressure: 8.0,
      loadPressure: 6.4,
      local: true,
      running: true,
      connected: true,
      alarm: false,
      fault: false,
      inverter: false,
      totalHours: 12405,
    },
    {
      id: 3,
      name: "3호기",
      model: "Micos 75V",
      pressure: 7.4,
      temperature: 64,
      noLoadPressure: 8.1,
      loadPressure: 6.6,
      controlPressure: 7.3,
      rpm: 1675,
      local: false,
      running: false,
      connected: true,
      alarm: true,
      fault: false,
      inverter: true,
      totalHours: 9912,
    },
    {
      id: 4,
      name: "4호기",
      model: "Micos 110",
      pressure: 0,
      temperature: 0,
      noLoadPressure: 8.0,
      loadPressure: 6.5,
      local: true,
      running: false,
      connected: false,
      alarm: false,
      fault: true,
      inverter: false,
      totalHours: 17620,
    },
    {
      id: 5,
      name: "5호기",
      model: "Micos 22",
      pressure: 6.9,
      temperature: 61,
      noLoadPressure: 7.8,
      loadPressure: 6.3,
      local: true,
      running: true,
      connected: true,
      alarm: false,
      fault: false,
      inverter: false,
      totalHours: 8820,
    },
    {
      id: 6,
      name: "6호기",
      model: "Micos 150V",
      pressure: 7.0,
      temperature: 70,
      noLoadPressure: 8.2,
      loadPressure: 6.7,
      controlPressure: 7.1,
      rpm: 1510,
      local: false,
      running: false,
      connected: true,
      alarm: false,
      fault: false,
      inverter: true,
      totalHours: 21104,
    },
    {
      id: 7,
      name: "7호기",
      model: "Micos 15",
      pressure: 6.6,
      temperature: 58,
      noLoadPressure: 7.6,
      loadPressure: 6.2,
      local: true,
      running: false,
      connected: true,
      alarm: false,
      fault: false,
      inverter: false,
      totalHours: 6420,
    },
    {
      id: 8,
      name: "8호기",
      model: "Micos 190V",
      pressure: 7.3,
      temperature: 74,
      noLoadPressure: 8.4,
      loadPressure: 6.8,
      controlPressure: 7.4,
      rpm: 1430,
      local: false,
      running: true,
      connected: true,
      alarm: false,
      fault: false,
      inverter: true,
      totalHours: 30550,
    },
  ],
};

export default function App() {
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dashboard = useMemo(() => mockDashboard, []);
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
            {lowPressureText ? <AlarmStrip tone={dashboard.lowPressureAlarm} text={lowPressureText} /> : null}
          </section>

          <Footer dashboard={dashboard} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </div>
      </section>
    </main>
  );
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
