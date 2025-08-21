"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useWallet } from '@/hooks/useWallet'
import { WALLETS, initMobileOptimizations, isMobile, isIOS, isAndroid, isFarcaster } from '@/lib/wallet-config'
import { AdvancedContractsService } from '@/lib/services/advanced-contracts-service'
import { getVMFBalanceUltimate } from '@/lib/vmf-contract'
import { ethers } from 'ethers'
import { useFarcasterShare } from '@/hooks/useFarcasterShare'

import { 
  earnDailyPlayToppings, 
  earnVMFHoldingsToppings,
  selectDailyJackpotWinners,
  payDailyJackpotWinners,
  isDailyJackpotTime,
  getDailyJackpotAmount,
  getRealTimeDailyPlayerCount,
  getRealTimeJackpotValue
} from '@/lib/jackpot-data'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Clock, Users, Coins, Copy, Share2, ExternalLink, UsersIcon, AlertCircle, X, ArrowLeft } from 'lucide-react'
import Image from 'next/image'

export default function GamePage() {
  const customFontStyle = {
    fontFamily: '"Comic Sans MS", "Comic Sans", "Marker Felt", "Arial", sans-serif', // NO CURSIVE FONTS - DYNAMIC PRICING LIVE
    fontWeight: "bold" as const,
  }

  // Wallet connection state
  const { isConnected, connection, connectWallet, isConnecting, error, setError } = useWallet()
  
  // Farcaster sharing functionality
  const { 
    shareGameEntry, 
    shareWinner, 
    shareJackpot, 
    shareReferralCode, 
    shareLeaderboard, 
    shareJackpotMilestone,
    isSharing: isFarcasterSharing,
    isFarcasterEnvironment 
  } = useFarcasterShare()
  const [isProcessing, setIsProcessing] = useState(false)
  const [gameError, setGameError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isFarcaster: false,
  })

  const [playerCount, setPlayerCount] = useState(0)
  const [jackpot, setJackpot] = useState(0)
  const [vmfBalance, setVmfBalance] = useState<string>('0')
  const [dailyJackpotAmount, setDailyJackpotAmount] = useState(0)
  const [dailyWinners, setDailyWinners] = useState<string[]>([])
  const [isDailyDrawComplete, setIsDailyDrawComplete] = useState(false)
  const [realTimeDailyPlayers, setRealTimeDailyPlayers] = useState(0)
  const [realTimeJackpotValue, setRealTimeJackpotValue] = useState(0)
  const [timeLeftInWindow, setTimeLeftInWindow] = useState({
    hours: 14,
    minutes: 53,
    seconds: 16,
  })
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [referralCode] = useState("PIZZA123ABC")
  const [referralLink] = useState("https://pizza.party/?ref=PIZZA123ABC")
  const [copied, setCopied] = useState(false)
  // Updated referral stats to be accurate: 1 Used, 0 Joined, 2 Remaining
  const [referralStats] = useState({ 
    used: 1,      // 1 code has been used
    joined: 0,    // 0 people actually joined (maybe they used code but didn't complete registration)
    remaining: 2, // 2 codes still available
    totalAllowed: 3 // Total codes per user
  })

  // Gasless transaction state
  const [useGasless, setUseGasless] = useState(true)
  const [gasEstimates, setGasEstimates] = useState({
    regular: { enterDailyGame: '0', claimToppings: '0', addJackpotEntry: '0' },
    gasless: { enterDailyGame: '0', claimToppings: '0', addJackpotEntry: '0' }
  })
  const [gaslessAvailable, setGaslessAvailable] = useState(false)
  const [hasEnteredToday, setHasEnteredToday] = useState(false)

  // Social media platforms for sharing
  const socialPlatforms = [
    {
      name: "X (Twitter)",
      icon: "𝕏",
      color: "bg-black hover:bg-gray-800",
      shareUrl: (url: string, text: string) =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      name: "Facebook",
      icon: "📘",
      color: "bg-blue-600 hover:bg-blue-700",
      shareUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      name: "Telegram",
      icon: "✈️",
      color: "bg-sky-500 hover:bg-sky-600",
      shareUrl: (url: string, text: string) =>
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    },
    {
      name: "Discord",
      icon: "🎮",
      color: "bg-indigo-600 hover:bg-indigo-700",
      action: "copy", // Discord doesn't have direct web sharing
    },
    {
      name: "WhatsApp",
      icon: "💬",
      color: "bg-green-500 hover:bg-green-600",
      shareUrl: (url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    },
    {
      name: "LinkedIn",
      icon: "💼",
      color: "bg-blue-700 hover:bg-blue-800",
      shareUrl: (url: string, text: string) =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      name: "Reddit",
      icon: "🤖",
      color: "bg-orange-600 hover:bg-orange-700",
      shareUrl: (url: string, text: string) =>
        `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
    },
    {
      name: "Farcaster",
      icon: "🟣",
      color: "bg-purple-600 hover:bg-purple-700",
      shareUrl: (url: string, text: string) =>
        `https://warpcast.com/~/compose?text=${encodeURIComponent(`${text} ${url}`)}`,
    },
  ]

  // Check if user has already entered today
  const checkDailyEntry = (): boolean => {
    if (!isConnected || !connection) return false
    
    const now = new Date()
    const pstOffset = -8
    const pstTime = new Date(now.getTime() + (pstOffset * 60 * 60 * 1000))
    const isBeforeNoonPST = pstTime.getHours() < 12
    const today = pstTime.toDateString()
    const yesterday = new Date(pstTime.getTime() - (24 * 60 * 60 * 1000)).toDateString()
    const gameDate = isBeforeNoonPST ? today : yesterday
    
    // Check both localStorage entries
    const entryKey = `pizza_entry_${connection.address}_${gameDate}`
    const dailyEntryKey = `daily_entry_${connection.address}`
    
    const hasEnteredToday = localStorage.getItem(entryKey) === 'true' || 
                           localStorage.getItem(dailyEntryKey) !== null
    
    return hasEnteredToday
  }

  // Initialize Advanced Contracts Service
  const getAdvancedContractsService = async () => {
    if (!window.ethereum) return null
    
    try {
      // Try wallet provider first
      const provider = new ethers.BrowserProvider(window.ethereum)
      
      // Test the connection first
      try {
        await provider.getNetwork()
        console.log('✅ Wallet RPC connection successful')
      } catch (networkError) {
        console.error('❌ Wallet RPC connection failed:', networkError)
        
        // Fallback to public RPC
        console.log('🔄 Trying fallback RPC...')
        const fallbackProvider = new ethers.JsonRpcProvider('https://base.blockpi.network/v1/rpc/public')
        await fallbackProvider.getNetwork()
        console.log('✅ Fallback RPC connection successful')
        
        // Use fallback provider for read operations, but we still need wallet for transactions
        throw new Error('Wallet RPC connection failed. Please try switching networks or refreshing the page.')
      }
      
      const signer = await provider.getSigner()
      return new AdvancedContractsService(provider, signer)
    } catch (error) {
      console.error('❌ Failed to initialize contract service:', error)
      throw error
    }
  }

  // Check if user has already entered today from contract
  const checkContractDailyEntry = async (): Promise<boolean> => {
    if (!isConnected || !connection || !window.ethereum) return false
    
    try {
      const service = await getAdvancedContractsService()
      if (!service) return false
      
      // For now, we'll use localStorage as the primary check
      // The contract doesn't have a direct hasEnteredToday function
      return checkDailyEntry()
    } catch (error) {
      console.error('Error checking contract daily entry:', error)
      return false
    }
  }

  // Update hasEnteredToday state when connection changes
  useEffect(() => {
    const updateEntryStatus = async () => {
      if (isConnected && connection) {
        // Check both localStorage and contract state
        const localStorageEntry = checkDailyEntry()
        const contractEntry = await checkContractDailyEntry()
        
        setHasEnteredToday(localStorageEntry || contractEntry)
      } else {
        setHasEnteredToday(false)
      }
    }
    
    updateEntryStatus()
  }, [isConnected, connection])

  // Periodically update real-time data
  useEffect(() => {
    if (!isConnected || !connection) return

    // Update data immediately when connected
    updateAllRealTimeData()

    // Set up periodic updates every 30 seconds
    const interval = setInterval(() => {
      updateAllRealTimeData()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [isConnected, connection])

  // Get next game reset time
  const getNextGameReset = () => {
    const now = new Date()
    const pstOffset = -8
    const pstTime = new Date(now.getTime() + (pstOffset * 60 * 60 * 1000))
    const isBeforeNoonPST = pstTime.getHours() < 12
    
    const nextReset = new Date(pstTime)
    if (isBeforeNoonPST) {
      nextReset.setHours(12, 0, 0, 0) // Today at 12pm PST
    } else {
      nextReset.setDate(nextReset.getDate() + 1)
      nextReset.setHours(12, 0, 0, 0) // Tomorrow at 12pm PST
    }
    
    return nextReset
  }

  // Format time until next reset
  const formatTimeUntilReset = () => {
    const nextReset = getNextGameReset()
    const now = new Date()
    const timeDiff = nextReset.getTime() - now.getTime()
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m`
  }

  // Check VMF balance
  const checkVMFBalance = async (address: string) => {
    try {
      const balance = await getVMFBalanceUltimate(address)
      setVmfBalance(balance)
      return parseFloat(balance)
    } catch (error) {
      console.error('Error checking VMF balance:', error)
      setVmfBalance('0')
      return 0
    }
  }

  // Handle game entry
  const handleEnterGame = async () => {
    if (!isConnected || !connection) {
      setShowWalletModal(true)
      return
    }

    // Check both localStorage and contract state
    const localStorageEntry = checkDailyEntry()
    const contractEntry = await checkContractDailyEntry()
    
    if (localStorageEntry || contractEntry) {
      const timeUntilReset = formatTimeUntilReset()
      setGameError(`You have already entered the game today. Come back tomorrow to play again. (Next game starts in ${timeUntilReset})`)
      return
    }

    // Check VMF balance before allowing entry
    const balance = await checkVMFBalance(connection.address)
    if (balance < 1) {
      setGameError('You need at least 1 VMF to enter the game. Please get some VMF tokens first.')
      return
    }

    setIsProcessing(true)
    setGameError(null)
    setSuccess(null)

    try {
      // Create advanced contracts service
      const service = await getAdvancedContractsService()
      if (!service) throw new Error('Failed to initialize contract service')
      
      // Debug: Get VMF price and required amount
      console.log('🔍 Getting VMF price and required amount...')
      // Temporarily disabled due to contract interaction issue
      // const vmfPrice = await service.getVMFPrice()
      // const vmfPriceFormatted = await service.getVMFPriceFormatted()
      // console.log('💰 VMF Price:', vmfPrice.toString(), 'wei')
      // console.log('💵 VMF Price:', vmfPriceFormatted, 'VMF')
      console.log('💰 VMF Price: 1.0 VMF (temporarily hardcoded)')
      
      // Enter the daily game (with optional referral)
      const txHash = await service.enterDailyGame()
      
      // Earn toppings for daily play (only when wallet is connected)
      if (isConnected && connection?.address) {
        const earnedDaily = earnDailyPlayToppings(connection.address, isConnected)
        if (earnedDaily) {
          console.log('🍕 Earned daily play topping!')
        }
        
        // Check VMF balance and earn VMF holdings toppings
        const vmfBalance = await checkVMFBalance(connection.address)
        if (vmfBalance > 0) {
          earnVMFHoldingsToppings(connection.address, isConnected, vmfBalance)
        }
      }
      
      setSuccess('Transaction submitted!')
      console.log('✅ Game entry successful:', txHash)
      
      // Auto-share on Farcaster if in Farcaster environment
      if (isFarcasterEnvironment) {
        try {
          await shareGameEntry()
          console.log('✅ Auto-shared game entry on Farcaster')
        } catch (error) {
          console.log('⚠️ Auto-share failed:', error)
        }
      }
      
      // Record daily entry
      const now = new Date()
      const pstOffset = -8
      const pstTime = new Date(now.getTime() + (pstOffset * 60 * 60 * 1000))
      const isBeforeNoonPST = pstTime.getHours() < 12
      const today = pstTime.toDateString()
      const yesterday = new Date(pstTime.getTime() - (24 * 60 * 60 * 1000)).toDateString()
      const gameDate = isBeforeNoonPST ? today : yesterday
      const entryKey = `pizza_entry_${connection.address}_${gameDate}`
      const dailyEntryKey = `daily_entry_${connection.address}`
      
      localStorage.setItem(entryKey, 'true')
      localStorage.setItem(dailyEntryKey, Date.now().toString())
      setHasEnteredToday(true)
      
      // Update all real-time data
      await updateAllRealTimeData()
      
    } catch (error: any) {
      console.error('❌ Error entering game:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to enter game. Please try again.'
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Failed to connect')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.'
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient VMF balance. You need at least 100 VMF to enter the game.'
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled by user.'
      } else if (error.message.includes('nonce too low')) {
        errorMessage = 'Transaction error. Please try again in a few seconds.'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait before trying again.'
      } else if (error.message.includes('blacklisted')) {
        errorMessage = 'Account is not eligible to enter the game.'
      }
      
      setGameError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  // Update player count display
  const updatePlayerCount = async () => {
    try {
      console.log('🔄 Updating player count...')
      
      if (isConnected && connection && window.ethereum) {
        try {
          console.log('🔍 Attempting contract calls...')
          const service = await getAdvancedContractsService()
          if (!service) throw new Error('Failed to initialize contract service')
          
          // Get current game ID and check if draw is ready
          const gameId = await service.getCurrentGameId()
          const isDailyReady = await service.isDailyDrawReady()
          
          console.log('📊 Current game ID:', gameId)
          console.log('📊 Daily draw ready:', isDailyReady)
          
          // For now, use localStorage as the primary source
          // The new contract structure doesn't have direct player count functions
          console.log('📊 Using localStorage for player count')
          updatePlayerCountFromLocalStorage()
          
        } catch (contractError) {
          console.error('❌ Error reading players from contract:', contractError)
          // Fallback to localStorage
          updatePlayerCountFromLocalStorage()
        }
      } else {
        console.log('🔍 Wallet not connected for contract calls')
        updatePlayerCountFromLocalStorage()
      }
    } catch (error) {
      console.error('❌ Error updating player count:', error)
      updatePlayerCountFromLocalStorage()
    }
  }

  // Update player count from localStorage (fallback)
  const updatePlayerCountFromLocalStorage = () => {
    const now = new Date()
    const pstOffset = -8
    const pstTime = new Date(now.getTime() + (pstOffset * 60 * 60 * 1000))
    const isBeforeNoonPST = pstTime.getHours() < 12
    const today = pstTime.toDateString()
    const yesterday = new Date(pstTime.getTime() - (24 * 60 * 60 * 1000)).toDateString()
    const gameDate = isBeforeNoonPST ? today : yesterday
    const dailyKey = `daily_players_${gameDate}`
    const dailyPlayers = JSON.parse(localStorage.getItem(dailyKey) || '[]')
    const localStorageDailyCount = dailyPlayers.length

    console.log('📊 Using localStorage daily players:', localStorageDailyCount)
    setPlayerCount(localStorageDailyCount)
  }

  // Update all real-time data
  const updateAllRealTimeData = async () => {
    console.log('🔄 Updating all real-time data...')
    
    // Update player count
    await updatePlayerCount()
    
    // Update jackpot amount
    await updateJackpotAmount()
    
    // Update player toppings
    await updatePlayerToppings()
    
    // Update VMF balance
    if (connection?.address) {
      await checkVMFBalance(connection.address)
    }
    
    console.log('✅ All real-time data updated!')
  }

  // Update player's toppings
  const updatePlayerToppings = async () => {
    try {
      console.log('🔄 Updating player toppings...')
      
      if (isConnected && connection && window.ethereum) {
        try {
          const service = await getAdvancedContractsService()
          if (!service) return
          
          const toppings = await service.getPlayerToppings(connection.address)
          
          console.log('🍕 Player toppings:', toppings.toString())
          
          // Update localStorage with current toppings
          localStorage.setItem(`toppings_${connection.address}`, toppings.toString())
          
        } catch (contractError) {
          console.error('❌ Error reading player toppings from contract:', contractError)
        }
      }
    } catch (error) {
      console.error('❌ Error updating player toppings:', error)
    }
  }

  // Update jackpot amount
  const updateJackpotAmount = async () => {
    try {
      console.log('🔄 Updating jackpot amount...')
      
      if (isConnected && connection && window.ethereum) {
        try {
          const service = await getAdvancedContractsService()
          if (!service) return
          
          const jackpotAmount = await service.getDailyJackpot()
          const jackpotFormatted = await service.getDailyJackpotFormatted()
          
          console.log('💰 Contract jackpot amount:', jackpotAmount.toString())
          
          // Validate the jackpot amount
          if (jackpotAmount && jackpotAmount > BigInt(0)) {
            const newJackpot = parseFloat(jackpotFormatted)
            const oldJackpot = jackpot
            
            setJackpot(newJackpot)
            console.log('💰 Jackpot in VMF:', jackpotFormatted)
            
            // Share jackpot milestone on Farcaster if significant increase
            if (isFarcasterEnvironment && newJackpot > oldJackpot && newJackpot >= 10) {
              const increase = newJackpot - oldJackpot
              if (increase >= 5) { // Share if jackpot increased by 5+ VMF
                try {
                  await shareJackpotMilestone(jackpotFormatted, 'daily')
                  console.log('✅ Shared jackpot milestone on Farcaster')
                } catch (error) {
                  console.log('⚠️ Failed to share jackpot milestone:', error)
                }
              }
            }
          } else {
            console.log('💰 Invalid jackpot amount, keeping current value')
          }
          
        } catch (contractError) {
          console.error('❌ Error reading jackpot from contract:', contractError)
        }
      }
    } catch (error) {
      console.error('❌ Error updating jackpot amount:', error)
    }
  }

  // Handle wallet connection
  const handleWalletConnect = async (walletId: string) => {
    try {
      await connectWallet(walletId)
      setShowWalletModal(false)
    } catch (error) {
      console.error('Error connecting wallet:', error)
    }
  }

  // Initialize mobile optimizations and device detection
  useEffect(() => {
    initMobileOptimizations()

    setDeviceInfo({
      isMobile: isMobile(),
      isIOS: isIOS(),
      isAndroid: isAndroid(),
      isFarcaster: isFarcaster(),
    })

    window.scrollTo(0, 0)
  }, [])

  // Handle page refresh and wallet disconnection
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Initialize player count on mount
  useEffect(() => {
    const initializePlayerCount = async () => {
      await updatePlayerCount()
    }
    
    initializePlayerCount()
  }, [])

  // Update real-time data
  const updateRealTimeData = async () => {
    try {
      // Get real-time daily player count
      const dailyPlayers = getRealTimeDailyPlayerCount()
      setRealTimeDailyPlayers(dailyPlayers)
      
      // Get real-time jackpot value from contract
      try {
        const service = await getAdvancedContractsService()
        if (service) {
          const weeklyJackpot = await service.getWeeklyJackpot()
          const weeklyJackpotFormatted = await service.getWeeklyJackpotFormatted()
          const weeklyToppingsPool = await service.getWeeklyToppingsPool()
          const totalToppingsClaimed = await service.getTotalToppingsClaimed()
          
          setRealTimeJackpotValue(parseFloat(weeklyJackpotFormatted))
          console.log('💰 Real weekly jackpot from contract:', weeklyJackpotFormatted, 'VMF')
          console.log('🍕 Weekly toppings pool:', weeklyToppingsPool.toString(), 'toppings')
          console.log('🍕 Total toppings claimed:', totalToppingsClaimed.toString(), 'toppings')
        } else {
          // Fallback to mock data if contract service fails
          const jackpotValue = await getRealTimeJackpotValue()
          setRealTimeJackpotValue(jackpotValue)
        }
      } catch (error) {
        console.error('❌ Error getting contract jackpot:', error)
        // Fallback to mock data
        const jackpotValue = await getRealTimeJackpotValue()
        setRealTimeJackpotValue(jackpotValue)
      }
      
      console.log('📊 Real-time data updated:', {
        dailyPlayers,
        jackpotValue: `$${realTimeJackpotValue.toFixed(2)}`
      })
    } catch (error) {
      console.error('❌ Error updating real-time data:', error)
    }
  }

  // Update real-time data continuously
  useEffect(() => {
    updateRealTimeData()
    
    // Update every 5 seconds for real-time data
    const interval = setInterval(() => {
      updateRealTimeData()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Update player count and VMF balance when wallet connects or changes
  useEffect(() => {
    if (isConnected && connection) {
      updatePlayerCount()
      checkVMFBalance(connection.address)
    }
  }, [isConnected, connection])

  // Daily jackpot draw logic
  useEffect(() => {
    const checkDailyJackpot = () => {
      if (isDailyJackpotTime() && !isDailyDrawComplete) {
        const performDailyDraw = async () => {
          console.log("🏆 Time for daily jackpot draw!")
          
          // Get daily jackpot amount
          const dailyAmount = getDailyJackpotAmount()
          setDailyJackpotAmount(dailyAmount)
          
          // Select 8 daily winners
          const selectedWinners = selectDailyJackpotWinners()
          setDailyWinners(selectedWinners)
          setIsDailyDrawComplete(true)
          
          if (selectedWinners.length > 0) {
            // Pay daily winners
            await payDailyJackpotWinners(selectedWinners, dailyAmount)
            console.log("✅ Daily jackpot draw completed!")
          } else {
            console.log("⚠️ No players found for daily jackpot draw")
          }
        }
        
        performDailyDraw()
      }
    }

    // Check every minute for daily jackpot time
    const interval = setInterval(checkDailyJackpot, 60000)
    checkDailyJackpot() // Check immediately

    return () => clearInterval(interval)
  }, [isDailyDrawComplete])

  // Auto-hide success/error messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (gameError) {
      const timer = setTimeout(() => setGameError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [gameError])

  // Update countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftInWindow(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
      } else {
          return { hours: 0, minutes: 0, seconds: 0 }
        }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const shareLink = async () => {
    setShowShareModal(true)
  }

  const handleSocialShare = async (platform: any) => {
    const shareText = "Join me on Pizza Party! 🍕 Play to win a slice of the pie!"

    if (platform.name === "Farcaster" && isFarcasterEnvironment) {
      // Use enhanced Farcaster sharing
      try {
        const success = await shareReferralCode(referralCode)
        if (success) {
          setSuccess("✅ Shared on Farcaster successfully!")
          setTimeout(() => setSuccess(null), 3000)
        } else {
          setGameError("❌ Failed to share on Farcaster")
          setTimeout(() => setGameError(null), 3000)
        }
      } catch (error) {
        console.error('Farcaster sharing error:', error)
        setGameError("❌ Error sharing on Farcaster")
        setTimeout(() => setGameError(null), 3000)
      }
      setShowShareModal(false)
    } else if (platform.action === "copy") {
      // For platforms like Discord and Instagram that don't have direct web sharing
      await copyToClipboard()
      setShowShareModal(false)
      // You could show a toast here saying "Link copied! Paste it in Discord/Instagram"
    } else if (platform.shareUrl) {
      // Open the social media sharing URL
      const url = platform.shareUrl(referralLink, shareText)
      window.open(url, "_blank", "width=600,height=400")
      setShowShareModal(false)
    }
  }

  // Check gasless availability and get gas estimates
  const checkGaslessAvailability = useCallback(async () => {
    if (!isConnected || !connection) return

    try {
      const service = await getAdvancedContractsService()
      if (!service) return
      
      // For now, disable gasless as it's not implemented in the new contracts
      setGaslessAvailable(false)
      console.log('⚠️ Gasless transactions not available in new contract system')
    } catch (error) {
      console.error('Error checking gasless availability:', error)
      setGaslessAvailable(false)
    }
  }, [isConnected, connection])

  useEffect(() => {
    checkGaslessAvailability()
  }, [isConnected, connection, checkGaslessAvailability])

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
      <div className="max-w-md mx-auto">
        <Card className="relative bg-white/90 backdrop-blur-sm border-4 border-red-800 rounded-3xl shadow-2xl mb-6">
          <CardHeader className="text-center pb-0">
            <div className="absolute top-4 left-4 z-10">
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
            

            
            <CardTitle className="text-red-800" style={{...customFontStyle, fontSize: '32px'}}>
              8 Slices, 8 Winners!
            </CardTitle>
            <p className="text-2xl text-gray-700 text-center" style={customFontStyle}>
              Jackpot split 8 ways!
            </p>
            <p className="text-2xl text-gray-700" style={customFontStyle}>
              Winners picked every 24 hrs!
            </p>
          </CardHeader>

          <CardContent className="p-6 pt-2">
            {/* Game Buttons - Moved to TOP */}
            <div className="relative w-72 h-72 mx-auto mb-6">
              {/* Pizza Image */}
              <Image
                src="/images/pizza-final.png"
                alt="Delicious pizza with pepperoni, green peppers, and olives"
                width={288}
                height={288}
                className="w-full h-full object-contain drop-shadow-2xl"
                priority
              />

              {/* Slice Lines Overlay */}
              <svg viewBox="0 0 288 288" className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {/* 8 slice divider lines from center to edge */}
                {[...Array(8)].map((_, i) => {
                  const angle = i * 45 - 90 // Start from top and go clockwise
                  const centerX = 144
                  const centerY = 144
                  const radius = 120 // Adjust based on pizza size
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
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  )
                })}
              </svg>
            </div>

            {/* Game Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Gasless Transaction Toggle */}
              {gaslessAvailable && (
                <div className="flex items-center justify-center space-x-2 bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                  <input
                    type="checkbox"
                    id="gasless-toggle"
                    checked={useGasless}
                    onChange={(e) => setUseGasless(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="gasless-toggle" className="text-sm font-medium text-blue-800" style={customFontStyle}>
                    🚀 Use Gasless Transactions (No Gas Fees!)
                  </label>
                </div>
              )}
              
              {/* Daily Entry Status */}
              {isConnected && connection && hasEnteredToday && (
                <div className="bg-yellow-100 border-2 border-yellow-400 rounded-xl p-3 text-center mb-4">
                  <p className="text-yellow-800 font-bold text-sm" style={customFontStyle}>
                    🕐 You have already entered today!
                  </p>
                  <p className="text-yellow-700 text-xs mt-1" style={customFontStyle}>
                    Next game starts in {formatTimeUntilReset()}
                  </p>
                </div>
              )}
              
              <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-4 px-8 rounded-xl border-4 border-green-800 shadow-lg"
                style={{
                  ...customFontStyle,
                  letterSpacing: "1px",
                  fontSize: "1.25rem",
                }}
              onClick={handleEnterGame}
              disabled={isProcessing || hasEnteredToday}
              >
              {isProcessing ? 'Processing...' : (
                <>
                  <img src="/images/pepperoni-art.png" alt="Pizza Slice" className="w-6 h-6 mr-2" />
                  {hasEnteredToday 
                    ? 'ALREADY ENTERED TODAY' 
                    : (useGasless && gaslessAvailable ? 'ENTER GAME $1 VMF (GASLESS!)' : 'ENTER GAME $1 VMF')
                  }
                  <img src="/images/pepperoni-art.png" alt="Pizza Slice" className="w-6 h-6 ml-2" />
                </>
              )}
              </Button>
              
              {/* Gas Estimate Display */}
              {gaslessAvailable && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded text-center" style={customFontStyle}>
                  {useGasless ? (
                    <span>💰 Gasless: ~{parseInt(gasEstimates.gasless.enterDailyGame) / 1000}k gas</span>
                  ) : (
                    <span>💰 Regular: ~{parseInt(gasEstimates.regular.enterDailyGame) / 1000}k gas</span>
                  )}
                </div>
              )}

            {/* Wallet Status Display */}
            {isConnected && connection && (
              <div className="bg-green-100 border-2 border-green-300 rounded-xl p-3 text-center">
                <p className="text-green-800 font-bold text-sm" style={customFontStyle}>
                  ✅ Connected to {connection.walletName || 'Wallet'} {connection.address?.slice(0, 6)}...{connection.address?.slice(-4)}
                </p>
                <p className="text-green-700 text-xs mt-1" style={customFontStyle}>
                  💰 VMF Balance: {parseFloat(vmfBalance).toFixed(2)} VMF
                </p>
                {parseFloat(vmfBalance) < 1 && (
                  <p className="text-red-600 text-xs mt-1 font-bold" style={customFontStyle}>
                    ⚠️ You need at least 1 VMF to play!
                  </p>
                )}
              </div>
            )}

            {/* Weekly Jackpot Button */}
              <Link href="/jackpot">
                <Button
                  className="w-full bg-red-700 hover:bg-red-800 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-red-900 shadow-lg transform hover:scale-105 transition-all"
                  style={{
                    ...customFontStyle,
                    letterSpacing: "1px",
                    fontSize: "1.25rem",
                  }}
                >
                  <img src="/images/star-favicon.png" alt="Star" className="w-6 h-6 rounded-full mx-1" />
                  Weekly Jackpot
                  <img src="/images/star-favicon.png" alt="Star" className="w-6 h-6 rounded-full mx-1" />
                </Button>
              </Link>

            {/* Leaderboard Button */}
            <Link href="/leaderboard">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-green-800 shadow-lg transform hover:scale-105 transition-all"
                style={{
                  ...customFontStyle,
                  letterSpacing: "1px",
                  fontSize: "1.25rem",
                }}
              >
                🏆 LEADERBOARD 🏆
                </Button>
              </Link>

            {/* Invite Friends Button */}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-blue-800 shadow-lg transform hover:scale-105 transition-all"
              style={{ ...customFontStyle, letterSpacing: "1px", fontSize: "1.25rem" }}
              onClick={() => {
                if (!isConnected || !connection) {
                  setShowWalletModal(true)
                } else {
                  setShowInviteModal(true)
                }
              }}
            >
              <UsersIcon className="mr-2 h-5 w-5" />
              Invite Friends
              <UsersIcon className="ml-2 h-5 w-5" />
              </Button>

            {/* Wallet Required Hint */}
            {!isConnected && (
              <p className="text-xs text-gray-500 text-center -mt-1" style={customFontStyle}>
                💡 Connect wallet to invite friends
              </p>
            )}
            </div>

            {/* Daily Game Window Countdown - Moved to BOTTOM */}
            <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200 mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <p className="font-semibold text-blue-800 text-center" style={customFontStyle}>
                  Current Game Window Ends In:
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded">
                  <div className="text-xl font-bold text-blue-800" style={customFontStyle}>
                    {timeLeftInWindow.hours}
                  </div>
                  <div className="text-xs text-blue-600" style={customFontStyle}>
                    HRS
                  </div>
                </div>
                <div className="bg-white p-2 rounded">
                  <div className="text-xl font-bold text-blue-800" style={customFontStyle}>
                    {timeLeftInWindow.minutes}
                  </div>
                  <div className="text-xs text-blue-600" style={customFontStyle}>
                    MIN
                  </div>
                </div>
                <div className="bg-white p-2 rounded">
                  <div className="text-xl font-bold text-blue-800" style={customFontStyle}>
                    {timeLeftInWindow.seconds}
                  </div>
                  <div className="text-xs text-blue-600" style={customFontStyle}>
                    SEC
                  </div>
                </div>
              </div>
              <p className="text-xs text-blue-600 text-center mt-2" style={customFontStyle}>
                New game starts daily at 12pm PST
              </p>
            </div>

            {/* Game Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <p className="text-sm text-blue-600" style={customFontStyle}>
                  Players Today
                </p>
                <p className="text-xl font-bold text-blue-800" style={customFontStyle}>
                  {realTimeDailyPlayers.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg text-center">
                <Coins className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <p className="text-sm text-green-600" style={customFontStyle}>
                  Jackpot
                </p>
                <p className="text-xl font-bold text-green-800" style={customFontStyle}>
                  ${realTimeJackpotValue.toFixed(2)} VMF
                </p>
              </div>
            </div>

                                  {/* BUY VMF Button */}
                      <Button
                        className="w-full bg-red-700 hover:bg-red-800 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-red-900 shadow-lg transform hover:scale-105 transition-all touch-manipulation mb-4"
                        style={{
                          ...customFontStyle,
                          letterSpacing: "1px",
                          fontSize: deviceInfo.isMobile ? "1.1rem" : "1.25rem",
                          minHeight: deviceInfo.isMobile ? "56px" : "auto",
                        }}
                      >
                        <img src="/images/star-favicon.png" alt="Star" className="w-6 h-6 rounded-full mx-1" />
                        BUY VMF
                        <img src="/images/star-favicon.png" alt="Star" className="w-6 h-6 rounded-full mx-1" />
                      </Button>


          </CardContent>
        </Card>

        {/* Invite Friends Modal */}
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent className="max-w-md mx-auto bg-white border-4 border-blue-800 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl text-blue-800 text-center" style={customFontStyle}>
                🎉 Invite Friends to Pizza Party! 🎉
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              {/* Referral Stats */}
              <div className="bg-blue-100 p-4 rounded-xl border-2 border-blue-300">
                <h3 className="text-lg font-bold text-blue-800 mb-2" style={customFontStyle}>
                  Your Referral Stats
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600" style={customFontStyle}>{referralStats.used}</div>
                    <div className="text-sm text-blue-700" style={customFontStyle}>Used</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600" style={customFontStyle}>{referralStats.joined}</div>
                    <div className="text-sm text-green-700" style={customFontStyle}>Joined</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600" style={customFontStyle}>{referralStats.remaining}</div>
                    <div className="text-sm text-orange-700" style={customFontStyle}>Remaining</div>
                  </div>
                </div>
              </div>

              {/* Referral Code */}
              <div className="bg-yellow-100 p-4 rounded-xl border-2 border-yellow-300">
                <h3 className="text-lg font-bold text-yellow-800 mb-2" style={customFontStyle}>Your Referral Code</h3>
                <div className="bg-white p-3 rounded-lg border border-yellow-400">
                  <p className="text-lg font-mono font-bold text-center text-gray-800" style={customFontStyle}>{referralCode}</p>
                </div>
              </div>

              {/* Share Link */}
              <div className="bg-green-100 p-4 rounded-xl border-2 border-green-300">
                <h3 className="text-lg font-bold text-green-800 mb-2" style={customFontStyle}>Share Your Link</h3>
                <div className="bg-white p-3 rounded-lg border border-green-400 mb-3">
                  <p className="text-xs font-mono text-gray-800 break-all" style={customFontStyle}>{referralLink}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyToClipboard} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" style={customFontStyle}>
                    <Copy className="mr-2 h-4 w-4" />Copy Link
                  </Button>
                  <Button onClick={shareLink} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg" style={customFontStyle}>
                    <Share2 className="mr-2 h-4 w-4" />Share
                  </Button>
                </div>
                {copied && (
                  <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3 text-center mt-2">
                    <p className="text-green-800 font-bold" style={customFontStyle}>✅ Link copied to clipboard!</p>
                  </div>
                )}
              </div>

              {/* Referral Rewards */}
              <div className="bg-purple-100 p-4 rounded-xl border-2 border-purple-300">
                <h3 className="text-lg font-bold text-purple-800 mb-2 flex items-center" style={customFontStyle}>🎁 Referral Rewards</h3>
                <ul className="space-y-1 text-sm text-purple-700" style={customFontStyle}>
                  <li>• 2 Toppings per successful referral</li>
                  <li>• Higher jackpot chances</li>
                  <li>• Toppings count toward weekly drawing</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Modal */}
        <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
          <DialogContent className="max-w-md mx-auto bg-white border-4 border-red-800 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl text-red-800 text-center" style={customFontStyle}>
                🍕 Share on Social Media 🍕
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 p-4">
              <p className="text-center text-gray-600" style={customFontStyle}>
                Choose where you'd like to share your referral link.
              </p>

              <div className="space-y-3">
                {/* X (Twitter) */}
                <Button
                  onClick={() => handleSocialShare({ 
                    action: "share", 
                    name: "X (Twitter)",
                    shareUrl: (link: string, text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`
                  })}
                  className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-between"
                  style={customFontStyle}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">𝕏</span>
                    <span>X (Twitter)</span>
                  </div>
                  <ExternalLink className="h-4 w-4" />
                </Button>

                {/* Facebook */}
                <Button
                  onClick={() => handleSocialShare({ 
                    action: "share", 
                    name: "Facebook",
                    shareUrl: (link: string, text: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`
                  })}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-between"
                  style={customFontStyle}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">f</span>
                    <span>Facebook</span>
                  </div>
                  <ExternalLink className="h-4 w-4" />
                </Button>

                {/* Telegram */}
                <Button
                  onClick={() => handleSocialShare({ 
                    action: "share", 
                    name: "Telegram",
                    shareUrl: (link: string, text: string) => `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
                  })}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-between"
                  style={customFontStyle}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">✈️</span>
                    <span>Telegram</span>
                  </div>
                  <ExternalLink className="h-4 w-4" />
                </Button>

                {/* Discord */}
                <Button
                  onClick={() => handleSocialShare({ action: "copy", name: "Discord" })}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-between"
                  style={customFontStyle}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">🎮</span>
                    <span>Discord</span>
                  </div>
                  <Copy className="h-4 w-4" />
                </Button>

                {/* WhatsApp */}
                <Button
                  onClick={() => handleSocialShare({ 
                    action: "share", 
                    name: "WhatsApp",
                    shareUrl: (link: string, text: string) => `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`
                  })}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-between"
                  style={customFontStyle}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">💬</span>
                    <span>WhatsApp</span>
                  </div>
                  <ExternalLink className="h-4 w-4" />
                </Button>

                {/* Farcaster */}
                <Button
                  onClick={() => handleSocialShare({ 
                    action: "share", 
                    name: "Farcaster",
                    shareUrl: (link: string, text: string) => `https://warpcast.com/~/compose?text=${encodeURIComponent(`${text} ${link}`)}`
                  })}
                  disabled={isFarcasterSharing}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-between disabled:opacity-50"
                  style={customFontStyle}
                >
                  <div className="flex items-center">
                    <Image
                      src="/images/farcaster-icon.png"
                      alt="Farcaster"
                      width={20}
                      height={20}
                      className="mr-3"
                    />
                    <span>{isFarcasterSharing ? 'Sharing...' : 'Farcaster'}</span>
                  </div>
                  {isFarcasterSharing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                </Button>

                {/* Copy Link */}
                <Button
                  onClick={copyToClipboard}
                  className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-between"
                  style={customFontStyle}
                >
                  <div className="flex items-center">
                    <Copy className="h-5 w-5 mr-3" />
                    <span>Copy Link</span>
                  </div>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {copied && (
                <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3 text-center">
                  <p className="text-green-800 font-bold" style={customFontStyle}>
                    ✅ Link copied to clipboard!
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Error/Success Messages */}
        {gameError && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border-2 border-red-300 rounded-lg p-4 max-w-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 font-bold" style={customFontStyle}>
                {gameError}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-100 border-2 border-green-300 rounded-lg p-4 max-w-md">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 text-green-600">✅</div>
              <p className="text-green-800 font-bold" style={customFontStyle}>
                {success}
              </p>
            </div>
          </div>
        )}

        {/* Wallet Connection Modal */}
        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogContent className="max-w-xl mx-auto bg-white border-4 border-red-800 rounded-3xl max-h-[90vh] overflow-y-auto m-2">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl text-red-800 text-center" style={customFontStyle}>
                🍕 Connect Your Wallet 🍕
              </DialogTitle>
              <p className="text-center text-gray-600 mt-2 text-sm" style={customFontStyle}>
                {deviceInfo.isMobile
                  ? "Choose your wallet to connect"
                  : "Choose your preferred wallet to connect to Pizza Party"}
              </p>
            </DialogHeader>

            <div className="space-y-3 p-4 max-h-[70vh] overflow-y-auto">
              {/* Error Display with Mobile Instructions */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-800 font-bold text-sm" style={customFontStyle}>
                      Connection Failed
                    </p>
                    <div className="text-red-700 text-xs mt-1 whitespace-pre-line" style={customFontStyle}>
                      {error}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setError(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Mobile-specific instructions */}
              {deviceInfo.isMobile && (
                <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
                  <h3 className="text-lg font-bold text-blue-800 mb-2" style={customFontStyle}>
                    📱 Mobile Connection Tips
                  </h3>
                  <ul className="space-y-1 text-sm text-blue-700" style={customFontStyle}>
                    <li>• Open your wallet app first</li>
                    <li>• Use the browser inside your wallet app</li>
                    <li>• Visit this page from within the wallet</li>
                    <li>• Then try connecting</li>
                  </ul>
                  <div className="mt-3 p-2 bg-white rounded border">
                    <p className="text-xs text-gray-600 mb-1" style={customFontStyle}>
                      Current URL to copy:
                    </p>
                    <p className="text-xs font-mono text-gray-800 break-all">
                      {typeof window !== "undefined" ? window.location.href : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Show all wallets on both mobile and desktop */}
              {WALLETS.map((wallet) => {
                // Define colors for each wallet based on the image
                const getWalletStyle = (walletName: string) => {
                  switch (walletName.toLowerCase()) {
                    case 'metamask':
                      return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600'
                    case 'coinbase wallet':
                      return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700'
                    case 'trust wallet':
                      return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700'
                    case 'rainbow':
                      return 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-purple-600'
                    case 'phantom':
                      return 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700'
                    default:
                      return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-700'
                  }
                }

                return (
                <Button
                  key={wallet.id}
                  onClick={() => handleWalletConnect(wallet.id)}
                  disabled={isConnecting === wallet.id}
                    className={`w-full font-bold py-6 px-4 rounded-xl border-2 shadow-lg transform hover:scale-105 transition-all flex items-center justify-between text-lg ${getWalletStyle(wallet.name)}`}
                  style={customFontStyle}
                >
                    <div className="flex items-center gap-3">
                    {wallet.iconImage ? (
                      <Image
                          src={wallet.iconImage}
                          alt={wallet.name}
                        width={24}
                        height={24}
                          className="w-6 h-6"
                          onError={(e) => {
                            // Fallback to emoji if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const emojiSpan = target.nextElementSibling as HTMLElement;
                            if (emojiSpan) {
                              emojiSpan.style.display = 'block';
                            }
                          }}
                        />
                      ) : null}
                      <span 
                        className={`text-lg ${wallet.iconImage ? 'hidden' : 'block'}`}
                        style={{ display: wallet.iconImage ? 'none' : 'block' }}
                      >
                        {wallet.icon}
                      </span>
                      <span>{wallet.name}</span>
                  </div>
                  <div className="flex-shrink-0">
                    {isConnecting === wallet.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        <ExternalLink className="h-4 w-4 text-white" />
                    )}
                  </div>
                </Button>
                )
              })}

              {/* Info Section */}
              <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200 mt-6">
                <h3 className="text-lg font-bold text-blue-800 mb-2" style={customFontStyle}>
                  🔒 Why Connect Your Wallet?
                </h3>
                <ul className="space-y-1 text-sm text-blue-700" style={customFontStyle}>
                  <li>• Earn VMF tokens and toppings</li>
                  <li>• Participate in daily & weekly jackpots</li>
                  <li>• Track your game history</li>
                  <li>• Secure and decentralized</li>
                </ul>
              </div>

              {/* Security Notice */}
              <div className="bg-yellow-50 p-3 rounded-xl border-2 border-yellow-200">
                <p className="text-xs text-yellow-800 text-center" style={customFontStyle}>
                  🛡️ Your wallet connection is secure and encrypted. We never store your private keys.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
