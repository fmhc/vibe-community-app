import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useChangeLanguage } from "remix-i18next/react";
import { useTranslation } from "react-i18next";
import i18next from "./i18n.server";
import { securityHeaders } from "./lib/security.server";
import { logger } from "./lib/logger.server";

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
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
  },
  // Favicon and App Icons
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
  { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
  { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
  
  // SEO and Performance
  { rel: "canonical", href: "https://community.vibe-coding.hamburg" },
  { rel: "alternate", hrefLang: "en", href: "https://community.vibe-coding.hamburg" },
  { rel: "alternate", hrefLang: "de", href: "https://community.vibe-coding.hamburg?lng=de" },
  { rel: "alternate", hrefLang: "x-default", href: "https://community.vibe-coding.hamburg" },
];

export const meta: MetaFunction = () => {
  return [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width,initial-scale=1" },
    { title: "Vibe Coding Hamburg - AI-Powered Developer Community" },
    { 
      name: "description", 
      content: "Join Hamburg's most vibrant AI-powered coding community. Connect with fellow developers, work on exciting projects, and explore the future of coding with AI tools." 
    },
    { name: "keywords", content: "Hamburg coding community, AI development, developer meetups, coding workshops, GitHub Copilot, ChatGPT, Claude API, programming events" },
    { name: "author", content: "Vibe Coding Hamburg" },
    { name: "robots", content: "index, follow" },
    
    // Open Graph / Facebook
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://community.vibe-coding.hamburg" },
    { property: "og:title", content: "Vibe Coding Hamburg - AI-Powered Developer Community" },
    { 
      property: "og:description", 
      content: "Join Hamburg's most vibrant AI-powered coding community. Connect with fellow developers, work on exciting projects, and explore the future of coding with AI tools." 
    },
    { property: "og:image", content: "https://community.vibe-coding.hamburg/og-image.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:site_name", content: "Vibe Coding Hamburg" },
    { property: "og:locale", content: "en_US" },
    { property: "og:locale:alternate", content: "de_DE" },
    
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:url", content: "https://community.vibe-coding.hamburg" },
    { name: "twitter:title", content: "Vibe Coding Hamburg - AI-Powered Developer Community" },
    { 
      name: "twitter:description", 
      content: "Join Hamburg's most vibrant AI-powered coding community. Connect with fellow developers, work on exciting projects, and explore the future of coding with AI tools." 
    },
    { name: "twitter:image", content: "https://community.vibe-coding.hamburg/twitter-image.png" },
    
    // Additional SEO
    { name: "theme-color", content: "#00f5ff" },
    { name: "msapplication-TileColor", content: "#0a0a0f" },
    { name: "application-name", content: "Vibe Coding Hamburg" },
    { name: "apple-mobile-web-app-title", content: "Vibe Coding Hamburg" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    
    // Geographic and Local SEO
    { name: "geo.region", content: "DE-HH" },
    { name: "geo.placename", content: "Hamburg" },
    { name: "geo.position", content: "53.5511;9.9937" },
    { name: "ICBM", content: "53.5511, 9.9937" },
];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const locale = await i18next.getLocale(request);
  const url = new URL(request.url);
  
  // Log page access for monitoring
  logger.info(`Page accessed: ${url.pathname}`, {
    service: 'app',
    method: 'loader',
    path: url.pathname,
    userAgent: request.headers.get('User-Agent') || 'unknown',
    locale
  });
  
  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://community.vibe-coding.hamburg/#organization",
        "name": "Vibe Coding Hamburg",
        "description": "Hamburg's most vibrant AI-powered coding community",
        "url": "https://community.vibe-coding.hamburg",
        "logo": {
          "@type": "ImageObject",
          "url": "https://community.vibe-coding.hamburg/logo.png",
          "width": 300,
          "height": 300
        },
        "sameAs": [
          "https://github.com/vibe-coding-hamburg",
          "https://discord.gg/vibe-coding-hamburg",
          "https://www.linkedin.com/company/vibe-coding-hamburg"
        ],
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Hamburg",
          "addressRegion": "Hamburg",
          "addressCountry": "DE"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "Customer Service",
          "email": "hello@vibe-coding.hamburg",
          "availableLanguage": ["English", "German"]
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://community.vibe-coding.hamburg/#website",
        "url": "https://community.vibe-coding.hamburg",
        "name": "Vibe Coding Hamburg",
        "description": "AI-powered developer community platform",
        "publisher": {
          "@id": "https://community.vibe-coding.hamburg/#organization"
        },
        "inLanguage": ["en", "de"],
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://community.vibe-coding.hamburg/search?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "WebPage",
        "@id": `${url.href}#webpage`,
        "url": url.href,
        "name": "Vibe Coding Hamburg - AI-Powered Developer Community",
        "isPartOf": {
          "@id": "https://community.vibe-coding.hamburg/#website"
        },
        "about": {
          "@id": "https://community.vibe-coding.hamburg/#organization"
        },
        "description": "Join Hamburg's most vibrant AI-powered coding community. Connect with fellow developers, work on exciting projects, and explore the future of coding with AI tools.",
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://community.vibe-coding.hamburg"
            }
          ]
        }
      },
      {
        "@type": "Event",
        "@id": "https://community.vibe-coding.hamburg/#monthly-meetup",
        "name": "Monthly AI Coding Meetup",
        "description": "Regular meetup for AI-powered development, workshops, and networking",
        "organizer": {
          "@id": "https://community.vibe-coding.hamburg/#organization"
        },
        "location": {
          "@type": "Place",
          "name": "Hamburg",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Hamburg",
            "addressCountry": "DE"
          }
        },
        "eventAttendanceMode": "https://schema.org/MixedEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "startDate": "2024-02-22T19:00:00+01:00",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock"
        }
      },
      {
        "@type": "LocalBusiness",
        "@id": "https://community.vibe-coding.hamburg/#local-business",
        "name": "Vibe Coding Hamburg",
        "description": "Developer community and coding education",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Hamburg",
          "addressRegion": "Hamburg",
          "addressCountry": "DE"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "53.5511",
          "longitude": "9.9937"
        },
        "url": "https://community.vibe-coding.hamburg",
        "email": "hello@vibe-coding.hamburg",
        "priceRange": "Free",
        "openingHours": "Mo-Su 00:00-24:00"
      }
    ]
  };

  return json({
    locale,
    structuredData,
    ENV: {
      NODE_ENV: process.env.NODE_ENV,
      APP_URL: process.env.APP_URL || 'http://localhost:3000',
    },
  }, {
    headers: securityHeaders
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  
  const { i18n } = useTranslation();
  
  // This hook will change the i18n instance language to the current locale
  // detected by the loader, this way, when we do SSR, both the server and client will
  // have the same language
  useChangeLanguage(data?.locale || "en");

  return (
    <html lang={data?.locale ?? "en"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data?.structuredData),
          }}
        />
        
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        
        {/* DNS Prefetch for external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        
        {/* Performance hints */}
        <meta httpEquiv="Accept-CH" content="DPR, Viewport-Width, Width" />
        
        {/* Progressive Web App */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-starturl" content="/" />
        
        {/* Cookie Consent (GDPR Compliance) */}
        {data?.ENV.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('consent', 'default', {
                  'analytics_storage': 'denied',
                  'ad_storage': 'denied',
                  'wait_for_update': 500,
                });
              `,
            }}
          />
        )}
      </head>
      <body className="bg-vaporwave-dark text-white antialiased">
        {children}
        <ScrollRestoration />
        
        {/* Environment variables for client-side */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data?.ENV)}`,
          }}
        />
        
        {/* Service Worker Registration */}
        {data?.ENV.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js')
                      .then(function(registration) {
                        console.log('SW registered: ', registration);
                      })
                      .catch(function(registrationError) {
                        console.log('SW registration failed: ', registrationError);
                      });
                  });
                }
              `,
            }}
          />
        )}
        
        {/* Analytics (with GDPR compliance) */}
        {data?.ENV.NODE_ENV === 'production' && (
          <>
            <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID" />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  
                  // Only load analytics if user has consented
                  if (localStorage.getItem('cookieConsent') === 'accepted') {
                    gtag('config', 'GA_MEASUREMENT_ID', {
                      page_title: document.title,
                      page_location: window.location.href,
                      anonymize_ip: true,
                      allow_google_signals: false,
                      allow_ad_personalization_signals: false
                    });
                  }
                `,
              }}
            />
          </>
        )}
        
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
