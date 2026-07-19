type EquipmentDetailSummaryProps = {
  alarm: boolean;
  commandBusy: boolean;
  commandStatus: string;
  connected: boolean;
  fault: boolean;
  inverter: boolean;
  isOilfree?: boolean;
  local: boolean;
  onOperate: (nextRunning: boolean) => void;
  onToggleRepair: () => void;
  pressure: number;
  repairActive: boolean;
  rpm?: number;
  running: boolean;
  temperature: number;
  totalHours: number;
};

export function EquipmentDetailSummary({
  alarm,
  commandBusy,
  commandStatus,
  connected,
  fault,
  inverter,
  isOilfree,
  local,
  onOperate,
  onToggleRepair,
  pressure,
  repairActive,
  rpm,
  running,
  temperature,
  totalHours,
}: EquipmentDetailSummaryProps) {
  return (
    <aside className="grid min-h-0 grid-rows-[auto_auto_auto_1fr_auto] gap-[10px] border-r border-[#cbdbe7] bg-[#123b60] p-[14px] text-white max-sm:hidden">
      <section className="rounded-[12px] border border-white/15 bg-white/[0.08] p-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black tracking-[0.08em] text-[#a9c7dd]">SERVICE PRESSURE</span>
          <ConnectionBadge connected={connected} />
        </div>
        <div className="mt-[14px] flex items-end justify-end gap-[7px]">
          <strong className="text-[46px] font-black leading-[0.9] tracking-[-0.04em]">
            {formatDecimal(pressure, 2)}
          </strong>
          <span className="pb-[3px] text-[14px] font-black text-[#b8d3e5]">bar</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-[7px]">
        <SummaryValue label="온도" unit="℃" value={formatDecimal(temperature, 1)} />
        <SummaryValue
          label={inverter ? "회전수" : "운전시간"}
          unit={inverter ? "rpm" : "hr"}
          value={inverter ? formatInteger(rpm) : formatInteger(totalHours)}
        />
      </section>

      <section className="grid grid-cols-2 gap-[6px] rounded-[10px] border border-white/10 bg-[#0e304f] p-[8px]">
        <StateChip active={running} activeLabel="운전 중" idleLabel="정지" />
        <StateChip active={local} activeLabel="LOCAL" idleLabel="REMOTE" neutral />
        <StateChip active={inverter} activeLabel="INVERTER" idleLabel="STANDARD" neutral />
        <StateChip active={Boolean(isOilfree)} activeLabel="OILFREE" idleLabel="INJECTION" neutral />
      </section>

      <section className="min-h-0 rounded-[10px] border border-white/10 bg-[#0e304f] p-[10px]">
        <div className="text-[10px] font-black tracking-[0.08em] text-[#91b4ce]">EQUIPMENT STATE</div>
        <div className="mt-[8px] grid gap-[6px]">
          <StateRow active={alarm} label="알림" tone="warning" />
          <StateRow active={fault} label="고장" tone="danger" />
          <StateRow active={repairActive} label="정비 설정" tone="maintenance" />
        </div>
      </section>

      <section className="grid gap-[8px]">
        <div className="grid grid-cols-2 gap-[7px]">
          <button
            className="h-[44px] rounded-[9px] border border-[#70b9ed] bg-[#e8f5ff] text-[14px] font-black text-[#164f7a] shadow-[0_4px_10px_rgba(0,0,0,0.12)] disabled:opacity-40"
            disabled={commandBusy || !connected}
            onClick={onToggleRepair}
            type="button"
          >
            {repairActive ? "정비 해제" : "정비 설정"}
          </button>
          <button
            className="h-[44px] rounded-[9px] bg-[#d93636] text-[16px] font-black text-white shadow-[0_4px_10px_rgba(0,0,0,0.16)] disabled:opacity-40"
            disabled={commandBusy || !connected}
            onClick={() => onOperate(true)}
            type="button"
          >
            운전
          </button>
        </div>
        <button
          className="h-[44px] rounded-[9px] border border-white/20 bg-[#647586] text-[16px] font-black text-white shadow-[0_4px_10px_rgba(0,0,0,0.14)] disabled:opacity-40"
          disabled={commandBusy || !connected}
          onClick={() => onOperate(false)}
          type="button"
        >
          정지
        </button>
        <div className="min-h-[32px] rounded-[8px] border border-white/10 bg-[#092640] px-[9px] py-[7px] text-[10px] font-bold leading-[1.35] text-[#b9d3e6]">
          {commandStatus || "장비 제어 명령 대기"}
        </div>
      </section>
    </aside>
  );
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-flex items-center gap-[5px] rounded-full px-[7px] py-[4px] text-[9px] font-black ${connected ? "bg-[#1e765c] text-[#d8fff1]" : "bg-[#663d48] text-[#ffe1e7]"}`}>
      <span className={`h-[6px] w-[6px] rounded-full ${connected ? "bg-[#5ee3aa]" : "bg-[#ff788e]"}`} />
      {connected ? "CONNECTED" : "DISCONNECTED"}
    </span>
  );
}

function SummaryValue({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: string;
}) {
  return (
    <div className="rounded-[10px] border border-white/12 bg-white/[0.07] px-[10px] py-[9px]">
      <div className="text-[10px] font-black text-[#9bbbd2]">{label}</div>
      <div className="mt-[5px] flex items-baseline justify-end gap-[4px]">
        <strong className="max-w-[84px] truncate text-[19px] font-black">{value}</strong>
        <span className="text-[9px] font-black text-[#a9c7dd]">{unit}</span>
      </div>
    </div>
  );
}

function StateChip({
  active,
  activeLabel,
  idleLabel,
  neutral = false,
}: {
  active: boolean;
  activeLabel: string;
  idleLabel: string;
  neutral?: boolean;
}) {
  const label = active ? activeLabel : idleLabel;
  const tone = neutral
    ? "border-[#3c6381] bg-[#173e5f] text-[#c7dfef]"
    : active
      ? "border-[#4cc18e] bg-[#174f44] text-[#8ff1c8]"
      : "border-[#536b80] bg-[#263f56] text-[#c5d3de]";
  return (
    <span className={`rounded-[7px] border px-[6px] py-[6px] text-center text-[9px] font-black ${tone}`}>
      {label}
    </span>
  );
}

function StateRow({
  active,
  label,
  tone,
}: {
  active: boolean;
  label: string;
  tone: "danger" | "maintenance" | "warning";
}) {
  const toneClass = active
    ? {
        danger: "bg-[#71343b] text-[#ffd9de]",
        maintenance: "bg-[#655225] text-[#ffe9a7]",
        warning: "bg-[#6b4d25] text-[#ffe3b0]",
      }[tone]
    : "bg-white/[0.05] text-[#a8c0d1]";

  return (
    <div className={`flex items-center justify-between rounded-[7px] px-[8px] py-[6px] text-[10px] font-black ${toneClass}`}>
      <span>{label}</span>
      <span>{active ? "발생" : "정상"}</span>
    </div>
  );
}

function formatDecimal(value: number | undefined, digits: number) {
  return value === undefined || !Number.isFinite(value) ? "---" : value.toFixed(digits);
}

function formatInteger(value: number | undefined) {
  return value === undefined || !Number.isFinite(value)
    ? "---"
    : Math.trunc(value).toLocaleString("ko-KR");
}
