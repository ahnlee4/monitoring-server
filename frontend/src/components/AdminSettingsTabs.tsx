import { useEffect, useState } from "react";
import { enqueueMapWriteBatch, waitForControlCommand } from "../services/api";
import type { MapWrite } from "../services/api";
import type { YujinMapValue } from "../types";

export type SettingsAccessLevel = 0 | 1 | 2;
export type SettingsTabKey = "sequence" | "network" | "product" | "gstech";

type MapSettingKind = "number" | "ip" | "mac" | "text" | "word-high" | "word-low";

export type MapSettingField = {
  key: string;
  label: string;
  kind?: MapSettingKind;
  secret?: boolean;
  editableLevels?: SettingsAccessLevel[];
};

const FACTORY: SettingsAccessLevel = 0;
const ADMIN: SettingsAccessLevel = 1;
const USER: SettingsAccessLevel = 2;

export const NETWORK_SETTING_FIELDS: MapSettingField[] = [
  { key: "0100", label: "ETH MAC ADDRESS", kind: "mac", editableLevels: [FACTORY] },
  { key: "0106", label: "ETH SERVER ADDRESS", kind: "ip", editableLevels: [FACTORY] },
  { key: "010A", label: "ETH SERVER PORT", editableLevels: [FACTORY] },
  { key: "010C", label: "WIFI MAC ADDRESS", kind: "mac", editableLevels: [FACTORY] },
  { key: "0112", label: "WIFI AP", kind: "text", editableLevels: [FACTORY, ADMIN, USER] },
  { key: "0122", label: "WIFI PASSWORD", kind: "text", secret: true, editableLevels: [FACTORY, ADMIN, USER] },
  { key: "0132", label: "WIFI SERVER ADDRESS", kind: "ip", editableLevels: [FACTORY] },
  { key: "0136", label: "WIFI SERVER PORT", editableLevels: [FACTORY] },
  { key: "0138", label: "ETH / WIFI SELECT", editableLevels: [FACTORY, ADMIN, USER] },
  { key: "0139", label: "DHCP ON/OFF", editableLevels: [FACTORY] },
  { key: "013A", label: "ETH LOCAL ADDRESS", kind: "ip", editableLevels: [FACTORY] },
  { key: "013E", label: "ETH LOCAL SUBNETMASK", kind: "ip", editableLevels: [FACTORY] },
  { key: "0142", label: "ETH LOCAL GATEWAY", kind: "ip", editableLevels: [FACTORY] },
  { key: "0146", label: "ETH AUTO IP ADDRESS", kind: "ip", editableLevels: [FACTORY] },
  { key: "014A", label: "WIFI AUTO IP ADDRESS", kind: "ip", editableLevels: [FACTORY] },
  { key: "014E", label: "DATA SEND DUTY (SEC)", editableLevels: [FACTORY, ADMIN] },
  { key: "0150", label: "GROUP ID", editableLevels: [FACTORY] },
  { key: "0152", label: "SYSTEM USER ID HIGH", editableLevels: [FACTORY] },
  { key: "0154", label: "SYSTEM USER ID LOW", editableLevels: [FACTORY] },
  { key: "0158", label: "MODEL (G-LINK)", editableLevels: [FACTORY] },
];

export const PRODUCT_SETTING_FIELDS: MapSettingField[] = [
  { key: "004E", label: "연결 대수", editableLevels: [FACTORY] },
  { key: "0006", label: "인젝션(0) / 오일프리(1) 비트", editableLevels: [FACTORY] },
  { key: "004C", label: "4~20mA 모듈 수", kind: "word-high", editableLevels: [FACTORY] },
  { key: "004C", label: "D I/O 모듈 수", kind: "word-low", editableLevels: [FACTORY] },
  { key: "003C", label: "기동 지연 시간(SEC)", editableLevels: [FACTORY, ADMIN] },
  { key: "003E", label: "메인 압력 선택 모듈", editableLevels: [FACTORY, ADMIN] },
  { key: "0050", label: "로컬(0) / 리모트(1)", kind: "word-high", editableLevels: [FACTORY, ADMIN] },
  { key: "0004", label: "정지 지연 시간(SEC)", editableLevels: [FACTORY, ADMIN] },
  { key: "000A", label: "저압경보 압력차 설정", editableLevels: [FACTORY, ADMIN] },
  { key: "000C", label: "저압경보 적용시간 설정(MIN)", editableLevels: [FACTORY, ADMIN] },
  { key: "015A", label: "펌웨어 버전", editableLevels: [] },
  { key: "015C", label: "펌웨어 버전 번호", editableLevels: [] },
];

export function settingsTabsForLevel(level: SettingsAccessLevel) {
  if (level === FACTORY) {
    return [
      { key: "sequence" as const, label: "운전 순서 설정" },
      { key: "network" as const, label: "Network 설정" },
      { key: "product" as const, label: "제품 설정" },
      { key: "gstech" as const, label: "GSTECH 설정" },
    ];
  }
  if (level === ADMIN) {
    return [
      { key: "sequence" as const, label: "운전 순서 설정" },
      { key: "network" as const, label: "Network 설정" },
      { key: "product" as const, label: "제품 설정" },
    ];
  }
  return [
    { key: "network" as const, label: "Network 설정" },
    { key: "product" as const, label: "제품 설정" },
  ];
}

export function SettingsTabBar({
  activeTab,
  level,
  onSelect,
}: {
  activeTab: SettingsTabKey;
  level: SettingsAccessLevel;
  onSelect: (tab: SettingsTabKey) => void;
}) {
  return (
    <div className="grid min-h-[52px] grid-flow-col auto-cols-fr gap-[3px] rounded-[9px] bg-[#c9deef] p-[3px]">
      {settingsTabsForLevel(level).map((tab) => (
        <button
          key={tab.key}
          className={`rounded-[7px] px-[8px] text-[17px] font-black ${activeTab === tab.key ? "bg-[#237bd0] text-white" : "bg-[#eef7ff] text-[#173f69]"}`}
          onClick={() => onSelect(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function MapSettingsPanel({
  fields,
  level,
  mapValues,
  title,
}: {
  fields: MapSettingField[];
  level: SettingsAccessLevel;
  mapValues: Record<string, YujinMapValue>;
  title: string;
}) {
  const integratedRun = (Number(mapValues["0050"]?.value ?? 0) & 0x00ff) !== 0;

  return (
    <section className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
      <div className="text-[20px] font-black text-[#173f69]">{title}</div>
      <div className="mt-[5px] text-[12px] font-bold text-[#6f879d]">수신 중인 실제 장비 맵 값을 표시합니다.</div>
      {integratedRun ? (
        <div className="mt-[10px] rounded-[7px] bg-[#fff0f0] px-[10px] py-[8px] text-[13px] font-black text-[#d92525]">
          통합운전 중에는 설정값을 변경할 수 없습니다.
        </div>
      ) : null}
      <div className="mt-[12px] grid grid-cols-2 gap-[8px] max-sm:grid-cols-1">
        {fields.map((field, index) => (
          <MapSettingRow
            key={`${field.key}-${field.kind ?? "number"}-${index}`}
            disabled={integratedRun}
            field={field}
            level={level}
            mapValue={mapValues[field.key]}
          />
        ))}
      </div>
    </section>
  );
}

function MapSettingRow({
  disabled,
  field,
  level,
  mapValue,
}: {
  disabled: boolean;
  field: MapSettingField;
  level: SettingsAccessLevel;
  mapValue?: YujinMapValue;
}) {
  const currentValue = displayFieldValue(field, mapValue?.value ?? "");
  const editable = Boolean(field.editableLevels?.includes(level));
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setValue(currentValue);
  }, [currentValue, editing]);

  const startEditing = () => {
    setValue(field.secret ? "" : currentValue);
    setStatus("");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setStatus("적용 중...");
    try {
      const write = buildMapSettingWrite(field, value, mapValue);
      const command = await enqueueMapWriteBatch("admin_settings_map_write", [write]);
      await waitForControlCommand(Number(command.id), () => {});
      setStatus("적용 완료");
      setEditing(false);
    } catch (error) {
      setStatus(`실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid min-h-[92px] grid-rows-[auto_1fr_auto] rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[10px]">
      <div className="flex items-center justify-between gap-[8px]">
        <span className="text-[13px] font-black text-[#45657f]">{field.label}</span>
        <span className="rounded bg-[#e4eef6] px-[5px] py-[2px] font-mono text-[10px] font-bold text-[#6f879d]">{field.key}</span>
      </div>
      {editing ? (
        <input
          autoFocus
          className="mt-[7px] min-w-0 rounded-[6px] border border-[#8ebce3] bg-white px-[9px] text-[16px] font-black text-[#173f69] outline-none"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void save();
            if (event.key === "Escape") setEditing(false);
          }}
          type={field.secret ? "password" : "text"}
          value={value}
        />
      ) : (
        <div className="mt-[7px] break-all text-[17px] font-black text-[#173f69]">{field.secret && currentValue ? "••••••••" : currentValue || "---"}</div>
      )}
      <div className="mt-[7px] flex items-center justify-between gap-[8px]">
        <span className={`min-w-0 truncate text-[10px] font-bold ${status.startsWith("실패") ? "text-[#d92525]" : "text-[#6f879d]"}`}>{status}</span>
        {editable ? (
          editing ? (
            <span className="flex gap-[5px]">
              <button className="rounded-[5px] bg-[#e4ebf1] px-[9px] py-[5px] text-[12px] font-black text-[#45657f]" disabled={saving} onClick={() => setEditing(false)} type="button">취소</button>
              <button className="rounded-[5px] bg-[#237bd0] px-[9px] py-[5px] text-[12px] font-black text-white disabled:opacity-50" disabled={saving || disabled} onClick={() => void save()} type="button">저장</button>
            </span>
          ) : (
            <button className="rounded-[5px] bg-[#237bd0] px-[10px] py-[5px] text-[12px] font-black text-white disabled:opacity-40" disabled={disabled} onClick={startEditing} type="button">변경</button>
          )
        ) : (
          <span className="text-[11px] font-black text-[#9aabb9]">조회 전용</span>
        )}
      </div>
    </div>
  );
}

function displayFieldValue(field: MapSettingField, rawValue: string | number) {
  const raw = String(rawValue ?? "");
  if (field.kind !== "word-high" && field.kind !== "word-low") return raw;
  const word = Math.trunc(Number(raw) || 0);
  return String(field.kind === "word-high" ? (word >> 8) & 0xff : word & 0xff);
}

function buildMapSettingWrite(field: MapSettingField, value: string, mapValue?: YujinMapValue): MapWrite {
  const address = Number.parseInt(field.key, 16);
  const length = mapValue?.data_length ?? 2;
  const base = { key: field.key, address, length };

  if (field.kind === "ip") return { ...base, data_hex: encodeIp(value) };
  if (field.kind === "mac") return { ...base, data_hex: encodeMac(value) };
  if (field.kind === "text") return { ...base, data_hex: encodeFixedText(value, length) };

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) throw new Error("정수 값을 입력하세요");
  if (field.kind === "word-high" || field.kind === "word-low") {
    if (parsed < 0 || parsed > 255) throw new Error("입력 범위는 0~255입니다");
    const currentWord = Math.trunc(Number(mapValue?.value ?? 0)) & 0xffff;
    const nextWord = field.kind === "word-high" ? ((parsed & 0xff) << 8) | (currentWord & 0xff) : (currentWord & 0xff00) | (parsed & 0xff);
    return { ...base, value: nextWord };
  }

  const maxValue = 2 ** (length * 8) - 1;
  const normalized = parsed < 0 ? parsed + maxValue + 1 : parsed;
  if (normalized < 0 || normalized > maxValue) throw new Error(`입력 범위는 ${-Math.ceil((maxValue + 1) / 2)}~${maxValue}입니다`);
  return { ...base, value: normalized };
}

function encodeIp(value: string) {
  const parts = value.trim().split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) throw new Error("IPv4 주소 형식이 올바르지 않습니다");
  return parts.map((part) => part.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function encodeMac(value: string) {
  const compact = value.replace(/[^0-9A-Fa-f]/g, "");
  if (compact.length !== 12) throw new Error("MAC 주소는 6바이트여야 합니다");
  return compact.toUpperCase();
}

function encodeFixedText(value: string, length: number) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > length) throw new Error(`최대 ${length}바이트까지 입력할 수 있습니다`);
  return Array.from(bytes)
    .concat(Array.from({ length: length - bytes.length }, () => 0))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
