import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import FarcasterWrapper from "@/components/FarcasterWrapper";
import { WagmiProvider } from "@/components/WagmiProvider";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pizza Party - The Tastiest Way to Chase Jackpots",
  description:
    "Get a slice of the action with Pizza Party, a sizzling decentralized jackpot game on Base! Toss in just $1 VMF for a chance to dough-minate daily and weekly prizes. With crust-worthy on-chain randomness, instant payouts, and cheesy topping rewards, it's a fair and fun fest for the whole pizza posse.",
  generator: "VMF Coin",
  openGraph: {
    title: "Join the Pizza Party Fun!",
    description:
      "Get a slice of the action with Pizza Party, a sizzling decentralized jackpot game on Base! Toss in just $1 VMF for a chance to dough-minate daily and weekly prizes. With crust-worthy on-chain randomness, instant payouts, and cheesy topping rewards, it's a fair and fun fest for the whole pizza posse.",
    images: ["https://u.cubeupload.com/vmfcoin/PizzaPartyHomepageLa.png"],
    url: "https://v0-farcaster-preview-issue.vercel.app",
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:name": "Pizza Party",
    "fc:frame:icon":
      "https://u.cubeupload.com/vmfcoin/E49A4767F2074D3C9CE7.png",
    "fc:frame:splash:image":
      "https://u.cubeupload.com/vmfcoin/PizzaPartyHomepageLa.png",
    "fc:frame:splash:color": "#b01c17",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:name" content="Pizza Party" />
        <meta
          property="fc:frame:icon"
          content="https://u.cubeupload.com/vmfcoin/E49A4767F2074D3C9CE7.png"
        />
        <meta
          property="fc:frame:splash:image"
          content="https://u.cubeupload.com/vmfcoin/PizzaPartyHomepageLa.png"
        />
        <meta property="fc:frame:splash:color" content="#b01c17" />
        <script type="module">
          {`
            // Import Farcaster Mini App SDK
            import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
            
            // Make SDK available globally
            window.farcasterSdk = sdk;
            
            // Signal that SDK is ready
            window.dispatchEvent(new CustomEvent('farcaster-sdk-loaded'));
            
            console.log('[v0] Farcaster SDK loaded via CDN');
          `}
        </script>
      </head>
      <body className={inter.className}>
        <Suspense fallback={<div>Loading...</div>}>
          <WagmiProvider>
            <FarcasterWrapper>{children}</FarcasterWrapper>
          </WagmiProvider>
        </Suspense>
      </body>
    </html>
  );
}
