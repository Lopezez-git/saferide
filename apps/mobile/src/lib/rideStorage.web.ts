export const rideStorage = { get: async (key:string) => window.localStorage.getItem(key), set: async (key:string,value:string) => { window.localStorage.setItem(key,value); } };
