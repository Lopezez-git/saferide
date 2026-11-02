export const storage = {
  get: async () =>
    typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem("saferide-session"),
  set: async (value: string) => {
    window.sessionStorage.setItem("saferide-session", value);
  },
  clear: async () => {
    window.sessionStorage.removeItem("saferide-session");
  },
};
