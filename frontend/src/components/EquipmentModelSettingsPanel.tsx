import { INJECTION_MODELS, OILFREE_MODELS } from "../equipmentModels";

export function EquipmentModelSettingsPanel({
  configuredCount,
  disabled,
  models,
  onChange,
  onSave,
  saving,
}: {
  configuredCount: number;
  disabled: boolean;
  models: string[];
  onChange: (index: number, model: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const visibleCount = Math.max(1, Math.min(12, Math.trunc(configuredCount) || 12));

  return (
    <section className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
      <div className="flex items-start justify-between gap-[12px]">
        <div>
          <div className="text-[20px] font-black text-[#173f69]">장비별 모델 지정</div>
          <div className="mt-[4px] text-[12px] font-bold text-[#6f879d]">
            지정 모델은 장비 모델 레지스터보다 우선하며 화면·SETTING·통합제어에 함께 적용됩니다.
          </div>
        </div>
        <span className="rounded-full bg-[#eef7ff] px-[9px] py-[5px] text-[10px] font-black text-[#237bd0]">
          안드로이드 모델 기준
        </span>
      </div>

      <div className="mt-[11px] grid grid-cols-4 gap-[7px] max-lg:grid-cols-3 max-sm:grid-cols-2">
        {Array.from({ length: visibleCount }, (_, index) => (
          <label key={index} className="grid gap-[5px] rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[9px]">
            <span className="text-[12px] font-black text-[#45657f]">{index + 1}호기</span>
            <select
              className="h-[36px] min-w-0 rounded-[6px] border border-[#c9deef] bg-white px-[7px] text-[13px] font-black text-[#173f69] disabled:bg-[#edf1f4]"
              disabled={disabled || saving}
              onChange={(event) => onChange(index, event.target.value)}
              value={models[index] ?? ""}
            >
              <option value="">자동 판별</option>
              <optgroup label="인젝션">
                {INJECTION_MODELS.map((model) => <option key={model} value={model}>{model}</option>)}
              </optgroup>
              <optgroup label="오일프리">
                {OILFREE_MODELS.map((model) => <option key={model} value={model}>{model}</option>)}
              </optgroup>
            </select>
          </label>
        ))}
      </div>

      <div className="mt-[10px] flex items-center justify-between gap-[8px] rounded-[8px] bg-[#fff6ed] px-[10px] py-[8px]">
        <span className="text-[11px] font-black text-[#9b5d27]">
          현재 현장 기본값: 1호기 37 · 2호기 37 · 3호기 37V
        </span>
        <button
          className="rounded-[6px] bg-[#237bd0] px-[18px] py-[8px] text-[13px] font-black text-white disabled:opacity-40"
          disabled={disabled || saving}
          onClick={onSave}
          type="button"
        >
          모델 설정 저장
        </button>
      </div>
    </section>
  );
}
