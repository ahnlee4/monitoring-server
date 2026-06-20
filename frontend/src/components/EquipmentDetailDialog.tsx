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
    <div className="absolute inset-0 z-[55] flex items-center justify-center bg-black/55 p-[22px]">
      <section className="grid h-[742px] w-[620px] grid-rows-[58px_1fr_116px] overflow-hidden rounded-[10px] border border-[#c7dceb] bg-[#f6f9fc] shadow-[0_18px_40px_rgba(14,39,65,0.38)]">
        <header className="grid grid-cols-[1fr_50px] border-b border-[#d9e6f0] bg-white">
          <div className="grid grid-cols-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`text-[17px] font-black ${
                  activeTab === tab.key ? "bg-[#237bd0] text-white" : "bg-white text-[#237bd0]"
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
            className="flex items-center justify-center border-l border-[#d9e6f0] text-[30px] font-black text-[#45657f]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 overflow-hidden p-[12px]">
          <EquipmentSummary compressor={compressor} repairActive={repairActive} />
          <div className="mt-[12px] h-[538px] overflow-y-auto rounded-[8px] border border-[#d9e6f0] bg-white">
            {activeTab === "setting" ? <SettingTab compressor={compressor} /> : null}
            {activeTab === "status" ? <StatusTab items={statusItems} /> : null}
            {activeTab === "error" ? <ErrorTab items={errorItems} /> : null}
            {activeTab === "power" ? <PowerTab /> : null}
          </div>
        </div>

        <footer className="grid grid-rows-[1fr_32px] border-t border-[#d9e6f0] bg-white px-[14px] py-[10px]">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-[10px]">
            <button
              className="rounded-[8px] bg-[#d92525] text-[26px] font-black text-white disabled:opacity-45"
              disabled={commandBusy || !compressor.connected}
              onClick={() => sendOperate(true)}
              type="button"
            >
              운전
            </button>
            <button
              className="rounded-[8px] bg-[#667380] text-[26px] font-black text-white disabled:opacity-45"
              disabled={commandBusy || !compressor.connected}
              onClick={() => sendOperate(false)}
              type="button"
            >
              정지
            </button>
            <button
              className="rounded-[8px] border border-[#237bd0] bg-[#eef7ff] text-[22px] font-black text-[#173f69] disabled:opacity-45"
              disabled={commandBusy || !compressor.connected}
              onClick={toggleRepair}
              type="button"
            >
              {repairActive ? "정비 해제" : "정비 설정"}
            </button>
          </div>
          <div className="flex items-end justify-between text-[13px] font-black">
            <span className="truncate text-[#237bd0]">{commandStatus}</span>
            <span className="text-[#6f879d]">원본 EquipActivity 기준 개별 장비 상세</span>
          </div>
        </footer>
      </section>
    </div>
  );
}

function EquipmentSummary({ compressor, repairActive }: { compressor: EquipmentCompressor; repairActive: boolean }) {
  const stateText = !compressor.connected ? "FAIL" : compressor.fault ? "FAULT" : compressor.running ? "RUN" : "RDY";
  const stateClass = compressor.fault ? "bg-[#ff4f4f]" : compressor.running ? "bg-[#d92525]" : "bg-[#8ec3f5]";

  return (
    <div className="grid h-[84px] grid-cols-[112px_1fr_116px] gap-[8px]">
      <div className={`flex items-center justify-center rounded-[8px] text-[26px] font-black text-white ${stateClass}`}>{stateText}</div>
      <div className="rounded-[8px] border border-[#d9e6f0] bg-white px-[14px] py-[10px]">
        <div className="text-[27px] font-black leading-none text-[#173f69]">
          {compressor.name} ({compressor.model})
        </div>
        <div className="mt-[9px] flex gap-[8px] text-[13px] font-black text-[#6f879d]">
          <span>{compressor.isOilfree ? "OILFREE" : "INJECTION"}</span>
          <span>{compressor.inverter ? "INVERTER" : "STANDARD"}</span>
          <span>{compressor.local ? "LOCAL" : "REMOTE"}</span>
          {repairActive ? <span className="text-[#d92525]">정비 중</span> : null}
        </div>
      </div>
      <div className="rounded-[8px] border border-[#d9e6f0] bg-[#eef7ff] px-[10px] py-[9px] text-right">
        <div className="text-[13px] font-black text-[#6f879d]">압력</div>
        <div className="mt-[6px] text-[28px] font-black leading-none text-[#173f69]">{formatScaledValue(compressor.pressure, "bar")}</div>
      </div>
    </div>
  );
}

function SettingTab({ compressor }: { compressor: EquipmentCompressor }) {
  const items = compressor.inverter
    ? [
        { label: "제어 압력", value: formatScaledValue(compressor.controlPressure, "bar") },
        { label: "회전수", value: formatIntegerValue(compressor.rpm, "rpm") },
        { label: "총 운전 시간", value: formatIntegerValue(compressor.totalHours, "hr") },
      ]
    : [
        { label: "무부하 압력", value: formatScaledValue(compressor.noLoadPressure, "bar") },
        { label: "부하 압력", value: formatScaledValue(compressor.loadPressure, "bar") },
        { label: "총 운전 시간", value: formatIntegerValue(compressor.totalHours, "hr") },
      ];

  return <KeyValueGrid items={items} />;
}

function StatusTab({ items }: { items: Array<{ label: string; value: string; alarm?: boolean }> }) {
  return <KeyValueGrid items={items} />;
}

function ErrorTab({ items }: { items: Array<{ label: string; value: string; alarm?: boolean }> }) {
  if (items.length === 0) {
    return <EmptyTab title="고장/알림 없음" description="현재 수신된 알림 또는 고장 비트가 없습니다" />;
  }

  return <KeyValueGrid items={items} />;
}

function PowerTab() {
  return <EmptyTab title="전력 로그 없음" description="현재 backend에 장비별 POWER 이력 API가 연결되어 있지 않습니다" />;
}

function KeyValueGrid({ items }: { items: Array<{ label: string; value: string; alarm?: boolean }> }) {
  return (
    <div className="grid grid-cols-2 gap-[8px] p-[10px]">
      {items.map((item) => (
        <div key={item.label} className="grid min-h-[54px] grid-cols-[1fr_1.1fr] overflow-hidden rounded-[6px] border border-[#c9e1f5]">
          <div className={`flex items-center justify-center px-[8px] text-center text-[15px] font-black ${item.alarm ? "bg-[#ff4f4f] text-white" : "bg-[#8ec3f5] text-white"}`}>
            {item.label}
          </div>
          <div className={`flex items-center justify-end px-[10px] text-right text-[20px] font-black ${item.alarm ? "text-[#d92525]" : "text-[#173f69]"}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyTab({ description, title }: { description: string; title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-[28px] font-black text-[#173f69]">{title}</div>
      <div className="mt-[10px] text-[15px] font-black text-[#6f879d]">{description}</div>
    </div>
  );
}

function buildStatusItems(compressor: EquipmentCompressor, values: Record<string, YujinMapValue>) {
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

function buildErrorItems(compressor: EquipmentCompressor, values: Record<string, YujinMapValue>) {
  const prefix = getMapPrefix(compressor);
  const readWord = (offset: number) => liveMapNumber(values, `${prefix}${offset.toString(16).padStart(2, "0")}`, 0);
  const items = [];
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
  const highAddr = compressor.id + 1;
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
