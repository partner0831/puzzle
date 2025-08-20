"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { useEffect, useState } from "react"

declare global {
  interface Window {
    parent: Window
    farcasterSdk?: {
      actions: {
        ready: (options?: { disableNativeGestures?: boolean }) => Promise<void>
      }
    }
  }
}

export default function HomePage() {
  const customFontStyle = {
    fontFamily: '"Comic Sans MS", "Marker Felt", "Chalkduster", "Kalam", "Caveat", cursive',
    fontWeight: "bold" as const,
  }

  const [showWalletModal, setShowWalletModal] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isFarcaster: false,
  })

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      const isIOSDevice = /ipad|iphone|ipod/.test(userAgent)
      const isAndroidDevice = /android/.test(userAgent)
      const isFarcasterEnv = window.parent !== window || userAgent.includes("farcaster")

      setDeviceInfo({
        isMobile: isMobileDevice,
        isIOS: isIOSDevice,
        isAndroid: isAndroidDevice,
        isFarcaster: isFarcasterEnv,
      })
    }

    checkDevice()
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0)
    }
  }, [])

  // Farcaster Mini App SDK: Remove splash screen when ready
  useEffect(() => {
    if (!deviceInfo.isFarcaster) return

    const initializeFarcasterSDK = async () => {
      try {
        console.log("[v0] About to call sdk.actions.ready()")

        // Try multiple methods to call ready
        if (window.farcasterSdk?.actions?.ready) {
          await window.farcasterSdk.actions.ready()
          console.log("[v0] ✅ Called window.farcasterSdk.actions.ready()")
        }

        // Try dynamic import
        try {
          const { sdk } = await import("@farcaster/miniapp-sdk")
          if (sdk?.actions?.ready) {
            await sdk.actions.ready()
            console.log("[v0] ✅ Called imported sdk.actions.ready()")
          }
        } catch (importError) {
          console.log("[v0] ⚠️ Could not import @farcaster/miniapp-sdk:", importError)
        }

        // Fallback postMessage
        window.parent?.postMessage({ type: "sdk_ready" }, "*")
        console.log("[v0] ✅ Sent sdk_ready message to parent")
      } catch (error) {
        console.error("[v0] ❌ Error in Farcaster SDK initialization:", error)
      }
    }

    initializeFarcasterSDK()
  }, [deviceInfo.isFarcaster])

  const handlePlayClick = () => {
    if (deviceInfo.isFarcaster) {
      alert("🍕 Pizza Party game would start here! Connect your wallet to play for real prizes.")
    } else {
      window.location.href = "/game"
    }
  }

  const handleJackpotClick = () => {
    if (deviceInfo.isFarcaster) {
      alert("🌟 Weekly Jackpot info would be shown here!")
    } else {
      window.location.href = "/jackpot"
    }
  }

  const handleLeaderboardClick = () => {
    if (deviceInfo.isFarcaster) {
      alert("🏆 Leaderboard would be displayed here!")
    } else {
      window.location.href = "/leaderboard"
    }
  }

  const handleWalletClick = () => {
    if (deviceInfo.isFarcaster) {
      alert("🔗 Wallet connection would happen here in the full app!")
    } else {
      setShowWalletModal(true)
    }
  }

  return (
    <div
      className="min-h-screen p-2 sm:p-4"
      style={{
        backgroundImage: "url('/pizza-party-background.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        minHeight: deviceInfo.isMobile ? "calc(100vh)" : "100vh",
        backgroundColor: "#FEF3C7",
      }}
    >
      <div className="max-w-md mx-auto">
        <Card className="bg-white/90 backdrop-blur-sm border-4 border-red-800 rounded-3xl shadow-2xl">
          <CardContent className="p-4 sm:p-6 text-center">
            {/* MASSIVE Pizza Party Title - Mobile optimized */}
            <div className="mb-4">
              <div
                className="text-6xl sm:text-8xl font-black transform -rotate-3 drop-shadow-2xl"
                style={{
                  ...customFontStyle,
                  color: "#DC2626",
                  textShadow: "4px 4px 0px #991B1B, 8px 8px 0px #7F1D1D, 12px 12px 20px rgba(0,0,0,0.5)",
                  letterSpacing: "3px",
                  fontWeight: "900",
                  WebkitTextStroke: "2px #450A0A",
                  background: "linear-gradient(45deg, #DC2626, #EF4444, #F87171)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 6px #DC2626)",
                }}
              >
                PIZZA
              </div>
              <div style={{ height: "10px" }}></div>
              <div
                className="text-6xl sm:text-8xl font-black transform -rotate-3 drop-shadow-2xl"
                style={{
                  ...customFontStyle,
                  color: "#DC2626",
                  textShadow: "4px 4px 0px #991B1B, 8px 8px 0px #7F1D1D, 12px 12px 20px rgba(0,0,0,0.5)",
                  letterSpacing: "3px",
                  fontWeight: "900",
                  WebkitTextStroke: "2px #450A0A",
                  background: "linear-gradient(45deg, #DC2626, #EF4444, #F87171)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 6px #DC2626)",
                }}
              >
                PARTY
              </div>
            </div>

            {/* Pizza Visual - Mobile optimized */}
            <div className="flex justify-center items-center mb-4 relative">
              <Image
                src="/pepperoni-green-pepper-olive-pizza-transparent.png"
                alt="Delicious pizza with pepperoni, green peppers, and olives"
                width={deviceInfo.isMobile ? 144 : 192}
                height={deviceInfo.isMobile ? 144 : 192}
                className="drop-shadow-2xl rounded-full"
                priority
              />

              {/* Slice Lines Overlay */}
              <svg
                viewBox={deviceInfo.isMobile ? "0 0 144 144" : "0 0 192 192"}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{
                  width: deviceInfo.isMobile ? "144px" : "192px",
                  height: deviceInfo.isMobile ? "144px" : "192px",
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* 8 slice divider lines from center to edge */}
                {[...Array(8)].map((_, i) => {
                  const angle = i * 45 - 90 // Start from top and go clockwise
                  const centerX = deviceInfo.isMobile ? 72 : 96
                  const centerY = deviceInfo.isMobile ? 72 : 96
                  const radius = deviceInfo.isMobile ? 64 : 85
                  const endX = centerX + radius * Math.cos((angle * Math.PI) / 180)
                  const endY = centerY + radius * Math.sin((angle * Math.PI) / 180)

                  return (
                    <line
                      key={i}
                      x1={centerX}
                      y1={centerY}
                      x2={endX}
                      y2={endY}
                      stroke="#8B4513"
                      strokeWidth={deviceInfo.isMobile ? "2" : "3"}
                      opacity="0.7"
                    />
                  )
                })}
              </svg>
            </div>

            {/* Call to Action */}
            <div className="bg-white border-4 border-black p-3 mb-6 transform rotate-1 rounded-2xl">
              <p
                className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-800"
                style={{
                  ...customFontStyle,
                  letterSpacing: "1px",
                }}
              >
                Play to win a slice!
                <br />
                <span className="text-lg sm:text-xl lg:text-2xl">8 Slices, 8 Winners!</span>
              </p>
            </div>

            {/* Farcaster Preview Notice */}
            {deviceInfo.isFarcaster && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-blue-800 font-bold" style={customFontStyle}>
                  🎮 Farcaster Mini App Preview Mode
                </p>
                <p className="text-xs text-blue-600" style={customFontStyle}>
                  Click buttons to see what the full app would do!
                </p>
              </div>
            )}

            {/* All Buttons with Equal Spacing */}
            <div className="flex flex-col" style={{ gap: "15px" }}>
              <Button
                onClick={handlePlayClick}
                className="w-full bg-red-700 hover:bg-red-800 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-red-900 shadow-lg transform hover:scale-105 transition-all touch-manipulation"
                style={{
                  ...customFontStyle,
                  letterSpacing: "1px",
                  fontSize: deviceInfo.isMobile ? "1.1rem" : "1.25rem",
                  minHeight: deviceInfo.isMobile ? "56px" : "auto",
                }}
              >
                🍕 START PLAYING 🍕
              </Button>

              <Button
                onClick={handleJackpotClick}
                className="w-full bg-red-700 hover:bg-red-800 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-red-900 shadow-lg transform hover:scale-105 transition-all touch-manipulation"
                style={{
                  ...customFontStyle,
                  letterSpacing: "1px",
                  fontSize: deviceInfo.isMobile ? "1.1rem" : "1.25rem",
                  minHeight: deviceInfo.isMobile ? "56px" : "auto",
                }}
              >
                ⭐ Weekly Jackpot ⭐
              </Button>

              <Button
                onClick={handleLeaderboardClick}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-green-800 shadow-lg transform hover:scale-105 transition-all touch-manipulation"
                style={{
                  ...customFontStyle,
                  letterSpacing: "1px",
                  fontSize: deviceInfo.isMobile ? "1.1rem" : "1.25rem",
                  minHeight: deviceInfo.isMobile ? "56px" : "auto",
                }}
              >
                🏆 LEADERBOARD 🏆
              </Button>

              {/* Simplified Wallet Button */}
              <Button
                onClick={handleWalletClick}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-purple-800 shadow-lg transform hover:scale-105 transition-all touch-manipulation"
                style={{
                  ...customFontStyle,
                  letterSpacing: "1px",
                  fontSize: deviceInfo.isMobile ? "1.1rem" : "1.25rem",
                  minHeight: deviceInfo.isMobile ? "56px" : "auto",
                }}
              >
                🔗 Connect Wallet
              </Button>
            </div>

            {/* Info Section */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 mt-4">
              <p className="text-xs text-yellow-800 text-center" style={customFontStyle}>
                🎯 Win VMF tokens • Daily & Weekly Jackpots • Decentralized Gaming
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showWalletModal && (
        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Connect Wallet</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 p-4">
              <p className="text-center text-gray-600">Wallet connection would be implemented here in the full app.</p>
              <Button
                onClick={() => setShowWalletModal(false)}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
