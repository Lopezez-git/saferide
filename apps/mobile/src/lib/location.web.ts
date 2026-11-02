import type { DevicePosition } from "./location";
export type { DevicePosition } from "./location";

function requestPosition(highAccuracy: boolean): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    const timeout = highAccuracy ? 12000 : 8000;
    const timer = setTimeout(() => reject({ code: 3 }), timeout + 2000);
    navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => {
        clearTimeout(timer);
        resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, timestamp });
      },
      (error) => { clearTimeout(timer); reject(error); },
      { enableHighAccuracy: highAccuracy, maximumAge: highAccuracy ? 0 : 60000, timeout },
    );
  });
}

export async function locate(onRefined?: (position: DevicePosition) => void): Promise<DevicePosition> {
  if (!navigator.geolocation) {
    throw new Error("Este navegador não oferece localização. Abra o SafeRide em localhost ou HTTPS no Chrome/Edge.");
  }
  try {
    // A recent network position is useful even when a precise GPS fix is unavailable.
    let initial: DevicePosition;
    try {
      initial = await requestPosition(false);
    } catch (error) {
      if ((error as { code?: number }).code === 1) throw error;
      return await requestPosition(true);
    }
    if (onRefined) {
      void requestPosition(true).then((precise) => {
        if (precise.accuracy !== null && (initial.accuracy === null || precise.accuracy < initial.accuracy)) onRefined(precise);
      }).catch(() => { /* Keep the real approximate position when refinement fails. */ });
    }
    return initial;
  } catch (error) {
    if ((error as { code?: number }).code === 1) {
      throw new Error("Localização bloqueada. Permita o acesso para este site e ative a localização nas configurações do dispositivo.");
    }
    throw new Error("O dispositivo não forneceu sua localização. No Windows, confira Configurações > Privacidade e segurança > Localização. Se estiver no navegador integrado, teste localhost:8081 no Chrome/Edge com a permissão liberada. O mapa continua disponível para seleção manual.");
  }
}
