import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyClass - Aplikasi Monitoring Kelas & Keaktifan Murid",
  description: "Pantau kehadiran harian, poin keaktifan, karya kreativitas, dan ibadah mandiri anak secara real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className="h-full antialiased"
    >
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full font-sans overflow-hidden flex flex-col bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
