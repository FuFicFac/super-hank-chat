import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Newsreader, IBM_Plex_Mono, Nunito } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["700", "800"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const ibmPlex = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Browser UI for the Hermes CLI agent",
};

async function initDbForRuntime() {
  if (process.env.npm_lifecycle_event === "build") return;
  const { initDbSingleton } = await import("@/lib/db/client");
  await initDbSingleton();
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await initDbForRuntime();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("shc-ui-theme");if(t!=="dispatch"&&t!=="classroom")t="classroom";document.documentElement.setAttribute("data-ui",t)}catch(e){document.documentElement.setAttribute("data-ui","classroom")}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${nunito.variable} ${jetbrains.variable} ${newsreader.variable} ${ibmPlex.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
