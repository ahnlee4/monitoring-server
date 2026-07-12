export function EquipmentMaskSettings({
  configuredCount,
  disabled,
  excludeMask,
  hiddenMask,
  onExcludeMaskChange,
  onHiddenMaskChange,
  onSave,
}: {
  configuredCount: number;
  disabled: boolean;
  excludeMask: number;
  hiddenMask: number;
  onExcludeMaskChange: (mask: number) => void;
  onHiddenMaskChange: (mask: number) => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-[12px] grid gap-[9px] rounded-[9px] border border-[#d9e6f0] bg-[#f8fbfd] p-[11px]">
      <MaskRow configuredCount={configuredCount} disabled={disabled} label="메인/상세 화면 숨김" mask={hiddenMask} onChange={onHiddenMaskChange} />
      <MaskRow configuredCount={configuredCount} disabled={disabled} label="통합운전 제외" mask={excludeMask} onChange={onExcludeMaskChange} />
      <button className="h-[40px] rounded-[7px] bg-[#237bd0] text-[14px] font-black text-white disabled:opacity-45" disabled={disabled} onClick={onSave} type="button">숨김/제외 설정 저장</button>
    </div>
  );
}

function MaskRow({ configuredCount, disabled, label, mask, onChange }: { configuredCount: number; disabled: boolean; label: string; mask: number; onChange: (mask: number) => void }) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-center gap-[8px] max-sm:grid-cols-1">
      <span className="text-[13px] font-black text-[#45657f]">{label}</span>
      <div className="grid grid-cols-8 gap-[5px] max-sm:grid-cols-4">
        {Array.from({ length: configuredCount }, (_, index) => {
          const checked = Boolean(mask & (1 << index));
          return (
            <label className={`flex h-[34px] items-center justify-center gap-[4px] rounded-[6px] border text-[12px] font-black ${checked ? "border-[#237bd0] bg-[#e7f4ff] text-[#173f69]" : "border-[#d9e6f0] bg-white text-[#6f879d]"}`} key={index}>
              <input checked={checked} disabled={disabled} onChange={() => onChange(checked ? mask & ~(1 << index) : mask | (1 << index))} type="checkbox" />
              {index + 1}호기
            </label>
          );
        })}
      </div>
    </div>
  );
}
