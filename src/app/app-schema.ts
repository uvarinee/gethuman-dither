import { defineToolcraft } from "@/toolcraft/runtime";

import { appIdentity } from "./app-identity";

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    upload: true,
  },
  identity: appIdentity,
  panels: {
    controls: {
      sections: [],
      title: "Dither controls",
    },
  },
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
