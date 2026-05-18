export const createGeoSlice = (set) => ({
  geoStatus: "checking", // "prompt" | "granted" | "denied"
  geoCoords: { lat: null, lng: null },
  geoAddress: "",

  setGeoStatus: (status) => set({ geoStatus: status }),
  setGeoCoords: (coords) => set({ geoCoords: coords }),
  setGeoAddress: (address) => set({ geoAddress: address }),
});
