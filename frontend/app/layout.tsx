import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/i18n/context";
import { ToastProvider } from "@/components/ui/toast";
import { PageLoader } from "@/components/layout/page-loader";
import { BASE_PATH } from "@/lib/base-path";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillBridge EdTech",
  description:
    "Bridging skills to opportunities. Building futures. The SkillBridge youth employability platform.",
  icons: {
    icon: `${BASE_PATH}/SkillBridge_logo.png`,
    shortcut: `${BASE_PATH}/SkillBridge_logo.png`,
    apple: `${BASE_PATH}/SkillBridge_logo.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--sb-bg)] text-[var(--sb-text)]">
        <PageLoader />
        <LanguageProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
