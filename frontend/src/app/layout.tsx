import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة نظر الشكاوى ضد المحامين | الهيئة السعودية للمحامين",
  description: "نظام متكامل لاستقبال ونظر الشكاوى والبلاغات ضد المحامين في المملكة العربية السعودية",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-full antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
