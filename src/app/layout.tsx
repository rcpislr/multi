import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Satış Paneli",
  description: "Çok subdomainli satış ve sipariş yönetimi",
};

// suppressHydrationWarning: browser extensions (e.g. Tag Assistant) add attributes to <html>/<body>
// before React hydrates; that is not an app bug.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
