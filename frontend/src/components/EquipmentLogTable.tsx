import { useEffect, useState } from "react";
import { fetchEquipmentLogs } from "../services/api";
import type { EquipmentLogSnapshot } from "../services/api";

const REFRESH_INTERVAL_MS = 2_000;

export function EquipmentLogTable({ equipmentNo }: { equipmentNo: number }) {
  const [rows, setRows] = useState<EquipmentLogSnapshot[]>([]);
  const [status, setStatus] = useState("로그 데이터를 불러오는 중...");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const refresh = async () => {
      try {
        const nextRows = await fetchEquipmentLogs(equipmentNo);
        if (!active) return;
        setRows(nextRows);
        setStatus(nextRows.length ? "" : "저장된 장비 로그가 없습니다.");
        setUpdatedAt(new Date());
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
    <div className="grid h-full min-h-0 grid-rows-[46px_minmax(0,1fr)] overflow-hidden rounded-[12px] border border-[#cbdce8] bg-white">
      <header className="flex items-center justify-between border-b border-[#d5e2eb] bg-[#f7fafc] px-[12px]">
        <div className="flex items-center gap-[9px]">
          <div>
            <div className="text-[12px] font-black leading-none text-[#274e70]">장비 운전 기록</div>
            <div className="mt-[4px] text-[9px] font-bold leading-none text-[#869aa9]">최신 데이터부터 최대 300건 표시</div>
          </div>
          <span className="rounded-full bg-[#e4f1fb] px-[8px] py-[4px] text-[9px] font-black text-[#256b9f]">
            {rows.length}건
          </span>
        </div>
        <div className="flex items-center gap-[7px] text-[9px] font-black text-[#71889a]">
          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#cde1d8] bg-[#eef9f4] px-[7px] py-[4px] text-[#2f765c]">
            <span className="h-[6px] w-[6px] rounded-full bg-[#35b77d]" />
            2초 자동 갱신
          </span>
          <span>{updatedAt ? `${formatClock(updatedAt)} 갱신` : "조회 중"}</span>
        </div>
      </header>

      <div className="min-h-0 overflow-auto">
        <div className="min-w-[700px]">
          <div className="sticky top-0 z-[1] grid grid-cols-[132px_82px_82px_96px_90px_90px_minmax(90px,1fr)] border-b border-[#b7ccdc] bg-[#1f5f91] text-center text-[10px] font-black tracking-[0.03em] text-white">
            {["시간", "압력(bar)", "온도(℃)", "운전상태", "RPM", "알람", "고장"].map((label) => (
              <div
                className="border-r border-white/15 px-[6px] py-[10px] last:border-r-0"
                key={label}
              >
                {label}
              </div>
            ))}
          </div>

          {rows.length ? (
            <div>
              {rows.map((row, index) => (
                <div
                  className={`grid grid-cols-[132px_82px_82px_96px_90px_90px_minmax(90px,1fr)] border-b border-[#dce6ed] text-center text-[11px] font-bold text-[#244a69] ${index % 2 ? "bg-[#f5f8fa]" : "bg-white"}`}
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
            <div className="flex min-h-[420px] flex-col items-center justify-center px-[16px] text-center">
              <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-[#c6dcec] bg-[#edf6fc] text-[18px] font-black text-[#397ba8]">
                ≡
              </div>
              <div className="mt-[12px] text-[13px] font-black text-[#587286]">{status}</div>
              <div className="mt-[5px] text-[10px] font-bold text-[#8ca0af]">
                장비 통신이 시작되면 설정된 저장 주기로 기록됩니다
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LogCell({ alarm = false, children }: { alarm?: boolean; children: string }) {
  return (
    <div className={`truncate border-r border-[#dce6ed] px-[6px] py-[9px] last:border-r-0 ${alarm ? "bg-[#fff0f0] font-black text-[#cf2929]" : ""}`}>
      {children}
    </div>
  );
}

function formatClock(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
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
