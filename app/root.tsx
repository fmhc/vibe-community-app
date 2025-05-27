import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useChangeLanguage } from "remix-i18next/react";
import { useTranslation } from "react-i18next";
import i18next from "~/i18n.server";

import "./tailwind.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const locale = await i18next.getLocale(request);
  return json({ locale });
}

export function Layout({ children }: { children: React.ReactNode }) {
  // Safely get loader data with fallback
  let locale = "en";
  try {
    const loaderData = useLoaderData<typeof loader>();
    locale = loaderData?.locale || "en";
  } catch (error) {
    // Fallback for error boundaries or missing loader data
    console.warn("Could not get loader data, using fallback locale:", error);
    locale = "en";
  }
  
  const { i18n } = useTranslation();
  
  // This hook will change the i18n instance language to the current locale
  // detected by the loader, this way, when we do SSR, both the server and client will
  // have the same language
  useChangeLanguage(locale);

  return (
    <html lang={locale} dir={i18n?.dir?.() || "ltr"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
