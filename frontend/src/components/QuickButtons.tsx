type ActiveDialog = "factory" | "settings" | "control" | null;
type ActiveScreen = "main" | "detail";

type QuickButtonsProps = {
  activeScreen: ActiveScreen;
  menuOpen: boolean;
  onOpenDialog: (dialog: ActiveDialog) => void;
  onToggleDetail: () => void;
  setMenuOpen: (open: boolean) => void;
};

type QuickMenuItem = {
  label: string;
  icon: string;
  action: () => void;
};

export function QuickButtons({
  activeScreen,
  menuOpen,
  onOpenDialog,
  onToggleDetail,
  setMenuOpen,
}: QuickButtonsProps) {
  const menuItems: QuickMenuItem[] = [
    { label: "공장 변경", icon: "/factory.png", action: () => onOpenDialog("factory") },
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
    <div className="flex min-h-0 items-center justify-center">
      <div className="relative grid h-[116px] grid-rows-[56px_56px] gap-[4px]">
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
          <div className="absolute bottom-[60px] right-0 z-20 flex flex-col gap-[12px]">
            {menuItems.map((item) => (
              <button
                key={item.label}
                className="grid h-[56px] w-[176px] grid-cols-[1fr_56px] items-center bg-transparent p-0 text-left"
                onClick={() => handleMenuAction(item.action)}
                type="button"
              >
                <span className="pl-[8px] text-left text-[18px] font-black leading-none text-[#163d69] drop-shadow-[0_1px_0_rgba(255,255,255,0.75)]">
                  {item.label}
                </span>
                <span className="flex h-[56px] w-[56px] items-center justify-center">
                  <img src={item.icon} alt="" className="h-[56px] w-[56px] object-contain" />
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
