"use client"

import { useState, useEffect } from "react"
import { useWallet } from "./useWallet"

// VMF Token Contract Address on Base
const VMF_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890" // Replace with actual VMF contract address

export const useVMFBalance = () => {
  const { connection, isConnected } = useWallet()
  const [balance, setBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Format balance for display
  const formattedBalance = balance.toLocaleString()

  // Check if user has minimum VMF tokens
  const hasMinimum = (minimum: number): boolean => {
    return balance >= minimum
  }

  // Fetch VMF balance
  const fetchVMFBalance = async () => {
    if (!isConnected || !connection?.address) {
      setBalance(0)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // For demo purposes, we'll simulate VMF balance
      // In a real app, you would call the VMF contract

      // Simulate different balances based on wallet address
      const addressHash = connection.address.toLowerCase()
      let simulatedBalance = 0

      // Create deterministic but varied balances based on address
      const lastChar = addressHash.slice(-1)
      const secondLastChar = addressHash.slice(-2, -1)

      if (lastChar >= "0" && lastChar <= "3") {
        simulatedBalance = 0 // 25% chance of having 0 VMF
      } else if (lastChar >= "4" && lastChar <= "7") {
        simulatedBalance = Math.floor(Math.random() * 10) + 1 // 1-10 VMF
      } else if (lastChar >= "8" && lastChar <= "b") {
        simulatedBalance = Math.floor(Math.random() * 100) + 10 // 10-110 VMF
      } else {
        simulatedBalance = Math.floor(Math.random() * 1000) + 100 // 100-1100 VMF
      }

      // Add some randomness based on second last character
      if (secondLastChar >= "8") {
        simulatedBalance += Math.floor(Math.random() * 50)
      }

      console.log(`💰 Simulated VMF balance for ${connection.address}: ${simulatedBalance}`)
      setBalance(simulatedBalance)
    } catch (err: any) {
      console.error("❌ Error fetching VMF balance:", err)
      setError(err.message || "Failed to fetch VMF balance")
      setBalance(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch balance when wallet connects or address changes
  useEffect(() => {
    fetchVMFBalance()
  }, [isConnected, connection?.address])

  // Refresh balance every 30 seconds
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      fetchVMFBalance()
    }, 30000)

    return () => clearInterval(interval)
  }, [isConnected])

  return {
    balance,
    formattedBalance,
    isLoading,
    error,
    hasMinimum,
    refetch: fetchVMFBalance,
  }
}
