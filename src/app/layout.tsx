import type { Metadata } from "next";
import "./globals.css";
import StoreProvider from "./StoreProvider";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Navbar from "./Navbar";

export const metadata: Metadata = {
  title: "Tellor Feed",
  description: "Tellor Feed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0D1421]">
        <AntdRegistry>
          <StoreProvider>
            <main className="flex min-h-screen flex-col justify-between">
              <Navbar />
              {children}
            </main>
          </StoreProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
