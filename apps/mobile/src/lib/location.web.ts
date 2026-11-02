import type { DevicePosition } from "./location";
export type { DevicePosition } from "./location";

export function locate(): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este navegador não oferece localização. Abra em localhost ou HTTPS em um navegador compatível."));
      return;
    }
    // Some embedded browsers never finish the permission request.
    const timer = setTimeout(() => reject(new Error("O navegador não respondeu à localização. Verifique a permissão ou abra o SafeRide no Chrome/Edge e tente novamente.")), 25000);
    navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => { clearTimeout(timer); resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, timestamp }); },
      (error) => { clearTimeout(timer); reject(new Error(error.code === 1
        ? "Localização bloqueada. Permita o acesso nas configurações deste site e do dispositivo e tente novamente."
        : error.code === 3
          ? "A localização demorou para responder. Verifique o sinal e tente novamente."
          : "Não foi possível localizar este dispositivo. Ative a localização e tente novamente.")); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  });
}
