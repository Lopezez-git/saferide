import { useEffect, useRef } from "react";
import { mapHtml, MapProps } from "./mapHtml";
export default function MapCanvas({ data, onPick, onReport, height = 360, html = mapHtml }: MapProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    function send() {
      ref.current?.contentWindow?.postMessage({ type: "update", data }, "*");
    }
    function receive(e: MessageEvent) {
      if (e.source !== ref.current?.contentWindow) return;
      try {
        const d = JSON.parse(e.data);
        if (!d.saferide) return;
        if (d.type === "ready") send();
        if (
          d.type === "pick" &&
          Number.isFinite(d.latitude) &&
          Number.isFinite(d.longitude)
        )
          onPick({ latitude: d.latitude, longitude: d.longitude });
        if (d.type === "report" && typeof d.id === "string") onReport(d.id);
      } catch {}
    }
    window.addEventListener("message", receive);
    send();
    return () => window.removeEventListener("message", receive);
  }, [data, onPick, onReport]);
  return (
    <iframe
      ref={ref}
      title="Mapa interativo de São Paulo"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ width: "100%", height, border: 0, borderRadius: 0 }}
    />
  );
}
