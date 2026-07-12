import { useEffect, useState } from "react";
import { fetchGsTechSettings, fetchProductSettings } from "../services/api";
import type { ProductSettings } from "../services/api";

export function CctvDialog({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<ProductSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("CCTV 설정 불러오는 중...");

  useEffect(() => {
    Promise.all([fetchProductSettings(), fetchGsTechSettings()])
      .then(([product, gstech]) => {
        setSettings(product);
        setEnabled(gstech.cctv_enabled);
        setMessage(gstech.cctv_enabled ? "카메라를 선택하세요" : "GSTECH 설정에서 CCTV 사용을 먼저 활성화하세요");
      })
      .catch((error) => setMessage(`CCTV 설정 불러오기 실패: ${error instanceof Error ? error.message : String(error)}`));
  }, []);

  const cameras = settings
    ? [
        { name: "CAM 1", url: cameraUrl(settings.camera1_ip, settings.camera1_port) },
        { name: "CAM 2", url: cameraUrl(settings.camera2_ip, settings.camera2_port) },
      ]
    : [];

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/65 p-[18px]">
      <section className="grid h-[650px] w-[1040px] max-w-full grid-rows-[72px_1fr_54px] overflow-hidden rounded-[12px] bg-[#f6f9fc] shadow-2xl max-sm:h-[calc(100dvh-16px)]">
        <header className="flex items-center justify-between border-b border-[#d9e6f0] bg-white px-[18px]">
          <div className="text-[26px] font-black text-[#173f69]">CCTV</div>
          <button className="h-[42px] w-[42px] rounded-[8px] bg-[#eef3f7] text-[27px] font-black text-[#45657f]" onClick={onClose} type="button">×</button>
        </header>
        <div className="grid min-h-0 grid-cols-2 gap-[12px] p-[14px] max-sm:grid-cols-1 max-sm:overflow-y-auto">
          {cameras.map((camera) => (
            <div className="grid min-h-[220px] grid-rows-[42px_1fr_48px] overflow-hidden rounded-[10px] border border-[#d9e6f0] bg-white" key={camera.name}>
              <div className="flex items-center justify-between bg-[#eef7ff] px-[12px] text-[16px] font-black text-[#173f69]"><span>{camera.name}</span><span className="text-[11px] text-[#6f879d]">{camera.url || "주소 미설정"}</span></div>
              <div className="flex min-h-0 items-center justify-center bg-[#17212b] p-[8px] text-center text-[14px] font-black text-white/75">
                {camera.url?.startsWith("https://") ? <iframe className="h-full w-full border-0" src={camera.url} title={camera.name} /> : "HTTP 카메라는 HTTPS 화면 안에 직접 표시할 수 없습니다. 아래 버튼으로 카메라 화면을 여세요."}
              </div>
              <button className="bg-[#237bd0] text-[15px] font-black text-white disabled:bg-[#aebbc6]" disabled={!enabled || !camera.url} onClick={() => { if (camera.url) window.open(camera.url, "_blank", "noopener,noreferrer"); }} type="button">카메라 화면 열기</button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center border-t border-[#d9e6f0] bg-white text-[13px] font-black text-[#45657f]">{message}</div>
      </section>
    </div>
  );
}

function cameraUrl(ip: string, port: number) {
  const host = ip.trim();
  if (!host || host === "0.0.0.0" || port <= 0) return "";
  if (/^https?:\/\//i.test(host)) {
    try {
      const url = new URL(host);
      if (port) url.port = String(port);
      return url.toString();
    } catch {
      return "";
    }
  }
  return `http://${host}:${port}`;
}
