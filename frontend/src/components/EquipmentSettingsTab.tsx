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
  return (
    <div className="grid h-full min-h-0 grid-rows-[1fr_auto] gap-[9px]">
      <div className="grid min-h-0 auto-rows-[78px] grid-cols-2 gap-[8px] overflow-y-auto rounded-[10px] border border-[#d9e6f0] bg-white p-[10px] max-sm:grid-cols-1">
        {fields.map((field) => (
          <label className="grid grid-rows-[20px_1fr] rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[9px]" key={field.key}>
            <span className="text-[13px] font-black text-[#6f879d]">{field.label}</span>
            <span className="grid grid-cols-[1fr_36px_50px] items-center gap-[5px]">
              <input className="min-w-0 rounded-[6px] border border-[#c9deef] bg-white px-[7px] py-[5px] text-right text-[20px] font-black text-[#173f69] outline-none focus:border-[#237bd0]" disabled={disabled} inputMode={field.scale === 1 ? "numeric" : "decimal"} onChange={(event) => setValues((current) => ({ ...current, [field.key]: sanitizeDecimal(event.target.value, field.scale === 1) }))} type="text" value={values[field.key]} />
              <span className="text-[11px] font-black text-[#6f879d]">{field.unit}</span>
              <button className="h-[34px] rounded-[6px] bg-[#237bd0] text-[12px] font-black text-white disabled:opacity-40" disabled={disabled} onClick={(event) => { event.preventDefault(); void save(field); }} type="button">저장</button>
            </span>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-[6px] rounded-[8px] bg-[#eef7ff] p-[7px] text-center text-[11px] font-black text-[#45657f] max-sm:grid-cols-2">
        <span>{compressor.isOilfree ? "OILFREE" : "INJECTION"}</span>
        <span>{compressor.inverter ? "INVERTER" : "STANDARD"}</span>
        <span>{compressor.local ? "LOCAL" : "REMOTE"}</span>
        <span>{compressor.running ? "운전" : "정지"}</span>
      </div>
    </div>
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
