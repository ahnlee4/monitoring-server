export type EquipmentDetailItem = {
  label: string;
  value: string;
  alarm?: boolean;
};

export function EquipmentMetricGrid({ items }: { items: EquipmentDetailItem[] }) {
  return (
    <div className="grid h-full auto-rows-[68px] grid-cols-3 content-start gap-[7px] overflow-y-auto rounded-[12px] border border-[#d5e2ed] bg-[#eef4f8] p-[8px] pr-[6px] max-lg:grid-cols-2 max-sm:auto-rows-[62px] max-sm:grid-cols-1">
      {items.map((item, index) => (
        <EquipmentMetricCard index={index} item={item} key={`${item.label}-${index}`} />
      ))}
    </div>
  );
}

export function EquipmentEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[12px] border border-[#d5e2ed] bg-white px-[24px] text-center">
      <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[#b9d7ee] bg-[#eaf5fd] text-[24px] font-black text-[#2377bc]">
        ✓
      </div>
      <div className="mt-[16px] text-[22px] font-black text-[#173f69]">{title}</div>
      <div className="mt-[7px] text-[13px] font-bold text-[#71879a]">{description}</div>
    </div>
  );
}

function EquipmentMetricCard({
  index,
  item,
}: {
  index: number;
  item: EquipmentDetailItem;
}) {
  const valueParts = splitValueUnit(item.value);
  const longValue = !valueParts.unit && valueParts.value.length > 10;

  return (
    <div
      className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-[8px] rounded-[9px] border px-[10px] py-[8px] shadow-[0_1px_2px_rgba(20,55,86,0.05)] ${
        item.alarm
          ? "border-[#ef9e9e] bg-[#fff3f3]"
          : "border-[#d8e4ed] bg-white"
      }`}
    >
      <div className="min-w-0">
        <div className={`text-[9px] font-black tracking-[0.08em] ${item.alarm ? "text-[#cf3030]" : "text-[#8aa0b3]"}`}>
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className={`mt-[2px] line-clamp-2 text-[11px] font-black leading-[1.25] ${item.alarm ? "text-[#c92525]" : "text-[#526d84]"}`}>
          {item.label}
        </div>
      </div>
      <div className="flex min-w-0 items-baseline justify-end gap-[4px]">
        <span className={`text-right font-black ${longValue ? "line-clamp-2 max-w-[132px] text-[11px] leading-[1.25]" : "max-w-[105px] truncate text-[18px] leading-none"} ${item.alarm ? "text-[#d42525]" : "text-[#173f69]"}`}>
          {valueParts.value}
        </span>
        {valueParts.unit ? (
          <span className={`text-[10px] font-black ${item.alarm ? "text-[#d42525]" : "text-[#7890a4]"}`}>
            {valueParts.unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function splitValueUnit(text: string) {
  const value = text.trim();
  const units = new Set(["bar", "℃", "rpm", "hr", "min", "ea", "nu", "mbar"]);
  const parts = value.split(/\s+/);
  const unit = parts.at(-1) ?? "";

  if (parts.length > 1 && units.has(unit)) {
    return { value: parts.slice(0, -1).join(" "), unit };
  }

  return { value, unit: "" };
}
