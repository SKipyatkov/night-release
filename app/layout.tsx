import type { Metadata, Viewport } from "next";
import { GAME } from "@/lib/copy";
import "./globals.css";

export const metadata: Metadata = {
  title: `${GAME.title} — ${GAME.specialty}`,
  description:
    "Спасите релиз приложения: восстановите команды, посчитайте экономику и разберите правовой вопрос. Игра для дня знакомства со специальностью «Бизнес-информатика».",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#07090f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <div id="root-app">{children}</div>
      </body>
    </html>
  );
}
