import { useEffect, useState } from "react";
import { fetchEquipmentLogs } from "../services/api";
import type { EquipmentLogSnapshot } from "../services/api";

const REFRESH_INTERVAL_MS = 2_000;

export function EquipmentLogTable({ equipmentNo }: { equipmentNo: number }) {
  const [rows, setRows] = useState<EquipmentLogSnapshot[]>([]);
  const [status, setStatus] = useState("로그 데이터를 불러오는 중...");

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const refresh = async () => {
      try {
        const nextRows = await fetchEquipmentLogs(equipmentNo);
        if (!active) return;
        setRows(nextRows);
        setStatus(nextRows.length ? "" : "저장된 장비 로그가 없습니다.");
      } catch (error) {
        if (!active) return;
        setStatus(`로그 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        if (active) timer = window.setTimeout(refresh, REFRESH_INTERVAL_MS);
      }
    };

    void refresh();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [equipmentNo]);

  return (
    <div className="h-full min-h-0 overflow-auto rounded-[10px] border border-[#b9d9f3] bg-white">
      <div className="grid min-h-full grid-rows-[auto_1fr] max-sm:min-w-[650px]">
        <div className="sticky top-0 z-[1] grid grid-cols-[112px_repeat(6,minmax(62px,1fr))] border-b border-[#75b4ee] bg-[#3374ce] text-center text-[12px] font-black text-white">
          {["시간", "압력", "온도", "운전상태", "RPM", "알람", "고장"].map((label) => (
            <div className="border-r border-white/25 px-[5px] py-[10px] last:border-r-0" key={label}>{label}</div>
          ))}
        </div>
        {rows.length ? (
          <div>
            {rows.map((row, index) => (
              <div
                className={`grid grid-cols-[112px_repeat(6,minmax(62px,1fr))] border-b border-[#d9e6f0] text-center text-[12px] font-bold text-[#173f69] ${index % 2 ? "bg-[#f4f9fd]" : "bg-white"}`}
                key={`${row.recorded_at}-${index}`}
              >
                <LogCell>{formatTime(row.recorded_at)}</LogCell>
                <LogCell>{formatDecimal(row.pressure, 1)}</LogCell>
                <LogCell>{formatDecimal(row.temperature, 1)}</LogCell>
                <LogCell>{formatInteger(row.operation_status)}</LogCell>
                <LogCell>{formatInteger(row.rpm)}</LogCell>
                <LogCell alarm={Boolean(row.alarm_word)}>{formatInteger(row.alarm_word)}</LogCell>
                <LogCell alarm={Boolean(row.error_word)}>{formatInteger(row.error_word)}</LogCell>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-[180px] items-center justify-center px-[16px] text-center text-[14px] font-black text-[#6f879d]">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

function LogCell({ alarm = false, children }: { alarm?: boolean; children: string }) {
  return (
    <div className={`truncate border-r border-[#d9e6f0] px-[5px] py-[9px] last:border-r-0 ${alarm ? "bg-[#fff0f0] text-[#d92525]" : ""}`}>
      {children}
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "---"
    : new Intl.DateTimeFormat("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(date);
}

function formatDecimal(value: number | null, digits: number) {
  return value === null || !Number.isFinite(value) ? "---" : value.toFixed(digits);
}

function formatInteger(value: number | null) {
  return value === null || !Number.isFinite(value)
    ? "---"
    : Math.trunc(value).toLocaleString("ko-KR");
}
