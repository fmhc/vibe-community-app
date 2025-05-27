import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

i18next
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: "en", // default language
    fallbackLng: "en",
    defaultNS: "common",
    
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    
    detection: {
      order: ["cookie", "localStorage", "navigator", "htmlTag"],
      caches: ["cookie", "localStorage"],
    },
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Add some debugging and error handling
    debug: false,
    
    // Handle loading failures gracefully
    saveMissing: false,
    
    // React specific options
    react: {
      useSuspense: false,
    },
  });

export default i18next; 