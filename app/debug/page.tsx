"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Wallet, Coins, Network, RefreshCw } from "lucide-react"
import { useWagmiWallet } from "@/hooks/useWagmiWallet"
import { VMFDebugTool } from "@/components/VMFDebugTool"

export default function DebugPage() {
  const customFontStyle = {
    fontFamily: '"Comic Sans MS", "Marker Felt", "Chalkduster", "Kalam", "Caveat", cursive',
    fontWeight: "bold" as const,
  }

  const [ethBalance, setEthBalance] = useState<string>("0")
  const [isLoadingEth, setIsLoadingEth] = useState(false)
  const [localStorageData, setLocalStorageData] = useState<{ [key: string]: string }>({})
  const [isClient, setIsClient] = useState(false)

  // SSR PROTECTION: Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // SSR SAFETY: Don't render anything until client-side to prevent SSR issues
  if (!isClient) {
    return (
      <div className="min-h-screen p-4" style={{
        backgroundImage: "url('/images/rotated-90-pizza-wallpaper.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center center",
      }}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm border-4 border-blue-800 rounded-3xl shadow-2xl p-6">
            <h1 className="text-3xl text-center text-blue-800 mb-6" style={customFontStyle}>
              🛠️ Debug Console 🛠️
            </h1>
            <p className="text-center text-gray-600">Loading debug console...</p>
          </div>
        </div>
      </div>
    )
  }

  // SSR SAFETY: Only call Wagmi hooks after client-side hydration
  const { 
    address, 
    isConnected, 
    error: walletError, 
    getBalance,
    formatAddress 
  } = useWagmiWallet()

  // Safe localStorage access
  const getLocalStorageItem = (key: string): string | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key)
    }
    return null
  }

  const getAllLocalStorageData = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data: { [key: string]: string } = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          data[key] = localStorage.getItem(key) || ''
        }
      }
      return data
    }
    return {}
  }

  const clearLocalStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear()
      window.location.reload()
    }
  }

  // Update localStorage data when component mounts
  useEffect(() => {
    if (isClient) {
      setLocalStorageData(getAllLocalStorageData())
    }
  }, [isClient])

  const fetchEthBalance = async () => {
    if (!isConnected || !isClient) return

    setIsLoadingEth(true)
    try {
      const balance = await getBalance()
      setEthBalance(balance)
    } catch (error) {
      console.error("Error fetching ETH balance:", error)
    } finally {
      setIsLoadingEth(false)
    }
  }

  return (
    <div
      className="min-h-screen p-4"
      style={{
        backgroundImage: "url('/images/rotated-90-pizza-wallpaper.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center center",
      }}
    >
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white/90 backdrop-blur-sm border-4 border-red-800 rounded-3xl shadow-2xl mb-6">
          <CardHeader className="text-center pb-4">
            <div className="absolute top-4 left-4">
              <Link href="/">
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-white hover:bg-gray-100 text-black border-2 border-gray-300 rounded-xl shadow-lg"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
            </div>
            <CardTitle className="text-3xl text-red-800" style={customFontStyle}>
              🔧 Debug Console 🔧
            </CardTitle>
            <p className="text-gray-600" style={customFontStyle}>
              Wallet & Contract Information
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Wallet Connection Status */}
            <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-blue-800" style={customFontStyle}>
                  Wallet Connection
                </h3>
              </div>

              {isConnected ? (
                <div className="space-y-2">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <p className="text-sm text-green-800" style={customFontStyle}>
                      <strong>Status:</strong> Connected ✅
                    </p>
                    <p className="text-sm text-green-800" style={customFontStyle}>
                      <strong>Wallet:</strong> Connected Wallet
                    </p>
                    <p className="text-sm text-green-800 font-mono">
                      <strong>Address:</strong> {address}
                    </p>
                    <p className="text-sm text-green-800" style={customFontStyle}>
                      <strong>Formatted:</strong> {formatAddress}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-100 p-3 rounded-lg">
                  <p className="text-sm text-red-800" style={customFontStyle}>
                    <strong>Status:</strong> Not Connected ❌
                  </p>
                  {walletError && (
                    <p className="text-xs text-red-700 mt-2" style={customFontStyle}>
                      <strong>Error:</strong> {walletError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ETH Balance */}
            <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-purple-800" style={customFontStyle}>
                    ETH Balance
                  </h3>
                </div>
                <Button
                  onClick={fetchEthBalance}
                  disabled={!isConnected || isLoadingEth}
                  size="sm"
                  variant="outline"
                  className="border-purple-300 bg-transparent"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingEth ? "animate-spin" : ""}`} />
                </Button>
              </div>

              <div className="bg-white p-3 rounded-lg">
                <p className="text-lg font-bold text-purple-800" style={customFontStyle}>
                  {isLoadingEth ? "Loading..." : `${Number.parseFloat(ethBalance).toFixed(4)} ETH`}
                </p>
              </div>
            </div>

            {/* VMF Balance */}
            <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-bold text-green-800" style={customFontStyle}>
                    VMF Token Balance
                  </h3>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg">
                <p className="text-lg font-bold text-green-800" style={customFontStyle}>
                  VMF Balance: Not Available
                </p>
                <p className="text-sm text-gray-600">
                  VMF token functionality is not available in this version
                </p>
              </div>
            </div>

            {/* VMF Debug Tool */}
            <VMFDebugTool />

            {/* Local Storage Debug */}
            <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
              <h3 className="text-lg font-bold text-yellow-800 mb-3" style={customFontStyle}>
                🗄️ Local Storage Data
              </h3>

              <div className="bg-white p-3 rounded-lg">
                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <strong>Wallet Connection:</strong>
                    <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                      {getLocalStorageItem("wallet_connection") || "None"}
                    </pre>
                  </div>

                  <div>
                    <strong>Today's Entries:</strong>
                    <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                      {Object.keys(localStorageData)
                        .filter((key) => key.startsWith("pizza_entry_") && key.includes(new Date().toDateString()))
                        .map((key) => `${key}: ${localStorageData[key]}`)
                        .join("\n") || "None"}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Clear Data Button */}
            <div className="text-center">
              <Button
                onClick={clearLocalStorage}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                style={customFontStyle}
                disabled={!isClient}
              >
                🗑️ Clear All Data & Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
