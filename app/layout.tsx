import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "Pizza Party - The Tastiest Way to Chase Jackpots",
  description:
    "Get a slice of the action with Pizza Party, a sizzling decentralized jackpot game on Base! Toss in just $1 VMF for a chance to dough-minate daily and weekly prizes. With crust-worthy on-chain randomness, instant payouts, and cheesy topping rewards, it's a fair and fun fest for the whole pizza posse.",
  icons: {
    icon: "/images/pizza-party-title-transparent.png",
    apple: "/images/pizza-party-title-transparent.png",
  },
  generator: "Pizza Party",
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
    "fc:frame:icon": "https://u.cubeupload.com/vmfcoin/E49A4767F2074D3C9CE7.png",
    "fc:frame:splash:image": "https://u.cubeupload.com/vmfcoin/PizzaPartyHomepageLa.png",
    "fc:frame:splash:color": "#b01c17",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:name" content="Pizza Party" />
        <meta property="fc:frame:icon" content="https://u.cubeupload.com/vmfcoin/E49A4767F2074D3C9CE7.png" />
        <meta property="fc:frame:splash:image" content="https://u.cubeupload.com/vmfcoin/PizzaPartyHomepageLa.png" />
        <meta property="fc:frame:splash:color" content="#b01c17" />

        <meta property="og:title" content="Join the Pizza Party Fun!" />
        <meta
          property="og:description"
          content="Get a slice of the action with Pizza Party, a sizzling decentralized jackpot game on Base! Toss in just $1 VMF for a chance to dough-minate daily and weekly prizes."
        />
        <meta property="og:image" content="https://u.cubeupload.com/vmfcoin/PizzaPartyHomepageLa.png" />
        <meta property="og:url" content="https://v0-farcaster-preview-issue.vercel.app" />

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
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
