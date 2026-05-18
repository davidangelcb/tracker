// src/store/useGlobalStore.js
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { createSystemSlice } from "./slices/system.slice";
import { createUiSlice } from "./slices/ui.slice";
import { createGeoSlice } from "./slices/geo.slice";

export const useGlobalStore = create(
  import.meta.env.MODE === "development"
    ? devtools((set, get) => ({
        ...createSystemSlice(set, get),
        ...createUiSlice(set, get),
        ...createGeoSlice(set, get),
      }))
    : (set, get) => ({
        ...createSystemSlice(set, get),
        ...createUiSlice(set, get),
        ...createGeoSlice(set, get),
      })
);