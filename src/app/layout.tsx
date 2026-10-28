import type { Metadata } from "next";
import "./globals.css";
import "./components.css";
import "./brand-theme.css";
import "./lms-theme.css";
export const metadata: Metadata = { title: "Deems", description: "Your personal learning workspace", icons: {icon:"/brand/favicon.ico",apple:"/brand/apple-touch-icon.png"}, robots: {index:false,follow:false} };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
