import type { Metadata } from "next";
import "./globals.css";
import "./components.css";
export const metadata: Metadata = { title: "Deems", description: "Your local interview preparation workspace", icons: {icon:"/icon.svg"}, robots: {index:false,follow:false} };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
