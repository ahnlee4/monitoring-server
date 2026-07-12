import type { YujinMapValue } from "../types";

export function MinMaxDialog({ mapValues, onClose }: { mapValues: Record<string, YujinMapValue>; onClose: () => void }) {
  const items = [
    { label: "메인 압력", min: scaled(mapValues.F004, 100, 2), max: scaled(mapValues.F006, 100, 2), unit: "bar" },
    { label: "메인 온도", min: scaled(mapValues.F008, 10, 1), max: scaled(mapValues.F00A, 10, 1), unit: "℃" },
  ];
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/65 p-[16px]">
      <section className="w-[620px] max-w-full rounded-[12px] bg-white p-[18px] shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-[25px] font-black text-[#173f69]">표시 범위</div>
          <button className="h-[40px] w-[40px] rounded-[7px] bg-[#eef3f7] text-[25px] font-black text-[#45657f]" onClick={onClose} type="button">×</button>
        </div>
        <div className="mt-[16px] grid grid-cols-2 gap-[10px] max-sm:grid-cols-1">
          {items.map((item) => (
            <div className="rounded-[10px] border border-[#d9e6f0] bg-[#f8fbfd] p-[13px]" key={item.label}>
              <div className="text-[16px] font-black text-[#45657f]">{item.label}</div>
              <div className="mt-[12px] grid grid-cols-2 gap-[8px]">
                <RangeValue label="MIN" unit={item.unit} value={item.min} />
                <RangeValue label="MAX" unit={item.unit} value={item.max} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RangeValue({ label, unit, value }: { label: string; unit: string; value: string }) {
  return <div className="rounded-[8px] bg-white p-[10px] text-center"><div className="text-[12px] font-black text-[#6f879d]">{label}</div><div className="mt-[6px] text-[25px] font-black text-[#173f69]">{value} <span className="text-[12px] text-[#6f879d]">{unit}</span></div></div>;
}

function scaled(item: YujinMapValue | undefined, divisor: number, digits: number) {
  if (!item || item.source === "seed") return "---";
  const raw = Number(item.value);
  if (!Number.isFinite(raw) || raw === 32767) return "---";
  const signed = raw > 32767 ? raw - 65536 : raw;
  return (signed / divisor).toFixed(digits);
}
