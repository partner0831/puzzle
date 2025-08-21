"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trophy, Users, Clock, Gift, Star, AlertCircle, Check } from "lucide-react"
import { useWallet } from "@/hooks/useWallet"
import { useVMFBalance } from "@/hooks/useVMFBalance"
import { calculateCommunityJackpot, formatJackpotAmount, getWeeklyJackpotInfo } from "@/lib/jackpot-data"
import {
  PayoutRecord,
  PayoutError,
  getCurrentGameData,
  getWeeklyData,
  selectDailyWinners,
  selectWeeklyWinners,
  savePayoutRecord,
  getPayoutHistory,
  resetDailyGame,
  resetWeeklyGame,
  formatTimestamp,
  formatAddress,
} from "@/lib/payout-utils"

// Enhanced payout system with improved error handling
export default function PayoutSystem() {
  const customFontStyle = {
    fontFamily: '"Comic Sans MS", "Marker Felt", "Chalkduster", "Kalam", "Caveat", cursive',
    fontWeight: "bold" as const,
  }

  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutHistory, setPayoutHistory] = useState<PayoutRecord[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [payoutError, setPayoutError] = useState<string | null>(null)
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

  const { isConnected, connection } = useWallet()
  const { balance, formattedBalance, hasMinimum } = useVMFBalance()

  // Load payout data
  useEffect(() => {
    loadPayoutData()
    const interval = setInterval(loadPayoutData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadPayoutData = () => {
    try {
      // Load community jackpot
      const jackpot = calculateCommunityJackpot()
      setCommunityJackpot(jackpot)

      // Load weekly info
      const info = getWeeklyJackpotInfo()
      setWeeklyInfo(info)

      // Load payout history
      const history = getPayoutHistory()
      setPayoutHistory(history)
    } catch (error) {
      console.error("Error loading payout data:", error)
      setPayoutError("Failed to load payout data")
    }
  }

  // Process daily payout with improved error handling
  const processDailyPayout = async () => {
    if (!isConnected) {
      setPayoutError("Wallet not connected")
      return
    }

    setIsProcessing(true)
    setPayoutError(null)

    try {
      console.log("🎯 Processing daily payout...")
      
      // Get current game data
      const currentGame = getCurrentGameData()
      
      if (currentGame.totalEntries === 0) {
        throw new PayoutError("No entries found for today", "NO_ENTRIES")
      }
      
      // Select winners
      const winners = selectDailyWinners(currentGame.totalEntries)
      
      if (winners.length === 0) {
        throw new PayoutError("No winners selected", "NO_WINNERS")
      }
      
      // Calculate prize per winner
      const prizePerWinner = currentGame.jackpotAmount / 8 // 8 winners
      
      // Record payout
      const payoutRecord: PayoutRecord = {
        id: Date.now(),
        type: "daily",
        timestamp: Date.now(),
        winners: winners,
        jackpotAmount: currentGame.jackpotAmount,
        prizePerWinner: prizePerWinner,
        totalEntries: currentGame.totalEntries,
        processed: true,
      }

      // Save payout record
      savePayoutRecord(payoutRecord)
      
      // Update local state
      const history = getPayoutHistory()
      setPayoutHistory(history)

      // Reset daily game
      resetDailyGame()

      console.log("✅ Daily payout processed successfully")
    } catch (error) {
      console.error("❌ Daily payout failed:", error)
      if (error instanceof PayoutError) {
        setPayoutError(error.message)
      } else {
        setPayoutError("Failed to process daily payout")
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Process weekly payout with improved error handling
  const processWeeklyPayout = async () => {
    if (!isConnected) {
      setPayoutError("Wallet not connected")
      return
    }

    setIsProcessing(true)
    setPayoutError(null)

    try {
      console.log("🏆 Processing weekly payout...")
      
      // Get weekly data
      const weeklyData = getWeeklyData()
      
      if (weeklyData.totalPlayers === 0) {
        throw new PayoutError("No players found for weekly payout", "NO_PLAYERS")
      }
      
      // Select winners based on toppings (weighted)
      const winners = selectWeeklyWinners(weeklyData.players)
      
      if (winners.length === 0) {
        throw new PayoutError("No winners selected for weekly payout", "NO_WINNERS")
      }
      
      // Calculate prize per winner
      const prizePerWinner = weeklyData.jackpotAmount / 10 // 10 winners
      
      // Record payout
      const payoutRecord: PayoutRecord = {
        id: Date.now(),
        type: "weekly",
        timestamp: Date.now(),
        winners: winners,
        jackpotAmount: weeklyData.jackpotAmount,
        prizePerWinner: prizePerWinner,
        totalToppings: weeklyData.totalToppings,
        totalPlayers: weeklyData.totalPlayers,
        processed: true,
      }

      // Save payout record
      savePayoutRecord(payoutRecord)
      
      // Update local state
      const history = getPayoutHistory()
      setPayoutHistory(history)

      // Reset weekly game
      resetWeeklyGame()

      console.log("✅ Weekly payout processed successfully")
    } catch (error) {
      console.error("❌ Weekly payout failed:", error)
      if (error instanceof PayoutError) {
        setPayoutError(error.message)
      } else {
        setPayoutError("Failed to process weekly payout")
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Payout Controls */}
      <Card className="bg-white/90 backdrop-blur-sm border-4 border-red-800 rounded-3xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-red-800" style={customFontStyle}>
            🏆 Payout System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Daily Payout */}
          <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-blue-800" style={customFontStyle}>
                  Daily Payout
                </h3>
                <p className="text-sm text-blue-600" style={customFontStyle}>
                  Jackpot: {formatJackpotAmount(communityJackpot)} VMF
                </p>
              </div>
              <Button
                onClick={processDailyPayout}
                disabled={isProcessing || !isConnected}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isProcessing ? "Processing..." : "Process Daily"}
              </Button>
            </div>
          </div>

          {/* Weekly Payout */}
          <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-green-800" style={customFontStyle}>
                  Weekly Payout
                </h3>
                <p className="text-sm text-green-600" style={customFontStyle}>
                  Total Toppings: {weeklyInfo.totalToppings.toLocaleString()}
                </p>
              </div>
              <Button
                onClick={processWeeklyPayout}
                disabled={isProcessing || !isConnected}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? "Processing..." : "Process Weekly"}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {payoutError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-bold" style={customFontStyle}>
                  {payoutError}
                </p>
              </div>
            </div>
          )}

      {/* Payout History */}
          <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3" style={customFontStyle}>
              📊 Payout History
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {payoutHistory.length === 0 ? (
                <p className="text-gray-600 text-center" style={customFontStyle}>
                  No payouts processed yet
                </p>
              ) : (
                payoutHistory.map((payout) => (
                  <div key={payout.id} className="bg-white p-3 rounded border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-800" style={customFontStyle}>
                          {payout.type === "daily" ? "🎯 Daily" : "🏆 Weekly"} Payout
                        </p>
                        <p className="text-sm text-gray-600" style={customFontStyle}>
                          {formatTimestamp(payout.timestamp)}
                        </p>
                        <p className="text-sm text-gray-600" style={customFontStyle}>
                          Jackpot: {formatJackpotAmount(payout.jackpotAmount)} VMF
                  </p>
                        <p className="text-sm text-gray-600" style={customFontStyle}>
                          Prize per winner: {formatJackpotAmount(payout.prizePerWinner)} VMF
                  </p>
                </div>
                <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600" style={customFontStyle}>
                            Processed
                          </span>
                        </div>
                        <p className="text-xs text-gray-500" style={customFontStyle}>
                          {payout.winners.length} winners
                        </p>
                      </div>
                    </div>
                  </div>
                ))
                  )}
                </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
