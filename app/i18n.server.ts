import { RemixI18Next } from "remix-i18next/server";
import { resolve } from "node:path";

// Import translation resources directly
import enCommon from "../public/locales/en/common.json";
import deCommon from "../public/locales/de/common.json";

export const i18n = new RemixI18Next({
  detection: {
    supportedLanguages: ["en", "de"],
    fallbackLanguage: "en",
    // Use cookie for language detection
    order: ["cookie", "header"],
  },
  // This is the configuration for i18next used
  // when translating messages server-side only
  i18next: {
    resources: {
      en: {
        common: enCommon,
      },
      de: {
        common: deCommon,
      },
    },
    fallbackLng: "en",
    defaultNS: "common",
  },
});

export default i18n; 