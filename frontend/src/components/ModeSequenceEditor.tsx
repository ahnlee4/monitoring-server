import { useMemo, useState } from "react";

export function ModeSequenceEditor({
  configuredCount,
  initialRunUnits,
  initialSequence,
  modeNumber,
  onCancel,
  onSave,
  saving,
}: {
  configuredCount: number;
  initialRunUnits: number;
  initialSequence: number[];
  modeNumber: number;
  onCancel: () => void;
  onSave: (sequence: number[], runUnits: number) => void;
  saving: boolean;
}) {
  const availableUnits = useMemo(() => Array.from({ length: configuredCount }, (_, index) => index + 1), [configuredCount]);
  const [sequence, setSequence] = useState(() => normalizeSequence(initialSequence, availableUnits));
  const [runUnits, setRunUnits] = useState(() => clamp(initialRunUnits, 1, Math.max(1, configuredCount)));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sequence.length) return;
    setSequence((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/65 p-[16px]">
      <section className="grid max-h-[calc(100dvh-32px)] w-[760px] max-w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[12px] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#d9e6f0] px-[18px] py-[14px]">
          <div>
            <div className="text-[23px] font-black text-[#173f69]">{modeNumber}번 모드 운전순서</div>
            <div className="mt-[4px] text-[12px] font-black text-[#6f879d]">위에서부터 통합운전 시작 순서입니다.</div>
          </div>
          <button className="h-[40px] w-[40px] rounded-[7px] bg-[#eef3f7] text-[25px] font-black text-[#45657f]" onClick={onCancel} type="button">×</button>
        </header>
        <div className="min-h-0 overflow-y-auto bg-[#f6f9fc] p-[14px]">
          <div className="grid grid-cols-2 gap-[7px] max-sm:grid-cols-1">
            {sequence.map((unit, index) => (
              <div className={`grid h-[48px] grid-cols-[42px_1fr_38px_38px] items-center gap-[5px] rounded-[8px] border px-[7px] ${index < runUnits ? "border-[#8bc3ed] bg-[#eef7ff]" : "border-[#d9e6f0] bg-white"}`} key={unit}>
                <span className={`flex h-[32px] items-center justify-center rounded-[6px] text-[15px] font-black ${index < runUnits ? "bg-[#237bd0] text-white" : "bg-[#e7edf3] text-[#45657f]"}`}>{index + 1}</span>
                <span className="text-[17px] font-black text-[#173f69]">{unit}호기 {index < runUnits ? "운전 대상" : "대기"}</span>
                <button className="h-[32px] rounded-[6px] bg-[#e8f2fa] text-[17px] font-black text-[#45657f] disabled:opacity-30" disabled={index === 0 || saving} onClick={() => move(index, -1)} type="button">↑</button>
                <button className="h-[32px] rounded-[6px] bg-[#e8f2fa] text-[17px] font-black text-[#45657f] disabled:opacity-30" disabled={index === sequence.length - 1 || saving} onClick={() => move(index, 1)} type="button">↓</button>
              </div>
            ))}
          </div>
        </div>
        <footer className="grid grid-cols-[1fr_110px_130px_150px] gap-[8px] border-t border-[#d9e6f0] p-[14px] max-sm:grid-cols-2">
          <label className="flex items-center gap-[8px] text-[14px] font-black text-[#45657f] max-sm:col-span-2">
            가동 대수
            <input className="h-[40px] w-[80px] rounded-[7px] border border-[#c9deef] bg-[#f8fbfd] text-center text-[19px] font-black text-[#173f69]" max={Math.max(1, configuredCount)} min={1} onChange={(event) => setRunUnits(clamp(Number(event.target.value), 1, Math.max(1, configuredCount)))} type="number" value={runUnits} />
          </label>
          <button className="h-[42px] rounded-[7px] bg-[#e8eef3] text-[14px] font-black text-[#45657f]" disabled={saving} onClick={() => setSequence([...availableUnits])} type="button">호기순 초기화</button>
          <button className="h-[42px] rounded-[7px] border border-[#d9e6f0] bg-white text-[14px] font-black text-[#45657f]" disabled={saving} onClick={onCancel} type="button">취소</button>
          <button className="h-[42px] rounded-[7px] bg-[#237bd0] text-[14px] font-black text-white disabled:opacity-45" disabled={saving || configuredCount === 0} onClick={() => onSave(sequence, runUnits)} type="button">순서 저장/적용</button>
        </footer>
      </section>
    </div>
  );
}

function normalizeSequence(sequence: number[], availableUnits: number[]) {
  const normalized = sequence.filter((unit, index) => availableUnits.includes(unit) && sequence.indexOf(unit) === index);
  return [...normalized, ...availableUnits.filter((unit) => !normalized.includes(unit))];
}

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
}
