import { useEffect, useMemo, useState } from "react";
import {
  enqueueMapWriteBatch,
  fetchControlProfile,
  updateControlProfile,
  waitForControlCommand,
} from "../services/api";
import type { ControlProfile } from "../services/api";

type CompressorOption = {
  id: number;
  inverter: boolean;
};

const DEFAULT_PROFILE: ControlProfile = {
  pressure_gap: 0.1,
  equipment_gaps: Array.from({ length: 11 }, () => 0.1),
  inverter_pressure_offset: 0,
  main_inverter_unit: 0,
};

export function ControlAdvancedPanel({
  compressors,
  disabled,
  energyMode,
  onProfileChange,
  onStatus,
  sortModeWord,
}: {
  compressors: CompressorOption[];
  disabled: boolean;
  energyMode: boolean;
  onProfileChange: (profile: ControlProfile) => void;
  onStatus: (message: string) => void;
  sortModeWord: number;
}) {
  const [profile, setProfile] = useState<ControlProfile>(DEFAULT_PROFILE);
  const [editingGaps, setEditingGaps] = useState(false);
  const [saving, setSaving] = useState(false);
  const inverterUnits = useMemo(() => compressors.filter((compressor) => compressor.inverter), [compressors]);
  const gapCount = Math.max(0, Math.min(11, compressors.length - 1));

  useEffect(() => {
    let alive = true;
    fetchControlProfile()
      .then((settings) => {
        if (alive) setProfile(normalizeProfile(settings));
      })
      .catch((error) => onStatus(`고급 제어 설정 불러오기 실패: ${error instanceof Error ? error.message : String(error)}`));
    return () => {
      alive = false;
    };
  }, [onStatus]);

  const saveProfile = async (nextProfile: ControlProfile, label: string) => {
    setSaving(true);
    try {
      const saved = normalizeProfile(await updateControlProfile(nextProfile));
      setProfile(saved);
      onProfileChange(saved);
      onStatus(`${label} 저장 완료`);
      return true;
    } catch (error) {
      onStatus(`${label} 저장 실패: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const applyMasterGap = (rawValue: string) => {
    const pressureGap = clampDecimal(rawValue, 0, 10);
    setProfile((current) => ({
      ...current,
      pressure_gap: pressureGap,
      equipment_gaps: current.equipment_gaps.map(() => pressureGap),
    }));
  };

  const toggleEnergyMode = async () => {
    setSaving(true);
    try {
      const highByte = energyMode ? 0 : 1;
      const result = await enqueueMapWriteBatch("control_dialog_energy_mode", [
        { key: "0024", address: 0x24, length: 2, value: ((highByte & 0xff) << 8) | (sortModeWord & 0xff) },
      ]);
      await waitForControlCommand(Number(result.id), () => {});
      onStatus(`인버터 절약모드 ${energyMode ? "해제" : "적용"} 완료`);
    } catch (error) {
      onStatus(`인버터 절약모드 변경 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const updateGap = (index: number, rawValue: string) => {
    setProfile((current) => {
      const equipmentGaps = [...current.equipment_gaps];
      equipmentGaps[index] = clampDecimal(rawValue, 0, current.pressure_gap);
      return { ...current, equipment_gaps: equipmentGaps };
    });
  };

  return (
    <div className="grid grid-cols-2 gap-[12px] max-sm:grid-cols-1">
      <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[12px]">
        <div className="text-[13px] font-black text-[#6f879d]">장비별 압력차</div>
        <div className="mt-[8px] grid grid-cols-[1fr_58px_72px] gap-[7px]">
          <label className="flex items-center rounded-[7px] border border-[#d9e6f0] bg-[#f8fbfd] px-[9px]">
            <input
              className="min-w-0 flex-1 bg-transparent text-right text-[22px] font-black text-[#173f69] outline-none"
              disabled={disabled || saving}
              inputMode="decimal"
              onChange={(event) => applyMasterGap(event.target.value)}
              type="number"
              value={profile.pressure_gap}
            />
            <span className="ml-[5px] text-[12px] font-black text-[#6f879d]">bar</span>
          </label>
          <button className="rounded-[7px] bg-[#e8f2fa] text-[13px] font-black text-[#45657f]" disabled={disabled || saving} onClick={() => setEditingGaps(true)} type="button">개별</button>
          <button className="rounded-[7px] bg-[#237bd0] text-[13px] font-black text-white" disabled={disabled || saving} onClick={() => void saveProfile(profile, "압력차")} type="button">저장</button>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[12px]">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-black text-[#6f879d]">인버터 절약 제어</span>
          <button className={`rounded-full px-[10px] py-[4px] text-[12px] font-black ${energyMode ? "bg-[#237bd0] text-white" : "bg-[#e7edf3] text-[#45657f]"}`} disabled={disabled || saving} onClick={() => void toggleEnergyMode()} type="button">{energyMode ? "사용" : "미사용"}</button>
        </div>
        <div className="mt-[8px] grid grid-cols-2 gap-[7px]">
          <label className="grid gap-[4px] text-[11px] font-black text-[#6f879d]">
            메인 인버터
            <select className="h-[36px] rounded-[6px] border border-[#d9e6f0] bg-[#f8fbfd] px-[7px] text-[14px] font-black text-[#173f69]" disabled={disabled || saving || !energyMode} onChange={(event) => setProfile((current) => ({ ...current, main_inverter_unit: Number(event.target.value) }))} value={profile.main_inverter_unit}>
              <option value={0}>선택 안 함</option>
              {inverterUnits.map((compressor) => <option key={compressor.id} value={compressor.id}>{compressor.id}호기</option>)}
            </select>
          </label>
          <label className="grid gap-[4px] text-[11px] font-black text-[#6f879d]">
            제어압력 보정
            <span className="flex h-[36px] items-center rounded-[6px] border border-[#d9e6f0] bg-[#f8fbfd] px-[7px]">
              <input className="min-w-0 flex-1 bg-transparent text-right text-[16px] font-black text-[#173f69] outline-none" disabled={disabled || saving || !energyMode} inputMode="decimal" onChange={(event) => setProfile((current) => ({ ...current, inverter_pressure_offset: clampDecimal(event.target.value, -10, 10) }))} type="number" value={profile.inverter_pressure_offset} />
              <span className="ml-[4px]">bar</span>
            </span>
          </label>
        </div>
        <button className="mt-[7px] h-[32px] w-full rounded-[6px] bg-[#237bd0] text-[13px] font-black text-white disabled:opacity-45" disabled={disabled || saving || !energyMode} onClick={() => void saveProfile(profile, "인버터 설정")} type="button">인버터 설정 저장</button>
      </div>

      {editingGaps ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-[16px]">
          <section className="w-[720px] max-w-full rounded-[12px] bg-white p-[16px] shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[22px] font-black text-[#173f69]">장비별 누적 압력차 설정</div>
                <div className="mt-[4px] text-[12px] font-black text-[#6f879d]">각 값은 앞 장비와 다음 장비 사이의 압력차입니다.</div>
              </div>
              <button className="h-[38px] w-[38px] rounded-[7px] bg-[#eef3f7] text-[24px] font-black text-[#45657f]" onClick={() => setEditingGaps(false)} type="button">×</button>
            </div>
            <div className="mt-[14px] grid grid-cols-4 gap-[8px] max-sm:grid-cols-2">
              {Array.from({ length: gapCount }, (_, index) => (
                <label className="grid gap-[5px] rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[9px] text-[12px] font-black text-[#45657f]" key={index}>
                  {index + 1} → {index + 2}호기 압력차
                  <span className="flex items-center">
                    <input className="min-w-0 flex-1 bg-white px-[6px] py-[6px] text-right text-[18px] font-black text-[#173f69] outline-none" inputMode="decimal" max={profile.pressure_gap} min={0} onChange={(event) => updateGap(index, event.target.value)} step={0.1} type="number" value={profile.equipment_gaps[index] ?? profile.pressure_gap} />
                    <span className="ml-[4px]">bar</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-[14px] grid grid-cols-2 gap-[8px]">
              <button className="h-[44px] rounded-[7px] border border-[#d9e6f0] bg-[#f8fbfd] text-[15px] font-black text-[#45657f]" onClick={() => setEditingGaps(false)} type="button">취소</button>
              <button className="h-[44px] rounded-[7px] bg-[#237bd0] text-[15px] font-black text-white" disabled={saving} onClick={async () => { if (await saveProfile(profile, "장비별 압력차")) setEditingGaps(false); }} type="button">전체 저장</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function clampDecimal(rawValue: string, minimum: number, maximum: number) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return minimum;
  return Math.round(Math.max(minimum, Math.min(maximum, value)) * 10) / 10;
}

function normalizeProfile(profile: ControlProfile): ControlProfile {
  const pressureGap = clampDecimal(String(profile.pressure_gap), 0, 10);
  return {
    ...profile,
    pressure_gap: pressureGap,
    equipment_gaps: Array.from({ length: 11 }, (_, index) => clampDecimal(String(profile.equipment_gaps[index] ?? pressureGap), 0, pressureGap)),
    inverter_pressure_offset: clampDecimal(String(profile.inverter_pressure_offset), -10, 10),
    main_inverter_unit: Math.max(0, Math.min(12, Math.trunc(profile.main_inverter_unit))),
  };
}
