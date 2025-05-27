/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */

import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { getInitialNamespaces } from "remix-i18next/client";

async function hydrate() {
  try {
    await i18next
      .use(initReactI18next)
      .use(LanguageDetector)
      .use(Backend)
      .init({
        supportedLngs: ["en", "de"],
        defaultNS: "common",
        fallbackLng: "en",
        
        // Disable suspense for now
        react: { useSuspense: false },
        
        ns: getInitialNamespaces(),
        
        backend: {
          loadPath: "/locales/{{lng}}/{{ns}}.json",
        },
        
        detection: {
          order: ["cookie", "localStorage", "navigator", "htmlTag"],
          caches: ["cookie", "localStorage"],
        },
        
        // Add error handling
        saveMissing: false,
        debug: false,
      });
  } catch (error) {
    console.warn("i18n initialization failed:", error);
    // Continue with hydration even if i18n fails
  }

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <RemixBrowser />
      </StrictMode>
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  window.setTimeout(hydrate, 1);
}
