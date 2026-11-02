import * as SecureStore from "expo-secure-store";
export const storage = {
  get: () => SecureStore.getItemAsync("saferide-session"),
  set: (value: string) => SecureStore.setItemAsync("saferide-session", value),
  clear: () => SecureStore.deleteItemAsync("saferide-session"),
};
