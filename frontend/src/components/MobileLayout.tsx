import { useEffect, useState } from "react";

type MobileCompressor = {
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
  isOilfree: boolean;
  totalHours: number;
};

type MobileDashboard = {
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
  compressors: MobileCompressor[];
};

type ActiveDialog = "factory" | "settings" | "control" | "password" | null;
type ActiveScreen = "main" | "detail";
type ModeSequenceAction = "previous" | "refresh" | "next";
type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function MobileLayout({
  activeScreen,
  dashboard,
  lowPressureText,
  modeSequenceBusy,
  now,
  onLogoClick,
  onModeSequenceAction,
  onOpenCompressorDetail,
  onOpenDialog,
  onToggleScreen,
}: {
  activeScreen: ActiveScreen;
  dashboard: MobileDashboard;
  lowPressureText: string;
  modeSequenceBusy: boolean;
  now: Date;
  onLogoClick: () => void;
  onModeSequenceAction: (action: ModeSequenceAction) => void;
  onOpenCompressorDetail: (id: number) => void;
  onOpenDialog: (dialog: ActiveDialog) => void;
  onToggleScreen: () => void;
}) {
  const connectedCompressors = dashboard.compressors.filter((compressor) => compressor.connected);

  return (
    <section className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#eef4fa] text-[#12263a]">
      <MobileHeader dashboard={dashboard} now={now} onLogoClick={onLogoClick} />
      <main className={`flex min-h-0 flex-1 flex-col px-[12px] pb-[92px] pt-[10px] ${activeScreen === "main" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {connectedCompressors.length === 0 ? (
          <MobileDisconnect />
        ) : activeScreen === "detail" ? (
          <MobileDetailList compressors={connectedCompressors} onOpenCompressorDetail={onOpenCompressorDetail} />
        ) : (
          <MobileMainList compressors={connectedCompressors} lowPressureText={lowPressureText} onOpenCompressorDetail={onOpenCompressorDetail} />
        )}
      </main>
      <MobileBottomActions
        activeScreen={activeScreen}
        dashboard={dashboard}
        modeSequenceBusy={modeSequenceBusy}
        onModeSequenceAction={onModeSequenceAction}
        onOpenDialog={onOpenDialog}
        onToggleScreen={onToggleScreen}
      />
    </section>
  );
}

function MobileHeader({
  dashboard,
  now,
  onLogoClick,
}: {
  dashboard: MobileDashboard;
  now: Date;
  onLogoClick: () => void;
}) {
  const [fullscreenActive, setFullscreenActive] = useState(false);

  useEffect(() => {
    const fullscreenDocument = document as FullscreenDocument;
    const syncFullscreenState = () => {
      setFullscreenActive(Boolean(document.fullscreenElement || fullscreenDocument.webkitFullscreenElement));
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
    };
  }, []);

  const handleFullscreenClick = () => {
    const fullscreenDocument = document as FullscreenDocument;
    const fullscreenElement = document.documentElement as FullscreenElement;

    if (document.fullscreenElement || fullscreenDocument.webkitFullscreenElement) {
      void (document.exitFullscreen?.() ?? fullscreenDocument.webkitExitFullscreen?.());
      return;
    }

    void (fullscreenElement.requestFullscreen?.() ?? fullscreenElement.webkitRequestFullscreen?.());
  };

  return (
    <header className="shrink-0 border-b border-[#d8e6f1] bg-white px-[12px] py-[10px] shadow-[0_6px_18px_rgba(18,54,88,0.08)]">
      <div className="flex items-center justify-between gap-[10px]">
        <button className="flex min-w-0 items-center gap-[8px] text-left" onClick={onLogoClick} type="button">
          <img src="/grid_logo3.png" alt="GRID" className="h-[30px] w-[78px] object-contain" />
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-black leading-none text-[#173f69]">컴프레샤 통합제어</span>
            <span className="mt-[4px] block text-[11px] font-black text-[#6f879d]">App {dashboard.appVersion} / Fw {dashboard.firmwareVersion}</span>
          </span>
        </button>
        <div className="grid shrink-0 grid-cols-[58px_44px] gap-[6px]">
          <span className={`flex min-h-[44px] items-center justify-center rounded-[9px] px-[10px] text-[17px] font-black text-white ${dashboard.integratedRun ? "bg-[#d92525]" : "bg-[#667380]"}`}>
            {dashboard.integratedRun ? "운전" : "정지"}
          </span>
          <button
            aria-label={fullscreenActive ? "전체화면 축소" : "전체화면"}
            className="flex min-h-[44px] items-center justify-center rounded-[9px] border border-[#c9deef] bg-[#eef7ff] text-[#173f69] shadow-[0_4px_10px_rgba(35,123,208,0.1)]"
            onClick={handleFullscreenClick}
            title={fullscreenActive ? "전체화면 축소" : "전체화면"}
            type="button"
          >
            <FullscreenIcon active={fullscreenActive} />
          </button>
        </div>
      </div>
      <div className="mt-[10px] grid grid-cols-2 gap-[8px]">
        <MobileSummaryTile label="메인 압력" unit="bar" value={formatNumber(dashboard.mainPressure, 1)} />
        <MobileSummaryTile label="현재 시각" value={formatMobileDateTime(now)} />
      </div>
    </header>
  );
}

function FullscreenIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <span aria-hidden="true" className="relative block h-[22px] w-[22px]">
        <span className="absolute left-[2px] top-[2px] h-[7px] w-[7px] border-b-[2px] border-r-[2px] border-[#173f69]" />
        <span className="absolute right-[2px] top-[2px] h-[7px] w-[7px] border-b-[2px] border-l-[2px] border-[#173f69]" />
        <span className="absolute bottom-[2px] left-[2px] h-[7px] w-[7px] border-r-[2px] border-t-[2px] border-[#173f69]" />
        <span className="absolute bottom-[2px] right-[2px] h-[7px] w-[7px] border-l-[2px] border-t-[2px] border-[#173f69]" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="relative block h-[22px] w-[22px]">
      <span className="absolute left-[2px] top-[2px] h-[8px] w-[8px] border-l-[2px] border-t-[2px] border-[#173f69]" />
      <span className="absolute right-[2px] top-[2px] h-[8px] w-[8px] border-r-[2px] border-t-[2px] border-[#173f69]" />
      <span className="absolute bottom-[2px] left-[2px] h-[8px] w-[8px] border-b-[2px] border-l-[2px] border-[#173f69]" />
      <span className="absolute bottom-[2px] right-[2px] h-[8px] w-[8px] border-b-[2px] border-r-[2px] border-[#173f69]" />
    </span>
  );
}

function MobileSummaryTile({ label, unit = "", value }: { label: string; unit?: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[#d9e6f0] bg-[#f8fbfd] px-[11px] py-[9px]">
      <div className="text-[11px] font-black text-[#6f879d]">{label}</div>
      <div className="mt-[5px] flex items-end justify-end gap-[5px] text-right">
        <span className="min-w-0 truncate text-[24px] font-black leading-none text-[#173f69]">{value}</span>
        {unit ? <span className="shrink-0 pb-[2px] text-[12px] font-black text-[#6f879d]">{unit}</span> : null}
      </div>
    </div>
  );
}

function MobileMainList({
  compressors,
  lowPressureText,
  onOpenCompressorDetail,
}: {
  compressors: MobileCompressor[];
  lowPressureText: string;
  onOpenCompressorDetail: (id: number) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[10px]">
      {lowPressureText ? <div className="rounded-[10px] bg-[#fff0f0] px-[12px] py-[10px] text-center text-[15px] font-black text-[#d92525]">{lowPressureText}</div> : null}
      <div className="grid min-h-0 flex-1 snap-y snap-mandatory grid-cols-1 auto-rows-[calc((100%-10px)/2)] gap-[10px] overflow-y-auto overscroll-contain scroll-smooth pr-[2px]">
        {compressors.map((compressor) => (
          <MobileCompressorCard key={compressor.id} compressor={compressor} onOpenDetail={onOpenCompressorDetail} />
        ))}
      </div>
    </div>
  );
}

function MobileDetailList({
  compressors,
  onOpenCompressorDetail,
}: {
  compressors: MobileCompressor[];
  onOpenCompressorDetail: (id: number) => void;
}) {
  return (
    <div className="grid gap-[10px]">
      {compressors.map((compressor) => (
        <MobileDetailCard key={compressor.id} compressor={compressor} onOpenDetail={onOpenCompressorDetail} />
      ))}
    </div>
  );
}

function MobileCompressorCard({
  compressor,
  onOpenDetail,
}: {
  compressor: MobileCompressor;
  onOpenDetail: (id: number) => void;
}) {
  return (
    <button
      className="grid min-h-0 w-full snap-start scroll-mt-0 grid-rows-[auto_1fr_auto] gap-[clamp(7px,1dvh,10px)] rounded-[13px] border border-[#d9e6f0] bg-white p-[clamp(10px,1.4dvh,14px)] text-left shadow-[0_8px_20px_rgba(18,54,88,0.08)]"
      onClick={() => onOpenDetail(compressor.id)}
      type="button"
    >
      <div className="grid grid-cols-[1fr_clamp(82px,22vw,100px)] items-start gap-[clamp(8px,1.1dvh,11px)]">
        <span className="min-w-0">
          <span className="block text-[clamp(20px,2.5dvh,24px)] font-black leading-none text-[#173f69]">{compressor.name}</span>
          <span className="mt-[clamp(4px,0.6dvh,6px)] block truncate text-[clamp(12px,1.4dvh,14px)] font-black text-[#6f879d]">{compressor.model}</span>
        </span>
        <span className={`flex min-h-[clamp(38px,4.8dvh,46px)] items-center justify-center rounded-[8px] px-[8px] text-[clamp(15px,1.9dvh,18px)] font-black text-white ${compressor.running ? "bg-[#d92525]" : "bg-[#667380]"}`}>
          {compressor.running ? "운전" : "정지"}
        </span>
      </div>
      <div className="grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-[clamp(6px,0.9dvh,9px)]">
        <MobileValue prominent label="압력" unit="bar" value={formatNumber(compressor.pressure, 1)} />
        <MobileValue prominent label="온도" unit="℃" value={formatNumber(compressor.temperature, 1)} />
        <MobileValue prominent label={compressor.inverter ? "제어압력" : "무부하"} unit="bar" value={formatNumber(compressor.inverter ? compressor.controlPressure : compressor.noLoadPressure, 1)} />
        <MobileValue prominent label={compressor.inverter ? "회전수" : "부하"} unit={compressor.inverter ? "rpm" : "bar"} value={compressor.inverter ? formatInteger(compressor.rpm) : formatNumber(compressor.loadPressure, 1)} />
      </div>
      <div className="grid grid-cols-3 gap-[clamp(6px,0.9dvh,9px)]">
        <MobileBadge icon={compressor.local ? "L" : "R"} tone="green">
          {compressor.local ? "LOCAL" : "REMOTE"}
        </MobileBadge>
        <MobileBadge icon="!" tone={compressor.alarm ? "yellow" : "gray"}>
          {compressor.alarm ? "알림" : "정상"}
        </MobileBadge>
        <MobileBadge icon="X" tone={compressor.fault ? "red" : "gray"}>
          {compressor.fault ? "고장" : "정상"}
        </MobileBadge>
      </div>
    </button>
  );
}

function MobileDetailCard({
  compressor,
  onOpenDetail,
}: {
  compressor: MobileCompressor;
  onOpenDetail: (id: number) => void;
}) {
  const imageSrc = getCompressorImage(compressor);

  return (
    <button
      className="grid w-full grid-cols-[104px_1fr] gap-[10px] rounded-[13px] border border-[#d9e6f0] bg-white p-[12px] text-left shadow-[0_8px_20px_rgba(18,54,88,0.08)]"
      onClick={() => onOpenDetail(compressor.id)}
      type="button"
    >
      <div className="grid min-h-[126px] grid-rows-[1fr_28px] overflow-hidden rounded-[10px] border border-[#d9e6f0] bg-[#f8fbfd]">
        <div className="flex items-center justify-center bg-white p-[6px]">
          <img src={imageSrc} alt="" className="max-h-full max-w-full object-contain" />
        </div>
        <div className="flex items-center justify-center bg-[#eef7ff] text-[12px] font-black text-[#173f69]">{compressor.inverter ? "INVERTER" : "STANDARD"}</div>
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-[8px]">
          <span className="min-w-0">
            <span className="block text-[19px] font-black leading-none text-[#173f69]">{compressor.name}</span>
            <span className="mt-[5px] block truncate text-[12px] font-black text-[#6f879d]">{compressor.model}</span>
          </span>
          <MobileBadge tone={compressor.running ? "red" : "gray"}>{compressor.running ? "RUN" : "RDY"}</MobileBadge>
        </div>
        <div className="mt-[10px] grid grid-cols-2 gap-[7px]">
          <MobileValue label="압력" unit="bar" value={formatNumber(compressor.pressure, 1)} />
          <MobileValue label="온도" unit="℃" value={formatNumber(compressor.temperature, 1)} />
          <MobileValue label="시간" unit="hr" value={formatInteger(compressor.totalHours)} />
          <MobileValue label={compressor.inverter ? "회전" : "부하"} unit={compressor.inverter ? "rpm" : "bar"} value={compressor.inverter ? formatInteger(compressor.rpm) : formatNumber(compressor.loadPressure, 1)} />
        </div>
      </div>
    </button>
  );
}

function MobileValue({ label, prominent = false, unit, value }: { label: string; prominent?: boolean; unit: string; value: string }) {
  const containerClass = prominent
    ? "grid h-full min-h-0 grid-rows-[auto_1fr] rounded-[9px] border border-[#d9e6f0] bg-[#f8fbfd] px-[clamp(9px,1.4dvh,14px)] py-[clamp(7px,1dvh,10px)]"
    : "rounded-[9px] border border-[#d9e6f0] bg-[#f8fbfd] px-[clamp(8px,1.1dvh,11px)] py-[clamp(6px,1dvh,9px)]";
  const labelClass = prominent
    ? "text-[clamp(13px,1.8dvh,16px)] font-black text-[#6f879d]"
    : "text-[clamp(11px,1.4dvh,13px)] font-black text-[#6f879d]";
  const valueRowClass = prominent
    ? "flex min-h-0 items-end justify-end gap-[5px] text-right"
    : "mt-[clamp(3px,0.6dvh,5px)] flex items-end justify-end gap-[4px] text-right";
  const valueClass = prominent
    ? "min-w-0 truncate text-[clamp(24px,3.6dvh,32px)] font-black leading-none text-[#173f69]"
    : "min-w-0 truncate text-[clamp(18px,2.4dvh,23px)] font-black leading-none text-[#173f69]";
  const unitClass = prominent
    ? "shrink-0 pb-0 text-[clamp(11px,1.6dvh,14px)] font-black leading-none text-[#6f879d]"
    : "shrink-0 pb-[1px] text-[clamp(10px,1.3dvh,12px)] font-black text-[#6f879d]";

  return (
    <div className={containerClass}>
      <div className={labelClass}>{label}</div>
      <div className={valueRowClass}>
        <span className={valueClass}>{value}</span>
        <span className={unitClass}>{unit}</span>
      </div>
    </div>
  );
}

function MobileBadge({ children, icon, tone }: { children: string; icon?: string; tone: "green" | "gray" | "red" | "yellow" }) {
  const className = {
    green: "bg-[#4eaa70] text-white",
    gray: "bg-[#e7edf3] text-[#45657f]",
    red: "bg-[#d92525] text-white",
    yellow: "bg-[#ffe642] text-[#173f69]",
  }[tone];

  return (
    <span className={`flex min-h-[clamp(34px,4.2dvh,42px)] items-center justify-center gap-[5px] rounded-[8px] px-[7px] text-[clamp(13px,1.7dvh,16px)] font-black ${className}`}>
      {icon ? <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white/55 px-[4px] text-[11px] font-black leading-none text-current">{icon}</span> : null}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function MobileDisconnect() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="w-full rounded-[16px] bg-[#9aa2aa] px-[16px] py-[34px] text-center text-[32px] font-black tracking-[0.18em] text-white">
        DISCONNECT
      </div>
    </div>
  );
}

function MobileBottomActions({
  activeScreen,
  dashboard,
  modeSequenceBusy,
  onModeSequenceAction,
  onOpenDialog,
  onToggleScreen,
}: {
  activeScreen: ActiveScreen;
  dashboard: MobileDashboard;
  modeSequenceBusy: boolean;
  onModeSequenceAction: (action: ModeSequenceAction) => void;
  onOpenDialog: (dialog: ActiveDialog) => void;
  onToggleScreen: () => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#d8e6f1] bg-white/95 px-[10px] py-[8px] shadow-[0_-8px_24px_rgba(18,54,88,0.12)] backdrop-blur">
      <div className="grid grid-cols-5 gap-[6px]">
        <MobileNavButton active={activeScreen === "main"} label="메인" onClick={activeScreen === "main" ? undefined : onToggleScreen} />
        <MobileNavButton active={activeScreen === "detail"} label="상세" onClick={activeScreen === "detail" ? undefined : onToggleScreen} />
        <MobileNavButton label="통합" onClick={() => onOpenDialog("control")} />
        <MobileNavButton label="설정" onClick={() => onOpenDialog("settings")} />
        <MobileNavButton label="공장" onClick={() => onOpenDialog("factory")} />
      </div>
      <div className="mt-[7px] grid grid-cols-[1fr_42px_42px_42px] gap-[6px]">
        <div className="flex items-center rounded-[8px] bg-[#eef7ff] px-[10px] text-[12px] font-black text-[#45657f]">
          {dashboard.sortMode === "time" ? "시간순" : "설정순"} / {dashboard.control.runUnits}대
        </div>
        <MobileIconButton disabled={modeSequenceBusy} label="이전" onClick={() => onModeSequenceAction("previous")} src="/arrow_back_ios_new_24dp.png" />
        <MobileIconButton disabled={modeSequenceBusy} label="새로고침" onClick={() => onModeSequenceAction("refresh")} src="/refresh_24dp.png" />
        <MobileIconButton disabled={modeSequenceBusy} label="다음" onClick={() => onModeSequenceAction("next")} src="/arrow_forward_ios_24dp.png" />
      </div>
    </nav>
  );
}

function MobileNavButton({ active = false, label, onClick }: { active?: boolean; label: string; onClick?: () => void }) {
  return (
    <button
      className={`h-[42px] rounded-[9px] text-[13px] font-black ${active ? "bg-[#237bd0] text-white" : "border border-[#d9e6f0] bg-[#f8fbfd] text-[#173f69]"}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function MobileIconButton({ disabled, label, onClick, src }: { disabled: boolean; label: string; onClick: () => void; src: string }) {
  return (
    <button
      aria-label={label}
      className="flex h-[36px] items-center justify-center rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <img src={src} alt="" className="h-[24px] w-[24px] object-contain" />
    </button>
  );
}

function getCompressorImage(compressor: MobileCompressor) {
  if (!compressor.isOilfree && compressor.model !== "-") {
    return compressor.inverter ? "/injection_v_mini.png" : "/injection_mini.png";
  }
  return compressor.inverter ? "/equip_mini.png" : "/equip_n_mini.png";
}

function formatNumber(value: number | undefined, digits: number) {
  if (value === undefined || !Number.isFinite(value)) return "---";
  return value.toFixed(digits);
}

function formatInteger(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return "---";
  return Math.trunc(value).toLocaleString("ko-KR");
}

function formatMobileDateTime(date: Date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}
