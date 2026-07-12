import { useEffect, useState } from "react";
import {
  enqueueMapWriteBatch,
  fetchGsTechSettings,
  fetchProductSettings,
  updateProductSettings,
  waitForControlCommand,
} from "../services/api";
import type { ProductSettings } from "../services/api";
import type { YujinMapValue } from "../types";
import { MapSettingsPanel, PRODUCT_SETTING_FIELDS } from "./AdminSettingsTabs";
import type { SettingsAccessLevel } from "./AdminSettingsTabs";

const FACTORY = 0;
const ADMIN = 1;
const USER = 2;
const OPTION_FIELDS = [
  [2, "고장발생시 모드 변경"],
  [3, "인버터 주도 절약운전 기능"],
  [4, "교환운전 기능"],
  [5, "메인압력모듈 적용"],
  [6, "통합운전 제어시 기타 기기 제어"],
  [7, "메인화면 정렬방식"],
  [8, "저압경보 적용"],
  [9, "저압경보시 예비기 가동 유무"],
  [10, "고장발생시 예비기 가동 유무"],
  [11, "리모트 모드일때만 쓰기"],
  [12, "로그인 했을때만 쓰기"],
  [13, "데이터 저장 유무"],
  [14, "통합제어 정지시 컴프레샤 정지안함"],
  [15, "교환운전 테스트"],
] as const;

const DEFAULT_SETTINGS: ProductSettings = {
  factory_password: "btfss0510",
  admin_password: "471112",
  user_password: "1234",
  login_id: "admin",
  login_password: "1234",
  save_cycle_seconds: 2,
  save_period_days: 30,
  backlight_percent: 50,
  screen_saver_seconds: 300,
  alarm_sound_enabled: true,
  alarm_visible: true,
  camera1_ip: "0.0.0.0",
  camera1_port: 0,
  camera2_ip: "0.0.0.0",
  camera2_port: 0,
};

type LocalField = {
  key: keyof ProductSettings;
  label: string;
  type?: "number" | "password" | "text";
  levels: SettingsAccessLevel[];
  min?: number;
  max?: number;
  unit?: string;
};

export function ProductSettingsPanel({
  level,
  mapValues,
}: {
  level: SettingsAccessLevel;
  mapValues: Record<string, YujinMapValue>;
}) {
  const integratedRun = (Number(mapValues["0050"]?.value ?? 0) & 0x00ff) !== 0;
  const optionWord = Math.trunc(Number(mapValues["004A"]?.value ?? 0)) & 0xffff;
  const [settings, setSettings] = useState<ProductSettings>(DEFAULT_SETTINGS);
  const [options, setOptions] = useState<Record<number, boolean>>(() => optionState(optionWord));
  const [cctvEnabled, setCctvEnabled] = useState(false);
  const [status, setStatus] = useState("제품 설정값 불러오는 중...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchProductSettings(), fetchGsTechSettings()])
      .then(([product, gstech]) => {
        if (!alive) return;
        setSettings(product);
        setCctvEnabled(gstech.cctv_enabled);
        setStatus("설정 변경 대기 중");
      })
      .catch((error) => {
        if (alive) setStatus(`설정 불러오기 실패: ${error instanceof Error ? error.message : String(error)}`);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => setOptions(optionState(optionWord)), [optionWord]);

  const localFields: LocalField[] = [
    {
      key: level === FACTORY ? "factory_password" : level === ADMIN ? "admin_password" : "user_password",
      label: `${level === FACTORY ? "공장 관리자" : level === ADMIN ? "관리자" : "사용자"} 설정 비밀번호 변경`,
      type: "password",
      levels: [level],
    },
    { key: "login_id", label: "로그인 아이디 변경", levels: [FACTORY, ADMIN] },
    { key: "login_password", label: "로그인 비밀번호 변경", type: "password", levels: [FACTORY, ADMIN] },
    { key: "save_cycle_seconds", label: "저장 주기 설정", type: "number", min: 1, max: 30, unit: "초", levels: [FACTORY] },
    { key: "save_period_days", label: "저장 기간 설정", type: "number", min: 1, max: 60, unit: "일", levels: [FACTORY, ADMIN] },
    { key: "backlight_percent", label: "백라이트 퍼센테이지", type: "number", min: 0, max: 100, unit: "%", levels: [FACTORY, ADMIN] },
    { key: "screen_saver_seconds", label: "스크린 세이버 (0=사용안함)", type: "number", min: 0, max: 300, unit: "초", levels: [FACTORY, ADMIN] },
    { key: "alarm_sound_enabled", label: "알람 소리 사용", levels: [FACTORY, ADMIN] },
    ...(cctvEnabled
      ? [
          { key: "camera1_ip" as const, label: "CAM1 IP", levels: [FACTORY, ADMIN] },
          { key: "camera1_port" as const, label: "CAM1 PORT", type: "number" as const, min: 0, max: 65535, levels: [FACTORY, ADMIN] },
          { key: "camera2_ip" as const, label: "CAM2 IP", levels: [FACTORY, ADMIN] },
          { key: "camera2_port" as const, label: "CAM2 PORT", type: "number" as const, min: 0, max: 65535, levels: [FACTORY, ADMIN] },
        ]
      : []),
  ];

  const updateLocal = (key: keyof ProductSettings, value: string | boolean) => {
    setSettings((current) => ({
      ...current,
      [key]: typeof current[key] === "number" ? Number(value) : value,
    }));
  };

  const saveLocal = async () => {
    if (settings.screen_saver_seconds !== 0 && settings.screen_saver_seconds < 10) {
      setStatus("스크린 세이버는 0(사용안함) 또는 10~300초로 설정하세요");
      return;
    }
    if (!/^\d{6}$/.test(settings.admin_password) || !/^\d{4}$/.test(settings.user_password)) {
      setStatus("관리자 비밀번호는 6자리, 사용자 비밀번호는 4자리 숫자여야 합니다");
      return;
    }
    setSaving(true);
    setStatus("제품 로컬 설정 저장 중...");
    try {
      const saved = await updateProductSettings(settings);
      setSettings(saved);
      setStatus("제품 로컬 설정 저장 완료");
    } catch (error) {
      setStatus(`저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const saveOptions = async () => {
    setSaving(true);
    setStatus("옵션 그룹 장비 적용 중...");
    try {
      let nextWord = optionWord & 0x0003;
      for (const [bit] of OPTION_FIELDS) if (options[bit]) nextWord |= 1 << bit;
      const command = await enqueueMapWriteBatch("product_option_group", [
        { key: "004A", address: 0x004a, length: 2, value: nextWord },
      ]);
      await waitForControlCommand(Number(command.id), () => {});
      const saved = await updateProductSettings(settings);
      setSettings(saved);
      setStatus("옵션 그룹 장비 적용 완료");
    } catch (error) {
      setStatus(`옵션 적용 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const syncSystemTime = async () => {
    setSaving(true);
    setStatus("현재 시간을 통합제어기에 전송 중...");
    try {
      const now = new Date();
      const bytes = [
        now.getFullYear() % 100,
        now.getDay(),
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        0,
        now.getSeconds(),
      ];
      const dataHex = bytes.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
      const command = await enqueueMapWriteBatch("product_sync_time", [
        { key: "005C", address: 0x005c, length: 8, data_hex: dataHex },
      ]);
      await waitForControlCommand(Number(command.id), () => {});
      setStatus("통합제어기 시간 동기화 완료");
    } catch (error) {
      setStatus(`시간 동기화 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-[12px]">
      <MapSettingsPanel fields={PRODUCT_SETTING_FIELDS} level={level} mapValues={mapValues} title="제품 / 장비 설정" />
      <section className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
        <div className="text-[20px] font-black text-[#173f69]">제품 로컬 설정</div>
        <div className="mt-[10px] grid grid-cols-3 gap-[8px] max-lg:grid-cols-2 max-sm:grid-cols-1">
          {localFields.map((field) => {
            const editable = field.levels.includes(level) && !integratedRun;
            const value = settings[field.key];
            return (
              <label key={field.key} className="grid min-h-[76px] gap-[5px] rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[9px]">
                <span className="text-[12px] font-black text-[#45657f]">{field.label}</span>
                {typeof value === "boolean" ? (
                  <select className="h-[34px] rounded-[5px] border border-[#c9deef] bg-white px-[7px] font-black text-[#173f69]" disabled={!editable || saving} onChange={(event) => updateLocal(field.key, event.target.value === "1")} value={value ? "1" : "0"}>
                    <option value="1">사용</option><option value="0">사용안함</option>
                  </select>
                ) : (
                  <span className="flex items-center gap-[5px]">
                    <input
                      className="h-[34px] min-w-0 flex-1 rounded-[5px] border border-[#c9deef] bg-white px-[7px] font-bold text-[#173f69] disabled:bg-[#edf1f4]"
                      disabled={!editable || saving}
                      max={field.max}
                      min={field.min}
                      onChange={(event) => updateLocal(field.key, event.target.value)}
                      type={field.type ?? "text"}
                      value={String(value)}
                    />
                    {field.unit ? <span className="text-[11px] font-black text-[#6f879d]">{field.unit}</span> : null}
                  </span>
                )}
              </label>
            );
          })}
          <div className="grid min-h-[76px] gap-[5px] rounded-[8px] border border-[#d9e6f0] bg-[#f8fbfd] p-[9px]">
            <span className="text-[12px] font-black text-[#45657f]">시간 설정</span>
            <button className="h-[34px] rounded-[5px] bg-[#45657f] text-[13px] font-black text-white disabled:opacity-40" disabled={integratedRun || saving || level === USER} onClick={() => void syncSystemTime()} type="button">현재 시간 전송</button>
          </div>
        </div>
        <div className="mt-[10px] flex items-center justify-between gap-[8px] rounded-[8px] bg-[#eef7ff] px-[10px] py-[8px]">
          <span className="text-[12px] font-black text-[#45657f]">{integratedRun ? "통합운전 중에는 설정할 수 없습니다" : status}</span>
          <button className="rounded-[6px] bg-[#237bd0] px-[18px] py-[8px] text-[14px] font-black text-white disabled:opacity-40" disabled={integratedRun || saving} onClick={() => void saveLocal()} type="button">로컬 설정 저장</button>
        </div>
      </section>
      {level !== USER ? (
        <section className="rounded-[10px] border border-[#d9e6f0] bg-white p-[14px]">
          <div className="text-[20px] font-black text-[#173f69]">하단 옵션 그룹</div>
          <div className="mt-[4px] text-[12px] font-bold text-[#6f879d]">원본 Option Device 0x004A의 BIT2~BIT15 설정</div>
          <div className="mt-[10px] grid grid-cols-3 gap-[7px] max-lg:grid-cols-2 max-sm:grid-cols-1">
            {OPTION_FIELDS.map(([bit, label]) => (
              <label key={bit} className="flex min-h-[44px] items-center gap-[7px] rounded-[7px] border border-[#d9e6f0] bg-[#f8fbfd] px-[9px] text-[12px] font-black text-[#45657f]">
                <input checked={Boolean(options[bit])} disabled={integratedRun || saving} onChange={(event) => setOptions((current) => ({ ...current, [bit]: event.target.checked }))} type="checkbox" />
                {label}
              </label>
            ))}
            <label className="flex min-h-[44px] items-center gap-[7px] rounded-[7px] border border-[#d9e6f0] bg-[#f8fbfd] px-[9px] text-[12px] font-black text-[#45657f]">
              <input checked={settings.alarm_visible} disabled={integratedRun || saving} onChange={(event) => setSettings((current) => ({ ...current, alarm_visible: event.target.checked }))} type="checkbox" />
              고장알람 표시 유무
            </label>
          </div>
          <div className="mt-[10px] flex justify-end">
            <button className="rounded-[6px] bg-[#237bd0] px-[18px] py-[8px] text-[14px] font-black text-white disabled:opacity-40" disabled={integratedRun || saving} onClick={() => void saveOptions()} type="button">옵션 저장</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function optionState(word: number) {
  return Object.fromEntries(OPTION_FIELDS.map(([bit]) => [bit, Boolean(word & (1 << bit))]));
}
