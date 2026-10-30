import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider, themeBootScript } from "@/components/theme";
import "./globals.css";
import "./components.css";
import "./brand-theme.css";
import "./lms-theme.css";
import "./appearance.css";
const manrope = localFont({ src: "./fonts/Manrope.ttf", variable: "--font-deems", weight: "200 800", display: "swap" });
export const metadata: Metadata = { title: "Deems", description: "Your personal learning workspace", icons: {icon:"/brand/favicon.ico",apple:"/brand/apple-touch-icon.png"}, robots: {index:false,follow:false} };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en" suppressHydrationWarning className={manrope.variable}><head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head><body><ThemeProvider>{children}</ThemeProvider></body></html>;
}
