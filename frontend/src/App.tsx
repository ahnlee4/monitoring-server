import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent, ReactNode } from "react";
import { DetailScreen, selectDetailCompressors } from "./components/DetailScreen";
import { EquipmentDetailDialog } from "./components/EquipmentDetailDialog";
import { ControlAdvancedPanel } from "./components/ControlAdvancedPanel";
import { EquipmentMaskSettings } from "./components/EquipmentMaskSettings";
import { ModeSequenceEditor } from "./components/ModeSequenceEditor";
import { CctvDialog } from "./components/CctvDialog";
import { MinMaxDialog } from "./components/MinMaxDialog";
import { LowPressureDialog } from "./components/LowPressureDialog";
import { MobileLayout } from "./components/MobileLayout";
import { GsTechSettingsPanel } from "./components/GsTechSettingsPanel";
import { ProductSettingsPanel } from "./components/ProductSettingsPanel";
import { QuickButtons } from "./components/QuickButtons";
import { ScheduleSettingsPanel } from "./components/ScheduleSettingsPanel";
import {
  MapSettingsPanel,
  NETWORK_SETTING_FIELDS,
  SettingsTabBar,
  settingsTabsForLevel,
} from "./components/AdminSettingsTabs";
import type { SettingsTabKey } from "./components/AdminSettingsTabs";
import { useYujinMapValues } from "./hooks/useYujinMapValues";
import { useRuntimeSettings } from "./hooks/useRuntimeSettings";
import {
  DEFAULT_EQUIPMENT_MODELS,
  equipmentModelIsInverter,
  normalizeEquipmentModel,
} from "./equipmentModels";
import {
  ControlStatusDelayedError,
  ControlStatusUnsupportedError,
  fetchControlProfile,
  fetchProductSettings,
  enqueueGroupOperation,
  enqueueMapWriteBatch,
  fetchModeSettings,
  updateModeSettings,
  waitForControlCommand,
} from "./services/api";
import type { ControlProfile, MapWrite, ModeSettings, ProductSettings } from "./services/api";
import type { YujinMapValue } from "./types";

type CompressorState = {
  id: number;
  name: string;
  model: string;
  pressure: number;
  temperature: number;
  noLoadPressure: number;
  loadPressure: number;
  controlPressure?: number;
  rpm?: number;
  runMode: number;
  operationStatus: number;
  local: boolean;
  running: boolean;
  connected: boolean;
  alarm: boolean;
  fault: boolean;
  inverter: boolean;
  isOilfree: boolean;
  totalHours: number;
  currentAmps: number;
  repair: boolean;
  mainInverter: boolean;
};

type DashboardState = {
  integratedRun: boolean;
  mainPressure: number;
  mainTemperature: number;
  totalPower: number;
  appVersion: string;
  firmwareVersion: string;
  lowPressureAlarm: "none" | "warning" | "reserve";
  lowPressureStep: number;
  sortMode: "setting" | "time";
  configuredCount: number;
  control: {
    noLoadPressure: number;
    loadPressure: number;
    pressureGap: number;
    lowAlarmPressure: number;
    runUnits: number;
    changeHours: number;
    remainMinutes: number;
    controlModeWord: number;
    sortModeWord: number;
    operationModeWord: number;
  };
  options: Array<{ label: string; checked: boolean; visible?: boolean }>;
  compressors: CompressorState[];
};

type ActiveDialog = "cctv" | "settings" | "control" | "minmax" | "lowpressure" | "password" | null;
type ActiveScreen = "main" | "detail";
type UserLevel = 0 | 1 | 2;

const LIVE_VALUE_MAX_AGE_MS = 30_000;
const SYSTEM_LINK_GRACE_MS = 8_000;
const DEVICE_LINK_GRACE_MS = 12_000;
const APP_VERSION = "0.1.144";
const INVALID_DISPLAY_RAW_VALUE = 32767;
const MAIN_RUN_SEQUENCE_KEYS = ["0028", "002A", "002C", "002E", "0030", "0032", "0034", "0036", "0038", "000E", "0010", "0012"];
const MODE_ALIGN_ROWS = 7;
const MODE_ALIGN_COLUMNS = 12;
const MODE_RUN_COUNT_INDEX = MODE_ALIGN_COLUMNS;
const MODE_ROW_VALUE_COUNT = MODE_ALIGN_COLUMNS + 1;
const ADMIN_LOGO_CLICK_WINDOW_MS = 5_000;
const ADMIN_LOGO_CLICK_COUNT = 5;
type ModeSequenceAction = "previous" | "refresh" | "next";
const USER_LEVELS = {
  admin: 0,
  manager: 1,
  user: 2,
} as const;
const USER_PASSWORDS: Record<UserLevel, string> = {
  [USER_LEVELS.admin]: "btfss0510",
  [USER_LEVELS.manager]: "471112",
  [USER_LEVELS.user]: "1234",
};
const USER_LEVEL_LABELS: Record<UserLevel, string> = {
  [USER_LEVELS.admin]: "공장 관리자",
  [USER_LEVELS.manager]: "관리자",
  [USER_LEVELS.user]: "사용자",
};
const OPTION_LABELS = [
  "고장발생시 모드 변경",
  "인버터 주도 절약운전 기능",
  "교환운전 기능",
  "메인압력모듈 적용",
  "통합운전 제어시 기타 기기 제어",
  "메인화면 정렬방식",
  "저압경보 적용",
  "저압경보시 예비기 가동유무",
  "고장발생시 예비기 가동유무",
  "리모트 모드일때만 쓰기",
  "로그인 했을때만 쓰기",
  "데이터 저장유무",
  "통합제어 정지시 컴프레샤 정지안함",
  "교환운전 테스트",
];

const emptyDashboard: DashboardState = {
  integratedRun: false,
  mainPressure: 0,
  mainTemperature: Number.NaN,
  totalPower: Number.NaN,
  appVersion: APP_VERSION,
  firmwareVersion: "-",
  lowPressureAlarm: "none",
  lowPressureStep: 0,
  sortMode: "setting",
  configuredCount: 0,
  control: {
    noLoadPressure: 0,
    loadPressure: 0,
    pressureGap: 0,
    lowAlarmPressure: 0,
    runUnits: 0,
    changeHours: 0,
    remainMinutes: 0,
    controlModeWord: 0,
    sortModeWord: 0,
    operationModeWord: 0,
  },
  options: OPTION_LABELS.map((label) => ({ label, checked: false })),
  compressors: Array.from({ length: 12 }, (_, index) => emptyCompressor(index)),
};

function emptyCompressor(index: number): CompressorState {
  return {
    id: index + 1,
    name: `${index + 1}호기`,
    model: "-",
    pressure: 0,
    temperature: 0,
    noLoadPressure: 0,
    loadPressure: 0,
    controlPressure: 0,
    rpm: 0,
    runMode: 0,
    operationStatus: 0,
    local: false,
    running: false,
    connected: false,
    alarm: false,
    fault: false,
    inverter: false,
    isOilfree: false,
    totalHours: 0,
    currentAmps: Number.NaN,
    repair: false,
    mainInverter: false,
  };
}

export default function App() {
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("main");
  const [selectedCompressorId, setSelectedCompressorId] = useState<number | null>(null);
  const [settingsLevel, setSettingsLevel] = useState<UserLevel>(USER_LEVELS.user);
  const [adminLogoClicks, setAdminLogoClicks] = useState({ count: 0, lastAt: 0 });
  const [modeSequenceBusy, setModeSequenceBusy] = useState(false);
  const [controlProfile, setControlProfile] = useState<ControlProfile | null>(null);
  const [equipmentModels, setEquipmentModels] = useState<string[]>(DEFAULT_EQUIPMENT_MODELS);
  const mapValues = useYujinMapValues();
  const isMobile = useIsMobileViewport();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchControlProfile()
      .then(setControlProfile)
      .catch((error) => console.error("failed to load control profile", error));
  }, []);

  useEffect(() => {
    let alive = true;
    fetchProductSettings()
      .then((settings) => {
        if (alive && Array.isArray(settings.equipment_models)) setEquipmentModels(settings.equipment_models);
      })
      .catch((error) => console.error("failed to load equipment model settings", error));
    const handleSettingsUpdate = (event: Event) => {
      const settings = (event as CustomEvent<ProductSettings>).detail;
      if (settings && Array.isArray(settings.equipment_models)) setEquipmentModels(settings.equipment_models);
    };
    window.addEventListener("product-settings-updated", handleSettingsUpdate);
    return () => {
      alive = false;
      window.removeEventListener("product-settings-updated", handleSettingsUpdate);
    };
  }, []);

  const dashboard = useMemo(
    () => buildDashboardFromMap(
      mapValues,
      controlProfile?.pressure_gap ?? null,
      controlProfile?.main_inverter_unit ?? 0,
      equipmentModels,
    ),
    [controlProfile, equipmentModels, mapValues],
  );
  const runtime = useRuntimeSettings(
    dashboard.lowPressureAlarm !== "none" || dashboard.compressors.some((compressor) => compressor.connected && (compressor.alarm || compressor.fault)),
  );
  const lowPressureText = getLowPressureText(dashboard.lowPressureAlarm);
  const showMainScreen = activeScreen === "main";
  const detailCompressors = useMemo(() => selectDetailCompressors(dashboard.compressors, mapValues), [dashboard.compressors, mapValues]);
  const visibleCompressors = detailCompressors;
  const selectedCompressor = selectedCompressorId
    ? dashboard.compressors.find((compressor) => compressor.id === selectedCompressorId) ?? null
    : null;
  const mainColumnCount = clamp(visibleCompressors.length, 2, 4);
  const handleModeSequenceAction = async (action: ModeSequenceAction) => {
    if (modeSequenceBusy) return;
    setModeSequenceBusy(true);
    try {
      const settings = await fetchModeSettings();
      const nextSettings = buildNextModeSettings(settings, dashboard, action);
      if (nextSettings) await updateModeSettings(nextSettings);
      const writes = buildModeSequenceActionWrites(nextSettings ?? settings, dashboard, action);
      const result = await enqueueMapWriteBatch(`mode_sequence_${action}`, writes);
      await waitForControlCommand(Number(result.id), () => {});
    } catch (error) {
      console.error("mode sequence action failed", error);
    } finally {
      setModeSequenceBusy(false);
    }
  };
  const openDialog = (dialog: ActiveDialog) => {
    if (dialog === "settings") {
      setMenuOpen(false);
      setActiveDialog("password");
      return;
    }
    setActiveDialog(dialog);
  };
  const handleLogoClick = () => {
    const nowMs = Date.now();
    const nextCount = nowMs - adminLogoClicks.lastAt > ADMIN_LOGO_CLICK_WINDOW_MS ? 1 : adminLogoClicks.count + 1;

    if (nextCount >= ADMIN_LOGO_CLICK_COUNT) {
      setAdminLogoClicks({ count: 0, lastAt: 0 });
      setMenuOpen(false);
      setActiveDialog("password");
      return;
    }

    setAdminLogoClicks({ count: nextCount, lastAt: nowMs });
  };
  const handleExportPower = () => exportPowerCsv(mapValues, dashboard.configuredCount);

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-black text-black">
      <section className={`relative overflow-hidden bg-white ${isMobile ? "h-[100dvh] w-full" : "h-[800px] w-[1280px]"}`}>
        {isMobile ? (
          <MobileLayout
            activeScreen={activeScreen}
            alarmMuted={runtime.alarmMuted}
            alarmVisible={runtime.alarmVisible}
            dashboard={dashboard}
            detailCompressors={detailCompressors}
            lowPressureText={lowPressureText}
            modeSequenceBusy={modeSequenceBusy}
            now={now}
            onLogoClick={handleLogoClick}
            onModeSequenceAction={handleModeSequenceAction}
            onOpenCompressorDetail={setSelectedCompressorId}
            onOpenDialog={openDialog}
            onToggleAlarmMute={runtime.toggleAlarmMuted}
            onToggleScreen={() => setActiveScreen((screen) => (screen === "detail" ? "main" : "detail"))}
          />
        ) : (
        <div className="grid h-full grid-rows-[74px_578px_148px]">
          <TopBar dashboard={dashboard} now={now} onLogoClick={handleLogoClick} onOpenMinMax={() => setActiveDialog("minmax")} />

          <section className="relative min-h-0">
            {showMainScreen ? (
              <>
                {visibleCompressors.length > 0 ? (
                  <div
                    className="grid h-full gap-0"
                    style={{
                      gridTemplateColumns: `repeat(${mainColumnCount}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${Math.ceil(visibleCompressors.length / mainColumnCount)}, minmax(0, 1fr))`,
                    }}
                  >
                    {visibleCompressors.map((compressor) => (
                      <CompressorCard alarmVisible={runtime.alarmVisible} key={compressor.id} compressor={compressor} onOpenDetail={setSelectedCompressorId} />
                    ))}
                  </div>
                ) : (
                  <DisconnectBanner />
                )}
                {runtime.alarmVisible && visibleCompressors.length > 0 && lowPressureText ? (
                  <AlarmStrip onClick={dashboard.lowPressureStep === 5 ? () => setActiveDialog("lowpressure") : undefined} tone={dashboard.lowPressureAlarm} text={lowPressureText} />
                ) : null}
              </>
            ) : (
              <DetailScreen dashboard={dashboard} mapValues={mapValues} onOpenCompressorDetail={setSelectedCompressorId} />
            )}
          </section>

          <Footer
            activeScreen={activeScreen}
            alarmMuted={runtime.alarmMuted}
            dashboard={dashboard}
            menuOpen={menuOpen}
            modeSequenceBusy={modeSequenceBusy}
            onOpenDialog={openDialog}
            onExportPower={handleExportPower}
            onModeSequenceAction={handleModeSequenceAction}
            onToggleAlarmMute={runtime.toggleAlarmMuted}
            onToggleDetail={() => setActiveScreen((screen) => (screen === "detail" ? "main" : "detail"))}
            setMenuOpen={setMenuOpen}
          />
        </div>
        )}
        {activeDialog === "cctv" ? <CctvDialog onClose={() => setActiveDialog(null)} /> : null}
        {activeDialog === "minmax" ? <MinMaxDialog mapValues={mapValues} onClose={() => setActiveDialog(null)} /> : null}
        {activeDialog === "lowpressure" ? (
          <LowPressureDialog compressors={dashboard.compressors.slice(0, dashboard.configuredCount)} onClose={() => setActiveDialog(null)} runUnits={dashboard.control.runUnits} />
        ) : null}
        {activeDialog === "settings" ? (
          <SettingsDialog configuredCount={dashboard.configuredCount} level={settingsLevel} mapValues={mapValues} onClose={() => setActiveDialog(null)} />
        ) : null}
        {activeDialog === "control" ? (
          <ControlDialog dashboard={dashboard} onClose={() => setActiveDialog(null)} onControlProfileChange={setControlProfile} />
        ) : null}
        {activeDialog === "password" ? (
          <PasswordDialog
            onClose={() => setActiveDialog(null)}
            onSuccess={(level) => {
              setSettingsLevel(level);
              setActiveDialog("settings");
            }}
          />
        ) : null}
        {selectedCompressor ? (
          <EquipmentDetailDialog
            compressor={selectedCompressor}
            integratedRun={dashboard.integratedRun}
            mapValues={mapValues}
            onClose={() => setSelectedCompressorId(null)}
          />
        ) : null}
        {runtime.dimmed ? (
          <button
            aria-label="화면 깨우기"
            className="absolute inset-0 z-[200] cursor-default bg-black"
            onPointerDown={(event) => {
              event.stopPropagation();
              runtime.wake();
            }}
            style={{ opacity: runtime.dimOpacity }}
            type="button"
          />
        ) : null}
      </section>
    </main>
  );
}

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function buildDashboardFromMap(
  values: Record<string, YujinMapValue>,
  savedPressureGap: number | null = null,
  savedMainInverterUnit = 0,
  equipmentModels: string[] = [],
): DashboardState {
  const oilfreeSelector = liveMapNumber(values, "0006", 0);
  const compressors = Array.from(
    { length: 12 },
    (_, index) => buildCompressorFromMap(values, index, oilfreeSelector, equipmentModels[index]),
  );
  const connectedMask = liveMapNumber(values, "0002", maskFromCompressors(compressors));
  const systemOnline = hasRecentValue(values, "0000", SYSTEM_LINK_GRACE_MS) || hasRecentValue(values, "0002", SYSTEM_LINK_GRACE_MS);
  const displayOrder = readRunSequence(values);
  const mainPressure = scalePressure100(liveMapNumber(values, "0000", 0));
  const mainTemperature = scale10(liveMapNumber(values, "F002", Number.NaN));
  const powerValues = Array.from({ length: Math.min(8, compressors.length) }, (_, index) => liveMapNumber(values, `${(0x31 + index).toString(16).toUpperCase()}12`, Number.NaN));
  const validPowerValues = powerValues.filter(Number.isFinite);
  const optionDevice = liveMapNumber(values, "004A", 0);
  const lowAlarmStep = liveMapNumber(values, "0054", 0);
  const sortModeWord = Math.trunc(liveMapNumber(values, "0024", 0));
  const operationModeWord = Math.trunc(liveMapNumber(values, "0050", 0));
  const repairMask = Math.trunc(liveMapNumber(values, "0058", 0));
  const options = buildOptions(optionDevice);
  const configuredCount = clamp(
    Math.trunc(storedMapNumber(values, "004E", highestSetBit(storedMapNumber(values, "0002", connectedMask)))),
    0,
    compressors.length,
  );
  const connectedCompressors = compressors.map((compressor, index) => ({
    ...compressor,
    connected: systemOnline && Boolean(connectedMask & (1 << index)),
    name: `${index + 1}호기`,
    model: compressor.model,
    repair: Boolean(repairMask & (1 << index)),
    mainInverter:
      (operationModeWord & 0x0001) === 0x0001 &&
      ((sortModeWord >> 8) & 0xff) === 1 &&
      options[1]?.checked === true &&
      savedMainInverterUnit === index + 1,
  }));
  const orderedCompressors = displayOrder
    .flatMap((compNo) => (connectedCompressors[compNo - 1] ? [connectedCompressors[compNo - 1]] : []));

  return {
    ...emptyDashboard,
    integratedRun: (liveMapNumber(values, "0050", 0) & 0x0001) === 0x0001,
    mainPressure,
    mainTemperature,
    totalPower: validPowerValues.length ? validPowerValues.reduce((sum, value) => sum + value, 0) : Number.NaN,
    firmwareVersion: buildFirmwareVersion(values),
    lowPressureAlarm: lowAlarmStep >= 4 && options[7]?.checked ? "reserve" : lowAlarmStep >= 3 ? "warning" : "none",
    lowPressureStep: Math.trunc(lowAlarmStep),
    sortMode: (sortModeWord & 0x0001) === 0x0001 ? "time" : "setting",
    configuredCount,
    control: {
      noLoadPressure: scale10(liveMapNumber(values, "0016", 0)),
      loadPressure: scale10(liveMapNumber(values, "0018", 0)),
      pressureGap: savedPressureGap ?? scale10(liveMapNumber(values, "001A", 0)),
      lowAlarmPressure: scale10(liveMapNumber(values, "001C", 0)),
      runUnits: Math.trunc(liveMapNumber(values, "0026", 0)),
      changeHours: Math.trunc(liveMapNumber(values, "0042", 0)),
      remainMinutes: Math.trunc(liveMapNumber(values, "0048", 0)),
      controlModeWord: Math.trunc(liveMapNumber(values, "0022", 0)),
      sortModeWord,
      operationModeWord,
    },
    options,
    compressors: orderedCompressors,
  };
}

function readRunSequence(values: Record<string, YujinMapValue>) {
  const sequence = MAIN_RUN_SEQUENCE_KEYS.map((key) => Math.trunc(liveMapNumber(values, key, 0))).filter(
    (value) => value >= 1 && value <= 12,
  );
  const uniqueSequence = Array.from(new Set(sequence));
  const fallback = Array.from({ length: 12 }, (_, index) => index + 1).filter((value) => !uniqueSequence.includes(value));

  return [...uniqueSequence, ...fallback];
}

function buildCompressorFromMap(
  values: Record<string, YujinMapValue>,
  index: number,
  oilfreeSelector: number,
  configuredModel?: string,
): CompressorState {
  const compNo = index + 1;
  const oilPrefix = `2${compNo.toString(16).toUpperCase()}`;
  const injectionPrefix = `1${compNo.toString(16).toUpperCase()}`;
  const isOilfree = Boolean(oilfreeSelector & (1 << index));
  const primaryPrefix = isOilfree ? oilPrefix : injectionPrefix;
  const fallbackPrefix = isOilfree ? injectionPrefix : oilPrefix;
  const read = (oilOffset: string, injectionOffset: string = oilOffset, fallbackValue = 0) => {
    const primaryOffset = isOilfree ? oilOffset : injectionOffset;
    const fallbackOffset = isOilfree ? injectionOffset : oilOffset;
    return liveMapNumber(
      values,
      `${primaryPrefix}${primaryOffset}`,
      liveMapNumber(values, `${fallbackPrefix}${fallbackOffset}`, fallbackValue),
    );
  };

  const pressure = scalePressure100(read("00", "00", 0));
  const temperatureRaw = read("0C", "02", 0);
  const temperature = isOilfree ? scaleOilfreeTemperature(temperatureRaw) : scaleInjectionTemperature(temperatureRaw);
  const noLoadPressure = scale10(read("4E", "26", 0));
  const loadPressure = scale10(read("50", "28", 0));
  const controlPressure = scale10(read("46", "20", 0));
  const rpm = Math.trunc(read("38", "04", 0));
  const alarm = read("28", "0A", 0);
  const faultLow = read("2A", "0C", 0);
  const faultHigh = read("2C", "0C", 0);
  const faultInv = read("2E", "0E", 0);
  const runMode = read("3A", "18", 0);
  const cpStatus = read("30", "16", 0);
  const model1 = Math.trunc(read("7C", "74", 0));
  const version1 = Math.trunc(read("7E", "76", 0));
  const version2 = Math.trunc(read("80", "78", 0));
  const runHoursLow = read("9A", "68", 0);
  const runHoursHigh = read("9C", "6A", 0);
  const currentAmps = liveMapNumber(values, `${(0x30 + compNo).toString(16).toUpperCase()}00`, Number.NaN);
  const connected = hasRecentValue(values, `${primaryPrefix}00`, DEVICE_LINK_GRACE_MS) || hasRecentValue(values, `${fallbackPrefix}00`, DEVICE_LINK_GRACE_MS);
  const liveModelName = isOilfree ? getOilfreeModelName(model1, version1, version2) : getInjectionModelName(model1);
  const configuredModelName = normalizeEquipmentModel(configuredModel);
  const modelName = configuredModelName || (connected ? liveModelName : "-");
  const isInverter = configuredModelName
    ? equipmentModelIsInverter(configuredModelName)
    : isOilfree
      ? version1 === 3
      : model1 >= 17 && model1 <= 26;

  return {
    ...emptyCompressor(index),
    model: modelName,
    pressure,
    temperature,
    noLoadPressure,
    loadPressure,
    controlPressure,
    rpm,
    runMode,
    operationStatus: cpStatus,
    local: runMode === 0,
    running: cpStatus > 0 && cpStatus < 7,
    connected,
    alarm: alarm !== 0,
    fault: faultLow !== 0 || faultHigh !== 0 || faultInv !== 0,
    inverter: isInverter,
    isOilfree,
    totalHours: Math.trunc(runHoursHigh * 65536 + runHoursLow),
    currentAmps,
  };
}

function buildFirmwareVersion(values: Record<string, YujinMapValue>) {
  const major = values["015A"]?.value?.trim() ?? "";
  const revision = values["015C"]?.value?.trim() ?? "";
  if (!major && !revision) return "-";
  return `${major}${revision.padStart(4, "0")}`;
}

function getOilfreeModelName(model1: number, version1: number, version2: number) {
  const modelMap = ["55F", "75F", "90F", "110F", "132F", "160F", "190F", "225F", "260F", "135F"];
  const model = modelMap[model1] ?? "";
  if (!model) return "-";

  const cooling = version2 === 1 ? "W" : "A";
  const version = version1 === 1 ? "R" : version1 === 2 ? "S" : version1 === 3 ? "V" : "-";
  return `${model}${cooling}${version}`;
}

function getInjectionModelName(model: number) {
  const modelMap = [
    "11", "15", "15D", "22", "22D", "37", "55", "75", "110", "150", "190", "225", "260", "300", "375", "450", "",
    "37V", "55V", "75V", "110V", "150V", "190V", "225V", "260V", "300V", "22V",
  ];
  return modelMap[model] || "-";
}

function buildOptions(optionDevice: number) {
  const base = emptyDashboard.options;
  const bit = (position: number) => Boolean(optionDevice & (1 << position));

  return base.map((option, index) => {
    return { ...option, checked: bit(index + 2) };
  });
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

function hasRecentValue(values: Record<string, YujinMapValue>, key: string, maxAgeMs = LIVE_VALUE_MAX_AGE_MS) {
  const value = values[key.toUpperCase()];
  return isLiveMapValue(value, maxAgeMs);
}

function isLiveMapValue(value: YujinMapValue | undefined, maxAgeMs = LIVE_VALUE_MAX_AGE_MS) {
  if (!value?.updated_at || value.source === "seed") return false;
  return Date.now() - new Date(value.updated_at).getTime() <= maxAgeMs;
}

function maskFromCompressors(compressors: CompressorState[]) {
  return compressors.reduce((mask, compressor, index) => (compressor.connected ? mask | (1 << index) : mask), 0);
}

function highestSetBit(value: number) {
  let highest = 0;
  for (let bit = 0; bit < 16; bit += 1) {
    if (value & (1 << bit)) highest = bit + 1;
  }
  return highest;
}

function scale10(value: number) {
  if (value === INVALID_DISPLAY_RAW_VALUE) return Number.NaN;
  return Math.round((value / 10) * 10) / 10;
}

function scalePressure100(value: number) {
  if (value === INVALID_DISPLAY_RAW_VALUE) return Number.NaN;
  return Math.round(value) / 100;
}

function scaleInjectionTemperature(value: number) {
  if (value === INVALID_DISPLAY_RAW_VALUE) return Number.NaN;
  const normalized = value > 2000 ? -(value - 2000) : value;
  return scale10(normalized);
}

function scaleOilfreeTemperature(value: number) {
  if (value === INVALID_DISPLAY_RAW_VALUE) return Number.NaN;
  return value;
}

function formatScaledValue(value: number | undefined, unit: string, digits = 1) {
  if (value === undefined || !Number.isFinite(value)) return "---";
  return `${value.toFixed(digits)} ${unit}`;
}

function formatIntegerValue(value: number | undefined, unit = "") {
  if (value === undefined || !Number.isFinite(value) || value === INVALID_DISPLAY_RAW_VALUE) return "---";
  const formatted = Math.trunc(value).toLocaleString("ko-KR");
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatEditableScaledValue(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function setWordLowByte(word: number, lowByte: number) {
  return (Math.trunc(word) & 0xff00) | (lowByte & 0xff);
}

function setWordHighByte(word: number, highByte: number) {
  return ((highByte & 0xff) << 8) | (Math.trunc(word) & 0x00ff);
}

function TopBar({ dashboard, now, onLogoClick, onOpenMinMax }: { dashboard: DashboardState; now: Date; onLogoClick: () => void; onOpenMinMax: () => void }) {
  return (
    <header className="grid min-h-0 grid-cols-[241px_241px_241px_65px_241px_241px] gap-[2px]">
      <TopRunPanel running={dashboard.integratedRun} />
      <TopPressurePanel onClick={onOpenMinMax} value={dashboard.mainPressure} />
      <TopPanel tone="date">
        <span>{formatDateTime(now)}</span>
        <small>App {dashboard.appVersion} / Fw {dashboard.firmwareVersion}</small>
      </TopPanel>
      <TopPanel tone="lock">
        <img src="/unlock.png" alt="unlock" className="h-[58px] w-[58px] object-contain" />
      </TopPanel>
      <TopPanel tone="title">
        <span>컴프레샤</span>
        <span>통합제어 시스템</span>
        <small className="mt-[2px] text-[10px]">온도 {Number.isFinite(dashboard.mainTemperature) ? `${dashboard.mainTemperature.toFixed(1)}℃` : "---"} / 전력 {Number.isFinite(dashboard.totalPower) ? `${Math.round(dashboard.totalPower).toLocaleString("ko-KR")}W` : "---"}</small>
      </TopPanel>
      <button
        aria-label="관리자 비밀번호 화면"
        className="flex min-h-0 items-center justify-center overflow-hidden bg-white px-[3px]"
        onClick={onLogoClick}
        type="button"
      >
        <img src="/grid_logo3.png" alt="GRID" className="h-[72px] w-full object-contain" />
      </button>
    </header>
  );
}

function TopRunPanel({ running }: { running: boolean }) {
  return (
    <TopPanel tone={running ? "run" : "stop"} emphasis>
      <span className="block w-full text-center text-[13px] font-black leading-none tracking-[0.12em] text-white/90">통합 운전</span>
      <span className="mt-[5px] block w-full text-center text-[31px] font-black leading-none tracking-[-0.04em] text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.16)]">
        {running ? "운전 중" : "정 지"}
      </span>
    </TopPanel>
  );
}

function TopPressurePanel({ onClick, value }: { onClick: () => void; value: number }) {
  const hasValue = Number.isFinite(value);

  return (
    <button className="min-h-0" onClick={onClick} title="압력/온도 최소·최대 보기" type="button">
      <TopPanel tone="pressure" emphasis>
        <span className="block w-full text-center text-[13px] font-black leading-none tracking-[0.14em] text-[#1b5c96]">메인 압력</span>
        <span className="mt-[3px] grid w-full grid-cols-[42px_1fr_42px] items-end leading-none text-[#083f73] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]">
          <span />
          <strong className="text-center font-black tabular-nums tracking-[-0.07em] text-[38px]">{hasValue ? value.toFixed(2) : "---"}</strong>
          <small className="pb-[5px] text-left text-[17px] font-black tracking-[-0.03em]">{hasValue ? "bar" : ""}</small>
        </span>
      </TopPanel>
    </button>
  );
}

function TopPanel({
  tone,
  emphasis = false,
  children,
}: {
  tone: "run" | "stop" | "pressure" | "date" | "lock" | "title";
  emphasis?: boolean;
  children: ReactNode;
}) {
  const toneClass = {
    run: "border-[#ff7900] bg-[#ff7900]",
    stop: "border-[#6698dd] bg-[#6698dd]",
    pressure: "border-[#8ec3f5] bg-[#8ec3f5]",
    date: "border-[#3374ce] bg-[#3374ce]",
    lock: "border-[#6698dd] bg-[#6698dd]",
    title: "border-[#0d4da5] bg-[#0d4da5]",
  }[tone];

  return (
    <div
      className={`flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-[4px] border px-[4px] text-center font-bold leading-tight text-white ${emphasis ? "text-[21px]" : "text-[23px]"} ${toneClass}`}
    >
      {children}
    </div>
  );
}

function CompressorCard({ alarmVisible, compressor, onOpenDetail }: { alarmVisible: boolean; compressor: CompressorState; onOpenDetail: (id: number) => void }) {
  const pressureLabel = compressor.inverter ? "설정압력" : "무부하/부하";
  const secondValue = !compressor.connected
    ? "--- bar"
    : compressor.inverter
    ? formatScaledValue(compressor.controlPressure, "bar")
    : formatScaledValue(compressor.noLoadPressure, "bar");
  const thirdValue = !compressor.connected
    ? compressor.inverter ? "--- rpm" : "--- bar"
    : compressor.inverter ? formatIntegerValue(compressor.rpm, "rpm") : formatScaledValue(compressor.loadPressure, "bar");
  const titleTone = compressorTitleTone(compressor.id);

  return (
    <button
      className="relative min-h-0 overflow-hidden bg-white text-left"
      onClick={() => onOpenDetail(compressor.id)}
      type="button"
    >
      <div className="grid h-full grid-rows-[42px_1fr_1fr_1fr_1fr_1fr_1fr] gap-[2px] border border-[#75b4ee] bg-[#d8ecff] p-[2px] shadow-[inset_0_0_0_1px_#ffffff]">
        <div
          className="flex items-center justify-center overflow-hidden border border-[#75b4ee] px-[6px] text-center text-[20px] font-bold leading-none shadow-[2px_2px_1px_#ababab]"
          style={{ backgroundColor: titleTone.background, color: titleTone.color }}
        >
          {compressor.name} ({compressor.connected ? compressor.model : "---"})
        </div>
        <MetricRow label="압력" value={compressor.connected ? formatScaledValue(compressor.pressure, "bar", 2) : "--- bar"} />
        <TripleRow label={pressureLabel} valueA={secondValue} valueB={thirdValue} />
        <MetricRow label="온도" value={compressor.connected ? formatScaledValue(compressor.temperature, "℃") : "--- ℃"} />
        <MetricRow label="전류" value={compressor.connected && Number.isFinite(compressor.currentAmps) ? formatScaledValue(compressor.currentAmps, "A") : "--- A"} />
        <div className="relative grid grid-cols-2 gap-[2px]">
          <StatusCell tone={compressor.connected && compressor.local ? "local" : "remote"}>{compressor.connected ? formatRunMode(compressor.runMode) : "---"}</StatusCell>
          <StatusCell tone={compressor.connected && compressor.running ? "running" : "stop"}>{compressor.connected ? formatOperationStatus(compressor.operationStatus) : "통신 불량"}</StatusCell>
          {compressor.repair ? <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#ffe35b] text-[25px] font-black text-[#111827]">정 비</div> : null}
          {alarmVisible ? <StatusFlagOverlay alarm={compressor.alarm} fault={compressor.fault} /> : null}
        </div>
        <MetricRow label="총 운전시간" value={compressor.connected ? formatIntegerValue(compressor.totalHours, "hr") : "--- hr"} />
        {compressor.mainInverter ? <div className="absolute right-[6px] top-[48px] z-20 rounded-[5px] bg-[#7b2cbf] px-[8px] py-[4px] text-[12px] font-black text-white">MAIN INV</div> : null}
      </div>
    </button>
  );
}

function formatRunMode(runMode: number) {
  return ["로 컬", "리모트", "스케쥴", "스케쥴 대기"][Math.trunc(runMode)] ?? "---";
}

function formatOperationStatus(operationStatus: number) {
  const labels = ["정 지", "자동 정지", "운전 시작", "운전 시작", "운전 시작", "무부하", "부 하", "정지 지연", "에어 배기"];
  return labels[Math.trunc(operationStatus)] ?? "---";
}

function DisconnectBanner() {
  return (
    <div className="flex h-full items-center justify-center bg-[#f1f3f5]">
      <div className="flex h-[114px] w-full items-center justify-center border-y border-[#b8c0c7] bg-[#9aa2aa] text-[57px] font-black leading-none tracking-[0.26em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
        DISCONNECT
      </div>
    </div>
  );
}

function compressorTitleTone(id: number) {
  const tones = [
    { background: "#b9dcff", color: "#0d4da5" },
    { background: "#9fcbf7", color: "#083f7d" },
    { background: "#82b8ec", color: "#063a74" },
    { background: "#66a4df", color: "#ffffff" },
    { background: "#4f91d2", color: "#ffffff" },
    { background: "#3c7fc5", color: "#ffffff" },
    { background: "#2c6bb0", color: "#ffffff" },
    { background: "#205895", color: "#ffffff" },
  ];
  return tones[(Math.max(1, id) - 1) % tones.length];
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-0 grid-cols-[96px_1fr_1fr] gap-[3px]">
      <MetricLabel>{label}</MetricLabel>
      <MetricValue className="col-span-2">
        {value}
      </MetricValue>
    </div>
  );
}

function TripleRow({ label, valueA, valueB }: { label: string; valueA: string; valueB: string }) {
  return (
    <div className="grid min-h-0 grid-cols-[96px_1fr_1fr] gap-[3px]">
      <MetricLabel>{label}</MetricLabel>
      <MetricValue compact>{valueA}</MetricValue>
      <MetricValue compact>{valueB}</MetricValue>
    </div>
  );
}

function MetricLabel({ children }: { children: string }) {
  return (
    <div className="flex min-h-0 items-center justify-center overflow-hidden border border-[#75b4ee] bg-[#b0d2ff] px-[4px] text-center text-[17px] font-bold leading-tight text-[#13243a]">
      <MetricLabelText label={children} />
    </div>
  );
}

function MetricLabelText({ label }: { label: string }) {
  const compactLabel = label.replace(/\s+/g, "");
  const shouldDistribute = compactLabel.length <= 5 && !compactLabel.includes("/");

  if (!shouldDistribute) {
    return <span className="text-[15px] tracking-[-0.04em]">{label}</span>;
  }

  return (
    <span aria-label={label} className="flex w-[72px] items-center justify-between whitespace-pre">
      {compactLabel.split("").map((char, index) => (
        <span key={`${char}-${index}`}>{char}</span>
      ))}
    </span>
  );
}

function MetricValue({
  children,
  compact = false,
  className = "",
}: {
  children: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-0 items-center justify-end overflow-hidden border border-[#75b4ee] bg-white px-[10px] text-right font-bold leading-tight tracking-[-0.01em] ${compact ? "text-[18px]" : "text-[23px]"} ${className}`}
    >
      {children}
    </div>
  );
}

function StatusCell({ tone, children }: { tone: "local" | "remote" | "running" | "stop"; children: ReactNode }) {
  const toneClass = {
    local: "bg-[#4caa70] text-white",
    remote: "bg-[#4caa70] text-white",
    running: "bg-[#e42222] text-white",
    stop: "bg-[#bdbdbd] text-black",
  }[tone];

  return (
    <div className={`flex min-h-0 items-center justify-center overflow-hidden border border-[#75b4ee] px-[2px] text-center text-[23px] font-bold leading-none tracking-[-0.04em] ${toneClass}`}>
      {children}
    </div>
  );
}

function StatusFlagOverlay({ alarm, fault }: { alarm: boolean; fault: boolean }) {
  if (!alarm && !fault) return null;
  if (alarm && fault) {
    return (
      <div className="status-flag-blink absolute inset-0 z-20 grid grid-cols-2 gap-[2px] bg-[#d8ecff]">
        <FlagCell tone="alarm">알 림</FlagCell>
        <FlagCell tone="fault">고 장</FlagCell>
      </div>
    );
  }

  return (
    <div className="status-flag-blink absolute inset-0 z-20 grid bg-[#d8ecff]">
      <FlagCell tone={alarm ? "alarm" : "fault"}>{alarm ? "알 림" : "고 장"}</FlagCell>
    </div>
  );
}

function FlagCell({ tone, children }: { tone: "alarm" | "fault"; children: ReactNode }) {
  const activeClass = tone === "alarm" ? "bg-[#ffff00] text-black" : "bg-[#ff4f4f] text-black";

  return (
    <div className={`flex min-h-0 items-center justify-center overflow-hidden border border-[#75b4ee] px-[2px] text-center text-[23px] font-black leading-none tracking-[-0.04em] ${activeClass}`}>
      {children}
    </div>
  );
}

function AlarmStrip({ onClick, tone, text }: { onClick?: () => void; tone: DashboardState["lowPressureAlarm"]; text: string }) {
  const toneClass = tone === "reserve" ? "text-[#1c55cc]" : "text-[#d90000]";

  return (
    <button className={`absolute bottom-0 left-0 right-0 z-10 h-[44px] bg-[#c1c1c1] text-center text-[30px] font-black leading-[44px] ${toneClass}`} disabled={!onClick} onClick={onClick} type="button">
      {text}
    </button>
  );
}

function Footer({
  activeScreen,
  alarmMuted,
  dashboard,
  menuOpen,
  modeSequenceBusy,
  onOpenDialog,
  onExportPower,
  onModeSequenceAction,
  onToggleAlarmMute,
  onToggleDetail,
  setMenuOpen,
}: {
  activeScreen: ActiveScreen;
  alarmMuted: boolean;
  dashboard: DashboardState;
  menuOpen: boolean;
  modeSequenceBusy: boolean;
  onOpenDialog: (dialog: ActiveDialog) => void;
  onExportPower: () => void;
  onModeSequenceAction: (action: ModeSequenceAction) => void;
  onToggleAlarmMute: () => void;
  onToggleDetail: () => void;
  setMenuOpen: (open: boolean) => void;
}) {
  return (
    <footer className="relative z-40 grid min-h-0 grid-cols-[45px_216px_45px_282px_45px_558px_66px] gap-[2px] overflow-visible bg-white p-[3px]">
      <VerticalTitle>모드</VerticalTitle>
      <ModePanel active={dashboard.sortMode} busy={modeSequenceBusy} onAction={onModeSequenceAction} />
      <VerticalTitle>통합제어</VerticalTitle>
      <ControlPanel control={dashboard.control} />
      <VerticalTitle>옵션</VerticalTitle>
      <OptionPanel options={dashboard.options} />
      <QuickButtons
        activeScreen={activeScreen}
        alarmMuted={alarmMuted}
        menuOpen={menuOpen}
        onExportPower={onExportPower}
        onOpenDialog={onOpenDialog}
        onToggleAlarmMute={onToggleAlarmMute}
        onToggleDetail={onToggleDetail}
        setMenuOpen={setMenuOpen}
      />
    </footer>
  );
}

function VerticalTitle({ children }: { children: string }) {
  return (
    <div className="flex min-h-0 items-center justify-center whitespace-pre-line rounded-[5px] border border-[#6698dd] bg-[#6698dd] text-center text-[24px] font-bold leading-tight text-white">
      {children.split("").join("\n")}
    </div>
  );
}

function ModePanel({
  active,
  busy,
  onAction,
}: {
  active: DashboardState["sortMode"];
  busy: boolean;
  onAction: (action: ModeSequenceAction) => void;
}) {
  return (
    <div className="grid min-h-0 grid-rows-2 gap-[4px] border border-[#9fc9fa] bg-[#eef7ff] p-[3px]">
      <div className="grid grid-cols-2 gap-[4px]">
        <ModeButton active={active === "setting"}>설정순</ModeButton>
        <ModeButton active={active === "time"}>시간순</ModeButton>
      </div>
      <div className="grid grid-cols-3 gap-[4px]">
        <IconButton disabled={busy} label="이전" onClick={() => onAction("previous")} src="/arrow_back_ios_new_24dp.png" />
        <IconButton disabled={busy} label="새로고침" onClick={() => onAction("refresh")} src="/refresh_24dp.png" />
        <IconButton disabled={busy} label="다음" onClick={() => onAction("next")} src="/arrow_forward_ios_24dp.png" />
      </div>
    </div>
  );
}

function ModeButton({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <button
      className={`rounded-[6px] border text-[22px] font-bold shadow-[1px_1px_1px_#c2c2c2] ${
        active ? "border-[#3374ce] bg-[#3374ce] text-white" : "border-[#3374ce] bg-white text-[#3374ce]"
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

function IconButton({ disabled = false, label, onClick, src }: { disabled?: boolean; label: string; onClick?: () => void; src: string }) {
  return (
    <button
      aria-label={label}
      className="flex items-center justify-center rounded-[6px] border border-[#9fc9fa] bg-white shadow-[1px_1px_1px_#c2c2c2] disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <img src={src} alt="" className="h-[42px] w-[42px] object-contain" />
    </button>
  );
}

function ControlPanel({ control }: { control: DashboardState["control"] }) {
  const items = [
    { label: "무부하", value: formatScaledValue(control.noLoadPressure, "bar") },
    { label: "부하", value: formatScaledValue(control.loadPressure, "bar") },
    { label: "압력차", value: formatScaledValue(control.pressureGap, "bar") },
    { label: "가동대수", value: `${control.runUnits} ea` },
    { label: "교환운전", value: `${control.changeHours} hr` },
    { label: "남은시간", value: `${control.remainMinutes} min` },
  ];

  return (
    <div className="grid min-h-0 grid-cols-3 grid-rows-2 gap-0 border border-[#75b4ee] bg-white">
      {items.map((item) => (
        <div key={item.label} className="grid min-h-0 grid-rows-[32px_1fr] border border-[#75b4ee]">
          <div className="flex items-center justify-center border-b border-[#75b4ee] bg-[#8ec3f5] text-center text-[16px] font-bold text-white">
            {item.label}
          </div>
          <div className="flex items-center justify-center bg-white px-[6px] text-center text-[22px] font-bold">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function OptionPanel({ options }: { options: DashboardState["options"] }) {
  return (
    <div className="grid min-h-0 grid-cols-3 grid-rows-5 gap-x-[6px] gap-y-[2px] overflow-hidden border border-[#9fc9fa] bg-[#fbfdff] px-[7px] py-[5px]">
      {options
        .filter((option) => option.visible !== false)
        .map((option) => (
          <label key={option.label} className="flex min-h-0 items-center gap-[4px] overflow-hidden text-[12px] font-semibold leading-tight">
            <input checked={option.checked} className="h-[14px] w-[14px] shrink-0 accent-[#3175ce]" readOnly type="checkbox" />
            <span className="line-clamp-2">{option.label}</span>
          </label>
        ))}
    </div>
  );
}

function DialogShell({
  children,
  onClose,
  subtitle = "설정을 확인하고 필요한 항목을 조정하세요",
  title,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
  wide?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-[24px] max-sm:p-[8px]">
      <section className={`${wide ? "w-[1040px]" : "w-[560px]"} max-sm:max-h-[calc(100dvh-16px)] max-sm:w-full overflow-hidden rounded-[12px] border border-[#d3e0eb] bg-[#f6f9fc] shadow-[0_14px_34px_rgba(15,43,72,0.32)]`}>
        <div className="flex h-[74px] items-center justify-between border-b border-[#dbe7f1] bg-white px-[22px] max-sm:h-[64px] max-sm:px-[14px]">
          <div>
            <div className="text-[26px] font-black leading-none text-[#173f69] max-sm:text-[21px]">{title}</div>
            <div className="mt-[7px] text-[13px] font-bold text-[#6f879d] max-sm:hidden">{subtitle}</div>
          </div>
          <DialogCloseButton onClick={onClose} />
        </div>
        {children}
      </section>
    </div>
  );
}

function DialogCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="닫기"
      className="flex h-[42px] w-[42px] items-center justify-center rounded-[8px] border border-[#cfdde8] bg-[#f3f7fa] text-[28px] font-black leading-none text-[#45657f] transition-colors hover:bg-[#e8f0f6]"
      onClick={onClick}
      type="button"
    >
      ×
    </button>
  );
}

function ControlDialog({
  dashboard,
  onClose,
  onControlProfileChange,
}: {
  dashboard: DashboardState;
  onClose: () => void;
  onControlProfileChange: (profile: ControlProfile) => void;
}) {
  const [sortMode, setSortMode] = useState<"setting" | "time">((dashboard.control.sortModeWord & 0x00ff) === 1 ? "time" : "setting");
  const [operationMode, setOperationMode] = useState<"local" | "remote">(((dashboard.control.operationModeWord >> 8) & 0xff) === 0 ? "local" : "remote");
  const [controlMode, setControlMode] = useState<"single" | "group">(dashboard.control.controlModeWord === 1 ? "group" : "single");
  const initialSettings = {
    noLoadPressure: formatEditableScaledValue(dashboard.control.noLoadPressure),
    loadPressure: formatEditableScaledValue(dashboard.control.loadPressure),
    lowAlarmPressure: formatEditableScaledValue(dashboard.control.lowAlarmPressure),
    changeHours: String(dashboard.control.changeHours),
    runUnits: String(dashboard.control.runUnits),
  };
  const [settings, setSettings] = useState(initialSettings);
  const [appliedSettings, setAppliedSettings] = useState(initialSettings);
  const [commandStatus, setCommandStatus] = useState("명령 대기 중");
  const [commandBusy, setCommandBusy] = useState(false);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const [stopEquipmentOnGroupStop, setStopEquipmentOnGroupStop] = useState(!dashboard.options[12]?.checked);
  const [activeControlKey, setActiveControlKey] = useState<keyof typeof settings | null>(null);
  const [replaceNextKeypadInput, setReplaceNextKeypadInput] = useState(false);
  const controls: Array<{
    address: number;
    key: keyof typeof settings;
    label: string;
    scale: number;
    step: string;
    unit: string;
  }> = [
    { label: "무부하 압력", key: "noLoadPressure", unit: "bar", step: "0.1", address: 0x16, scale: 10 },
    { label: "부하 압력", key: "loadPressure", unit: "bar", step: "0.1", address: 0x18, scale: 10 },
    { label: "저압경보 압력 설정", key: "lowAlarmPressure", unit: "bar", step: "0.1", address: 0x1c, scale: 10 },
    { label: "교환 운전 시간", key: "changeHours", unit: "hr", step: "1", address: 0x42, scale: 1 },
    { label: "가동 대수", key: "runUnits", unit: "ea", step: "1", address: 0x26, scale: 1 },
  ];
  const updateSetting = (key: keyof typeof settings, value: string) => {
    const integerOnly = key === "changeHours" || key === "runUnits";
    setSettings((current) => ({ ...current, [key]: sanitizeNumericInput(value, integerOnly) }));
  };
  const activeControl = activeControlKey ? controls.find((item) => item.key === activeControlKey) : undefined;
  const appendKeypadValue = (value: string) => {
    if (!activeControlKey) return;
    const integerOnly = activeControlKey === "changeHours" || activeControlKey === "runUnits";
    setSettings((current) => {
      const currentValue = replaceNextKeypadInput ? "" : current[activeControlKey];
      const nextValue = value === "." && (integerOnly || currentValue.includes("."))
        ? currentValue
        : `${currentValue}${value}`;
      return { ...current, [activeControlKey]: sanitizeNumericInput(nextValue, integerOnly) };
    });
    setReplaceNextKeypadInput(false);
  };
  const backspaceKeypadValue = () => {
    if (!activeControlKey) return;
    setSettings((current) => ({ ...current, [activeControlKey]: current[activeControlKey].slice(0, -1) }));
    setReplaceNextKeypadInput(false);
  };
  const clearKeypadValue = () => {
    if (!activeControlKey) return;
    setSettings((current) => ({ ...current, [activeControlKey]: "" }));
    setReplaceNextKeypadInput(false);
  };
  const confirmKeypadValue = async () => {
    if (!activeControlKey) return;
    const key = activeControlKey;
    setActiveControlKey(null);
    await applySetting(key);
  };
  const closeKeypad = () => {
    setActiveControlKey(null);
    setReplaceNextKeypadInput(false);
  };
  const numberValue = (key: keyof typeof settings) => {
    if (settings[key].trim() === "") throw new Error(`${key} 값이 비어 있습니다`);
    const value = Number(settings[key]);
    if (!Number.isFinite(value)) throw new Error(`${key} 값이 올바르지 않습니다`);
    return value;
  };

  const sendControlWrites = async (
    label: string,
    source: string,
    writes: MapWrite[],
  ) => {
    let commandId: number | null = null;
    setCommandBusy(true);
    setCommandStatus(`${label} 명령 전송 중...`);
    try {
      const result = await enqueueMapWriteBatch(source, writes);
      commandId = Number(result.id);
      setCommandStatus(`${label} #${commandId} 전송 대기...`);
      await waitForControlCommand(commandId, (status) => {
        if (status.status === "pending") setCommandStatus(`${label} #${commandId} 대기 중...`);
        if (status.status === "in_progress") setCommandStatus(`${label} #${commandId} 장비 전송 중...`);
        if (status.status === "completed") setCommandStatus(`${label} #${commandId} 전송 완료`);
      });
      return true;
    } catch (error) {
      if (error instanceof ControlStatusUnsupportedError && commandId !== null) {
        setCommandStatus(`${label} #${commandId} 등록됨 / backend 갱신 필요`);
        return true;
      }
      if (error instanceof ControlStatusDelayedError) {
        setCommandStatus(`${label} #${error.commandId} 등록됨 / 완료 확인 지연`);
        return true;
      }
      setCommandStatus(`${label} 실패: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      setCommandBusy(false);
    }
  };

  const sendGroupOperation = async (action: "run" | "stop", stopEquipment = true) => {
    if (action === "run") {
      const configured = dashboard.compressors.slice(0, dashboard.configuredCount);
      const targetCount = clamp(Math.trunc(Number(settings.runUnits) || 0), 0, configured.length);
      const targets = configured.slice(0, targetCount);
      const invalid = targets.find((compressor) =>
        !compressor.connected || compressor.repair || compressor.fault || (dashboard.options[9]?.checked && compressor.local),
      );
      if (invalid) {
        const reason = !invalid.connected ? "통신 불량" : invalid.repair ? "정비 중" : invalid.fault ? "고장 발생" : "LOCAL 상태";
        setCommandStatus(`${invalid.id}호기 ${reason}: 통합운전을 시작할 수 없습니다`);
        return;
      }
      if (targets.length === 0) {
        setCommandStatus("통합운전 대상 장비가 없습니다");
        return;
      }
    }
    let commandId: number | null = null;
    setCommandBusy(true);
    setCommandStatus(action === "run" ? "통합운전 명령 전송 중..." : "통합정지 명령 전송 중...");
    try {
      const result = await enqueueGroupOperation(action, stopEquipment);
      commandId = Number(result.id);
      setCommandStatus(`명령 #${commandId} 전송 대기...`);
      await waitForControlCommand(commandId, (status) => {
        if (status.status === "pending") setCommandStatus(`명령 #${commandId} 대기 중...`);
        if (status.status === "in_progress") setCommandStatus(`명령 #${commandId} 장비 전송 중...`);
        if (status.status === "completed") setCommandStatus(`명령 #${commandId} 전송 완료`);
      }, 180_000);
    } catch (error) {
      if (error instanceof ControlStatusUnsupportedError && commandId !== null) setCommandStatus(`명령 #${commandId} 등록됨 / backend 갱신 필요`);
      else if (error instanceof ControlStatusDelayedError) setCommandStatus(`명령 #${error.commandId} 등록됨 / 완료 확인 지연`);
      else setCommandStatus(`명령 전송 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCommandBusy(false);
    }
  };

  const toggleStopEquipmentOption = async () => {
    const next = !stopEquipmentOnGroupStop;
    const optionWord = dashboard.options.reduce((word, option, index) => option.checked ? word | (1 << (index + 2)) : word, 0);
    const nextWord = next ? optionWord & ~(1 << 14) : optionWord | (1 << 14);
    const success = await sendControlWrites("통합정지 장비 동작", "control_dialog_stop_equipment_option", [
      { key: "004A", address: 0x4a, length: 2, value: nextWord },
    ]);
    if (success) setStopEquipmentOnGroupStop(next);
  };
  const openStopConfirm = () => setStopConfirmOpen(true);

  const applySetting = async (key: keyof typeof settings) => {
    const control = controls.find((item) => item.key === key);
    if (!control) return;
    if (settings[key] === appliedSettings[key]) return;
    try {
      const value = numberValue(key);
      const packetValue = Math.round(value * control.scale);
      const success = await sendControlWrites(control.label, "control_dialog_setting", [
        {
          key: control.address.toString(16).padStart(4, "0").toUpperCase(),
          address: control.address,
          length: 2,
          value: packetValue,
        },
      ]);
      if (success) {
        setAppliedSettings((current) => ({ ...current, [key]: settings[key] }));
      }
    } catch (error) {
      setCommandStatus(`${control.label} 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const selectSortMode = async (nextMode: "setting" | "time") => {
    if (nextMode === sortMode) return;
    const previous = sortMode;
    setSortMode(nextMode);
    const success = await sendControlWrites("운전 조건", "control_dialog_sort_mode", [
      {
        key: "0024",
        address: 0x24,
        length: 2,
        value: setWordLowByte(dashboard.control.sortModeWord, nextMode === "time" ? 1 : 0),
      },
    ]);
    if (!success) setSortMode(previous);
  };

  const selectOperationMode = async (nextMode: "local" | "remote") => {
    if (nextMode === operationMode) return;
    if (dashboard.integratedRun) {
      setCommandStatus("통합 운전중에는 운전 위치를 변경할 수 없습니다");
      return;
    }

    const previous = operationMode;
    setOperationMode(nextMode);

    const success = await sendControlWrites("운전 위치", "control_dialog_operation_mode", [
      {
        key: "0050",
        address: 0x50,
        length: 2,
        value: setWordHighByte(dashboard.control.operationModeWord, nextMode === "local" ? 0 : 1),
      },
    ]);
    if (!success) setOperationMode(previous);
  };

  const selectControlMode = async (nextMode: "single" | "group") => {
    if (nextMode === controlMode) return;
    if (dashboard.integratedRun) {
      setCommandStatus("통합 운전중에는 제어 모드를 변경할 수 없습니다");
      return;
    }

    const previous = controlMode;
    setControlMode(nextMode);

    const success = await sendControlWrites("제어 모드", "control_dialog_control_mode", [
      {
        key: "0022",
        address: 0x22,
        length: 2,
        value: nextMode === "group" ? 1 : 0,
      },
    ]);
    if (!success) setControlMode(previous);
  };
  const showCommandStatus = commandBusy || commandStatus !== "명령 대기 중";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-[24px] max-sm:p-[8px]">
      <section className="w-[1080px] overflow-hidden rounded-[12px] border border-[#d3e0eb] bg-[#f6f9fc] shadow-[0_14px_34px_rgba(15,43,72,0.32)] max-sm:max-h-[calc(100dvh-16px)] max-sm:w-full">
        <div className="flex h-[86px] items-center justify-between border-b border-[#dbe7f1] bg-white px-[22px] max-sm:h-[64px] max-sm:px-[14px]">
          <div className="flex items-center gap-[14px]">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-[#eaf4fc] max-sm:h-[42px] max-sm:w-[42px]">
              <img src="/control.png" alt="" className="h-[36px] w-[36px] object-contain" />
            </span>
            <span>
              <span className="block text-[27px] font-black leading-none text-[#173f69] max-sm:text-[21px]">통합운전 설정</span>
              <span className="mt-[7px] block text-[14px] font-bold text-[#6f879d] max-sm:hidden">운전 조건과 그룹 제어를 한 화면에서 관리합니다</span>
            </span>
          </div>
          <DialogCloseButton onClick={onClose} />
        </div>
        <div className="grid grid-cols-[1fr_300px] gap-[14px] p-[16px] max-sm:max-h-[calc(100dvh-134px)] max-sm:grid-cols-1 max-sm:overflow-y-auto max-sm:p-[12px]">
          <div className="grid gap-[12px]">
            <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[12px]">
              <PanelHeading eyebrow="CONTROL VALUES">제어 기준값</PanelHeading>
              <div className="mt-[10px] grid grid-cols-3 gap-[9px] max-sm:grid-cols-1">
                {controls.map(({ key, label, unit }) => (
                  <div key={label} className="rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[10px]">
                    <div className="text-[14px] font-black text-[#6f879d]">{label}</div>
                    <label className="mt-[7px] flex items-end justify-between gap-[8px]">
                      <input
                        className="min-w-0 flex-1 rounded-[6px] border border-[#c9deef] bg-white px-[8px] py-[5px] text-right text-[24px] font-black leading-none text-[#173f69] outline-none focus:border-[#237bd0]"
                        autoComplete="off"
                        disabled={commandBusy}
                        enterKeyHint="done"
                        inputMode={key === "changeHours" || key === "runUnits" ? "numeric" : "decimal"}
                        onBlur={() => {
                          void applySetting(key);
                          window.setTimeout(() => {
                            setActiveControlKey((current) => (current === key ? null : current));
                          }, 120);
                        }}
                        onChange={(event) => updateSetting(key, event.target.value)}
                        onFocus={(event) => {
                          setActiveControlKey(key);
                          setReplaceNextKeypadInput(true);
                          event.currentTarget.select();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                        pattern={key === "changeHours" || key === "runUnits" ? "[0-9]*" : "[0-9.]*"}
                        type="text"
                        value={settings[key]}
                      />
                      <span className="text-[14px] font-black text-[#6f879d]">{unit}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <ControlAdvancedPanel
              compressors={dashboard.compressors.slice(0, dashboard.configuredCount)}
              disabled={commandBusy || dashboard.integratedRun}
              energyMode={((dashboard.control.sortModeWord >> 8) & 0xff) === 1}
              onProfileChange={onControlProfileChange}
              onStatus={setCommandStatus}
              sortModeWord={dashboard.control.sortModeWord}
            />
            <div className="grid grid-cols-1 gap-[12px]">
              <div className="grid min-h-[104px] grid-rows-[40px_1fr] rounded-[10px] border border-[#d9e6f0] bg-white p-[12px]">
                <PanelHeading eyebrow="SORT MODE">운전 조건</PanelHeading>
                <div className="mt-[10px] grid content-start gap-[8px]">
                  <SegmentedOption
                    items={[
                      ["setting", "설정순"],
                      ["time", "시간순"],
                    ]}
                    disabled={commandBusy}
                    selected={sortMode}
                    onSelect={(value) => selectSortMode(value as "setting" | "time")}
                  />
                </div>
              </div>
            </div>
          </div>
          <aside className="grid min-h-[334px] grid-rows-[40px_auto_1fr_auto] rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
            <PanelHeading eyebrow="ACTION">통합운전</PanelHeading>
            <div className="mt-[11px] grid content-start gap-[10px]">
              <div className="grid gap-[6px]">
                <span className="text-[13px] font-black text-[#6f879d]">운전 위치</span>
                <SegmentedOption
                  items={[
                    ["local", "LOCAL"],
                    ["remote", "REMOTE"],
                  ]}
                  disabled={commandBusy}
                  selected={operationMode}
                  onSelect={(value) => selectOperationMode(value as "local" | "remote")}
                />
              </div>
              <label className="flex min-h-[42px] items-center justify-between rounded-[7px] border border-[#d9e6f0] bg-[#f8fbfd] px-[10px] text-[13px] font-black text-[#244c75]">
                <span>통합정지 시 장비도 정지</span>
                <input checked={stopEquipmentOnGroupStop} className="h-[20px] w-[20px] accent-[#237bd0]" disabled={commandBusy} onChange={() => void toggleStopEquipmentOption()} type="checkbox" />
              </label>
              <div className="grid gap-[6px]">
                <span className="text-[13px] font-black text-[#6f879d]">제어 모드</span>
                <SegmentedOption
                  items={[
                    ["single", "개별"],
                    ["group", "통합"],
                  ]}
                  disabled={commandBusy}
                  selected={controlMode}
                  onSelect={(value) => selectControlMode(value as "single" | "group")}
                />
              </div>
            </div>
            <div />
            <div className="grid gap-[8px] pt-[12px]">
              <button className="h-[68px] rounded-[8px] bg-[#d92525] text-[31px] font-black text-white shadow-[0_5px_11px_rgba(208,31,38,0.18)] disabled:opacity-55" disabled={commandBusy} onClick={() => sendGroupOperation("run")} type="button">운전</button>
              <button className="h-[68px] rounded-[8px] bg-[#667380] text-[31px] font-black text-white shadow-[0_5px_11px_rgba(70,82,94,0.14)] disabled:opacity-55" disabled={commandBusy} onClick={openStopConfirm} type="button">정지</button>
            </div>
          </aside>
        </div>
        <div className="flex h-[62px] items-center justify-between border-t border-[#dbe7f1] bg-white px-[18px] text-[14px] font-black text-[#6f879d] max-sm:hidden">
          <span className="max-w-[520px] truncate text-[#237bd0]">{showCommandStatus ? commandStatus : ""}</span>
          <span>입력칸 선택 시 숫자 키패드가 표시되며, 확인 또는 포커스 해제 시 즉시 장비로 전송됩니다</span>
        </div>
      </section>
      {activeControl ? (
        <NumericKeypad
          allowDecimal={activeControl.key !== "changeHours" && activeControl.key !== "runUnits"}
          disabled={commandBusy}
          label={activeControl.label}
          onAppend={appendKeypadValue}
          onBackspace={backspaceKeypadValue}
          onClear={clearKeypadValue}
          onClose={closeKeypad}
          onConfirm={confirmKeypadValue}
          unit={activeControl.unit}
          value={settings[activeControl.key]}
        />
      ) : null}
      {stopConfirmOpen ? (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/65 p-[16px]">
          <section className="w-[560px] rounded-[12px] bg-white p-[18px] shadow-2xl">
            <div className="text-[24px] font-black text-[#173f69]">통합운전 정지</div>
            <div className="mt-[8px] text-[15px] font-black text-[#6f879d]">통합제어만 해제할지, 현재 장비까지 순차 정지할지 선택하세요.</div>
            <div className="mt-[18px] grid grid-cols-2 gap-[10px]">
              <button className="h-[58px] rounded-[8px] border border-[#cfdde8] bg-[#f8fbfd] text-[17px] font-black text-[#45657f]" onClick={() => { setStopConfirmOpen(false); void sendGroupOperation("stop", false); }} type="button">장비는 계속 운전</button>
              <button className="h-[58px] rounded-[8px] bg-[#667380] text-[17px] font-black text-white" onClick={() => { setStopConfirmOpen(false); void sendGroupOperation("stop", true); }} type="button">장비까지 전체 정지</button>
            </div>
            <button className="mt-[10px] h-[42px] w-full rounded-[8px] bg-[#e8eef3] text-[15px] font-black text-[#45657f]" onClick={() => setStopConfirmOpen(false)} type="button">취소</button>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function sanitizeNumericInput(value: string, integerOnly: boolean) {
  const numeric = value.replace(integerOnly ? /\D/g : /[^0-9.]/g, "");
  if (integerOnly) return numeric;
  const [head, ...tails] = numeric.split(".");
  return tails.length > 0 ? `${head}.${tails.join("")}` : head;
}

function NumericKeypad({
  allowDecimal,
  disabled,
  label,
  onAppend,
  onBackspace,
  onClear,
  onClose,
  onConfirm,
  unit,
  value,
}: {
  allowDecimal: boolean;
  disabled: boolean;
  label: string;
  onAppend: (value: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onClose: () => void;
  onConfirm: () => void;
  unit: string;
  value: string;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];
  const preventFocusLoss = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/10" onPointerDown={onClose}>
      <div
        className="w-[360px] rounded-[14px] border border-[#b8d2e8] bg-white p-[12px] shadow-[0_18px_36px_rgba(15,43,72,0.34)]"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="mb-[10px] flex items-end justify-between rounded-[10px] bg-[#eef7ff] px-[12px] py-[9px]">
          <span>
            <span className="block text-[12px] font-black tracking-[0.08em] text-[#6f879d]">{label}</span>
            <span className="mt-[3px] block text-[25px] font-black leading-none text-[#173f69]">{value || "0"}</span>
          </span>
          <span className="text-[14px] font-black text-[#6f879d]">{unit}</span>
        </div>
        <div className="grid grid-cols-3 gap-[8px]">
          {keys.map((key) => (
            <button
              key={key}
              className="h-[50px] rounded-[8px] border border-[#d3e4f2] bg-[#f8fbfd] text-[24px] font-black text-[#173f69] active:bg-[#e2f1ff] disabled:opacity-45"
              disabled={disabled || (key === "." && !allowDecimal)}
              onClick={() => onAppend(key)}
              onPointerDown={preventFocusLoss}
              type="button"
            >
              {key}
            </button>
          ))}
          <button
            className="h-[50px] rounded-[8px] border border-[#d3e4f2] bg-[#f8fbfd] text-[18px] font-black text-[#173f69] active:bg-[#e2f1ff] disabled:opacity-45"
            disabled={disabled}
            onClick={onBackspace}
            onPointerDown={preventFocusLoss}
            type="button"
          >
            지움
          </button>
        </div>
        <div className="mt-[8px] grid grid-cols-2 gap-[8px]">
          <button
            className="h-[48px] rounded-[8px] border border-[#d3e4f2] bg-white text-[17px] font-black text-[#45657f] active:bg-[#eef7ff] disabled:opacity-45"
            disabled={disabled}
            onClick={onClear}
            onPointerDown={preventFocusLoss}
            type="button"
          >
            초기화
          </button>
          <button
            className="h-[48px] rounded-[8px] bg-[#237bd0] text-[18px] font-black text-white active:bg-[#1968b3] disabled:opacity-45"
            disabled={disabled}
            onClick={onConfirm}
            onPointerDown={preventFocusLoss}
            type="button"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, unit, value }: { label: string; unit: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[12px]">
      <div className="text-[13px] font-black text-[#6f879d]">{label}</div>
      <div className="mt-[8px] flex items-end justify-between">
        <span className="text-[25px] font-black leading-none text-[#173f69]">{value}</span>
        <span className="text-[13px] font-black text-[#6f879d]">{unit}</span>
      </div>
    </div>
  );
}

function PanelHeading({ children, eyebrow }: { children: ReactNode; eyebrow: string }) {
  return (
    <div className="flex h-[40px] items-center justify-between border-b border-[#c9e1f5]">
      <span className="text-[20px] font-black text-[#173f69]">{children}</span>
      <span className="text-[11px] font-black tracking-[0.12em] text-[#7c97b0]">{eyebrow}</span>
    </div>
  );
}

function SegmentedOption({
  disabled = false,
  items,
  onSelect,
  selected,
}: {
  disabled?: boolean;
  items: Array<[string, string]>;
  onSelect: (value: string) => void;
  selected: string;
}) {
  return (
    <div className="grid h-[48px] grid-cols-2 rounded-[8px] border border-[#d3e7f8] bg-[#edf6fe] p-[4px]">
      {items.map(([value, label]) => (
        <button
          key={value}
          className={`rounded-[6px] text-[18px] font-black transition-colors ${
            selected === value ? "bg-[#237bd0] text-white shadow-[0_4px_10px_rgba(35,123,208,0.28)]" : "text-[#3e6488]"
          }`}
          disabled={disabled}
          onClick={() => onSelect(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PasswordDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: (level: UserLevel) => void }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("설정 화면에 진입할 비밀번호를 입력하세요");
  const [checking, setChecking] = useState(false);
  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setChecking(true);
    let configuredPasswords = USER_PASSWORDS;
    try {
      const settings = await fetchProductSettings();
      configuredPasswords = {
        [USER_LEVELS.admin]: settings.factory_password,
        [USER_LEVELS.manager]: settings.admin_password,
        [USER_LEVELS.user]: settings.user_password,
      };
    } catch {
      setMessage("저장된 비밀번호 확인 실패 / 기본 비밀번호로 확인합니다");
    }
    const matchedLevel = (Object.entries(configuredPasswords).find(([, expected]) => expected === password)?.[0] ?? "") as `${UserLevel}` | "";

    if (matchedLevel === "") {
      setMessage("비밀번호가 올바르지 않습니다");
      setPassword("");
      setChecking(false);
      return;
    }

    onSuccess(Number(matchedLevel) as UserLevel);
    setChecking(false);
  };

  return (
    <DialogShell onClose={onClose} subtitle="원본 프로그램과 동일하게 권한별 설정 화면을 엽니다" title="비밀번호 입력">
      <form className="grid max-h-[calc(100dvh-92px)] gap-[14px] overflow-y-auto bg-[#f6f9fc] p-[18px] max-sm:max-h-[calc(100dvh-80px)] max-sm:gap-[10px] max-sm:p-[12px]" onSubmit={submitPassword}>
        <label className="grid gap-[8px]">
          <span className="text-[16px] font-black text-[#45657f] max-sm:text-[13px]">공장 관리자 / 관리자 / 사용자 비밀번호</span>
          <input
            autoFocus
            className="h-[58px] rounded-[8px] border border-[#c9deef] bg-white px-[16px] text-center text-[28px] font-black tracking-[0.16em] text-[#173f69] outline-none focus:border-[#237bd0] max-sm:h-[48px] max-sm:text-[22px]"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        <div className={`rounded-[8px] px-[12px] py-[10px] text-center text-[14px] font-black max-sm:py-[8px] max-sm:text-[12px] ${message.includes("올바르지") ? "bg-[#fff0f0] text-[#d92525]" : "bg-[#eef7ff] text-[#45657f]"}`}>
          {message}
        </div>
        <div className="grid h-[54px] grid-cols-2 gap-[10px] max-sm:h-[46px]">
          <button className="rounded-[8px] border border-[#cfdde8] bg-[#f8fbfd] text-[18px] font-black text-[#45657f]" onClick={onClose} type="button">취소</button>
          <button className="rounded-[8px] bg-[#237bd0] text-[18px] font-black text-white shadow-[0_5px_12px_rgba(35,123,208,0.2)] disabled:opacity-50" disabled={checking} type="submit">{checking ? "확인 중..." : "확인"}</button>
        </div>
      </form>
    </DialogShell>
  );
}

type ModeRow = {
  no: string;
  values: string[];
};

function createDefaultModeRows(): ModeRow[] {
  return Array.from({ length: MODE_ALIGN_ROWS }, (_, index) => ({
    no: `${index + 1}`,
    values: [...Array.from({ length: MODE_ALIGN_COLUMNS }, (_, unit) => String(unit + 1)), "3"],
  }));
}

function readLiveWord(values: Record<string, YujinMapValue>, key: string) {
  const item = values[key.toUpperCase()];
  if (!isLiveMapValue(item)) return null;
  const word = Number(item.value);
  return Number.isFinite(word) ? Math.trunc(word) & 0xffff : null;
}

function readAsciiMap(values: Record<string, YujinMapValue>, highAddr: string) {
  const bytes: number[] = [];
  for (let offset = 0; offset <= 0xfe; offset += 2) {
    const word = readLiveWord(values, `${highAddr}${offset.toString(16).padStart(2, "0")}`);
    if (word === null) break;
    bytes.push((word >> 8) & 0xff, word & 0xff);
  }

  const endIndex = bytes.findIndex((byte) => byte === 0);
  const asciiBytesOnly = endIndex >= 0 ? bytes.slice(0, endIndex) : bytes;
  return String.fromCharCode(...asciiBytesOnly.filter((byte) => byte >= 0x20 && byte <= 0x7e));
}

function readModeRowsFromMap(values: Record<string, YujinMapValue>): ModeRow[] {
  const rows = createDefaultModeRows();
  const alignList = readAsciiMap(values, "03").split("=")[0];

  alignList
    .split("/")
    .filter(Boolean)
    .slice(0, MODE_ALIGN_ROWS)
    .forEach((rowText, rowIndex) => {
      const cells = rowText.split(",").slice(0, MODE_ALIGN_COLUMNS);
      cells.forEach((cell, colIndex) => {
        rows[rowIndex].values[colIndex] = sanitizeNumericInput(cell, true) || "0";
      });
    });

  for (let rowIndex = 0; rowIndex < MODE_ALIGN_ROWS; rowIndex += 1) {
    const runUnit = readLiveWord(values, `04${(0x12 + rowIndex * 2).toString(16).padStart(2, "0")}`);
    if (runUnit !== null) rows[rowIndex].values[MODE_RUN_COUNT_INDEX] = String(runUnit);
  }

  return rows;
}

function readUseUnitIndex(values: Record<string, YujinMapValue>) {
  const useUnit = readLiveWord(values, "0420");
  return useUnit === null ? null : clamp(useUnit, 0, MODE_ALIGN_ROWS - 1);
}

function readUseUnitCount(values: Record<string, YujinMapValue>) {
  const highWord = readLiveWord(values, "0446");
  const lowWord = readLiveWord(values, "0448");
  if (highWord === null || lowWord === null) return null;

  const count = ((highWord & 0xff) << 8) | ((lowWord >> 8) & 0xff);
  return count > 0 && count <= MODE_ALIGN_ROWS ? count : null;
}

function normalizeModeRows(rows: ModeRow[]) {
  const defaults = createDefaultModeRows();
  return defaults.map((defaultRow, rowIndex) => {
    const row = rows[rowIndex] ?? defaultRow;
    return {
      no: `${rowIndex + 1}`,
      values: Array.from({ length: MODE_ROW_VALUE_COUNT }, (_, colIndex) => {
        const migratedValue = row.values.length === 4
          ? colIndex < 3 ? row.values[colIndex] : colIndex === MODE_RUN_COUNT_INDEX ? row.values[3] : defaultRow.values[colIndex]
          : row.values[colIndex];
        return sanitizeNumericInput(migratedValue ?? defaultRow.values[colIndex] ?? "0", true) || "0";
      }),
    };
  });
}

function modeSettingsToState(settings: ModeSettings) {
  const useModeCount = clamp(Math.trunc(Number(settings.use_mode_count) || 1), 1, MODE_ALIGN_ROWS);
  return {
    rows: normalizeModeRows(settings.rows),
    selectedModeIndex: clamp(Math.trunc(Number(settings.selected_mode_index) || 0), 0, Math.min(MODE_ALIGN_ROWS - 1, useModeCount - 1)),
    useModeCount: String(useModeCount),
    hiddenMask: Math.trunc(Number(settings.hidden_mask) || 0),
    excludeMask: Math.trunc(Number(settings.exclude_mask) || 0),
  };
}

function buildModeSettingsPayload(
  rows: ModeRow[],
  selectedModeIndex: number,
  useModeCount: string,
  hiddenMask = 0,
  excludeMask = 0,
): ModeSettings {
  const count = clamp(Math.trunc(Number(useModeCount) || 1), 1, MODE_ALIGN_ROWS);
  return {
    rows: normalizeModeRows(rows),
    selected_mode_index: clamp(Math.trunc(Number(selectedModeIndex) || 0), 0, Math.min(MODE_ALIGN_ROWS - 1, count - 1)),
    use_mode_count: count,
    hidden_mask: hiddenMask & 0xffff,
    exclude_mask: excludeMask & 0xffff,
  };
}

function wordArrayToHex(words: number[]) {
  return words.map((word) => (word & 0xffff).toString(16).padStart(4, "0").toUpperCase()).join("");
}

function buildSequenceWritesFromUnits(units: number[], runUnitCount: number): MapWrite[] {
  const words = Array.from({ length: 12 }, (_, index) => (index < runUnitCount ? units[index] ?? 0 : 0));
  return [
    { address: 0x28, length: 0x12, data_hex: wordArrayToHex(words.slice(0, 9)) },
    { address: 0x0e, length: 0x06, data_hex: wordArrayToHex(words.slice(9, 12)) },
  ];
}

function buildApplySequenceWrites(rows: ModeRow[], selectedModeIndex: number, useModeCount: string): MapWrite[] {
  const normalizedRows = normalizeModeRows(rows);
  const row = normalizedRows[clamp(selectedModeIndex, 0, MODE_ALIGN_ROWS - 1)] ?? normalizedRows[0];
  const allowedModeCount = clamp(Math.trunc(Number(useModeCount) || 1), 1, 12);
  const activeModeIndex = clamp(selectedModeIndex, 0, allowedModeCount - 1);
  const activeRow = normalizedRows[activeModeIndex] ?? row;
  const runUnitCount = clamp(Math.trunc(Number(activeRow.values[MODE_RUN_COUNT_INDEX]) || 1), 1, 12);
  const selectedUnits = activeRow.values
    .slice(0, MODE_ALIGN_COLUMNS)
    .map((value) => Math.trunc(Number(value) || 0))
    .filter((value) => value > 0);
  return buildSequenceWritesFromUnits(selectedUnits, runUnitCount);
}

function buildNextModeSettings(settings: ModeSettings, dashboard: DashboardState, action: ModeSequenceAction): ModeSettings | null {
  if (dashboard.sortMode !== "setting" || action === "refresh") return null;
  const state = modeSettingsToState(settings);
  const count = clamp(Number(state.useModeCount) || 1, 1, MODE_ALIGN_ROWS);
  const direction = action === "next" ? 1 : -1;
  const selectedModeIndex = (state.selectedModeIndex + direction + count) % count;
  return buildModeSettingsPayload(state.rows, selectedModeIndex, state.useModeCount, state.hiddenMask, state.excludeMask);
}

function buildModeSequenceActionWrites(settings: ModeSettings, dashboard: DashboardState, action: ModeSequenceAction) {
  const state = modeSettingsToState(settings);
  if (dashboard.sortMode === "setting") {
    return buildApplySequenceWrites(state.rows, state.selectedModeIndex, state.useModeCount);
  }

  const connectedOrder = dashboard.compressors.map((compressor) => compressor.id);
  const nextOrder =
    action === "refresh"
      ? [...dashboard.compressors].sort((a, b) => a.totalHours - b.totalHours || a.id - b.id).map((compressor) => compressor.id)
      : rotateSequence(connectedOrder, action === "next" ? 1 : -1);
  return buildSequenceWritesFromUnits(nextOrder, nextOrder.length);
}

function rotateSequence(sequence: number[], direction: 1 | -1) {
  if (sequence.length <= 1) return sequence;
  if (direction > 0) return [sequence[sequence.length - 1], ...sequence.slice(0, -1)];
  return [...sequence.slice(1), sequence[0]];
}

function dashboardMaskConflict(hiddenMask: number, excludeMask: number, configuredCount: number) {
  if (configuredCount <= 0) return false;
  const configuredMask = (1 << configuredCount) - 1;
  return (hiddenMask & configuredMask) === configuredMask || (excludeMask & configuredMask) === configuredMask;
}

function SettingsDialog({ configuredCount, level, mapValues, onClose }: { configuredCount: number; level: UserLevel; mapValues: Record<string, YujinMapValue>; onClose: () => void }) {
  type ModeCellTarget = { rowIndex: number; colIndex: number; kind: "align" | "index" } | { kind: "count" };
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabKey>(() => settingsTabsForLevel(level)[0].key);
  const [sequenceSection, setSequenceSection] = useState<"order" | "schedule">("order");
  const [modeRows, setModeRows] = useState(() => createDefaultModeRows());
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);
  const [useModeCount, setUseModeCount] = useState("1");
  const [hiddenMask, setHiddenMask] = useState(0);
  const [excludeMask, setExcludeMask] = useState(0);
  const [editingModeRowIndex, setEditingModeRowIndex] = useState<number | null>(null);
  const [activeModeCell, setActiveModeCell] = useState<ModeCellTarget | null>(null);
  const [replaceNextModeInput, setReplaceNextModeInput] = useState(false);
  const [saveStatus, setSaveStatus] = useState("설정값 불러오는 중...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchModeSettings()
      .then((settings) => {
        if (!alive) return;
        const state = modeSettingsToState(settings);
        setModeRows(state.rows);
        setSelectedModeIndex(state.selectedModeIndex);
        setUseModeCount(state.useModeCount);
        setHiddenMask(state.hiddenMask);
        setExcludeMask(state.excludeMask);
        setSaveStatus("설정 저장 대기 중");
      })
      .catch((error) => {
        if (!alive) return;
        setModeRows(readModeRowsFromMap(mapValues));
        const nextUseUnit = readUseUnitIndex(mapValues);
        if (nextUseUnit !== null) setSelectedModeIndex(nextUseUnit);
        const nextUseModeCount = readUseUnitCount(mapValues);
        if (nextUseModeCount !== null) setUseModeCount(String(nextUseModeCount));
        setHiddenMask(Math.trunc(Number(mapValues["0008"]?.value ?? 0)));
        setSaveStatus(`저장값 불러오기 실패: ${error instanceof Error ? error.message : String(error)}`);
      });
    return () => {
      alive = false;
    };
  }, []);

  const saveModeSettings = async (label: string, rows = modeRows, modeIndex = selectedModeIndex, modeCount = useModeCount) => {
    setSaving(true);
    setSaveStatus(`${label} 저장 중...`);
    try {
      const saved = await updateModeSettings(buildModeSettingsPayload(rows, modeIndex, modeCount, hiddenMask, excludeMask));
      const state = modeSettingsToState(saved);
      setModeRows(state.rows);
      setSelectedModeIndex(state.selectedModeIndex);
      setUseModeCount(state.useModeCount);
      setHiddenMask(state.hiddenMask);
      setExcludeMask(state.excludeMask);

      setSaveStatus(`${label} 저장 완료 / 장비 적용 중...`);
      const result = await enqueueMapWriteBatch("settings_apply_sequence", buildApplySequenceWrites(state.rows, state.selectedModeIndex, state.useModeCount));
      const commandId = Number(result.id);
      setSaveStatus(`${label} #${commandId} 적용 대기...`);
      await waitForControlCommand(commandId, (status) => {
        if (status.status === "pending") setSaveStatus(`${label} #${commandId} 적용 대기 중...`);
        if (status.status === "in_progress") setSaveStatus(`${label} #${commandId} 장비 적용 중...`);
        if (status.status === "completed") setSaveStatus(`${label} 저장/적용 완료`);
      });
    } catch (error) {
      if (error instanceof ControlStatusDelayedError) setSaveStatus(`${label} #${error.commandId} 등록됨 / 완료 확인 지연`);
      else setSaveStatus(`${label} 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };
  const updateModeCell = (rowIndex: number, colIndex: number, value: string) => {
    setModeRows((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? { ...row, values: row.values.map((item, itemIndex) => (itemIndex === colIndex ? sanitizeNumericInput(value, true) : item)) }
          : row,
      ),
    );
  };
  const saveModeAlign = async () => {
    await saveModeSettings("정렬표");
  };
  const saveModeIndex = async (rowIndex: number) => {
    const value = Math.trunc(Number(modeRows[rowIndex].values[MODE_RUN_COUNT_INDEX] || 0));
    if (!Number.isFinite(value) || value < 0 || value > 0xffff) {
      setSaveStatus("Index 값 범위는 0~65535입니다");
      return;
    }
    await saveModeSettings(`${rowIndex + 1}번 운전대수`);
  };
  const saveUseModeCount = async () => {
    const count = Math.trunc(Number(useModeCount));
    if (!Number.isFinite(count) || count < 1 || count > MODE_ALIGN_ROWS) {
      setSaveStatus(`사용모드 개수 범위는 1~${MODE_ALIGN_ROWS}입니다`);
      return;
    }
    await saveModeSettings("사용모드 개수");
  };
  const saveEquipmentMasks = async () => {
    if (dashboardMaskConflict(hiddenMask, excludeMask, configuredCount)) {
      setSaveStatus("모든 장비를 숨기거나 통합운전에서 제외할 수 없습니다");
      return;
    }
    setSaving(true);
    setSaveStatus("숨김/제외 설정 저장 중...");
    try {
      const saved = await updateModeSettings(buildModeSettingsPayload(modeRows, selectedModeIndex, useModeCount, hiddenMask, excludeMask));
      const result = await enqueueMapWriteBatch("settings_equipment_masks", [
        { key: "0008", address: 0x08, length: 2, value: hiddenMask },
      ]);
      await waitForControlCommand(Number(result.id), () => {});
      setHiddenMask(saved.hidden_mask);
      setExcludeMask(saved.exclude_mask);
      setSaveStatus("숨김/제외 설정 저장 완료");
    } catch (error) {
      setSaveStatus(`숨김/제외 설정 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };
  const saveEditedModeRow = async (rowIndex: number, sequence: number[], runUnits: number) => {
    const nextRows = modeRows.map((row, index) => index === rowIndex
      ? { ...row, values: [...sequence.slice(0, MODE_ALIGN_COLUMNS).map(String), ...Array.from({ length: Math.max(0, MODE_ALIGN_COLUMNS - sequence.length) }, () => "0"), String(runUnits)] }
      : row);
    setModeRows(nextRows);
    setEditingModeRowIndex(null);
    await saveModeSettings(`${rowIndex + 1}번 운전순서`, nextRows, rowIndex, useModeCount);
  };
  const activeModeValue =
    activeModeCell?.kind === "count"
      ? useModeCount
      : activeModeCell
        ? modeRows[activeModeCell.rowIndex].values[activeModeCell.colIndex]
        : "";
  const activeModeLabel =
    activeModeCell?.kind === "count"
      ? "사용모드 개수"
      : activeModeCell
        ? `${activeModeCell.rowIndex + 1}번 ${activeModeCell.kind === "index" ? "Index" : `값 ${activeModeCell.colIndex + 1}`}`
        : "";
  const updateActiveModeValue = (value: string) => {
    if (!activeModeCell) return;
    if (activeModeCell.kind === "count") {
      setUseModeCount(sanitizeNumericInput(value, true));
      return;
    }
    updateModeCell(activeModeCell.rowIndex, activeModeCell.colIndex, value);
  };
  const appendActiveModeValue = (value: string) => {
    updateActiveModeValue(replaceNextModeInput ? value : `${activeModeValue}${value}`);
    setReplaceNextModeInput(false);
  };
  const backspaceActiveModeValue = () => {
    updateActiveModeValue(activeModeValue.slice(0, -1));
    setReplaceNextModeInput(false);
  };
  const clearActiveModeValue = () => {
    updateActiveModeValue("");
    setReplaceNextModeInput(false);
  };
  const confirmActiveModeValue = async () => {
    if (!activeModeCell) return;
    const target = activeModeCell;
    setActiveModeCell(null);
    if (target.kind === "count") {
      await saveUseModeCount();
      return;
    }
    if (target.kind === "index") await saveModeIndex(target.rowIndex);
    else await saveModeAlign();
  };
  const closeActiveModeKeypad = () => {
    setActiveModeCell(null);
    setReplaceNextModeInput(false);
  };

  return (
    <DialogShell onClose={onClose} subtitle={`${USER_LEVEL_LABELS[level]} 권한으로 표시 가능한 항목만 보여줍니다`} title={`설정 - ${USER_LEVEL_LABELS[level]}`} wide>
      <div className="grid max-h-[690px] gap-[12px] overflow-y-auto bg-[#f6f9fc] p-[16px] max-sm:max-h-[calc(100dvh-80px)] max-sm:p-[12px]">
        <SettingsTabBar activeTab={activeSettingsTab} level={level} onSelect={setActiveSettingsTab} />

        {activeSettingsTab === "sequence" ? (
          <div className="grid grid-cols-2 gap-[5px] rounded-[8px] bg-[#dfeaf3] p-[4px]">
            <button className={`h-[42px] rounded-[6px] text-[15px] font-black ${sequenceSection === "order" ? "bg-[#45657f] text-white" : "bg-white text-[#45657f]"}`} onClick={() => setSequenceSection("order")} type="button">운전 순서</button>
            <button className={`h-[42px] rounded-[6px] text-[15px] font-black ${sequenceSection === "schedule" ? "bg-[#45657f] text-white" : "bg-white text-[#45657f]"}`} onClick={() => setSequenceSection("schedule")} type="button">스케줄</button>
          </div>
        ) : null}

        {activeSettingsTab === "sequence" && sequenceSection === "order" ? (
          <div className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
            <PanelHeading eyebrow="MODE TABLE">사용모드 / 정렬 설정</PanelHeading>
            <div className="mt-[12px] grid gap-[6px]">
              {modeRows.map((row, rowIndex) => (
                <div key={row.no} className="grid min-h-[42px] grid-cols-[54px_1fr_92px_100px] gap-[5px] max-sm:grid-cols-[42px_1fr_68px_72px]">
                  <button
                    className={`flex items-center justify-center rounded-[6px] font-black ${
                      selectedModeIndex === rowIndex ? "bg-[#237bd0] text-white" : "bg-[#eef3f7] text-[#45657f]"
                    }`}
                    disabled={saving}
                    onClick={() => {
                      setSelectedModeIndex(rowIndex);
                      void saveModeSettings(`${row.no}번 모드`, modeRows, rowIndex, useModeCount);
                    }}
                    type="button"
                  >
                    {row.no}
                  </button>
                  <div className="flex min-w-0 items-center overflow-hidden rounded-[6px] border border-[#d9e6f0] bg-[#f8fbfd] px-[9px] text-[14px] font-black text-[#45657f]">
                    <span className="truncate">{row.values.slice(0, configuredCount).filter((value) => Number(value) > 0).join(" → ") || "순서 없음"}</span>
                  </div>
                  <div className="flex items-center justify-center rounded-[6px] bg-[#eef3f7] text-[14px] font-black text-[#173f69]">{row.values[MODE_RUN_COUNT_INDEX]}대</div>
                  <button className="rounded-[6px] bg-[#237bd0] text-[13px] font-black text-white disabled:opacity-45" disabled={saving || configuredCount === 0} onClick={() => setEditingModeRowIndex(rowIndex)} type="button">순서 편집</button>
                </div>
              ))}
            </div>
            <div className="mt-[12px] grid h-[46px] grid-cols-[1fr_58px_78px_58px_120px] gap-[8px] max-sm:h-auto max-sm:grid-cols-[48px_1fr_48px_82px]">
              <div className="flex items-center text-[17px] font-black text-[#173f69] max-sm:col-span-4">사용모드 개수 설정</div>
              <ChoiceButton onClick={() => setUseModeCount((value) => String(Math.max(1, Number(value || 1) - 1)))}>-</ChoiceButton>
              <input
                className="min-w-0 rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] px-0 text-center text-[22px] font-black leading-none text-[#173f69] outline-none focus:border-[#237bd0] focus:bg-white"
                disabled={saving}
                inputMode="numeric"
                onChange={(event) => setUseModeCount(sanitizeNumericInput(event.target.value, true))}
                onFocus={(event) => {
                  setActiveModeCell({ kind: "count" });
                  setReplaceNextModeInput(true);
                  event.currentTarget.select();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                    void saveUseModeCount();
                  }
                }}
                pattern="[0-9]*"
                type="text"
                value={useModeCount}
              />
              <ChoiceButton onClick={() => setUseModeCount((value) => String(Math.min(MODE_ALIGN_ROWS, Number(value || 1) + 1)))}>+</ChoiceButton>
              <button className="rounded-[8px] bg-[#237bd0] text-[18px] font-bold text-white disabled:opacity-55" disabled={saving} onClick={saveUseModeCount} type="button">저장</button>
            </div>
            <EquipmentMaskSettings
              configuredCount={configuredCount}
              disabled={saving || (Number(mapValues["0050"]?.value ?? 0) & 0x00ff) !== 0}
              excludeMask={excludeMask}
              hiddenMask={hiddenMask}
              onExcludeMaskChange={setExcludeMask}
              onHiddenMaskChange={setHiddenMask}
              onSave={() => void saveEquipmentMasks()}
            />
            <div className="mt-[8px] rounded-[8px] bg-[#eef7ff] px-[10px] py-[8px] text-[13px] font-black text-[#45657f]">{saveStatus}</div>
          </div>
        ) : null}

        {activeSettingsTab === "sequence" && sequenceSection === "schedule" ? (
          <ScheduleSettingsPanel disabled={(Number(mapValues["0050"]?.value ?? 0) & 0x00ff) !== 0} />
        ) : null}

        {activeSettingsTab === "network" ? (
          <MapSettingsPanel fields={NETWORK_SETTING_FIELDS} level={level} mapValues={mapValues} title="Network 설정" />
        ) : null}

        {activeSettingsTab === "product" ? (
          <ProductSettingsPanel level={level} mapValues={mapValues} />
        ) : null}

        {activeSettingsTab === "gstech" ? (
          <GsTechSettingsPanel mapValues={mapValues} />
        ) : null}
      </div>
      {activeSettingsTab === "sequence" && sequenceSection === "order" && activeModeCell ? (
        <NumericKeypad
          allowDecimal={false}
          disabled={saving}
          label={activeModeLabel}
          onAppend={appendActiveModeValue}
          onBackspace={backspaceActiveModeValue}
          onClear={clearActiveModeValue}
          onClose={closeActiveModeKeypad}
          onConfirm={confirmActiveModeValue}
          unit=""
          value={activeModeValue}
        />
      ) : null}
      {activeSettingsTab === "sequence" && sequenceSection === "order" && editingModeRowIndex !== null ? (
        <ModeSequenceEditor
          configuredCount={configuredCount}
          initialRunUnits={Number(modeRows[editingModeRowIndex].values[MODE_RUN_COUNT_INDEX]) || 1}
          initialSequence={modeRows[editingModeRowIndex].values.slice(0, MODE_ALIGN_COLUMNS).map(Number)}
          modeNumber={editingModeRowIndex + 1}
          onCancel={() => setEditingModeRowIndex(null)}
          onSave={(sequence, runUnits) => void saveEditedModeRow(editingModeRowIndex, sequence, runUnits)}
          saving={saving}
        />
      ) : null}
    </DialogShell>
  );
}

function ChoiceButton({ active = false, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      className={`rounded-[8px] border text-[19px] font-bold ${active ? "border-[#237bd0] bg-[#237bd0] text-white" : "border-[#9fc8ea] bg-white text-[#237bd0]"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function getLowPressureText(tone: DashboardState["lowPressureAlarm"]) {
  if (tone === "none") return "";
  if (tone === "reserve") return "저압 경보로 인하여 예비기 가동중";
  return "저압 경보 알람";
}

function exportPowerCsv(values: Record<string, YujinMapValue>, configuredCount: number) {
  const labels = ["상전류 R", "상전류 S", "상전류 T", "상전압 R", "상전압 S", "상전압 T", "선간전압 RS", "선간전압 ST", "선간전압 TR", "유효전력", "무효전력", "피상전력", "유효전력량", "무효전력량", "피상전력량", "부하율", "역률", "주파수"];
  const rows = [["저장시각", "호기", ...labels]];
  const recordedAt = new Date().toLocaleString("ko-KR");
  for (let unit = 1; unit <= Math.min(8, configuredCount); unit += 1) {
    const prefix = (0x30 + unit).toString(16).toUpperCase();
    rows.push([
      recordedAt,
      `${unit}호기`,
      ...labels.map((_, index) => values[`${prefix}${(index * 2).toString(16).padStart(2, "0").toUpperCase()}`]?.value ?? ""),
    ]);
  }
  const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `power-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatDateTime(date: Date) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yy}/${mm}/${dd} ${hh}:${mi}:${ss}`;
}
