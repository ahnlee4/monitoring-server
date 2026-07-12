import { useState } from "react";
import {
  ControlStatusDelayedError,
  ControlStatusUnsupportedError,
  enqueueMapWriteBatch,
  waitForControlCommand,
} from "../services/api";
import type { MapWrite } from "../services/api";
import type { YujinMapValue } from "../types";

const LIVE_VALUE_MAX_AGE_MS = 30_000;
const INVALID_DISPLAY_RAW_VALUE = 32767;

type EquipmentCompressor = {
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
  isOilfree?: boolean;
  totalHours: number;
};

type DetailTab = "setting" | "status" | "error" | "power";
type DetailItem = { label: string; value: string; alarm?: boolean };

const TABS: Array<{ key: DetailTab; label: string }> = [
  { key: "setting", label: "SETTING" },
  { key: "status", label: "STATUS" },
  { key: "error", label: "ERROR" },
  { key: "power", label: "POWER" },
];

export function EquipmentDetailDialog({
  compressor,
  integratedRun,
  mapValues,
  onClose,
}: {
  compressor: EquipmentCompressor;
  integratedRun: boolean;
  mapValues: Record<string, YujinMapValue>;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("setting");
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandStatus, setCommandStatus] = useState("");
  const repairMask = Math.trunc(liveMapNumber(mapValues, "0058", 0));
  const repairActive = Boolean(repairMask & (1 << (compressor.id - 1)));
  const statusItems = buildStatusItems(compressor, mapValues);
  const errorItems = buildErrorItems(compressor, mapValues);
  const visibleItems = activeTab === "setting" ? buildSettingItems(compressor) : activeTab === "status" ? statusItems : [];

  const sendWrites = async (label: string, source: string, writes: MapWrite[]) => {
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
    } catch (error) {
      if (error instanceof ControlStatusUnsupportedError && commandId !== null) {
        setCommandStatus(`${label} #${commandId} 등록됨 / backend 갱신 필요`);
      } else if (error instanceof ControlStatusDelayedError) {
        setCommandStatus(`${label} #${error.commandId} 등록됨 / 완료 확인 지연`);
      } else {
        setCommandStatus(`${label} 실패: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setCommandBusy(false);
    }
  };

  const sendOperate = (nextRunning: boolean) => {
    if (integratedRun) {
      setCommandStatus("통합 운전중에는 개별 운전/정지를 변경할 수 없습니다");
      return;
    }
    if (repairActive && nextRunning) {
      setCommandStatus("정비 장비는 개별 운전할 수 없습니다");
      return;
    }
    if (compressor.fault && nextRunning) {
      setCommandStatus("고장 상태에서는 운전 명령을 보낼 수 없습니다");
      return;
    }

    const address = getCpStatusAddress(compressor);
    void sendWrites(nextRunning ? "개별 운전" : "개별 정지", "equipment_detail_operate", [
      {
        key: address.toString(16).padStart(4, "0").toUpperCase(),
        address,
        length: 2,
        value: nextRunning ? 0x0002 : 0x0001,
      },
    ]);
  };

  const toggleRepair = () => {
    if (!repairActive && compressor.running) {
      void sendWrites("정비 설정", "equipment_detail_repair", [
        buildCpStatusWrite(compressor, 0x0001),
        buildRepairMaskWrite(repairMask | (1 << (compressor.id - 1))),
      ]);
      return;
    }

    const nextMask = repairActive ? repairMask & ~(1 << (compressor.id - 1)) : repairMask | (1 << (compressor.id - 1));
    void sendWrites(repairActive ? "정비 해제" : "정비 설정", "equipment_detail_repair", [buildRepairMaskWrite(nextMask)]);
  };

  return (
    <div className="absolute inset-0 z-[55] flex items-center justify-center bg-black/60 p-[16px] max-sm:p-[8px]">
      <section className="grid h-[760px] w-[576px] grid-rows-[56px_1fr_auto_48px] overflow-hidden rounded-[12px] border border-[#d3e0eb] bg-[#f6f9fc] shadow-[0_14px_34px_rgba(15,43,72,0.32)] max-sm:h-[calc(100dvh-16px)] max-sm:w-full max-sm:grid-rows-[auto_minmax(0,1fr)_auto] max-sm:rounded-[10px]">
        <header className="grid grid-cols-[1fr_48px] border-b border-[#dbe7f1] bg-white px-[8px] py-[7px] max-sm:grid-cols-[1fr_42px] max-sm:gap-[7px] max-sm:px-[9px] max-sm:py-[9px]">
          <div className="grid grid-cols-4 rounded-[8px] border border-[#d3e7f8] bg-[#edf6fe] p-[4px] max-sm:rounded-[7px] max-sm:p-[3px]">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`min-h-[38px] rounded-[6px] text-[16px] font-black transition-colors max-sm:min-h-[34px] max-sm:text-[12px] ${
                  activeTab === tab.key ? "bg-[#237bd0] text-white shadow-[0_4px_10px_rgba(35,123,208,0.28)]" : "text-[#3e6488]"
                }`}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            aria-label="닫기"
            className="ml-[8px] flex items-center justify-center rounded-[8px] border border-[#cfdde8] bg-[#f3f7fa] text-[28px] font-black leading-none text-[#45657f] transition-colors hover:bg-[#e8f0f6] max-sm:ml-0 max-sm:rounded-[7px] max-sm:text-[25px]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 overflow-hidden p-[12px] max-sm:p-[9px]">
          {activeTab === "error" ? <ErrorTab items={errorItems} compressorName={compressor.name} /> : null}
          {activeTab === "power" ? <PowerTab /> : null}
          {activeTab === "setting" || activeTab === "status" ? <MetricGrid items={visibleItems} /> : null}
        </div>

        <div className="border-t border-[#dbe7f1] bg-white px-[12px] py-[10px] max-sm:px-[9px] max-sm:py-[8px]">
          {activeTab === "setting" ? (
            <OperatePanel
              commandBusy={commandBusy}
              commandStatus={commandStatus}
              connected={compressor.connected}
              onOperate={sendOperate}
              onToggleRepair={toggleRepair}
              repairActive={repairActive}
            />
          ) : (
            <div className="flex h-[28px] items-center justify-center text-[13px] font-black text-[#6f879d]">{commandStatus}</div>
          )}
        </div>

        <button className="m-[8px] mt-0 rounded-[8px] bg-[#237bd0] text-[20px] font-black text-white shadow-[0_5px_12px_rgba(35,123,208,0.2)] disabled:opacity-45 max-sm:hidden" onClick={onClose} type="button">
          닫기
        </button>
      </section>
    </div>
  );
}

function buildSettingItems(compressor: EquipmentCompressor): DetailItem[] {
  return compressor.inverter
    ? [
        { label: "장비명", value: `${compressor.name} (${compressor.model})` },
        { label: "형식", value: compressor.isOilfree ? "OILFREE" : "INJECTION" },
        { label: "운전 위치", value: compressor.local ? "LOCAL" : "REMOTE" },
        { label: "운전 상태", value: compressor.running ? "운전" : "정지" },
        { label: "제어 압력", value: formatScaledValue(compressor.controlPressure, "bar") },
        { label: "회전수", value: formatIntegerValue(compressor.rpm, "rpm") },
        { label: "현재 압력", value: formatScaledValue(compressor.pressure, "bar") },
        { label: "현재 온도", value: formatScaledValue(compressor.temperature, "℃") },
        { label: "총 운전 시간", value: formatIntegerValue(compressor.totalHours, "hr") },
      ]
    : [
        { label: "장비명", value: `${compressor.name} (${compressor.model})` },
        { label: "형식", value: compressor.isOilfree ? "OILFREE" : "INJECTION" },
        { label: "운전 위치", value: compressor.local ? "LOCAL" : "REMOTE" },
        { label: "운전 상태", value: compressor.running ? "운전" : "정지" },
        { label: "무부하 압력", value: formatScaledValue(compressor.noLoadPressure, "bar") },
        { label: "부하 압력", value: formatScaledValue(compressor.loadPressure, "bar") },
        { label: "현재 압력", value: formatScaledValue(compressor.pressure, "bar") },
        { label: "현재 온도", value: formatScaledValue(compressor.temperature, "℃") },
        { label: "총 운전 시간", value: formatIntegerValue(compressor.totalHours, "hr") },
      ];
}

function ErrorTab({ compressorName, items }: { compressorName: string; items: DetailItem[] }) {
  if (items.length === 0) {
    return <EmptyTab title={`${compressorName} 고장/알림 없음`} description="현재 수신된 알림 또는 고장 비트가 없습니다" />;
  }

  return <MetricGrid items={items} />;
}

function PowerTab() {
  return <EmptyTab title="전력 로그 없음" description="현재 backend에 장비별 POWER 이력 API가 연결되어 있지 않습니다" />;
}

function MetricGrid({ items }: { items: DetailItem[] }) {
  return (
    <div className="grid h-full auto-rows-[82px] grid-cols-2 gap-[9px] overflow-y-auto rounded-[10px] border border-[#d9e6f0] bg-white p-[12px] pr-[8px] max-sm:auto-rows-[68px] max-sm:grid-cols-1 max-sm:gap-[7px] max-sm:rounded-[8px] max-sm:p-[8px] max-sm:pr-[6px]">
      {items.map((item) => (
        <MetricCard key={item.label} item={item} />
      ))}
    </div>
  );
}

function MetricCard({ item }: { item: DetailItem }) {
  const valueParts = splitValueUnit(item.value);

  return (
    <div className={`grid min-h-0 grid-rows-[24px_1fr] rounded-[8px] border bg-[#f8fbfd] p-[10px] max-sm:grid-rows-[20px_1fr] max-sm:p-[8px] ${item.alarm ? "border-[#f1b2b2]" : "border-[#d9e6f0]"}`}>
      <div className={`flex items-center text-[14px] font-black leading-none max-sm:text-[12px] ${item.alarm ? "text-[#d92525]" : "text-[#6f879d]"}`}>
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{item.label}</span>
      </div>
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_48px] items-end max-sm:grid-cols-[minmax(0,1fr)_36px]">
        <div className={`flex min-w-0 items-end justify-end text-right text-[24px] font-black leading-none max-sm:text-[21px] ${item.alarm ? "text-[#d92525]" : "text-[#173f69]"}`}>
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{valueParts.value}</span>
        </div>
        <div className={`flex items-end justify-start pb-[1px] pl-[5px] text-[13px] font-black leading-none max-sm:pl-[4px] max-sm:text-[11px] ${item.alarm ? "text-[#d92525]" : "text-[#6f879d]"}`}>
          {valueParts.unit}
        </div>
      </div>
    </div>
  );
}

function OperatePanel({
  commandBusy,
  commandStatus,
  connected,
  onOperate,
  onToggleRepair,
  repairActive,
}: {
  commandBusy: boolean;
  commandStatus: string;
  connected: boolean;
  onOperate: (nextRunning: boolean) => void;
  onToggleRepair: () => void;
  repairActive: boolean;
}) {
  return (
    <div className="grid gap-[8px] max-sm:gap-[6px]">
      <div className="grid h-[58px] grid-cols-3 gap-[9px] max-sm:h-[48px] max-sm:gap-[6px]">
        <button
          className="rounded-[8px] border border-[#237bd0] bg-[#eef7ff] text-[20px] font-black text-[#173f69] shadow-[0_5px_11px_rgba(35,123,208,0.12)] disabled:opacity-45 max-sm:rounded-[7px] max-sm:text-[14px]"
          disabled={commandBusy || !connected}
          onClick={onToggleRepair}
          type="button"
        >
          {repairActive ? "정비 해제" : "정비 설정"}
        </button>
        <button
          className="rounded-[8px] bg-[#d92525] text-[23px] font-black text-white shadow-[0_5px_11px_rgba(208,31,38,0.18)] disabled:opacity-45 max-sm:rounded-[7px] max-sm:text-[17px]"
          disabled={commandBusy || !connected}
          onClick={() => onOperate(true)}
          type="button"
        >
          운전
        </button>
        <button
          className="rounded-[8px] bg-[#667380] text-[23px] font-black text-white shadow-[0_5px_11px_rgba(70,82,94,0.14)] disabled:opacity-45 max-sm:rounded-[7px] max-sm:text-[17px]"
          disabled={commandBusy || !connected}
          onClick={() => onOperate(false)}
          type="button"
        >
          정지
        </button>
      </div>
      <div className="h-[20px] truncate rounded-[7px] bg-[#eef7ff] px-[10px] text-[12px] font-black leading-[20px] text-[#237bd0] max-sm:h-[24px] max-sm:leading-[24px]">{commandStatus}</div>
    </div>
  );
}

function splitValueUnit(text: string) {
  const value = text.trim();
  const units = new Set(["bar", "℃", "rpm", "hr", "min", "ea", "mbar"]);
  const parts = value.split(/\s+/);
  const unit = parts.at(-1) ?? "";

  if (parts.length > 1 && units.has(unit)) {
    return { value: parts.slice(0, -1).join(" "), unit };
  }

  return { value, unit: "" };
}

function EmptyTab({ description, title }: { description: string; title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[10px] border border-[#d9e6f0] bg-white px-[14px] text-center max-sm:rounded-[8px]">
      <div className="text-[28px] font-black text-[#173f69] max-sm:text-[20px]">{title}</div>
      <div className="mt-[10px] text-[15px] font-black text-[#6f879d] max-sm:text-[13px]">{description}</div>
    </div>
  );
}

function buildStatusItems(compressor: EquipmentCompressor, values: Record<string, YujinMapValue>): DetailItem[] {
  const prefix = getMapPrefix(compressor);
  const readWord = (offset: number) => liveMapNumber(values, `${prefix}${offset.toString(16).padStart(2, "0")}`, Number.NaN);
  const baseItems = [
    { label: "압력", value: formatScaledValue(compressor.pressure, "bar") },
    { label: "온도", value: formatScaledValue(compressor.temperature, "℃") },
    { label: "운전 상태", value: compressor.running ? "운전" : "정지" },
    { label: "운전 위치", value: compressor.local ? "LOCAL" : "REMOTE" },
    { label: "총 운전 시간", value: formatIntegerValue(compressor.totalHours, "hr") },
    { label: "모델", value: compressor.model || "---" },
  ];

  if (compressor.isOilfree) {
    return [
      ...baseItems,
      { label: "토출 압력", value: formatScaledValue(scale10(readWord(0x04)), "bar") },
      { label: "토출 온도", value: formatScaledValue(scale10(readWord(0x0c)), "℃") },
      { label: "알림 WORD", value: formatRawWord(readWord(0x28)), alarm: compressor.alarm },
    ];
  }

  return [
    ...baseItems,
    { label: compressor.inverter ? "제어 압력" : "무부하 압력", value: formatScaledValue(compressor.inverter ? compressor.controlPressure : compressor.noLoadPressure, "bar") },
    { label: compressor.inverter ? "회전수" : "부하 압력", value: compressor.inverter ? formatIntegerValue(compressor.rpm, "rpm") : formatScaledValue(compressor.loadPressure, "bar") },
    { label: "알림 WORD", value: formatRawWord(readWord(0x0a)), alarm: compressor.alarm },
  ];
}

function buildErrorItems(compressor: EquipmentCompressor, values: Record<string, YujinMapValue>): DetailItem[] {
  const prefix = getMapPrefix(compressor);
  const readWord = (offset: number) => liveMapNumber(values, `${prefix}${offset.toString(16).padStart(2, "0")}`, 0);
  const items: DetailItem[] = [];
  if (compressor.alarm) {
    items.push({ label: "알림", value: formatRawWord(readWord(compressor.isOilfree ? 0x28 : 0x0a)), alarm: true });
  }
  if (compressor.fault) {
    if (compressor.isOilfree) {
      items.push({ label: "고장 LOW", value: formatRawWord(readWord(0x2a)), alarm: true });
      items.push({ label: "고장 HIGH", value: formatRawWord(readWord(0x2c)), alarm: true });
      items.push({ label: "인버터 고장", value: formatRawWord(readWord(0x2e)), alarm: true });
    } else {
      items.push({ label: "고장", value: formatRawWord(readWord(0x0c)), alarm: true });
      items.push({ label: "인버터 고장", value: formatRawWord(readWord(0x0e)), alarm: true });
    }
  }
  return items;
}

function getMapPrefix(compressor: EquipmentCompressor) {
  return `${compressor.isOilfree ? "2" : "1"}${compressor.id.toString(16).toUpperCase()}`;
}

function getCpStatusAddress(compressor: EquipmentCompressor) {
  const highAddr = 0x10 + compressor.id;
  const lowAddr = compressor.isOilfree ? 0x44 : 0x1a;
  return (highAddr << 8) | lowAddr;
}

function buildCpStatusWrite(compressor: EquipmentCompressor, value: number): MapWrite {
  const address = getCpStatusAddress(compressor);
  return {
    key: address.toString(16).padStart(4, "0").toUpperCase(),
    address,
    length: 2,
    value,
  };
}

function buildRepairMaskWrite(value: number): MapWrite {
  return {
    key: "0058",
    address: 0x58,
    length: 2,
    value,
  };
}

function liveMapNumber(values: Record<string, YujinMapValue>, key: string, fallback = 0) {
  const item = values[key.toUpperCase()];
  if (!isLiveMapValue(item)) return fallback;
  const raw = item.value;
  if (raw === undefined || raw === null || raw === "") return fallback;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function isLiveMapValue(value: YujinMapValue | undefined, maxAgeMs = LIVE_VALUE_MAX_AGE_MS) {
  if (!value?.updated_at || value.source === "seed") return false;
  return Date.now() - new Date(value.updated_at).getTime() <= maxAgeMs;
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

function formatRawWord(value: number) {
  if (!Number.isFinite(value)) return "---";
  return `0x${(Math.trunc(value) & 0xffff).toString(16).padStart(4, "0").toUpperCase()}`;
}
