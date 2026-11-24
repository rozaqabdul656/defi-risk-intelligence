import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mcClabe · DeFi Risk Intelligence",
  description: "Live, read-only Aave V4 liquidity intelligence."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
