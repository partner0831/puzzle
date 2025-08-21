"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, Settings, RefreshCw } from "lucide-react"
import { useWallet } from "@/hooks/useWallet"

export function VMFDebugTool() {
  const customFontStyle = {
    fontFamily: '"Comic Sans MS", "Marker Felt", "Chalkduster", "Kalam", "Caveat", cursive',
    fontWeight: "bold" as const,
  }

  const { connection, isConnected } = useWallet()
  const [customBalance, setCustomBalance] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

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

  const removeLocalStorageItem = (key: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key)
    }
  }

  const getCurrentSimulatedBalance = (): number => {
    if (!isConnected || !connection?.address || !isClient) return 0

    // Get the current simulated balance from localStorage or calculate it
    const balanceKey = `vmf_balance_${connection.address}`
    const stored = getLocalStorageItem(balanceKey)

    if (stored) {
      return Number.parseInt(stored)
    }

    // Calculate default simulated balance
    const addressHash = connection.address.toLowerCase()
    const lastChar = addressHash.slice(-1)

    let simulatedBalance = 0
    if (lastChar >= "0" && lastChar <= "3") {
      simulatedBalance = 0
    } else if (lastChar >= "4" && lastChar <= "7") {
      simulatedBalance = Math.floor(Math.random() * 10) + 1
    } else if (lastChar >= "8" && lastChar <= "b") {
      simulatedBalance = Math.floor(Math.random() * 100) + 10
    } else {
      simulatedBalance = Math.floor(Math.random() * 1000) + 100
    }

    return simulatedBalance
  }

  const updateVMFBalance = async () => {
    if (!isConnected || !connection?.address || !customBalance || !isClient) return

    setIsUpdating(true)

    try {
      const newBalance = Number.parseInt(customBalance)
      if (isNaN(newBalance) || newBalance < 0) {
        alert("Please enter a valid positive number")
        return
      }

      // Store the custom balance in localStorage
      const balanceKey = `vmf_balance_${connection.address}`
      setLocalStorageItem(balanceKey, newBalance.toString())

      console.log(`🔧 Updated VMF balance for ${connection.address} to ${newBalance}`)

      // Clear the input
      setCustomBalance("")

      // Trigger a page refresh to update all components
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error("Error updating VMF balance:", error)
      alert("Error updating balance")
    } finally {
      setIsUpdating(false)
    }
  }

  const resetToDefault = () => {
    if (!isConnected || !connection?.address || !isClient) return

    // Remove custom balance from localStorage
    const balanceKey = `vmf_balance_${connection.address}`
    removeLocalStorageItem(balanceKey)

    console.log(`🔧 Reset VMF balance for ${connection.address} to default`)

    // Trigger a page refresh
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  if (!isConnected) {
    return (
      <Card className="bg-gray-50 border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg text-gray-600 flex items-center gap-2" style={customFontStyle}>
            <Settings className="h-5 w-5" />
            VMF Debug Tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500" style={customFontStyle}>
            Connect your wallet to use the VMF debug tool
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentBalance = getCurrentSimulatedBalance()

  return (
    <Card className="bg-orange-50 border-2 border-orange-200">
      <CardHeader>
        <CardTitle className="text-lg text-orange-800 flex items-center gap-2" style={customFontStyle}>
          <Settings className="h-5 w-5" />
          VMF Debug Tool
        </CardTitle>
        <p className="text-sm text-orange-600" style={customFontStyle}>
          Modify your simulated VMF balance for testing
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-3 rounded-lg">
          <p className="text-sm text-orange-800 mb-2" style={customFontStyle}>
            <strong>Current Balance:</strong> {currentBalance.toLocaleString()} VMF
          </p>
          <div className="text-sm text-gray-600">
            {currentBalance >= 1 ? "✅ Can enter games" : "❌ Need at least $1 worth of VMF"}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-orange-800" style={customFontStyle}>
            Set New Balance:
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter VMF amount"
              value={customBalance}
              onChange={(e) => setCustomBalance(e.target.value)}
              className="border-orange-300"
              min="0"
            />
            <Button
              onClick={updateVMFBalance}
              disabled={isUpdating || !customBalance || !isClient}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              style={customFontStyle}
            >
              {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setCustomBalance("0")}
            variant="outline"
            size="sm"
            className="border-orange-300 text-orange-700"
            style={customFontStyle}
          >
            0 VMF
          </Button>
          <Button
            onClick={() => setCustomBalance("1")}
            variant="outline"
            size="sm"
            className="border-orange-300 text-orange-700"
            style={customFontStyle}
          >
            1 VMF
          </Button>
          <Button
            onClick={() => setCustomBalance("100")}
            variant="outline"
            size="sm"
            className="border-orange-300 text-orange-700"
            style={customFontStyle}
          >
            100 VMF
          </Button>
          <Button
            onClick={() => setCustomBalance("1000")}
            variant="outline"
            size="sm"
            className="border-orange-300 text-orange-700"
            style={customFontStyle}
          >
            1000 VMF
          </Button>
        </div>

        <Button
          onClick={resetToDefault}
          variant="outline"
          className="w-full border-orange-300 text-orange-700 hover:bg-orange-100 bg-transparent"
          style={customFontStyle}
          disabled={!isClient}
        >
          Reset to Default Balance
        </Button>

        <div className="bg-yellow-100 p-3 rounded-lg border border-yellow-300">
          <p className="text-xs text-yellow-800" style={customFontStyle}>
            ⚠️ This is a simulation tool for testing. In production, VMF balances would be read from the actual smart
            contract on Base network.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
