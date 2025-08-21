"use client"

import { useState, useEffect, useCallback } from "react"
import {
  type WalletConnection,
  formatAddress,
  connectMobileWallet,
  requestWalletConnection,
  openWalletInstallPage,
  isWalletInstalled,
  getWalletDisplayName,
  isMobile,
} from "@/lib/wallet-config"

export const useWallet = () => {
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load saved connection on mount (but don't auto-connect)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if this is a fresh page load (not a reload)
      const isFreshLoad = sessionStorage.getItem("wallet_fresh_load")
      
      if (!isFreshLoad) {
        // This is a fresh page load - set the flag
        sessionStorage.setItem("wallet_fresh_load", "true")
        
        // Clear any existing wallet data on fresh load
        console.log("🔄 Fresh page load - clearing wallet data")
        const walletKeysToRemove = [
          'wallet_connection',
          'wagmi.connected',
          'wagmi.wallet',
          'wagmi.account',
          'wagmi.chainId',
          'wagmi.connector',
          'wagmi.cache',
          'wagmi.state'
        ]
        
        walletKeysToRemove.forEach(key => {
          localStorage.removeItem(key)
        })
        
        // Don't load saved connection on fresh load
        return
      }
      
      // This is not a fresh load - check for saved connection
      const savedConnection = localStorage.getItem("wallet_connection")
      if (savedConnection) {
        try {
          const parsedConnection = JSON.parse(savedConnection)
          console.log("📱 Found saved connection:", parsedConnection)
          setConnection(parsedConnection)
        } catch (error) {
          console.error("❌ Error parsing saved connection:", error)
          localStorage.removeItem("wallet_connection")
        }
      }
    }
  }, [])

  // Listen for account changes (only when already connected)
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum && connection) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("👤 Accounts changed:", accounts)
        if (accounts.length === 0) {
          // User disconnected their wallet
          console.log("🔌 User disconnected wallet externally")
          disconnect()
        } else if (connection && accounts[0] !== connection.address) {
          setConnection((prev) => (prev ? { ...prev, address: accounts[0] } : null))
        }
      }

      const handleChainChanged = (chainId: string) => {
        console.log("🔗 Chain changed:", chainId)
        setConnection((prev) => (prev ? { ...prev, chainId: Number.parseInt(chainId, 16) } : null))
      }

      const handleConnect = (connectInfo: any) => {
        console.log("🔌 Wallet connected:", connectInfo)
      }

      const handleDisconnect = (error: any) => {
        console.log("🔌 Wallet disconnected:", error)
        disconnect()
      }

      // Add event listeners
      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)
      window.ethereum.on("connect", handleConnect)
      window.ethereum.on("disconnect", handleDisconnect)

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
          window.ethereum.removeListener("chainChanged", handleChainChanged)
          window.ethereum.removeListener("connect", handleConnect)
          window.ethereum.removeListener("disconnect", handleDisconnect)
        }
      }
    }
  }, [connection])

  const connectWallet = useCallback(async (walletId: string) => {
    setIsConnecting(walletId)
    setError(null)

    console.log(`🎯 Attempting to connect to ${walletId}`)
    console.log(`📱 Mobile device: ${isMobile()}`)

    try {
      let result

      // Use mobile-specific connection for mobile devices
      if (isMobile()) {
        console.log("📱 Using mobile connection strategy...")
        result = await connectMobileWallet(walletId)
      } else {
        console.log("💻 Using desktop connection strategy...")

        // Check if wallet is installed on desktop
        if (!isWalletInstalled(walletId)) {
          console.log(`❌ ${walletId} not installed on desktop`)
          openWalletInstallPage(walletId)
          throw new Error(`${getWalletDisplayName(walletId)} is not installed. Please install it first.`)
        }

        result = await requestWalletConnection(walletId)
      }

      if (!result || !result.accounts || result.accounts.length === 0) {
        throw new Error("No accounts returned from wallet")
      }

      const walletConnection: WalletConnection = {
        address: result.accounts[0],
        chainId: Number.parseInt(result.chainId, 16),
        walletName: getWalletDisplayName(walletId),
      }

      console.log(`✅ Successfully connected to ${walletId}:`, walletConnection)
      setConnection(walletConnection)

      // Save connection to localStorage for persistence across pages
      localStorage.setItem("wallet_connection", JSON.stringify(walletConnection))

      return walletConnection
    } catch (error: any) {
      console.error(`❌ Failed to connect to ${walletId}:`, error)

      let errorMessage = error.message || "Connection failed"

      // Handle specific error codes with mobile-friendly messages
      if (error.code === 4001) {
        errorMessage = "Connection rejected. Please try again and approve the connection."
      } else if (error.code === -32002) {
        errorMessage = "Connection request pending. Please check your wallet app."
      } else if (error.code === 4902) {
        errorMessage = isMobile()
          ? "Please switch to Base network in your wallet app and try again."
          : "Base network not found. Please add Base network to your wallet."
      } else if (error.message?.includes("not found") || error.message?.includes("not installed")) {
        errorMessage = isMobile()
          ? `${getWalletDisplayName(walletId)} app not found. Please install it from your app store.`
          : error.message
      } else if (isMobile() && (error.message?.includes("app not found") || error.message?.includes("not available"))) {
        errorMessage = `${getWalletDisplayName(walletId)} app not found. Please install it and try again.`
      }

      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsConnecting(null)
    }
  }, [])

  const disconnect = useCallback(() => {
    console.log("🔌 Starting wallet disconnect process...")

    // Clear all connection state immediately
    setConnection(null)
    setError(null)

    // Clear ALL localStorage wallet data
    if (typeof window !== "undefined") {
      // Clear any wallet-specific storage
      localStorage.removeItem("wallet_connection")
      sessionStorage.removeItem("wallet_connection")
      
      // Clear any other wallet-related data
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('wallet') || key.includes('ethereum') || key.includes('web3'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Clear any wallet provider data
      if (window.ethereum) {
        // Try to disconnect from the wallet provider
        try {
          if (window.ethereum.disconnect) {
            window.ethereum.disconnect()
          }
        } catch (e) {
          console.log("Wallet provider disconnect not available")
        }
      }
    }

    console.log("✅ Wallet disconnected successfully")
  }, [])

  const getBalance = useCallback(async (): Promise<string> => {
    if (!connection) return "0"

    try {
      const balance = await window.ethereum.request({
        method: "eth_getBalance",
        params: [connection.address, "latest"],
      })

      const balanceInEth = Number.parseInt(balance, 16) / Math.pow(10, 18)
      return balanceInEth.toString()
    } catch (error) {
      console.error("Error getting balance:", error)
      return "0"
    }
  }, [connection])

  return {
    connection,
    isConnecting,
    error,
    connectWallet,
    disconnect,
    getBalance,
    isConnected: !!connection,
    formattedAddress: connection ? formatAddress(connection.address) : null,
    setError,
  }
}
