import { useState } from "react";
import {
  ControlStatusDelayedError,
  ControlStatusUnsupportedError,
  enqueueMapWriteBatch,
  waitForControlCommand,
} from "../services/api";

export type YonseiAuxiliaryDevice = {
  id: string;
  name: string;
  address: number;
  bit: 0 | 2 | 4 | 6;
  connected: boolean;
  running: boolean;
};

export function AuxiliaryControlDialog({ device, onClose }: { device: YonseiAuxiliaryDevice; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("명령 대기 중");

  const send = async (running: boolean) => {
    const groupIndex = device.bit / 2;
    const value = groupIndex * 4 + (running ? 2 : 1);
    setBusy(true);
    setStatus(`${device.name} ${running ? "운전" : "정지"} 명령 전송 중...`);
    let commandId: number | null = null;
    try {
      const result = await enqueueMapWriteBatch("yonsei_auxiliary_operation", [
        { key: device.address.toString(16).padStart(4, "0").toUpperCase(), address: device.address, length: 2, value },
      ]);
      commandId = Number(result.id);
      await waitForControlCommand(commandId, (command) => setStatus(`${device.name} #${command.id} ${command.status}`));
      setStatus(`${device.name} ${running ? "운전" : "정지"} 명령 완료`);
    } catch (error) {
      if (error instanceof ControlStatusUnsupportedError && commandId !== null) setStatus(`명령 #${commandId} 등록됨`);
      else if (error instanceof ControlStatusDelayedError) setStatus(`명령 #${error.commandId} 완료 확인 지연`);
      else setStatus(`명령 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-[16px]">
      <section className="w-[430px] max-w-full rounded-[12px] bg-white p-[18px] shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[25px] font-black text-[#173f69]">{device.name}</div>
            <div className={`mt-[7px] text-[15px] font-black ${device.connected ? device.running ? "text-[#d92525]" : "text-[#45657f]" : "text-[#d92525]"}`}>{device.connected ? device.running ? "현재 운전 중" : "현재 정지" : "통신 불량"}</div>
          </div>
          <button className="h-[40px] w-[40px] rounded-[7px] bg-[#eef3f7] text-[25px] font-black text-[#45657f]" onClick={onClose} type="button">×</button>
        </div>
        <div className="mt-[20px] grid grid-cols-2 gap-[10px]">
          <button className="h-[68px] rounded-[8px] bg-[#d92525] text-[24px] font-black text-white disabled:opacity-40" disabled={busy || !device.connected} onClick={() => void send(true)} type="button">운전</button>
          <button className="h-[68px] rounded-[8px] bg-[#667380] text-[24px] font-black text-white disabled:opacity-40" disabled={busy || !device.connected} onClick={() => void send(false)} type="button">정지</button>
        </div>
        <div className="mt-[12px] rounded-[7px] bg-[#eef7ff] px-[10px] py-[9px] text-center text-[12px] font-black text-[#237bd0]">{status}</div>
      </section>
    </div>
  );
}
