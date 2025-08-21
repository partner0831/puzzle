"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { ExternalLink, AlertCircle } from "lucide-react"

export default function TestMainPage() {
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

  // Initialize device detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDeviceInfo({
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isAndroid: /Android/.test(navigator.userAgent),
        isFarcaster: window.location.href.includes('farcaster') || window.location.href.includes('warpcast'),
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500">
      {/* Header */}
      <header className="relative z-10 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Image
              src="/images/pizza-transparent.png"
              alt="Pizza Party Logo"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <h1 className="text-2xl font-bold text-white" style={customFontStyle}>
              Pizza Party
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              onClick={() => setShowWalletModal(true)}
            >
              Connect Wallet
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-5xl font-bold text-white mb-4" style={customFontStyle}>
              🍕 Welcome to Pizza Party! 🍕
            </h2>
            <p className="text-xl text-white/90 mb-6">
              Play daily, earn toppings, and win the weekly jackpot!
            </p>
          </div>

          {/* Game Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">🎮</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Daily Game</h3>
                <p className="text-gray-600 mb-4">Play once per day to earn toppings</p>
                <Link href="/game">
                  <Button className="w-full bg-red-500 hover:bg-red-600">
                    Play Now
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Leaderboard</h3>
                <p className="text-gray-600 mb-4">See who's winning this week</p>
                <Link href="/leaderboard">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600">
                    View Rankings
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Jackpot</h3>
                <p className="text-gray-600 mb-4">Check the current jackpot amount</p>
                <Link href="/jackpot">
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-600">
                    View Jackpot
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4" style={customFontStyle}>
              How to Play
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="text-2xl mb-2">1️⃣</div>
                <h4 className="font-bold text-gray-800 mb-2">Connect Wallet</h4>
                <p className="text-gray-600">Connect your wallet to start playing</p>
              </div>
              <div>
                <div className="text-2xl mb-2">2️⃣</div>
                <h4 className="font-bold text-gray-800 mb-2">Play Daily</h4>
                <p className="text-gray-600">Enter the daily game once per day</p>
              </div>
              <div>
                <div className="text-2xl mb-2">3️⃣</div>
                <h4 className="font-bold text-gray-800 mb-2">Win Prizes</h4>
                <p className="text-gray-600">Earn toppings and win the weekly jackpot</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-4 mt-8">
        <div className="max-w-4xl mx-auto text-center text-white/80">
          <p>Built on Base Network • Powered by VMF Token</p>
        </div>
      </footer>
    </div>
  )
}
