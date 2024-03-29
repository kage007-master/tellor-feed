"use client";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StoreProvider from "./StoreProvider";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { useEffect } from "react";
import { getPrices } from "@/lib/home/homeSlice";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { gasPrice, ethPrice, tellorPrice, avaliableEarning } = useSelector(
    (state: RootState) => state.home
  );
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(getPrices());
    setInterval(() => {
      dispatch(getPrices());
    }, 12000);
  }, []);

  return (
    <html lang="en">
      <body className="bg-[#0D1421]">
        <AntdRegistry>
          <StoreProvider>
            <main className="flex min-h-screen flex-col justify-between">
              <nav className="!z-50 flex gap-2 px-5 py-2 fixed bg-[#aaa] w-full">
                <div>Gas: {(gasPrice / 1e9).toFixed(0)} Gwei</div>
                <div>ETH: {ethPrice}</div>
                <div>TRB: {tellorPrice}</div>
                <div>Current Rewards: {avaliableEarning}</div>
                <div>
                  Estimated Earning:{" "}
                  {(
                    avaliableEarning * tellorPrice -
                    ((gasPrice * 272954) / 1e18) * ethPrice
                  ).toFixed(2)}
                </div>
              </nav>
              {children}
            </main>
          </StoreProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
