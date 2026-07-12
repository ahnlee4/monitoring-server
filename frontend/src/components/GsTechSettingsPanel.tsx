import { useEffect, useMemo, useState } from "react";
import {
  enqueueMapWriteBatch,
  fetchCollectorSettings,
  fetchGsTechSettings,
  updateCollectorSettings,
  updateGsTechSettings,
  waitForControlCommand,
} from "../services/api";
import type { GsTechSettings } from "../services/api";
import type { YujinMapValue } from "../types";

const DIO_ITEMS = ["드라이어", "흡착식 드라이어", "애프터 쿨러", "드라이어", "냉동식 드라이어", "트랜스미터", "사용안함", "흡착식 드라이어"];
const CALIBRATION_OFFSETS = {
  "0-0": 0x04,
  "0-1": 0x06,
  "0-2": 0x0c,
  "0-3": 0x1c,
  "1-0": 0x08,
  "1-1": 0x0a,
  "1-2": 0x0e,
  "1-3": 0x1e,
} as const;
const STANDARD_OFFSETS = { "0-0": 0x10, "0-1": 0x12, "1-0": 0x14, "1-1": 0x16 } as const;

const DEFAULT_GSTECH: GsTechSettings = { dio_bit0: 0, dio_bit4: 1, tcp_mode: 0, cctv_enabled: false };

export function GsTechSettingsPanel({ mapValues }: { mapValues: Record<string, YujinMapValue> }) {
  const integratedRun = (Number(mapValues["0050"]?.value ?? 0) & 0x00ff) !== 0;
  const [moduleIndex, setModuleIndex] = useState(0);
  const [channel, setChannel] = useState(0);
  const [calibrationKind, setCalibrationKind] = useState(0);
  const [calibrationValue, setCalibrationValue] = useState("0");
  const [standardChannel, setStandardChannel] = useState(0);
  const [standardMa, setStandardMa] = useState(0);
  const [settings, setSettings] = useState<GsTechSettings>(DEFAULT_GSTECH);
  const [collectorPort, setCollectorPort] = useState<"/dev/ttyUSB0" | "/dev/ttyS7" | null>(null);
  const [status, setStatus] = useState("GSTECH 설정값 불러오는 중...");
  const [saving, setSaving] = useState(false);

  const calibrationOffset = CALIBRATION_OFFSETS[`${channel}-${calibrationKind}` as keyof typeof CALIBRATION_OFFSETS];
  const calibrationKey = `${(0xf0 + moduleIndex).toString(16).toUpperCase()}${calibrationOffset.toString(16).padStart(2, "0").toUpperCase()}`;
  const currentCalibration = mapValues[calibrationKey]?.value;

  useEffect(() => {
    let alive = true;
    Promise.all([fetchGsTechSettings(), fetchCollectorSettings()])
      .then(([gstech, collector]) => {
        if (!alive) return;
        setSettings(gstech);
        setCollectorPort(collector.serial_port);
        setStatus("GSTECH 설정 변경 대기 중");
      })
      .catch((error) => {
        if (alive) setStatus(`불러오기 실패: ${error instanceof Error ? error.message : String(error)}`);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (currentCalibration !== undefined && currentCalibration !== null) setCalibrationValue(String(currentCalibration));
  }, [calibrationKey, currentCalibration]);

  const moduleLabel = useMemo(() => `F${moduleIndex}`, [moduleIndex]);

  const writeCalibration = async () => {
    const parsed = Number(calibrationValue);
    if (!Number.isInteger(parsed) || parsed < -32768 || parsed > 65535) {
      setStatus("보정값 범위는 -32768~65535입니다");
      return;
    }
    setSaving(true);
    setStatus(`${moduleLabel} CH${channel + 1} 보정값 전송 중...`);
    try {
      const address = ((0xf0 + moduleIndex) << 8) | calibrationOffset;
      const command = await enqueueMapWriteBatch("gstech_calibration", [
        { key: calibrationKey, address, length: 2, value: parsed < 0 ? parsed + 65536 : parsed },
      ]);
      await waitForControlCommand(Number(command.id), () => {});
      setStatus("센서 보정값 적용 완료");
    } catch (error) {
      setStatus(`보정값 적용 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const writeStandard = async () => {
    const offset = STANDARD_OFFSETS[`${standardChannel}-${standardMa}` as keyof typeof STANDARD_OFFSETS];
    const key = `${(0xf0 + moduleIndex).toString(16).toUpperCase()}${offset.toString(16).padStart(2, "0").toUpperCase()}`;
    const value = Number(`${standardChannel + 1}${standardMa === 0 ? 4 : 20}`);
    setSaving(true);
    setStatus(`${moduleLabel} CH${standardChannel + 1} ${standardMa === 0 ? "4mA" : "20mA"} 기준값 전송 중...`);
    try {
      const command = await enqueueMapWriteBatch("gstech_ma_standard", [
        { key, address: ((0xf0 + moduleIndex) << 8) | offset, length: 2, value },
      ]);
      await waitForControlCommand(Number(command.id), () => {});
      setStatus("4~20mA 기준값 적용 완료");
    } catch (error) {
      setStatus(`기준값 적용 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const saveLocal = async () => {
    if (settings.dio_bit0 === settings.dio_bit4) {
      setStatus("DIO BIT0과 BIT4에는 같은 장치를 선택할 수 없습니다");
      return;
    }
    setSaving(true);
    setStatus("GSTECH 로컬 설정 저장 중...");
    try {
      const saved = await updateGsTechSettings({ ...settings, tcp_mode: 0 });
      setSettings(saved);
      setStatus("DIO / TCP / CCTV 설정 저장 완료");
    } catch (error) {
      setStatus(`로컬 설정 저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const savePort = async (port: "/dev/ttyUSB0" | "/dev/ttyS7") => {
    setSaving(true);
    setStatus(`${port} 저장 중...`);
    try {
      const saved = await updateCollectorSettings({ serial_port: port });
      setCollectorPort(saved.serial_port);
      setStatus(`${saved.serial_port} 저장 완료 / collector 자동 적용`);
    } catch (error) {
      setStatus(`포트 저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const disabled = integratedRun || saving;
  return (
    <div className="grid gap-[12px]">
      <section className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
        <div className="text-[20px] font-black text-[#173f69]">4~20mA 센서 보정</div>
        <div className="mt-[4px] text-[12px] font-bold text-[#6f879d]">원본 F0~F3 모듈 / CH1·CH2 / DSP_MIN·DSP_MAX·CAL·DAC_CAL</div>
        <div className="mt-[10px] grid grid-cols-[1fr_1fr_1.2fr_1fr_auto] gap-[7px] max-lg:grid-cols-2 max-sm:grid-cols-1">
          <SettingSelect disabled={disabled} label="모듈" onChange={setModuleIndex} options={["F0", "F1", "F2", "F3"]} value={moduleIndex} />
          <SettingSelect disabled={disabled} label="채널" onChange={setChannel} options={["CH1", "CH2"]} value={channel} />
          <SettingSelect disabled={disabled} label="구분" onChange={setCalibrationKind} options={["DSP_MIN", "DSP_MAX", "CAL", "DAC_CAL"]} value={calibrationKind} />
          <label className="grid gap-[4px] text-[11px] font-black text-[#6f879d]">보정값 ({calibrationKey})<input className="h-[38px] rounded-[6px] border border-[#c9deef] px-[8px] font-black text-[#173f69]" disabled={disabled} onChange={(event) => setCalibrationValue(event.target.value)} type="number" value={calibrationValue} /></label>
          <button className="self-end rounded-[6px] bg-[#237bd0] px-[18px] py-[10px] text-[13px] font-black text-white disabled:opacity-40" disabled={disabled} onClick={() => void writeCalibration()} type="button">WRITE</button>
        </div>
      </section>

      <section className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
        <div className="text-[20px] font-black text-[#173f69]">4mA / 20mA 기준 설정</div>
        <div className="mt-[10px] grid grid-cols-[1fr_1fr_1fr_auto] gap-[7px] max-sm:grid-cols-1">
          <SettingSelect disabled={disabled} label="모듈" onChange={setModuleIndex} options={["F0", "F1", "F2", "F3"]} value={moduleIndex} />
          <SettingSelect disabled={disabled} label="채널" onChange={setStandardChannel} options={["CH1", "CH2"]} value={standardChannel} />
          <SettingSelect disabled={disabled} label="기준" onChange={setStandardMa} options={["4mA", "20mA"]} value={standardMa} />
          <button className="self-end rounded-[6px] bg-[#237bd0] px-[18px] py-[10px] text-[13px] font-black text-white disabled:opacity-40" disabled={disabled} onClick={() => void writeStandard()} type="button">WRITE</button>
        </div>
      </section>

      <section className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
        <div className="text-[20px] font-black text-[#173f69]">DIO / TCP / CCTV 설정</div>
        <div className="mt-[10px] grid grid-cols-2 gap-[8px] max-sm:grid-cols-1">
          <SettingSelect disabled={disabled} label="DIO BIT0" onChange={(value) => setSettings((current) => ({ ...current, dio_bit0: value }))} options={DIO_ITEMS} value={settings.dio_bit0} />
          <SettingSelect disabled={disabled} label="DIO BIT4" onChange={(value) => setSettings((current) => ({ ...current, dio_bit4: value }))} options={DIO_ITEMS} value={settings.dio_bit4} />
          <label className="grid gap-[4px] text-[11px] font-black text-[#6f879d]">TCP/IP<input className="h-[38px] rounded-[6px] border border-[#c9deef] bg-[#edf1f4] px-[8px] font-black text-[#45657f]" disabled readOnly value="Server (보드 직접 연결)" /></label>
          <label className="grid gap-[4px] text-[11px] font-black text-[#6f879d]">GSTECH 옵션<select className="h-[38px] rounded-[6px] border border-[#c9deef] bg-white px-[8px] font-black text-[#173f69]" disabled={disabled} onChange={(event) => setSettings((current) => ({ ...current, cctv_enabled: event.target.value === "1" }))} value={settings.cctv_enabled ? "1" : "0"}><option value="1">CCTV 사용</option><option value="0">CCTV 사용안함</option></select></label>
        </div>
        <div className="mt-[7px] text-[11px] font-bold text-[#6f879d]">현재 Web/Docker 보드는 RS485 장비에 직접 연결되는 Server 역할로 고정됩니다.</div>
        <div className="mt-[10px] flex justify-end"><button className="rounded-[6px] bg-[#237bd0] px-[18px] py-[8px] text-[14px] font-black text-white disabled:opacity-40" disabled={disabled} onClick={() => void saveLocal()} type="button">설정 저장</button></div>
      </section>

      <section className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
        <div className="text-[20px] font-black text-[#173f69]">RS485 통신 포트</div>
        <div className="mt-[10px] grid grid-cols-2 gap-[8px]">
          {(["/dev/ttyUSB0", "/dev/ttyS7"] as const).map((port) => (
            <button key={port} className={`h-[50px] rounded-[7px] border text-[15px] font-black ${collectorPort === port ? "border-[#237bd0] bg-[#237bd0] text-white" : "border-[#d9e6f0] bg-[#f8fbfd] text-[#173f69]"}`} disabled={disabled} onClick={() => void savePort(port)} type="button">{port}</button>
          ))}
        </div>
      </section>
      <div className={`rounded-[8px] px-[10px] py-[9px] text-[13px] font-black ${status.includes("실패") || status.includes("없습니다") ? "bg-[#fff0f0] text-[#d92525]" : "bg-[#eef7ff] text-[#45657f]"}`}>{integratedRun ? "통합운전 중에는 GSTECH 설정을 변경할 수 없습니다" : status}</div>
    </div>
  );
}

function SettingSelect({ disabled, label, onChange, options, value }: { disabled: boolean; label: string; onChange: (value: number) => void; options: string[]; value: number }) {
  return (
    <label className="grid gap-[4px] text-[11px] font-black text-[#6f879d]">{label}<select className="h-[38px] rounded-[6px] border border-[#c9deef] bg-white px-[8px] font-black text-[#173f69]" disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} value={value}>{options.map((option, index) => <option key={`${option}-${index}`} value={index}>{option}</option>)}</select></label>
  );
}
