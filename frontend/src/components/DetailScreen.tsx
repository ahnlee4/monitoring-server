import type { YujinMapValue } from "../types";
import type { ReactNode } from "react";

const INVALID_DISPLAY_RAW_VALUE = 32767;
const LIVE_VALUE_MAX_AGE_MS = 30_000;

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
  const auxiliaryDevices = buildAuxiliaryDevices(mapValues);
  const devices = [
    ...dashboard.compressors.map((compressor) => ({ kind: "compressor" as const, compressor })),
    ...auxiliaryDevices.map((device) => ({ kind: "auxiliary" as const, device })),
  ];
  const connectedCount = devices.filter((device) =>
    device.kind === "compressor" ? device.compressor.connected : device.device.connected,
  ).length;

  return (
    <div className="grid h-full grid-rows-[42px_1fr] gap-[3px] bg-[#eef7ff] p-[3px]">
      <div className="grid grid-cols-[170px_1fr_180px_190px] gap-[3px]">
        <HeaderCell>상세 화면</HeaderCell>
        <HeaderCell>컴프레샤 / DIO / AIO 상태</HeaderCell>
        <HeaderCell>연결 {connectedCount} / {devices.length}</HeaderCell>
        <HeaderCell>메인압력 {formatScaledValue(dashboard.mainPressure, "bar")}</HeaderCell>
      </div>
      <div className="grid min-h-0 grid-cols-4 auto-rows-[263px] gap-[3px] overflow-y-auto pr-[2px]">
        {devices.map((device) =>
          device.kind === "compressor" ? (
            <DetailCompressorCard
              key={`comp-${device.compressor.id}`}
              compressor={device.compressor}
              onOpenDetail={onOpenCompressorDetail}
            />
          ) : (
            <AuxiliaryDeviceCard key={device.device.id} device={device.device} />
          ),
        )}
      </div>
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
  const pressureText = compressor.connected ? formatScaledValue(compressor.pressure, "bar") : "--- bar";

  return (
    <button
      className="grid min-h-0 grid-rows-[82px_1fr] overflow-hidden border border-[#75b4ee] bg-white p-[4px] text-left"
      onClick={() => onOpenDetail(compressor.id)}
      type="button"
    >
      <div className="grid grid-cols-[70px_1fr] gap-[4px]">
        <StatusColumn modeText={modeText} runText={runText} loadText={getLoadText(compressor)} fault={compressor.fault} connected={compressor.connected} />
        <div className="grid grid-rows-[28px_1fr] gap-[4px]">
          <div className="flex min-w-0 items-center justify-start overflow-hidden rounded-[4px] bg-[#3374ce] px-[10px] text-[17px] font-black leading-none text-white">
            <span className="truncate">{compressor.name} ({compressor.model})</span>
          </div>
          <div className="flex items-center justify-center rounded-[10px] border border-[#173f69] bg-[#3374ce] text-[31px] font-black leading-none text-white">
            {pressureText}
          </div>
        </div>
      </div>
      <div className="grid min-h-0 grid-cols-[1fr_92px] gap-[4px] pt-[4px]">
        <div className="grid min-h-0 grid-rows-[1fr_32px]">
          <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-white">
            <img src={imageSrc} alt="" className="max-h-full max-w-full object-contain" />
            {!compressor.connected ? <StatusOverlay src="/failure.png" label="FAIL" /> : null}
            {compressor.connected && compressor.fault ? <StatusOverlay src="/fault.png" label="FAULT" /> : null}
          </div>
          <div className="flex items-center justify-center text-[20px] font-black text-[#173f69]">
            {compressor.inverter ? "INVERTER" : "STANDARD"}
          </div>
        </div>
        <div className="grid content-start gap-[4px]">
          <SideMetric label="온도" value={compressor.connected ? formatScaledValue(compressor.temperature, "℃") : "--- ℃"} />
          {compressor.inverter ? (
            <>
              <SideMetric label="제어압력" value={formatScaledValue(compressor.controlPressure, "bar")} />
              <SideMetric label="회전수" value={formatIntegerValue(compressor.rpm, "rpm")} />
            </>
          ) : (
            <>
              <SideMetric label="무부하" value={formatScaledValue(compressor.noLoadPressure, "bar")} />
              <SideMetric label="부하" value={formatScaledValue(compressor.loadPressure, "bar")} />
            </>
          )}
          <SideMetric label="운전시간" value={formatIntegerValue(compressor.totalHours, "hr")} />
          <AlarmBadge alarm={compressor.alarm} fault={compressor.fault} />
        </div>
      </div>
    </button>
  );
}

function AuxiliaryDeviceCard({ device }: { device: AuxiliaryDevice }) {
  const valueText = !device.connected
    ? "FAIL"
    : device.measuredValue === undefined || !Number.isFinite(device.measuredValue)
      ? `--- ${device.measuredUnit}`
      : `${device.measuredValue.toFixed(device.measuredUnit === "bar" ? 2 : 1)} ${device.measuredUnit}`;

  return (
    <article className="grid min-h-0 grid-rows-[82px_1fr] overflow-hidden border border-[#75b4ee] bg-white p-[4px]">
      <div className="grid grid-cols-[70px_1fr] gap-[4px]">
        <StatusColumn modeText={device.modeText} runText={device.runText} loadText={device.loadText} fault={device.fault} connected={device.connected} />
        <div className="grid grid-rows-[28px_1fr] gap-[4px]">
          <div className="flex items-center justify-center rounded-[4px] bg-[#3374ce] px-[10px] text-[17px] font-black leading-none text-white">
            {device.name}
          </div>
          <div className="flex items-center justify-center rounded-[10px] border border-[#173f69] bg-[#3374ce] text-[31px] font-black leading-none text-white">
            {valueText}
          </div>
        </div>
      </div>
      <div className="grid min-h-0 grid-rows-[1fr_36px] pt-[4px]">
        <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-white">
          <img src={device.imageSrc} alt="" className="max-h-full max-w-full object-contain" />
          {!device.connected ? <StatusOverlay src="/failure.png" label="FAIL" /> : null}
          {device.connected && device.fault ? <StatusOverlay src="/fault.png" label="FAULT" /> : null}
        </div>
        <div className="flex items-center justify-center text-[21px] font-black text-[#173f69]">{device.type}</div>
      </div>
    </article>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center border border-[#75b4ee] bg-[#3374ce] px-[6px] text-center text-[19px] font-bold text-white">
      {children}
    </div>
  );
}

function StatusColumn({
  connected,
  fault,
  loadText,
  modeText,
  runText,
}: {
  connected: boolean;
  fault: boolean;
  loadText?: string;
  modeText: string;
  runText: string;
}) {
  return (
    <div className="grid auto-rows-[26px] gap-[2px]">
      <StatusPill tone="label">STATUS</StatusPill>
      <StatusPill tone="mode">{modeText}</StatusPill>
      <StatusPill tone={!connected || fault ? "danger" : runText === "RUN" ? "run" : "ready"}>{runText}</StatusPill>
      {loadText ? <StatusPill tone={loadText === "부하" ? "danger" : "warning"}>{loadText}</StatusPill> : null}
    </div>
  );
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "label" | "mode" | "ready" | "run" | "warning" | "danger" }) {
  const className = {
    label: "bg-[#9fc9fa] text-black",
    mode: "bg-[#9bd46f] text-black",
    ready: "bg-[#d7edf8] text-black",
    run: "bg-[#f05b5b] text-black",
    warning: "bg-[#ffd84b] text-black",
    danger: "bg-[#e33131] text-white",
  }[tone];

  return <div className={`flex items-center justify-center border border-[#6faee7] text-[15px] font-black leading-none ${className}`}>{children}</div>;
}

function SideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-[34px] overflow-hidden border border-[#9fc9fa] bg-white">
      <div className="flex items-center justify-center bg-[#eef7ff] text-[12px] font-black leading-none text-[#173f69]">{label}</div>
      <div className="flex items-center justify-center px-[2px] text-center text-[14px] font-black leading-none text-black">{value}</div>
    </div>
  );
}

function StatusOverlay({ label, src }: { label: string; src: string }) {
  return <img src={src} alt={label} className="absolute left-[12px] right-[12px] top-1/2 h-[38px] -translate-y-1/2 object-fill" />;
}

function AlarmBadge({ alarm, fault }: { alarm: boolean; fault: boolean }) {
  if (!alarm && !fault) return <SideMetric label="상태" value="정상" />;
  return <SideMetric label="상태" value={fault ? "고장" : "알람"} />;
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

function getLoadText(compressor: DetailCompressor) {
  if (!compressor.connected || compressor.fault || !compressor.running) return undefined;
  if (compressor.inverter) return "부하";
  if (compressor.loadPressure > 0 && compressor.pressure >= compressor.loadPressure) return "부하";
  return "무부하";
}

function buildAuxiliaryDevices(values: Record<string, YujinMapValue>) {
  const useDeviceCount = clamp(Math.trunc(liveMapNumber(values, "004C", 0)), 0, 16);
  const dioConnectMask = Math.trunc(liveMapNumber(values, "001E", 0));
  const moduleConnectMask = Math.trunc(liveMapNumber(values, "0020", 0));
  const devices: AuxiliaryDevice[] = [];

  for (let index = 0; index < useDeviceCount; index += 1) {
    const dioPrefix = `E${index.toString(16).toUpperCase()}`;
    const modulePrefix = `F${index.toString(16).toUpperCase()}`;
    const dioRecent = hasRecentValue(values, `${dioPrefix}00`);
    const moduleRecent = hasRecentValue(values, `${modulePrefix}00`);
    const connected = Boolean(dioConnectMask & (1 << index)) || dioRecent;
    const moduleConnected = Boolean(moduleConnectMask & (1 << index)) || moduleRecent;
    const inputStatus = Math.trunc(liveMapNumber(values, `${dioPrefix}00`, 0));
    const measuredRaw = moduleConnected ? liveMapNumber(values, `${modulePrefix}00`, Number.NaN) : Number.NaN;

    if (DEFAULT_DIO_BIT0 !== 6) {
      devices.push(
        buildAuxiliaryDevice({
          category: "dio1",
          connected,
          index,
          inputStatus: inputStatus & 0x0f,
          measuredRaw,
          typeIndex: DEFAULT_DIO_BIT0,
        }),
      );
    }

    if (DEFAULT_DIO_BIT4 !== 6) {
      devices.push(
        buildAuxiliaryDevice({
          category: "dio2",
          connected,
          index,
          inputStatus: (inputStatus >> 4) & 0x0f,
          measuredRaw,
          typeIndex: DEFAULT_DIO_BIT4,
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

function hasRecentValue(values: Record<string, YujinMapValue>, key: string, maxAgeMs = LIVE_VALUE_MAX_AGE_MS) {
  return isLiveMapValue(values[key.toUpperCase()], maxAgeMs);
}

function isLiveMapValue(value: YujinMapValue | undefined, maxAgeMs = LIVE_VALUE_MAX_AGE_MS) {
  if (!value?.updated_at || value.source === "seed") return false;
  return Date.now() - new Date(value.updated_at).getTime() <= maxAgeMs;
}

function formatScaledValue(value: number | undefined, unit: string) {
  if (value === undefined || !Number.isFinite(value)) return "---";
  return `${value.toFixed(1)} ${unit}`;
}

function formatIntegerValue(value: number | undefined, unit = "") {
  if (value === undefined || !Number.isFinite(value)) return "---";
  const suffix = unit ? ` ${unit}` : "";
  return `${Math.trunc(value)}${suffix}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
