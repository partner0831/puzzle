"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"
import { ArrowLeft, Users, Coins, Clock, AlertTriangle, Check, X, Shield, Settings, Activity } from "lucide-react"
import { useWagmiWallet } from "@/hooks/useWagmiWallet"
import { calculateCommunityJackpot, formatJackpotAmount, getWeeklyJackpotInfo } from "@/lib/jackpot-data"
import PayoutSystem from "@/components/PayoutSystem"

export default function AdminPage() {
  const customFontStyle = {
    fontFamily: '"Comic Sans MS", "Marker Felt", "Chalkduster", "Kalam", "Caveat", cursive',
    fontWeight: "bold" as const,
  }

  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [emergencyAction, setEmergencyAction] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [communityJackpot, setCommunityJackpot] = useState(0)
  const [weeklyInfo, setWeeklyInfo] = useState({
    totalToppings: 0,
    totalPlayers: 0,
    timeUntilDraw: {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    },
  })
  const [securityStatus, setSecurityStatus] = useState({
    contractPaused: false,
    blacklistedAddresses: 0,
    suspiciousTransactions: 0,
    lastSecurityCheck: null as Date | null,
  })
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
              🛡️ Admin Dashboard 🛡️
            </h1>
            <p className="text-center text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  // SSR SAFETY: Only call Wagmi hooks after client-side hydration
  const { isConnected, address } = useWagmiWallet()

  // Safe localStorage access
  const getLocalStorageItem = (key: string): string | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key)
    }
    return null
  }

  const setLocalStorageItem = (key: string, value: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value)
    }
  }

  // Load admin data
  useEffect(() => {
    if (isClient) {
    loadAdminData()
    const interval = setInterval(loadAdminData, 10000)
    return () => clearInterval(interval)
    }
  }, [isClient])

  const loadAdminData = () => {
    if (!isClient) return

    // Load community jackpot
    const jackpot = calculateCommunityJackpot()
    setCommunityJackpot(jackpot)

    // Load weekly info
    const info = getWeeklyJackpotInfo()
    setWeeklyInfo(info)

    // Load security status
    loadSecurityStatus()
  }

  const loadSecurityStatus = () => {
    if (!isClient) return

    const paused = getLocalStorageItem("pizza_contract_paused") === "true"
    const blacklisted = JSON.parse(getLocalStorageItem("pizza_blacklisted_addresses") || "[]")
    const suspicious = JSON.parse(getLocalStorageItem("pizza_suspicious_transactions") || "[]")

    // SSR SAFETY: Only create Date object on client-side
    const currentDate = typeof window !== 'undefined' ? new Date() : null

      setSecurityStatus({
        contractPaused: paused,
        blacklistedAddresses: blacklisted.length,
        suspiciousTransactions: suspicious.length,
      lastSecurityCheck: currentDate,
      })
  }

  // Emergency pause/unpause contract
  const handleEmergencyPause = async (pause: boolean) => {
    if (!isConnected) {
      setAdminError("Wallet not connected")
      return
    }

    setIsProcessing(true)
    setAdminError(null)

    try {
      console.log(`🚨 ${pause ? "Pausing" : "Unpausing"} contract...`)
      
      // Simulate smart contract call
      setLocalStorageItem("pizza_contract_paused", pause.toString())
      
      setSecurityStatus(prev => ({
        ...prev,
        contractPaused: pause,
        lastSecurityCheck: new Date(),
      }))

      console.log(`✅ Contract ${pause ? "paused" : "unpaused"} successfully`)
    } catch (error: any) {
      console.error("Emergency pause error:", error)
      setAdminError(`Failed to ${pause ? "pause" : "unpause"} contract: ${error.message}`)
    } finally {
      setIsProcessing(false)
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
      <div className="max-w-4xl mx-auto">
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
              🛡️ Admin Panel 🛡️
            </CardTitle>
            <p className="text-gray-600" style={customFontStyle}>
              Contract Management & Security
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Admin Status */}
            <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-blue-800" style={customFontStyle}>
                  Admin Status
                </h3>
              </div>

              {isConnected ? (
                <div className="bg-green-100 p-3 rounded-lg">
                  <p className="text-sm text-green-800" style={customFontStyle}>
                    <strong>Status:</strong> Connected ✅
                  </p>
                  <p className="text-sm text-green-800 font-mono">
                    <strong>Address:</strong> {address}
                  </p>
                </div>
              ) : (
                <div className="bg-red-100 p-3 rounded-lg">
                  <p className="text-sm text-red-800" style={customFontStyle}>
                    <strong>Status:</strong> Not Connected ❌
                          </p>
                  <p className="text-xs text-red-700 mt-2">
                    Connect wallet to access admin functions
                          </p>
                        </div>
              )}
                        </div>

            {/* Contract Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-200">
                <h3 className="text-lg font-bold text-purple-800 mb-2">Community Jackpot</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {formatJackpotAmount(communityJackpot)}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                <h3 className="text-lg font-bold text-green-800 mb-2">Weekly Players</h3>
                <p className="text-2xl font-bold text-green-600">{weeklyInfo.totalPlayers}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl border-2 border-orange-200">
                <h3 className="text-lg font-bold text-orange-800 mb-2">Total Toppings</h3>
                <p className="text-2xl font-bold text-orange-600">{weeklyInfo.totalToppings}</p>
              </div>
            </div>

            {/* Security Status */}
            <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="text-lg font-bold text-yellow-800" style={customFontStyle}>
                  Security Status
              </h3>
                  </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-sm font-bold text-gray-800">Contract Status</p>
                  <p className={`text-lg font-bold ${securityStatus.contractPaused ? 'text-red-600' : 'text-green-600'}`}>
                    {securityStatus.contractPaused ? '⏸️ Paused' : '▶️ Active'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-sm font-bold text-gray-800">Blacklisted Addresses</p>
                  <p className="text-lg font-bold text-red-600">{securityStatus.blacklistedAddresses}</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-sm font-bold text-gray-800">Suspicious Transactions</p>
                  <p className="text-lg font-bold text-orange-600">{securityStatus.suspiciousTransactions}</p>
                        </div>
                      </div>
                    </div>

            {/* Admin Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => setShowEmergencyModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl"
                style={customFontStyle}
                disabled={!isConnected}
                  >
                🚨 Emergency Controls
                      </Button>
              
                  <Button
                    onClick={() => setShowSecurityModal(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white p-4 rounded-xl"
                style={customFontStyle}
                disabled={!isConnected}
                  >
                🛡️ Security Management
                  </Button>
                      </div>

            {/* Error Messages */}
            {adminError && (
              <div className="bg-red-100 p-3 rounded-xl border-2 border-red-300">
                <p className="text-sm text-red-800">{adminError}</p>
                    </div>
            )}
          </CardContent>
        </Card>

        {/* Payout System */}
        <PayoutSystem />
      </div>

        {/* Emergency Modal */}
        <Dialog open={showEmergencyModal} onOpenChange={setShowEmergencyModal}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border-4 border-red-800 rounded-3xl shadow-2xl">
            <DialogHeader>
            <DialogTitle className="text-2xl text-red-800 text-center" style={customFontStyle}>
              🚨 Emergency Controls 🚨
              </DialogTitle>
            </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Button
                onClick={() => handleEmergencyPause(true)}
                disabled={isProcessing || securityStatus.contractPaused}
                className="bg-red-600 hover:bg-red-700 text-white"
                style={customFontStyle}
              >
                ⏸️ Pause Contract
                </Button>
              
                <Button
                onClick={() => handleEmergencyPause(false)}
                disabled={isProcessing || !securityStatus.contractPaused}
                className="bg-green-600 hover:bg-green-700 text-white"
                style={customFontStyle}
              >
                ▶️ Unpause Contract
                </Button>
              </div>
            
            <div className="bg-yellow-100 p-3 rounded-lg border border-yellow-300">
              <p className="text-xs text-yellow-800" style={customFontStyle}>
                ⚠️ Emergency controls should only be used in critical situations. These actions affect all users.
              </p>
            </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Security Modal */}
        <Dialog open={showSecurityModal} onOpenChange={setShowSecurityModal}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border-4 border-yellow-800 rounded-3xl shadow-2xl">
            <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-800 text-center" style={customFontStyle}>
              🛡️ Security Management 🛡️
              </DialogTitle>
            </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700 text-center">
              Monitor and manage security threats and suspicious activities.
                </p>
            
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-800">
                <strong>Blacklisted Addresses:</strong> {securityStatus.blacklistedAddresses}
              </p>
              <p className="text-sm text-gray-800">
                <strong>Suspicious Transactions:</strong> {securityStatus.suspiciousTransactions}
              </p>
              <p className="text-sm text-gray-800">
                <strong>Last Security Check:</strong> {securityStatus.lastSecurityCheck?.toLocaleString() || 'Not available'}
              </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}
