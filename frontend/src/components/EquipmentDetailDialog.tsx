import { useState } from "react";
import {
  ControlStatusDelayedError,
  ControlStatusUnsupportedError,
  enqueueMapWriteBatch,
  waitForControlCommand,
} from "../services/api";
import type { MapWrite } from "../services/api";
import type { YujinMapValue } from "../types";
import { EquipmentDetailSummary } from "./EquipmentDetailSummary";
import { EquipmentLogTable } from "./EquipmentLogTable";
import {
  EquipmentEmptyState,
  EquipmentMetricGrid,
} from "./EquipmentMetricGrid";
import type { EquipmentDetailItem } from "./EquipmentMetricGrid";
import { EquipmentSettingsTab } from "./EquipmentSettingsTab";
import { buildEquipmentStatusItems } from "./equipmentStatusData";

const LIVE_VALUE_MAX_AGE_MS = 30_000;

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

type DetailTab = "setting" | "status" | "error" | "log";

const TABS: Array<{ caption: string; key: DetailTab; label: string }> = [
  { key: "setting", label: "SETTING", caption: "장비 설정" },
  { key: "status", label: "STATUS", caption: "상세 상태" },
  { key: "error", label: "ERROR", caption: "알림·고장" },
  { key: "log", label: "LOG TABLE", caption: "운전 기록" },
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
  const statusItems = buildEquipmentStatusItems(compressor, mapValues);
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
    <div className="absolute inset-0 z-[55] flex items-center justify-center bg-[#07182a]/75 p-[12px] backdrop-blur-[2px]">
      <section className="grid h-[720px] max-h-[calc(100dvh-24px)] w-[1050px] max-w-[calc(100vw-24px)] grid-rows-[68px_minmax(0,1fr)] overflow-hidden rounded-[15px] border border-[#b8cbd9] bg-[#edf3f7] shadow-[0_22px_70px_rgba(4,22,39,0.45)] max-sm:h-[calc(100dvh-12px)] max-sm:max-h-none max-sm:max-w-[calc(100vw-12px)] max-sm:grid-rows-[64px_minmax(0,1fr)] max-sm:rounded-[10px]">
        <header className="flex items-center justify-between border-b border-[#c9d8e3] bg-white px-[16px] max-sm:px-[10px]">
          <div className="flex min-w-0 items-center gap-[12px]">
            <div className="flex h-[42px] min-w-[58px] items-center justify-center rounded-[9px] bg-[#176eb2] px-[10px] text-[18px] font-black text-white shadow-[0_4px_10px_rgba(23,110,178,0.22)]">
              #{String(compressor.id).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[20px] font-black leading-none text-[#173f69] max-sm:text-[16px]">
                {compressor.name}
              </div>
              <div className="mt-[6px] flex items-center gap-[7px] text-[10px] font-black text-[#7890a4]">
                <span>{compressor.model === "-" ? "모델 정보 없음" : compressor.model}</span>
                <span className="h-[3px] w-[3px] rounded-full bg-[#9eb1c1]" />
                <span>{compressor.isOilfree ? "OILFREE" : "INJECTION"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-[8px]">
            <span className={`rounded-full px-[9px] py-[5px] text-[10px] font-black ${compressor.connected ? "bg-[#e2f6ee] text-[#147354]" : "bg-[#fbe7e9] text-[#b72e3a]"}`}>
              {compressor.connected ? "통신 정상" : "통신 끊김"}
            </span>
            <span className={`rounded-full px-[9px] py-[5px] text-[10px] font-black ${compressor.running ? "bg-[#e1f0ff] text-[#1769aa]" : "bg-[#edf1f4] text-[#677b8c]"}`}>
              {compressor.running ? "운전 중" : "정지"}
            </span>
            <button
              aria-label="상세 화면 닫기"
              className="ml-[4px] flex h-[40px] w-[40px] items-center justify-center rounded-[9px] border border-[#d1dde6] bg-[#f4f7f9] text-[25px] font-black leading-none text-[#49667e] transition-colors hover:border-[#afc5d5] hover:bg-[#e7eef3]"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
        </header>

        <div className="grid min-h-0 grid-cols-[252px_minmax(0,1fr)] max-sm:grid-cols-1">
          <EquipmentDetailSummary
            alarm={compressor.alarm}
            commandBusy={commandBusy}
            commandStatus={commandStatus}
            connected={compressor.connected}
            fault={compressor.fault}
            inverter={compressor.inverter}
            isOilfree={compressor.isOilfree}
            local={compressor.local}
            onOperate={sendOperate}
            onToggleRepair={toggleRepair}
            pressure={compressor.pressure}
            repairActive={repairActive}
            rpm={compressor.rpm}
            running={compressor.running}
            temperature={compressor.temperature}
            totalHours={compressor.totalHours}
          />

          <main className="grid min-h-0 grid-rows-[60px_minmax(0,1fr)] bg-[#edf3f7]">
            <nav className="border-b border-[#cad9e4] bg-[#e3ebf1] px-[10px] pt-[8px]">
              <div className="grid h-full grid-cols-4 gap-[5px]">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`grid content-center rounded-t-[9px] border border-b-0 px-[8px] text-left transition-colors ${
                      activeTab === tab.key
                        ? "border-[#bdcfdd] bg-white text-[#176eb2] shadow-[0_-2px_8px_rgba(26,73,108,0.06)]"
                        : "border-transparent bg-transparent text-[#5f788d] hover:bg-white/50"
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    <span className="text-[13px] font-black leading-none max-sm:text-[10px]">{tab.label}</span>
                    <span className={`mt-[4px] text-[9px] font-bold ${activeTab === tab.key ? "text-[#5f8faf]" : "text-[#8a9eae]"}`}>
                      {tab.caption}
                    </span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="min-h-0 overflow-hidden p-[10px]">
              {activeTab === "error" ? <ErrorTab items={errorItems} compressorName={compressor.name} /> : null}
              {activeTab === "log" ? <EquipmentLogTable equipmentNo={compressor.id} /> : null}
              {activeTab === "setting" ? (
                <EquipmentSettingsTab
                  commandBusy={commandBusy}
                  compressor={compressor}
                  integratedRun={integratedRun}
                  mapValues={mapValues}
                  onSend={sendWrites}
                  onStatus={setCommandStatus}
                />
              ) : null}
              {activeTab === "status" ? <EquipmentMetricGrid items={statusItems} /> : null}
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}

function ErrorTab({
  compressorName,
  items,
}: {
  compressorName: string;
  items: EquipmentDetailItem[];
}) {
  if (items.length === 0) {
    return (
      <EquipmentEmptyState
        title={`${compressorName} 고장/알림 없음`}
        description="현재 수신된 알림 또는 고장 비트가 없습니다"
      />
    );
  }

  return <EquipmentMetricGrid items={items} />;
}

function buildErrorItems(
  compressor: EquipmentCompressor,
  values: Record<string, YujinMapValue>,
): EquipmentDetailItem[] {
  const prefix = getMapPrefix(compressor);
  const readWord = (offset: number) => liveMapNumber(values, `${prefix}${offset.toString(16).padStart(2, "0")}`, 0);
  const items: EquipmentDetailItem[] = [];
  const injectionAlarms = ["에어필터 사용시간 초과", "오일필터 사용시간 초과", "세퍼레이터 사용시간 초과", "오일 사용시간 초과", "오일온도 과온", "구리스 사용시간 초과"];
  const injectionFaults = ["메인모터 과부하 정지", "팬모터 과부하 정지", "오일온도 과온 정지", "온도센서 연결 이상", "압력센서 연결 이상", "압력 과압축 정지", "워터플로어 스위치 이상", "운전확인신호 이상"];
  const oilfreeAlarms = ["에어필터 사용시간 초과", "오일필터 사용시간 초과", "구리스 사용시간 초과", "오일 사용시간 초과", "에어클리너 차압 LOW", "1단 토출온도", "2단 토출온도", "오일온도 과온", "", "에어클리너 차압센서 연결이상", "오일온도 저온", "팬모터 과부하", "오일압력", "2단 흡입온도 과온"];
  const oilfreeFaultLow = ["서비스 압력센서 이상", "펌프 모터 운전신호 이상", "2단 흡입 압력센서 이상", "오일 압력센서 이상", "서비스 온도센서 이상", "1단 토출온도센서 이상", "2단 흡입온도센서 이상", "2단 토출온도센서 이상", "오일 온도센서 이상", "메인모터 과부하", "팬모터 과부하", "펌프모터 과부하", "서비스 압력 과압축", "2단 흡입압력 과압축", "1단 토출온도 과온", "2단 토출온도 과온"];
  const oilfreeFaultHigh = ["오일온도 과온", "오일압력 이상", "냉각수 흐름 이상", "인버터 통신에러", "비상정지 스위치 ON", "2단 흡입온도 과온"];
  const inverterFaults = ["OC", "OV", "OL2", "OH1", "rr", "PUF", "FBL", "EF", "CPF", "OL1", "PG0", "UV", "UV1", "LF", "CE", "OPR"].map((value) => `인버터 ${value} 에러`);
  if (compressor.isOilfree) {
    appendActiveBits(items, readWord(0x28), oilfreeAlarms, "알림");
    appendActiveBits(items, readWord(0x2a), oilfreeFaultLow, "고장");
    appendActiveBits(items, readWord(0x2c), oilfreeFaultHigh, "고장");
    appendActiveBits(items, readWord(0x2e), inverterFaults, "고장");
  } else {
    appendActiveBits(items, readWord(0x0a), injectionAlarms, "알림");
    appendActiveBits(items, readWord(0x0c), injectionFaults, "고장");
    appendActiveBits(items, readWord(0x0e), inverterFaults, "고장");
  }
  return items;
}

function appendActiveBits(
  items: EquipmentDetailItem[],
  word: number,
  labels: string[],
  kind: string,
) {
  labels.forEach((label, bit) => {
    if (label && (Math.trunc(word) & (1 << bit))) items.push({ label: kind, value: label, alarm: true });
  });
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
