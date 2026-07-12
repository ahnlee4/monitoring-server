type ActiveDialog = "cctv" | "settings" | "control" | "minmax" | "lowpressure" | null;
type ActiveScreen = "main" | "detail";

type QuickButtonsProps = {
  activeScreen: ActiveScreen;
  alarmMuted: boolean;
  menuOpen: boolean;
  onOpenDialog: (dialog: ActiveDialog) => void;
  onExportPower: () => void;
  onToggleAlarmMute: () => void;
  onToggleDetail: () => void;
  setMenuOpen: (open: boolean) => void;
};

type QuickMenuItem = {
  label: string;
  icon: string;
  action: () => void;
};

const PRELOAD_ICONS = ["/setting.png", "/control.png", "/device.png", "/device_back.png", "/menu.png"];

export function QuickButtons({
  activeScreen,
  alarmMuted,
  menuOpen,
  onOpenDialog,
  onExportPower,
  onToggleAlarmMute,
  onToggleDetail,
  setMenuOpen,
}: QuickButtonsProps) {
  const menuItems: QuickMenuItem[] = [
    { label: alarmMuted ? "알람음 켜기" : "알람음 끄기", icon: "/setting.png", action: onToggleAlarmMute },
    { label: "CCTV", icon: "/device.png", action: () => onOpenDialog("cctv") },
    { label: "전력 CSV", icon: "/setting.png", action: onExportPower },
    { label: "설정", icon: "/setting.png", action: () => onOpenDialog("settings") },
    { label: "통합운전", icon: "/control.png", action: () => onOpenDialog("control") },
    {
      label: activeScreen === "detail" ? "메인 화면" : "상세 화면",
      icon: activeScreen === "detail" ? "/device_back.png" : "/device.png",
      action: onToggleDetail,
    },
  ];

  const handleMenuAction = (action: () => void) => {
    action();
    setMenuOpen(false);
  };

  return (
    <div className="relative z-[80] flex min-h-0 items-center justify-center overflow-visible">
      <div aria-hidden className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
        {PRELOAD_ICONS.map((icon) => (
          <img key={icon} src={icon} alt="" decoding="sync" loading="eager" />
        ))}
      </div>
      <div className="relative isolate grid h-[122px] grid-rows-[56px_56px] gap-[10px] overflow-visible">
        <button aria-label="상세 화면" className="flex h-[56px] w-[56px] items-center justify-center bg-transparent p-0" onClick={onToggleDetail} type="button">
          <img src={activeScreen === "detail" ? "/device_back.png" : "/device.png"} alt="" className="h-[56px] w-[56px] object-contain" />
        </button>
        <button
          aria-label="메뉴"
          className="flex h-[56px] w-[56px] items-center justify-center bg-transparent p-0"
          onClick={() => setMenuOpen(!menuOpen)}
          type="button"
        >
          <img src="/menu.png" alt="" className="h-[56px] w-[56px] object-contain" />
        </button>
        {menuOpen ? (
          <div className="absolute bottom-[66px] right-0 z-[90] flex flex-col gap-[12px]">
            {menuItems.map((item) => (
              <button
                key={item.label}
                className="grid h-[56px] w-[190px] grid-cols-[1fr_56px] items-center gap-[12px] bg-transparent p-0 text-left"
                onClick={() => handleMenuAction(item.action)}
                type="button"
              >
                <span className="justify-self-end rounded-[8px] border border-[#b9dff7] bg-[#e7f5ff] px-[10px] py-[7px] text-left text-[18px] font-black leading-none text-[#163d69] shadow-[0_2px_5px_rgba(37,97,148,0.14)]">
                  {item.label}
                </span>
                <span className="relative z-10 flex h-[56px] w-[56px] shrink-0 items-center justify-center">
                  <img
                    src={item.icon}
                    alt=""
                    className="block h-[56px] w-[56px] object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.22)]"
                    decoding="sync"
                    loading="eager"
                  />
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
