import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

export const metadata: Metadata = {
  title: "ElMaher | الماهر",
  description: "منصة تفاعلية للفيزياء والكيمياء مع مستر ماهر حمود",
};

export const viewport: Viewport = { themeColor: "#0a1628" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
