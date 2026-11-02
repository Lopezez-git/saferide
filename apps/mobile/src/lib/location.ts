import * as Location from "expo-location";

export type DevicePosition = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

export async function locate(_onRefined?: (position: DevicePosition) => void): Promise<DevicePosition> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permita o acesso à localização nas configurações do dispositivo e tente novamente.");
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error("Ative a localização do dispositivo e tente novamente.");
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("A localização demorou para responder. Tente novamente em um local com melhor sinal.")), 20000);
      }),
    ]);
    return { ...position.coords, timestamp: position.timestamp };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
