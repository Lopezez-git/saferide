import { useEffect, useRef } from "react";
import { WebView } from "react-native-webview";
import { mapHtml, MapProps } from "./mapHtml";
export default function MapCanvas({ data, onPick, onReport }: MapProps) {
  const ref = useRef<WebView<object>>(null);
  const script = `window.updateMap && window.updateMap(${JSON.stringify(data)});true;`;
  useEffect(() => {
    ref.current?.injectJavaScript(script);
  }, [script]);
  return (
    <WebView<object>
      ref={ref}
      style={{ height: 360, borderRadius: 20 }}
      source={{
        html: mapHtml,
        baseUrl: "https://github.com/Lopezez-git/saferide",
      }}
      originWhitelist={["*"]}
      userAgent="SafeRideAcademicPrototype/0.1 (+https://github.com/Lopezez-git/saferide)"
      onMessage={(e) => {
        try {
          const d = JSON.parse(e.nativeEvent.data);
          if (!d.saferide) return;
          if (d.type === "ready") ref.current?.injectJavaScript(script);
          if (
            d.type === "pick" &&
            Number.isFinite(d.latitude) &&
            Number.isFinite(d.longitude)
          )
            onPick({ latitude: d.latitude, longitude: d.longitude });
          if (d.type === "report" && typeof d.id === "string") onReport(d.id);
        } catch {}
      }}
      onShouldStartLoadWithRequest={(r) =>
        r.url === "about:blank" ||
        r.url === "https://github.com/Lopezez-git/saferide"
      }
    />
  );
}
