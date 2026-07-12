import { useMemo, useState } from "react";
import { enqueueMapWriteBatch, waitForControlCommand } from "../services/api";
import type { MapWrite } from "../services/api";

type LowPressureCompressor = {
  connected: boolean;
  id: number;
  isOilfree: boolean;
  name: string;
  running: boolean;
};

export function LowPressureDialog({
  compressors,
  onClose,
  runUnits,
}: {
  compressors: LowPressureCompressor[];
  onClose: () => void;
  runUnits: number;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("해제 후 추가 가동된 예비기의 정지 여부를 선택하세요");
  const reserveUnits = useMemo(
    () => compressors.slice(Math.max(0, Math.trunc(runUnits))).filter((compressor) => compressor.connected && compressor.running),
    [compressors, runUnits],
  );

  const releaseAlarm = async (stopReserve: boolean) => {
    setBusy(true);
    setStatus(stopReserve ? "예비기 정지 및 저압경보 해제 명령 전송 중..." : "저압경보 해제 명령 전송 중...");
    const stopWrites: MapWrite[] = stopReserve
      ? reserveUnits.map((compressor) => {
          const address = ((0x10 + compressor.id) << 8) | (compressor.isOilfree ? 0x44 : 0x1a);
          return {
            key: address.toString(16).padStart(4, "0").toUpperCase(),
            address,
            length: 2,
            value: 1,
            delay_after_seconds: 1,
            continue_on_verification_failure: true,
          };
        })
      : [];
    try {
      const command = await enqueueMapWriteBatch("low_pressure_release", [
        ...stopWrites,
        { key: "0054", address: 0x0054, length: 2, value: 2 },
      ]);
      await waitForControlCommand(Number(command.id), (commandStatus) => {
        if (commandStatus.status === "in_progress") setStatus("장비에 명령 적용 중...");
      });
      onClose();
    } catch (error) {
      setStatus(`명령 실패: ${error instanceof Error ? error.message : String(error)}`);
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/45 p-[16px]">
      <section className="w-full max-w-[620px] rounded-[16px] border border-[#b9d5e9] bg-white p-[22px] shadow-2xl">
        <div className="flex items-start justify-between gap-[16px]">
          <div>
            <h2 className="text-[25px] font-black text-[#173f69]">저압 경보시 가동된 기기 정지 유무 설정</h2>
            <p className="mt-[8px] text-[14px] font-bold text-[#6f879d]">{status}</p>
          </div>
          <button aria-label="닫기" className="h-[42px] w-[42px] rounded-[8px] bg-[#eef3f7] text-[27px] font-black text-[#45657f]" disabled={busy} onClick={onClose} type="button">×</button>
        </div>
        <div className="mt-[18px] rounded-[10px] bg-[#fff3df] px-[14px] py-[11px] text-[14px] font-black text-[#965b00]">
          정지 대상: {reserveUnits.length ? reserveUnits.map((compressor) => compressor.name).join(", ") : "현재 운전 중인 예비기 없음"}
        </div>
        <div className="mt-[20px] grid grid-cols-2 gap-[12px] max-sm:grid-cols-1">
          <button className="min-h-[82px] rounded-[10px] border-2 border-[#237bd0] bg-white px-[12px] text-[19px] font-black text-[#237bd0] disabled:opacity-45" disabled={busy} onClick={() => void releaseAlarm(false)} type="button">
            장비는 계속 운전
          </button>
          <button className="min-h-[82px] rounded-[10px] bg-[#d92525] px-[12px] text-[19px] font-black text-white disabled:opacity-45" disabled={busy} onClick={() => void releaseAlarm(true)} type="button">
            예비기 정지 후 해제
          </button>
        </div>
      </section>
    </div>
  );
}
