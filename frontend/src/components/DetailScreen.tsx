import { useEffect, useState } from "react";
import { fetchGsTechSettings } from "../services/api";
import type { GsTechSettings } from "../services/api";
import type { YujinMapValue } from "../types";
import { AuxiliaryControlDialog } from "./AuxiliaryControlDialog";
import type { YonseiAuxiliaryDevice } from "./AuxiliaryControlDialog";

const INVALID_DISPLAY_RAW_VALUE = 32767;
const LIVE_VALUE_MAX_AGE_MS = 12_000;

type DetailCompressor = {
  id: number;
  name: string;
  model: string;
  pressure: number;
  temperature: number;
  noLoadPressure: number;
  loadPressure: number;
  controlPressure?: number;
  rpm?: number;
  local: boolean;
  running: boolean;
  connected: boolean;
  alarm: boolean;
  fault: boolean;
  control?: YonseiAuxiliaryDevice;
  inverter: boolean;
  isOilfree?: boolean;
  totalHours: number;
};

type DetailDashboard = {
  mainPressure: number;
  compressors: DetailCompressor[];
};

type AuxiliaryDevice = {
  id: string;
  name: string;
  type: string;
  category: "dio1" | "dio2";
  imageSrc: string;
  connected: boolean;
  measuredValue?: number;
  measuredUnit: "bar" | "℃";
  modeText: string;
  runText: string;
  loadText?: string;
  fault: boolean;
};

const DIO_DEVICE_TYPES = [
  "드라이어",
  "흡착식 드라이어",
  "애프터 쿨러",
  "드라이어",
  "냉동식 드라이어",
  "트랜스미터",
  "사용안함",
  "흡착식 드라이어",
  "드라이어",
  "쿨러",
];

const DEFAULT_DIO_BIT0 = 0;
const DEFAULT_DIO_BIT4 = 1;

export function DetailScreen({
  dashboard,
  mapValues,
  onOpenCompressorDetail,
}: {
  dashboard: DetailDashboard;
  mapValues: Record<string, YujinMapValue>;
  onOpenCompressorDetail: (id: number) => void;
}) {
  const [gstechSettings, setGsTechSettings] = useState<GsTechSettings>({
    dio_bit0: DEFAULT_DIO_BIT0,
    dio_bit4: DEFAULT_DIO_BIT4,
    tcp_mode: 0,
    cctv_enabled: false,
  });
  const [selectedAuxiliary, setSelectedAuxiliary] = useState<YonseiAuxiliaryDevice | null>(null);

  useEffect(() => {
    let alive = true;
    fetchGsTechSettings()
      .then((settings) => {
        if (alive) setGsTechSettings(settings);
      })
      .catch((error) => console.error("failed to load GSTECH detail settings", error));
    return () => {
      alive = false;
    };
  }, []);

  const compressors = selectDetailCompressors(dashboard.compressors, mapValues);
  const yonseiDevices = buildYonseiAuxiliaryDevices(mapValues);
  const auxiliaryDevices = yonseiDevices.some((device) => device.connected)
    ? yonseiDevices
    : buildAuxiliaryDevices(mapValues, gstechSettings.dio_bit0, gstechSettings.dio_bit4);
  const devices = [
    ...compressors.map((compressor) => ({ kind: "compressor" as const, compressor })),
    ...auxiliaryDevices.map((device) => ({ kind: "auxiliary" as const, device })),
  ];

  return (
    <div className="h-full bg-[#eaf4fd] p-[4px]">
      <div className="grid h-full min-h-0 grid-cols-4 auto-rows-[281px] gap-[4px] overflow-y-auto pr-[2px]">
        {devices.length ? devices.map((device) =>
          device.kind === "compressor" ? (
            <DetailCompressorCard
              key={`comp-${device.compressor.id}`}
              compressor={device.compressor}
              onOpenDetail={onOpenCompressorDetail}
            />
          ) : (
            <AuxiliaryDeviceCard key={device.device.id} device={device.device} onOpenControl={setSelectedAuxiliary} />
          ),
        ) : (
          <div className="col-span-4 flex h-[281px] items-center justify-center rounded-[8px] border border-[#b9d9f3] bg-white text-[22px] font-black text-[#6f879d]">
            설정된 표시 장비가 없습니다
          </div>
        )}
      </div>
      {selectedAuxiliary ? <AuxiliaryControlDialog device={selectedAuxiliary} onClose={() => setSelectedAuxiliary(null)} /> : null}
    </div>
  );
}

function DetailCompressorCard({
  compressor,
  onOpenDetail,
}: {
  compressor: DetailCompressor;
  onOpenDetail: (id: number) => void;
}) {
  const imageSrc = getCompressorImage(compressor);
  const runText = getRunText(compressor);
  const modeText = compressor.local ? "LOC" : "REM";
  const pressureText = compressor.connected ? formatScaledValue(compressor.pressure, "bar", 2) : "--- bar";
  const machineType = compressor.inverter ? "INVERTER" : "STANDARD";

  return (
    <button
      className="grid min-h-0 grid-rows-[42px_1fr_34px] gap-[3px] overflow-hidden border border-[#75b4ee] bg-[#d8ecff] p-[3px] text-left shadow-[inset_0_0_0_1px_#ffffff]"
      onClick={() => onOpenDetail(compressor.id)}
      type="button"
    >
      <DeviceSummary indexLabel={compressor.name} title={compressor.model} value={pressureText} />
      <div className="grid min-h-0 grid-cols-[1fr_126px] gap-[3px] overflow-hidden">
        <div className="grid min-h-0 grid-rows-[1fr_30px] overflow-hidden border border-[#75b4ee] bg-white">
          <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-[#ffffff]">
            <img src={imageSrc} alt="" className="max-h-full max-w-full object-contain" />
            {!compressor.connected ? <StatusOverlay src="/failure.png" label="FAIL" /> : null}
            {compressor.connected && compressor.fault ? <StatusOverlay src="/fault.png" label="FAULT" /> : null}
          </div>
          <div className="flex items-center justify-center border-t border-[#75b4ee] bg-[#eef7ff] text-[16px] font-black text-[#173f69]">{machineType}</div>
        </div>
        <div className="grid grid-rows-4 gap-[3px] overflow-hidden">
          <DetailMetric label="온도" value={compressor.connected ? formatScaledValue(compressor.temperature, "℃") : "--- ℃"} />
          {compressor.inverter ? (
            <>
              <DetailMetric label="제어" value={formatScaledValue(compressor.controlPressure, "bar")} />
              <DetailMetric label="회전" value={formatIntegerValue(compressor.rpm, "rpm")} />
            </>
          ) : (
            <>
              <DetailMetric label="무부하" value={formatScaledValue(compressor.noLoadPressure, "bar")} />
              <DetailMetric label="부하" value={formatScaledValue(compressor.loadPressure, "bar")} />
            </>
          )}
          <DetailMetric label="시간" value={formatIntegerValue(compressor.totalHours, "hr")} />
        </div>
      </div>
      <StatusRow
        alarm={compressor.alarm}
        connected={compressor.connected}
        fault={compressor.fault}
        modeText={modeText}
        runText={runText}
      />
    </button>
  );
}

function AuxiliaryDeviceCard({ device, onOpenControl }: { device: AuxiliaryDevice; onOpenControl: (device: YonseiAuxiliaryDevice) => void }) {
  const valueText = !device.connected
    ? "FAIL"
    : device.measuredValue === undefined || !Number.isFinite(device.measuredValue)
      ? `--- ${device.measuredUnit}`
      : `${device.measuredValue.toFixed(device.measuredUnit === "bar" ? 2 : 1)} ${device.measuredUnit}`;

  return (
    <button className="grid min-h-0 grid-rows-[42px_1fr_34px] gap-[3px] overflow-hidden border border-[#75b4ee] bg-[#d8ecff] p-[3px] text-left shadow-[inset_0_0_0_1px_#ffffff] disabled:cursor-default" disabled={!device.control} onClick={() => { if (device.control) onOpenControl(device.control); }} type="button">
      <DeviceSummary indexLabel={device.category.toUpperCase()} title={device.name} value={valueText} />
      <div className="grid min-h-0 grid-cols-[1fr_126px] gap-[3px] overflow-hidden">
        <div className="grid min-h-0 grid-rows-[1fr_30px] overflow-hidden border border-[#75b4ee] bg-white">
          <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-[#ffffff]">
            <img src={device.imageSrc} alt="" className="max-h-full max-w-full object-contain" />
            {!device.connected ? <StatusOverlay src="/failure.png" label="FAIL" /> : null}
            {device.connected && device.fault ? <StatusOverlay src="/fault.png" label="FAULT" /> : null}
          </div>
          <div className="flex items-center justify-center border-t border-[#75b4ee] bg-[#eef7ff] text-[16px] font-black text-[#173f69]">{device.type}</div>
        </div>
        <div className="grid grid-rows-3 gap-[3px] overflow-hidden">
          <DetailMetric label={device.measuredUnit === "bar" ? "압력" : "온도"} value={valueText} />
          <DetailMetric label="운전" value={device.runText} />
          <DetailMetric label="통신" value={device.connected ? "정상" : "FAIL"} />
        </div>
      </div>
      <StatusRow
        alarm={false}
        connected={device.connected}
        fault={device.fault}
        modeText={device.modeText}
        runText={device.runText}
      />
    </button>
  );
}

function DeviceSummary({
  indexLabel,
  title,
  value,
}: {
  indexLabel: string;
  title: string;
  value: string;
}) {
  const valueParts = splitValueUnit(value);

  return (
    <div className="grid min-w-0 grid-cols-[62px_minmax(0,1fr)_104px] gap-[3px] overflow-hidden">
      <div className="flex items-center justify-center border border-[#75b4ee] bg-[#3374ce] text-[18px] font-black leading-none text-white">
        {indexLabel}
      </div>
      <div className="flex min-w-0 items-center justify-center overflow-hidden border border-[#75b4ee] bg-[#b9dcff] px-[6px] text-[17px] font-black leading-none text-[#0d4da5]">
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{title}</span>
      </div>
      <div className="flex items-center justify-center gap-[4px] overflow-hidden border border-[#1e5c98] bg-[#1e5c98] px-[5px] text-white">
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[23px] font-black leading-none">
          {valueParts.value}
        </span>
        {valueParts.unit ? <span className="shrink-0 pt-[8px] text-[10px] font-black leading-none">{valueParts.unit}</span> : null}
      </div>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  const valueParts = splitValueUnit(value);

  return (
    <div className="grid min-h-0 grid-cols-[46px_minmax(0,1fr)] overflow-hidden border border-[#75b4ee] bg-white">
      <div className="flex items-center justify-center border-r border-[#75b4ee] bg-[#b0d2ff] px-[2px] text-[10px] font-black leading-none text-[#174f88]">
        {label}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-[3px] overflow-hidden px-[6px] text-[#101827]">
        <span className="min-w-0 overflow-hidden text-right text-[18px] font-black leading-none">{valueParts.value}</span>
        {valueParts.unit ? <span className="shrink-0 pt-[7px] text-[10px] font-black leading-none text-[#4f6173]">{valueParts.unit}</span> : null}
      </div>
    </div>
  );
}

function StatusOverlay({ label, src }: { label: string; src: string }) {
  return <img src={src} alt={label} className="absolute left-[12px] right-[12px] top-1/2 h-[38px] -translate-y-1/2 object-fill" />;
}

function StatusRow({
  alarm,
  connected,
  fault,
  modeText,
  runText,
}: {
  alarm: boolean;
  connected: boolean;
  fault: boolean;
  modeText: string;
  runText: string;
}) {
  return (
    <div className="grid grid-cols-4 gap-[3px] overflow-hidden">
      <StatusCell tone={connected ? "green" : "gray"}>{connected ? modeText : "---"}</StatusCell>
      <StatusCell tone={!connected || fault ? "red" : runText === "RUN" ? "red" : "gray"}>{runText}</StatusCell>
      <StatusCell tone={alarm ? "yellow" : "gray"}>{alarm ? "알림" : "정상"}</StatusCell>
      <StatusCell tone={!connected || fault ? "red" : "gray"}>{!connected ? "FAIL" : fault ? "고장" : "정상"}</StatusCell>
    </div>
  );
}

function StatusCell({ children, tone }: { children: string; tone: "green" | "gray" | "red" | "yellow" }) {
  const className = {
    green: "bg-[#4eaa70] text-white",
    gray: "bg-[#c4ccd4] text-[#111827]",
    red: "bg-[#e42626] text-white",
    yellow: "bg-[#ffe642] text-[#111827]",
  }[tone];

  return <div className={`flex items-center justify-center border border-[#75b4ee] text-[17px] font-black leading-none ${className}`}>{children}</div>;
}

function splitValueUnit(text: string) {
  const value = text.trim();
  const units = new Set(["bar", "℃", "rpm", "hr", "min", "ea"]);
  const parts = value.split(/\s+/);
  const unit = parts.at(-1) ?? "";

  if (parts.length > 1 && units.has(unit)) {
    return { value: parts.slice(0, -1).join(" "), unit };
  }

  return { value, unit: "" };
}

function getCompressorImage(compressor: DetailCompressor) {
  if (!compressor.isOilfree && compressor.model !== "-") {
    return compressor.inverter ? "/injection_v_mini.png" : "/injection_mini.png";
  }
  return compressor.inverter ? "/equip_mini.png" : "/equip_n_mini.png";
}

function getRunText(compressor: DetailCompressor) {
  if (!compressor.connected) return "FAIL";
  if (compressor.fault) return "FAULT";
  return compressor.running ? "RUN" : "RDY";
}

export function selectDetailCompressors(
  compressors: DetailCompressor[],
  values: Record<string, YujinMapValue>,
) {
  const storedConnectMask = Math.trunc(storedMapNumber(values, "0002", 0));
  const configuredRaw = Math.trunc(storedMapNumber(values, "004E", 0));
  const fallbackCount = highestSetBit(storedConnectMask);
  const configuredCount = clamp(configuredRaw > 0 ? configuredRaw : fallbackCount, 0, compressors.length);
  const hiddenMask = Math.trunc(storedMapNumber(values, "0008", 0));

  return compressors
    .filter((compressor) => compressor.id <= configuredCount && !(hiddenMask & (1 << (compressor.id - 1))))
    .sort((left, right) => left.id - right.id);
}

function buildYonseiAuxiliaryDevices(values: Record<string, YujinMapValue>): AuxiliaryDevice[] {
  return Array.from({ length: 8 }, (_, index) => {
    const highAddress = index < 4 ? 0xe0 : 0xe1;
    const bit = ((index % 4) * 2) as 0 | 2 | 4 | 6;
    const key = `${highAddress.toString(16).toUpperCase()}00`;
    const connected = hasRecentValue(values, key, 30_000);
    const word = Math.trunc(liveMapNumber(values, key, 0));
    const running = connected && Boolean(word & (1 << bit));
    const name = index < 6 ? `DRYER ${index + 1}${index % 2 === 1 ? " (PCM)" : ""}` : index === 6 ? "PUMP" : "FAN";
    const control: YonseiAuxiliaryDevice = {
      id: `yonsei-${index + 1}`,
      name,
      address: (highAddress << 8) | 0x04,
      bit,
      connected,
      running,
    };
    return {
      id: control.id,
      name,
      type: index < 6 ? "DRYER" : index === 6 ? "PUMP" : "FAN",
      category: index < 4 ? "dio1" : "dio2",
      imageSrc: index < 6 ? "/dryer.png" : "/device.png",
      connected,
      measuredValue: undefined,
      measuredUnit: "℃",
      modeText: "REM",
      runText: connected ? running ? "RUN" : "RDY" : "FAIL",
      fault: false,
      control,
    };
  });
}

function buildAuxiliaryDevices(
  values: Record<string, YujinMapValue>,
  dioBit0: number,
  dioBit4: number,
) {
  const useDeviceWord = Math.trunc(storedMapNumber(values, "004C", 0));
  const moduleCount = clamp((useDeviceWord >> 8) & 0xff, 0, 16);
  const dioCount = clamp(useDeviceWord & 0xff, 0, 16);
  const dioConnectMask = Math.trunc(storedMapNumber(values, "001E", 0));
  const moduleConnectMask = Math.trunc(storedMapNumber(values, "0020", 0));
  const devices: AuxiliaryDevice[] = [];

  for (let index = 0; index < dioCount; index += 1) {
    const dioPrefix = `E${index.toString(16).toUpperCase()}`;
    const modulePrefix = `F${index.toString(16).toUpperCase()}`;
    const dioRecent = hasRecentValue(values, `${dioPrefix}00`);
    const moduleRecent = index < moduleCount && hasRecentValue(values, `${modulePrefix}00`);
    const connected = Boolean(dioConnectMask & (1 << index)) || dioRecent;
    const moduleConnected = index < moduleCount && (Boolean(moduleConnectMask & (1 << index)) || moduleRecent);
    const inputStatus = Math.trunc(liveMapNumber(values, `${dioPrefix}00`, 0));
    const measuredRaw = moduleConnected ? liveMapNumber(values, `${modulePrefix}00`, Number.NaN) : Number.NaN;

    if (dioBit0 !== 6) {
      devices.push(
        buildAuxiliaryDevice({
          category: "dio1",
          connected,
          index,
          inputStatus: inputStatus & 0x0f,
          measuredRaw,
          typeIndex: dioBit0,
        }),
      );
    }

    if (dioBit4 !== 6) {
      devices.push(
        buildAuxiliaryDevice({
          category: "dio2",
          connected,
          index,
          inputStatus: (inputStatus >> 4) & 0x0f,
          measuredRaw,
          typeIndex: dioBit4,
        }),
      );
    }
  }

  return devices;
}

function buildAuxiliaryDevice({
  category,
  connected,
  index,
  inputStatus,
  measuredRaw,
  typeIndex,
}: {
  category: "dio1" | "dio2";
  connected: boolean;
  index: number;
  inputStatus: number;
  measuredRaw: number;
  typeIndex: number;
}): AuxiliaryDevice {
  const isPressure = typeIndex === 5;
  const faultBit = category === "dio1" ? 0x02 : 0x02;
  const type = cleanDioType(DIO_DEVICE_TYPES[typeIndex] ?? "기타 장비");
  return {
    id: `${category}-${index}`,
    name: "MT-G0801",
    type,
    category,
    imageSrc: getAuxiliaryImage(typeIndex),
    connected,
    measuredValue: Number.isFinite(measuredRaw) && measuredRaw < INVALID_DISPLAY_RAW_VALUE ? measuredRaw / (isPressure ? 100 : 10) : Number.NaN,
    measuredUnit: isPressure ? "bar" : "℃",
    modeText: "LOC",
    runText: connected ? (inputStatus === 0 ? "RDY" : "RUN") : "FAIL",
    loadText: connected && inputStatus === 6 ? "부하" : connected && inputStatus === 5 ? "무부하" : undefined,
    fault: connected && Boolean(inputStatus & faultBit),
  };
}

function getAuxiliaryImage(typeIndex: number) {
  const imageMap: Record<number, string> = {
    0: "/dryer.png",
    1: "/adsorption_img.png",
    2: "/cooler.png",
    3: "/dryer2.png",
    4: "/freeze_img.png",
    5: "/transmeter.png",
    7: "/adsorption_img.png",
    8: "/dryer_gumi.png",
    9: "/cooler_gumi.png",
  };
  return imageMap[typeIndex] ?? "/equip_n.png";
}

function cleanDioType(type: string) {
  const separatorIndex = type.indexOf("_");
  return separatorIndex >= 0 ? type.slice(0, separatorIndex) : type;
}

function liveMapNumber(values: Record<string, YujinMapValue>, key: string, fallback = 0) {
  const item = values[key.toUpperCase()];
  if (!isLiveMapValue(item)) return fallback;
  const raw = item.value;
  if (raw === undefined || raw === null || raw === "") return fallback;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function storedMapNumber(values: Record<string, YujinMapValue>, key: string, fallback = 0) {
  const raw = values[key.toUpperCase()]?.value;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function highestSetBit(mask: number) {
  let highest = 0;
  for (let bit = 0; bit < 16; bit += 1) if (mask & (1 << bit)) highest = bit + 1;
  return highest;
}

function hasRecentValue(values: Record<string, YujinMapValue>, key: string, maxAgeMs = LIVE_VALUE_MAX_AGE_MS) {
  return isLiveMapValue(values[key.toUpperCase()], maxAgeMs);
}

function isLiveMapValue(value: YujinMapValue | undefined, maxAgeMs = LIVE_VALUE_MAX_AGE_MS) {
  if (!value?.updated_at || value.source === "seed") return false;
  return Date.now() - new Date(value.updated_at).getTime() <= maxAgeMs;
}

function formatScaledValue(value: number | undefined, unit: string, digits = 1) {
  if (value === undefined || !Number.isFinite(value)) return "---";
  return `${value.toFixed(digits)} ${unit}`;
}

function formatIntegerValue(value: number | undefined, unit = "") {
  if (value === undefined || !Number.isFinite(value)) return "---";
  const suffix = unit ? ` ${unit}` : "";
  return `${Math.trunc(value)}${suffix}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
