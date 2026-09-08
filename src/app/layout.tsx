import type { Metadata } from "next";
import { Fustat } from "next/font/google";
import { ClerkAuthProvider } from "@/components/layout/ClerkAuthProvider";
import { Providers } from "@/components/layout/Providers";
import { DevHostRedirect } from "@/components/shared/DevHostRedirect";
import "./globals.css";

const fustat = Fustat({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fustat",
});

export const metadata: Metadata = {
  title: "eMenza",
  description: "Studentski portal za menzu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr-Latn" data-theme="light">
      <body className={`${fustat.variable} font-sans antialiased`}>
        <DevHostRedirect />
        <ClerkAuthProvider>
          <Providers>{children}</Providers>
        </ClerkAuthProvider>
      </body>
    </html>
  );
}
