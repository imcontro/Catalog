import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Каталог NapitkiBerkat",
  description: "Каталог напитков NapitkiBerkat для заказов через WhatsApp"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
