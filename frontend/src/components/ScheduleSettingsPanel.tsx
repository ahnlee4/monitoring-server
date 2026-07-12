import { useEffect, useMemo, useState } from "react";
import { fetchScheduleSettings, updateScheduleSettings } from "../services/api";
import type { ScheduleSettings } from "../services/api";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function emptySettings(): ScheduleSettings {
  const slot = () => ({ enabled: false, time: "00:00", run_units: 1 });
  return {
    days: DAY_LABELS.map((_, day) => ({
      day,
      run_slots: Array.from({ length: 3 }, slot),
      stop_slots: Array.from({ length: 3 }, slot),
    })),
    holidays: [],
  };
}

export function ScheduleSettingsPanel({ disabled }: { disabled: boolean }) {
  const [settings, setSettings] = useState<ScheduleSettings>(() => emptySettings());
  const [selectedDay, setSelectedDay] = useState(0);
  const [holiday, setHoliday] = useState("");
  const [status, setStatus] = useState("스케줄 불러오는 중...");
  const [saving, setSaving] = useState(false);
  const selected = settings.days[selectedDay] ?? emptySettings().days[selectedDay];

  useEffect(() => {
    let alive = true;
    fetchScheduleSettings()
      .then((result) => {
        if (!alive) return;
        setSettings(result);
        setStatus("요일별 3개 가동/정지 스케줄을 설정할 수 있습니다");
      })
      .catch((error) => {
        if (alive) setStatus(`불러오기 실패: ${error instanceof Error ? error.message : String(error)}`);
      });
    return () => {
      alive = false;
    };
  }, []);

  const updateSlot = (
    group: "run_slots" | "stop_slots",
    slotIndex: number,
    patch: Partial<{ enabled: boolean; time: string; run_units: number }>,
  ) => {
    setSettings((current) => ({
      ...current,
      days: current.days.map((day, dayIndex) =>
        dayIndex === selectedDay
          ? { ...day, [group]: day[group].map((slot, index) => (index === slotIndex ? { ...slot, ...patch } : slot)) }
          : day,
      ),
    }));
  };

  const save = async () => {
    setSaving(true);
    setStatus("스케줄 저장 중...");
    try {
      const saved = await updateScheduleSettings(settings);
      setSettings(saved);
      setStatus("저장 완료 / 백엔드 스케줄러에 즉시 적용됨");
    } catch (error) {
      setStatus(`저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = () => {
    const monthDay = holiday.match(/(\d{2}-\d{2})$/)?.[1];
    if (!monthDay) return;
    setSettings((current) => ({ ...current, holidays: Array.from(new Set([...current.holidays, monthDay])).sort() }));
    setHoliday("");
  };

  const enabledCount = useMemo(
    () => settings.days.reduce((total, day) => total + [...day.run_slots, ...day.stop_slots].filter((slot) => slot.enabled).length, 0),
    [settings],
  );

  return (
    <section className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
      <div className="flex items-center justify-between gap-[8px]">
        <div>
          <div className="text-[20px] font-black text-[#173f69]">통합운전 스케줄</div>
          <div className="mt-[3px] text-[12px] font-bold text-[#6f879d]">원본과 동일한 요일별 가동 3회·정지 3회 / 가동대수 / 휴일 제외</div>
        </div>
        <span className="rounded bg-[#e8f3fc] px-[8px] py-[5px] text-[12px] font-black text-[#237bd0]">사용 {enabledCount}건</span>
      </div>
      <div className="mt-[12px] grid grid-cols-7 gap-[5px]">
        {DAY_LABELS.map((label, index) => (
          <button
            key={label}
            className={`h-[42px] rounded-[7px] text-[16px] font-black ${selectedDay === index ? "bg-[#237bd0] text-white" : "bg-[#eef3f7] text-[#45657f]"}`}
            onClick={() => setSelectedDay(index)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-[10px] grid gap-[7px]">
        {Array.from({ length: 3 }, (_, slotIndex) => (
          <div key={slotIndex} className="grid grid-cols-[52px_1fr_1fr] gap-[7px] max-sm:grid-cols-1">
            <div className="flex items-center justify-center rounded-[7px] bg-[#e8f3fc] text-[14px] font-black text-[#237bd0]">{slotIndex + 1}회</div>
            <ScheduleSlotEditor
              disabled={disabled || saving}
              label="가동"
              onChange={(patch) => updateSlot("run_slots", slotIndex, patch)}
              showRunUnits
              slot={selected.run_slots[slotIndex]}
            />
            <ScheduleSlotEditor
              disabled={disabled || saving}
              label="정지"
              onChange={(patch) => updateSlot("stop_slots", slotIndex, patch)}
              slot={selected.stop_slots[slotIndex]}
            />
          </div>
        ))}
      </div>
      <div className="mt-[12px] rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[10px]">
        <div className="text-[14px] font-black text-[#45657f]">휴일 제외 (매년 반복)</div>
        <div className="mt-[7px] flex gap-[7px]">
          <input className="h-[40px] min-w-0 flex-1 rounded-[6px] border border-[#c9deef] px-[9px] font-bold text-[#173f69]" disabled={disabled || saving} onChange={(event) => setHoliday(event.target.value)} type="date" value={holiday} />
          <button className="rounded-[6px] bg-[#45657f] px-[14px] text-[13px] font-black text-white disabled:opacity-40" disabled={!holiday || disabled || saving} onClick={addHoliday} type="button">추가</button>
        </div>
        <div className="mt-[7px] flex flex-wrap gap-[5px]">
          {settings.holidays.length ? settings.holidays.map((item) => (
            <button key={item} className="rounded-full bg-[#fff0f0] px-[9px] py-[4px] text-[12px] font-black text-[#c74343]" disabled={disabled || saving} onClick={() => setSettings((current) => ({ ...current, holidays: current.holidays.filter((value) => value !== item) }))} type="button">{item} ×</button>
          )) : <span className="text-[12px] font-bold text-[#9aabb9]">등록된 휴일 없음</span>}
        </div>
      </div>
      <div className="mt-[10px] flex items-center justify-between gap-[8px] rounded-[8px] bg-[#eef7ff] px-[10px] py-[8px]">
        <span className="text-[12px] font-black text-[#45657f]">{disabled ? "통합운전 중에는 변경할 수 없습니다" : status}</span>
        <button className="rounded-[6px] bg-[#237bd0] px-[18px] py-[8px] text-[14px] font-black text-white disabled:opacity-40" disabled={disabled || saving} onClick={() => void save()} type="button">전체 저장</button>
      </div>
    </section>
  );
}

function ScheduleSlotEditor({
  disabled,
  label,
  onChange,
  showRunUnits = false,
  slot,
}: {
  disabled: boolean;
  label: string;
  onChange: (patch: Partial<{ enabled: boolean; time: string; run_units: number }>) => void;
  showRunUnits?: boolean;
  slot: { enabled: boolean; time: string; run_units: number };
}) {
  return (
    <label className={`grid min-h-[48px] items-center gap-[6px] rounded-[7px] border px-[8px] ${label === "가동" ? "grid-cols-[auto_1fr_72px] border-[#b9d9f3] bg-[#f3f9fe]" : "grid-cols-[auto_1fr] border-[#e5c8c8] bg-[#fff8f8]"}`}>
      <span className="flex items-center gap-[5px] text-[13px] font-black text-[#45657f]">
        <input checked={slot.enabled} disabled={disabled} onChange={(event) => onChange({ enabled: event.target.checked })} type="checkbox" />
        {label}
      </span>
      <input className="h-[34px] min-w-0 rounded-[5px] border border-[#d9e6f0] bg-white px-[5px] text-center font-black text-[#173f69]" disabled={disabled} onChange={(event) => onChange({ time: event.target.value })} type="time" value={slot.time} />
      {showRunUnits ? (
        <label className="flex items-center gap-[3px] text-[11px] font-black text-[#6f879d]">
          <input className="h-[34px] w-[42px] rounded-[5px] border border-[#d9e6f0] text-center font-black text-[#173f69]" disabled={disabled} max={12} min={1} onChange={(event) => onChange({ run_units: Math.max(1, Math.min(12, Number(event.target.value) || 1)) })} type="number" value={slot.run_units} />대
        </label>
      ) : null}
    </label>
  );
}
