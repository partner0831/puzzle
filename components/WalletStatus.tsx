'use client'

import { Button } from "@/components/ui/button"

interface WalletStatusProps {
  isConnected: boolean
  walletName?: string
  formattedAddress?: string
  onConnect: () => void
  onDisconnect: () => void
  customFontStyle?: React.CSSProperties
}

export function WalletStatus({ 
  isConnected, 
  walletName, 
  formattedAddress, 
  onConnect, 
  onDisconnect, 
  customFontStyle 
}: WalletStatusProps) {
  if (!isConnected) {
    return (
      <Button
        onClick={onConnect}
        className="w-full bg-white text-red-700 border-2 border-red-700 hover:bg-red-50 text-base font-bold py-2 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all touch-manipulation"
        style={{
          ...customFontStyle,
          letterSpacing: "1px",
          fontSize: "1rem",
          minHeight: "34px", // Reduced by 40% from 56px
        }}
      >
        💳 Connect Wallet
      </Button>
    )
  }

  return (
    <>
      <div className="w-full bg-green-100 text-green-800 border-4 border-green-600 text-base font-bold py-2 px-6 rounded-xl shadow-lg touch-manipulation flex items-center justify-center"
        style={{
          ...customFontStyle,
          letterSpacing: "1px",
          fontSize: "1rem",
          minHeight: "34px", // Reduced by 40% from 56px
        }}
      >
        ✅ Connected {formattedAddress}
      </div>
      <Button
        onClick={onDisconnect}
        className="w-full bg-red-600 hover:bg-red-700 text-white text-base font-bold py-2 px-6 rounded-xl border-4 border-red-700 shadow-lg transform hover:scale-105 transition-all touch-manipulation"
        style={{
          ...customFontStyle,
          letterSpacing: "1px",
          fontSize: "1rem",
          minHeight: "34px", // Reduced by 40% from 56px
        }}
      >
        🔌 Disconnect
      </Button>
    </>
  )
}
