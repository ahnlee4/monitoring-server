import { useEffect, useMemo, useState } from "react";
import type { MapWrite } from "../services/api";
import type { YujinMapValue } from "../types";

type Equipment = {
  id: number;
  model: string;
  connected: boolean;
  inverter: boolean;
  isOilfree?: boolean;
  local: boolean;
  running: boolean;
};

type SettingField = {
  key: "primary" | "secondary" | "tertiary" | "autoStop";
  label: string;
  offset: number;
  scale: number;
  unit: string;
};

export function EquipmentSettingsTab({
  commandBusy,
  compressor,
  integratedRun,
  mapValues,
  onSend,
  onStatus,
}: {
  commandBusy: boolean;
  compressor: Equipment;
  integratedRun: boolean;
  mapValues: Record<string, YujinMapValue>;
  onSend: (label: string, source: string, writes: MapWrite[]) => Promise<void>;
  onStatus: (message: string) => void;
}) {
  const fields = useMemo(() => settingFields(compressor), [compressor.inverter, compressor.isOilfree]);
  const [values, setValues] = useState<Record<SettingField["key"], string>>(() => readSettingValues(compressor, fields, mapValues));

  useEffect(() => {
    setValues(readSettingValues(compressor, fields, mapValues));
  }, [compressor.id, fields]);

  const save = async (field: SettingField) => {
    const validation = validateSettings(compressor, fields, values, mapValues);
    if (validation) {
      onStatus(validation);
      return;
    }
    const numeric = Number(values[field.key]);
    const address = (getHighAddress(compressor) << 8) | field.offset;
    await onSend(`${field.label} 설정`, "equipment_detail_setting", [
      {
        key: address.toString(16).padStart(4, "0").toUpperCase(),
        address,
        length: 2,
        value: Math.round(numeric * field.scale),
      },
    ]);
  };

  const disabled = commandBusy || integratedRun || !compressor.connected;
  const disabledReason = !compressor.connected
    ? "장비 통신이 끊겨 설정을 전송할 수 없습니다"
    : integratedRun
      ? "통합 운전 중에는 개별 장비 설정을 변경할 수 없습니다"
      : "";

  return (
    <div className="grid h-full min-h-0 grid-rows-[46px_minmax(0,1fr)_40px] gap-[8px]">
      <header className="flex items-center justify-between rounded-[10px] border border-[#d3e1eb] bg-white px-[12px]">
        <div>
          <div className="text-[12px] font-black text-[#274e70]">압력 및 자동 정지 설정</div>
          <div className="mt-[2px] text-[9px] font-bold text-[#8398a9]">값을 확인한 후 항목별로 적용합니다</div>
        </div>
        <span className="rounded-full bg-[#e8f3fb] px-[9px] py-[5px] text-[9px] font-black text-[#397397]">
          {compressor.inverter ? "INVERTER PROFILE" : "STANDARD PROFILE"}
        </span>
      </header>

      <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-[8px] max-sm:grid-cols-1 max-sm:grid-rows-none max-sm:overflow-y-auto">
        {fields.map((field, index) => (
          <label
            className="grid min-h-0 grid-rows-[auto_1fr_auto] rounded-[11px] border border-[#d4e1eb] bg-white p-[12px] shadow-[0_2px_5px_rgba(22,61,92,0.05)]"
            key={field.key}
          >
            <span className="flex items-center gap-[8px]">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-[#1d72b5] text-[9px] font-black text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-[12px] font-black text-[#47657c]">{field.label}</span>
            </span>

            <span className="flex items-center justify-center py-[8px]">
              <span className="grid h-[54px] w-full grid-cols-[minmax(0,1fr)_52px] overflow-hidden rounded-[9px] border border-[#bcd0df] bg-[#f7fafc] focus-within:border-[#1d72b5] focus-within:ring-2 focus-within:ring-[#1d72b5]/10">
                <input
                  className="min-w-0 bg-transparent px-[13px] text-right text-[28px] font-black text-[#173f69] outline-none disabled:text-[#95a7b5]"
                  disabled={disabled}
                  inputMode={field.scale === 1 ? "numeric" : "decimal"}
                  onChange={(event) => setValues((current) => ({
                    ...current,
                    [field.key]: sanitizeDecimal(event.target.value, field.scale === 1),
                  }))}
                  type="text"
                  value={values[field.key]}
                />
                <span className="flex items-center justify-center border-l border-[#d3e0e9] bg-[#edf3f7] text-[11px] font-black text-[#6e879a]">
                  {field.unit}
                </span>
              </span>
            </span>

            <button
              className="h-[36px] rounded-[8px] bg-[#1d72b5] text-[11px] font-black text-white shadow-[0_3px_7px_rgba(29,114,181,0.18)] transition-colors hover:bg-[#155f99] disabled:bg-[#9aabb8] disabled:shadow-none"
              disabled={disabled}
              onClick={(event) => {
                event.preventDefault();
                void save(field);
              }}
              type="button"
            >
              이 값 적용
            </button>
          </label>
        ))}
      </div>

      <footer className={`flex items-center justify-between rounded-[9px] border px-[10px] ${disabledReason ? "border-[#ecc3a0] bg-[#fff6ed]" : "border-[#cde2d8] bg-[#eef9f4]"}`}>
        <span className={`text-[10px] font-black ${disabledReason ? "text-[#a75c21]" : "text-[#267258]"}`}>
          {disabledReason || "설정값 전송 가능"}
        </span>
        <div className="flex gap-[5px] text-[8px] font-black">
          <SettingBadge label={compressor.isOilfree ? "OILFREE" : "INJECTION"} />
          <SettingBadge label={compressor.local ? "LOCAL" : "REMOTE"} />
          <SettingBadge label={compressor.running ? "RUN" : "STOP"} />
        </div>
      </footer>
    </div>
  );
}

function SettingBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#bfd3e2] bg-white px-[7px] py-[3px] text-[#5d788d]">
      {label}
    </span>
  );
}

function settingFields(compressor: Equipment): SettingField[] {
  if (compressor.isOilfree) {
    return compressor.inverter
      ? [
          { key: "primary", label: "제어 압력 설정", offset: 0x46, scale: 10, unit: "bar" },
          { key: "secondary", label: "상세 제어 압력 설정", offset: 0x48, scale: 10, unit: "bar" },
          { key: "tertiary", label: "압력 제어 설정", offset: 0x4a, scale: 10, unit: "bar" },
          { key: "autoStop", label: "자동 정지 시간", offset: 0x52, scale: 1, unit: "min" },
        ]
      : [
          { key: "primary", label: "비상 정지 압력", offset: 0x4c, scale: 10, unit: "bar" },
          { key: "secondary", label: "무부하 압력", offset: 0x4e, scale: 10, unit: "bar" },
          { key: "tertiary", label: "부하 압력", offset: 0x50, scale: 10, unit: "bar" },
          { key: "autoStop", label: "자동 정지 시간", offset: 0x52, scale: 1, unit: "min" },
        ];
  }
  return compressor.inverter
    ? [
        { key: "primary", label: "제어 압력 설정", offset: 0x20, scale: 10, unit: "bar" },
        { key: "secondary", label: "상세 제어 압력 설정", offset: 0x22, scale: 10, unit: "bar" },
        { key: "tertiary", label: "압력 제어 설정", offset: 0x24, scale: 10, unit: "bar" },
        { key: "autoStop", label: "자동 정지 시간", offset: 0x2a, scale: 1, unit: "min" },
      ]
    : [
        { key: "primary", label: "비상 정지 압력", offset: 0x1e, scale: 10, unit: "bar" },
        { key: "secondary", label: "무부하 압력", offset: 0x26, scale: 10, unit: "bar" },
        { key: "tertiary", label: "부하 압력", offset: 0x28, scale: 10, unit: "bar" },
        { key: "autoStop", label: "자동 정지 시간", offset: 0x2a, scale: 1, unit: "min" },
      ];
}

function readSettingValues(compressor: Equipment, fields: SettingField[], values: Record<string, YujinMapValue>) {
  const highAddress = getHighAddress(compressor);
  return Object.fromEntries(fields.map((field) => {
    const raw = Number(values[`${highAddress.toString(16).toUpperCase()}${field.offset.toString(16).padStart(2, "0").toUpperCase()}`]?.value ?? 0);
    return [field.key, Number.isFinite(raw) ? String(Math.round((raw / field.scale) * 10) / 10) : "0"];
  })) as Record<SettingField["key"], string>;
}

function validateSettings(compressor: Equipment, fields: SettingField[], values: Record<SettingField["key"], string>, mapValues: Record<string, YujinMapValue>) {
  const parsed = fields.map((field) => Number(values[field.key]));
  if (parsed.some((value) => !Number.isFinite(value))) return "설정값을 숫자로 입력하세요";
  const [primary, secondary, tertiary, autoStop] = parsed;
  const maxOffset = compressor.isOilfree ? 0x66 : 0x1c;
  const maxRaw = Number(mapValues[`${getHighAddress(compressor).toString(16).toUpperCase()}${maxOffset.toString(16).toUpperCase()}`]?.value ?? 136);
  const maxPressure = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw / 10 : 13.6;
  if (autoStop < 0 || autoStop >= 30) return "자동 정지 시간은 0~29분 범위여야 합니다";
  if (compressor.inverter) {
    if (!(primary > 4.9 && primary < maxPressure)) return `제어 압력은 4.9bar 초과, ${maxPressure.toFixed(1)}bar 미만이어야 합니다`;
    if (!(secondary > 0 && secondary < 1)) return "상세 제어 압력은 0~1bar 사이여야 합니다";
    if (!(tertiary > 0.5 && tertiary < 2)) return "압력 제어 설정은 0.5~2bar 사이여야 합니다";
    return "";
  }
  if (!(primary <= maxPressure + 1 && primary > secondary + 0.4)) return "비상 정지 압력은 무부하 압력보다 0.4bar 이상 높아야 합니다";
  if (!(secondary > tertiary + 0.2 && secondary <= maxPressure)) return "무부하 압력은 부하 압력보다 0.2bar 이상 높아야 합니다";
  if (!(tertiary > 1.4 && tertiary < 13.6)) return "부하 압력은 1.4~13.6bar 사이여야 합니다";
  return "";
}

function getHighAddress(compressor: Equipment) {
  return (compressor.isOilfree ? 0x20 : 0x10) + compressor.id;
}

function sanitizeDecimal(value: string, integerOnly: boolean) {
  const numeric = value.replace(integerOnly ? /\D/g : /[^0-9.]/g, "");
  if (integerOnly) return numeric;
  const [head, ...tail] = numeric.split(".");
  return tail.length ? `${head}.${tail.join("")}` : head;
}
