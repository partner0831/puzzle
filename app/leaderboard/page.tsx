'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Medal, Crown, ArrowDown, User, UsersIcon, Copy, Share2, X, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useWallet } from '@/hooks/useWallet'
import { WALLETS, initMobileOptimizations, isMobile, isIOS, isAndroid, isFarcaster } from '@/lib/wallet-config'

interface Winner {
  rank: number
  name: string
  address: string
  winnings: string
  farcasterUsername?: string
  farcasterPfp?: string
}

export default function LeaderboardPage() {
  const [dailyWinners, setDailyWinners] = useState<Winner[]>([
    { rank: 1, name: "pizza_lover_123", address: "0x1234...5678", winnings: "2.5 VMF" },
    { rank: 2, name: "crypto_chef", address: "0x8765...4321", winnings: "2.0 VMF" },
    { rank: 3, name: "slice_master", address: "0x1111...2222", winnings: "1.8 VMF" },
    { rank: 4, name: "topping_king", address: "0x3333...4444", winnings: "1.5 VMF" },
    { rank: 5, name: "dough_boss", address: "0x5555...6666", winnings: "1.2 VMF" },
    { rank: 6, name: "sauce_slinger", address: "0x7777...8888", winnings: "1.0 VMF" },
    { rank: 7, name: "cheese_champion", address: "0x9999...0000", winnings: "0.8 VMF" },
    { rank: 8, name: "pepperoni_pro", address: "0xaaaa...bbbb", winnings: "0.5 VMF" },
  ])

  const [weeklyWinners, setWeeklyWinners] = useState<Winner[]>([
    { rank: 1, name: "pizza_legend", address: "0xcccc...dddd", winnings: "15.2 VMF" },
    { rank: 2, name: "jackpot_jedi", address: "0xeeee...ffff", winnings: "12.8 VMF" },
    { rank: 3, name: "vmf_victor", address: "0x1111...3333", winnings: "10.5 VMF" },
    { rank: 4, name: "topping_titan", address: "0x4444...6666", winnings: "8.9 VMF" },
    { rank: 5, name: "slice_supreme", address: "0x7777...9999", winnings: "7.3 VMF" },
    { rank: 6, name: "dough_dominator", address: "0xaaaa...cccc", winnings: "6.1 VMF" },
    { rank: 7, name: "sauce_supreme", address: "0xdddd...eeee", winnings: "5.2 VMF" },
    { rank: 8, name: "cheese_commander", address: "0xffff...1111", winnings: "4.8 VMF" },
    { rank: 9, name: "pepperoni_power", address: "0x2222...4444", winnings: "4.1 VMF" },
    { rank: 10, name: "pizza_pioneer", address: "0x5555...7777", winnings: "3.7 VMF" },
  ])

  // Invite Friends Modal State
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const { connection, isConnected, connectWallet, isConnecting, error, setError } = useWallet()

  const customFontStyle = {
    fontFamily: '"Comic Sans MS", "Marker Felt", "Chalkduster", "Kalam", "Caveat", cursive',
    fontWeight: 'bold',
  }

  // Referral data (same as game page)
  const referralCode = connection?.address ? `PIZZA-${connection.address.slice(2, 8).toUpperCase()}` : 'PIZZA-XXXXXX'
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/game?ref=${referralCode}` : `/game?ref=${referralCode}`
  // Updated referral stats to be accurate: 1 Used, 0 Joined, 2 Remaining
  const [referralStats] = useState({ 
    used: 1,      // 1 code has been used
    joined: 0,    // 0 people actually joined (maybe they used code but didn't complete registration)
    remaining: 2, // 2 codes still available
    totalAllowed: 3 // Total codes per user
  })

  // Function to fetch Farcaster profile data
  const fetchFarcasterProfile = async (address: string): Promise<{ username?: string; pfp?: string }> => {
    try {
      // Try to fetch from Farcaster API
      const response = await fetch(`https://api.farcaster.xyz/v2/users?fid=${address}`)
      if (response.ok) {
        const data = await response.json()
        if (data.users && data.users.length > 0) {
          const user = data.users[0]
          return {
            username: user.username,
            pfp: user.pfp?.url
          }
        }
      }
    } catch (error) {
      console.log('Error fetching Farcaster profile:', error)
    }
    
    // Fallback: try to get from localStorage if we have cached data
    if (typeof window !== 'undefined') {
      const cachedProfile = localStorage.getItem(`farcaster_profile_${address}`)
      if (cachedProfile) {
        return JSON.parse(cachedProfile)
      }
    }
    
    return {}
  }

  // Function to load Farcaster profiles for all winners
  const loadFarcasterProfiles = async () => {
    const allWinners = [...dailyWinners, ...weeklyWinners]
    
    for (const winner of allWinners) {
      const profile = await fetchFarcasterProfile(winner.address)
      if (profile.username || profile.pfp) {
        // Update the winner with Farcaster data
        winner.farcasterUsername = profile.username
        winner.farcasterPfp = profile.pfp
        
        // Cache the profile data
        if (typeof window !== 'undefined') {
          localStorage.setItem(`farcaster_profile_${winner.address}`, JSON.stringify(profile))
        }
      }
    }
    
    // Update state to trigger re-render
    setDailyWinners([...dailyWinners])
    setWeeklyWinners([...weeklyWinners])
  }

  // Load Farcaster profiles on component mount
  useEffect(() => {
    loadFarcasterProfiles()
  }, [])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <Trophy className="w-4 h-4 text-blue-500" />
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white'
    if (rank === 3) return 'bg-gradient-to-r from-amber-500 to-amber-700 text-white'
    return 'bg-white hover:bg-blue-50'
  }

  const formatAddress = (address: string) => {
    if (address.length > 10) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    }
    return address
  }

  // Referral functions (same as game page)
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const handleSocialShare = async (platform: any) => {
    const shareText = "Join me on Pizza Party! 🍕 Play to win a slice of the pie!"

    if (platform.action === "copy") {
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

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Pizza Party!',
          text: 'Check out this awesome pizza game!',
          url: referralLink,
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      copyToClipboard()
    }
  }

  // Wallet connection handler
  const handleWalletConnect = async (walletId: string) => {
    try {
      await connectWallet(walletId)
      setShowWalletModal(false)
      // If wallet connects successfully, show the invite modal
      setShowInviteModal(true)
    } catch (err) {
      console.error('Failed to connect wallet:', err)
      setError('Failed to connect wallet')
    }
  }

  const renderWinnerEntry = (winner: Winner) => (
    <div
      key={winner.rank}
      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-200 ${getRankColor(winner.rank)}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {getRankIcon(winner.rank)}
          <span className="font-bold text-lg" style={customFontStyle}>
            {winner.rank}.
          </span>
        </div>
        
        {/* Profile Icon */}
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 flex-shrink-0">
          {winner.farcasterPfp ? (
            <Image
              src={winner.farcasterPfp}
              alt={`${winner.farcasterUsername || winner.name} profile`}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
          )}
        </div>
        
        <div>
          <p className="font-semibold" style={customFontStyle}>
            {winner.farcasterUsername || winner.name}
          </p>
          <p className="text-xs opacity-75" style={customFontStyle}>
            {formatAddress(winner.address)}
          </p>
        </div>
      </div>
      
      <div className="text-right">
        <p className={`font-bold ${winner.rank <= 3 ? 'text-white' : 'text-green-600'}`} style={customFontStyle}>
          {winner.winnings}
        </p>
      </div>
    </div>
  )

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
        {/* Main Leaderboard Container */}
        <Card className="bg-white/90 backdrop-blur-sm border-4 border-red-800 rounded-3xl shadow-2xl">
          <CardContent className="p-6">
            {/* Back Button - Upper Left */}
            <div className="absolute top-4 left-4">
              <Link href="/">
                <Button
                  variant="outline"
                  className="bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 rounded-xl px-4 py-2 shadow-md transform hover:scale-105 transition-all"
                  style={customFontStyle}
                >
                  ← Back to Home
                </Button>
              </Link>
            </div>

            {/* Header - Moved inside the white card */}
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-red-800 mb-2" style={customFontStyle}>
                🏆 LEADER BOARD 🏆
              </h1>
              <p className="text-lg text-gray-700" style={customFontStyle}>
                See who's winning the most VMF tokens!
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* DAILY WINNERS Section */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-4 border-blue-300 p-4">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-blue-800 mb-2" style={customFontStyle}>
                    🎯 DAILY WINNERS 🎯
                  </h2>
                  <p className="text-sm text-blue-600" style={customFontStyle}>
                    Today's 8 lucky winners
                  </p>
                </div>
                
                <div className="space-y-2">
                  {dailyWinners.map(renderWinnerEntry)}
                </div>

                {/* Back to Game Button - Moved inside Daily Winners card */}
                <div className="text-center mt-4">
                  <Link href="/game">
                    <Button
                      className="w-full !bg-green-600 hover:!bg-green-700 text-white text-lg font-bold py-3 px-8 rounded-xl border-4 border-green-800 shadow-lg transform hover:scale-105 transition-all"
                      style={{
                        ...customFontStyle,
                        letterSpacing: "1px",
                        fontSize: "1.25rem",
                      }}
                    >
                      🍕 Play to Win 🍕
                    </Button>
                  </Link>
                </div>

                {/* Weekly Jackpot Button */}
                <div className="text-center mt-3">
                  <Link href="/jackpot">
                    <Button
                      className="w-full !bg-red-700 hover:!bg-red-800 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-red-900 shadow-lg transform hover:scale-105 transition-all"
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
                </div>

                {/* Invite Friends Button */}
                <div className="text-center mt-3">
                  <Button
                    className="w-full !bg-blue-600 hover:!bg-blue-700 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-blue-800 shadow-lg transform hover:scale-105 transition-all"
                    style={{
                      ...customFontStyle,
                      letterSpacing: "1px",
                      fontSize: "1.25rem",
                    }}
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
                </div>
              </div>

              {/* WEEKLY WINNERS Section */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-4 border-purple-300 p-4">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-purple-800 mb-2" style={customFontStyle}>
                    🌟 WEEKLY WINNERS 🌟
                  </h2>
                  <p className="text-sm text-purple-600" style={customFontStyle}>
                    This week's top 10 champions
                  </p>
                </div>
                
                <div className="space-y-2">
                  {weeklyWinners.map(renderWinnerEntry)}
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-2 border-green-300 p-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-green-800 mb-2" style={customFontStyle}>
                  🎮 How to Get on the Leaderboard
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="font-semibold text-green-700 mb-1" style={customFontStyle}>Daily Winners</p>
                    <p className="text-green-600" style={customFontStyle}>8 players randomly selected every day at 12pm PST</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <p className="font-semibold text-blue-700 mb-1" style={customFontStyle}>Weekly Winners</p>
                    <p className="text-blue-600" style={customFontStyle}>10 random players selected with weighted probability based on claimed toppings</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <p className="font-semibold text-purple-700 mb-1" style={customFontStyle}>Earn More Toppings</p>
                    <p className="text-purple-600" style={customFontStyle}>Play daily, refer friends, and hold VMF tokens!</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Connection Modal */}
        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogContent className="max-w-md mx-auto bg-white border-2 border-red-500 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl text-red-800 flex items-center gap-2 justify-center" style={customFontStyle}>
                🍕 Connect Your Wallet 🍕
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <p className="text-center text-gray-800" style={customFontStyle}>
                Choose your preferred wallet to connect to Pizza Party
              </p>
              
              <div className="space-y-3">
                {WALLETS.map((wallet) => {
                  // Define colors for each wallet based on the image
                  const getWalletStyle = (walletName: string) => {
                    switch (walletName.toLowerCase()) {
                      case 'metamask':
                        return '!bg-orange-500 hover:!bg-orange-600 text-white'
                      case 'coinbase wallet':
                        return '!bg-blue-600 hover:!bg-blue-700 text-white'
                      case 'trust wallet':
                        return '!bg-[#000F7E] hover:!bg-[#000F7E]/90 text-white'
                      case 'rainbow':
                        return '!bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
                      case 'phantom':
                        return '!bg-purple-600 hover:!bg-purple-700 text-white'
                      default:
                        return '!bg-gray-600 hover:!bg-gray-700 text-white'
                    }
                  }

                  return (
                    <Button
                      key={wallet.id}
                      onClick={() => handleWalletConnect(wallet.id)}
                      disabled={!!isConnecting}
                      className={`w-full font-bold py-6 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all flex items-center justify-between text-lg ${getWalletStyle(wallet.name)}`}
                      style={customFontStyle}
                    >
                      <div className="flex items-center gap-4">
                        {wallet.iconImage != null ? (
                          <Image
                            src={wallet.iconImage}
                            alt={wallet.name}
                            width={32}
                            height={32}
                            className="w-8 h-8"
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
                          className={`text-xl ${wallet.iconImage ? 'hidden' : 'block'}`}
                          style={{ display: wallet.iconImage ? 'none' : 'block' }}
                        >
                          {wallet.icon}
                        </span>
                        <span className="text-lg font-bold">{wallet.name}</span>
                      </div>
                      <ExternalLink className="h-5 w-5 text-white" />
                    </Button>
                  )
                })}
              </div>
              
              {error && (
                <div className="bg-red-100 border-2 border-red-300 rounded-lg p-3 text-center">
                  <p className="text-red-800 font-bold" style={customFontStyle}>{error}</p>
                </div>
              )}

              {/* Why Connect Your Wallet Section */}
              <div className="bg-blue-50 p-4 rounded-xl border border-gray-300">
                <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2" style={customFontStyle}>
                  🔒 Why Connect Your Wallet?
                </h3>
                <ul className="space-y-1 text-sm text-blue-700" style={customFontStyle}>
                  <li>• Earn VMF tokens and toppings</li>
                  <li>• Participate in daily & weekly jackpots</li>
                  <li>• Track your game history</li>
                  <li>• Secure and decentralized</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                  <Button onClick={() => setShowShareModal(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg" style={customFontStyle}>
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
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-between"
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
                    <span>Farcaster</span>
                  </div>
                  <ExternalLink className="h-4 w-4" />
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
      </div>
    </div>
  )
} 