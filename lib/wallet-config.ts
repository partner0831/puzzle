// Wallet connection utilities and configurations
export interface WalletInfo {
  name: string
  icon: string
  color: string
  id: string
  mobile?: boolean
  deepLink?: string
  downloadUrl?: string
  universalLink?: string
  iconImage?: string // Add support for image icons
}

export const WALLETS: WalletInfo[] = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "🦊",
    iconImage: "/images/metamask-icon.svg",
    color: "bg-orange-500 hover:bg-orange-600",
    mobile: true,
    deepLink: "metamask://",
    universalLink: "https://metamask.app.link/",
    downloadUrl: "https://metamask.io/download/",
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    icon: "🪙", // Fallback emoji if image fails to load
    iconImage: "/images/Coinbase-icon.png",
    color: "bg-blue-500 hover:bg-blue-600",
    mobile: true,
    deepLink: "coinbasewallet://",
    universalLink: "https://wallet.coinbase.com/",
    downloadUrl: "https://wallet.coinbase.com/",
  },
  {
    id: "trust",
    name: "Trust Wallet",
    icon: "🛡️",
    iconImage: "/images/trust-wallet-icon.svg",
    color: "bg-blue-600 hover:bg-blue-700",
    mobile: true,
    deepLink: "trust://",
    universalLink: "https://link.trustwallet.com/",
    downloadUrl: "https://trustwallet.com/",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    icon: "🌈",
    iconImage: "/images/rainbow-wallet-icon.svg",
    color: "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600",
    mobile: true,
    deepLink: "rainbow://",
    universalLink: "https://rnbwapp.com/",
    downloadUrl: "https://rainbow.me/",
  },
  {
    id: "phantom",
    name: "Phantom",
    icon: "👻",
    iconImage: "/images/phantom-wallet-icon.svg",
    color: "bg-purple-500 hover:bg-purple-600",
    mobile: true,
    deepLink: "phantom://",
    universalLink: "https://phantom.app/ul/",
    downloadUrl: "https://phantom.app/",
  },
]

// Base network configuration
export const BASE_NETWORK = {
  chainId: 8453,
  chainName: "Base",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: [
    "https://mainnet.base.org",
    "https://base-mainnet.g.alchemy.com/v2/demo",
    "https://base.gateway.tenderly.co",
  ],
  blockExplorerUrls: ["https://basescan.org"],
}

// Base mainnet configuration
export const BASE_MAINNET_NETWORK = {
  chainId: 8453,
  chainName: "Base",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: [
    "https://mainnet.base.org",
    "https://base-mainnet.g.alchemy.com/v2/demo",
    "https://base.gateway.tenderly.co",
  ],
  blockExplorerUrls: ["https://basescan.org"],
}

// Mobile detection
export const isMobile = (): boolean => {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// iOS detection
export const isIOS = (): boolean => {
  if (typeof window === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

// Android detection
export const isAndroid = (): boolean => {
  if (typeof window === "undefined") return false
  return /Android/.test(navigator.userAgent)
}

// Farcaster detection
export const isFarcaster = (): boolean => {
  if (typeof window === "undefined") return false
  return (
    window.location.hostname.includes("farcaster") ||
    window.navigator.userAgent.includes("Farcaster") ||
    window.parent !== window
  ) // Running in iframe (common for Farcaster frames)
}

// Check if we're in a mobile wallet browser
export const isInWalletBrowser = (): string | null => {
  if (typeof window === "undefined") return null

  const userAgent = navigator.userAgent.toLowerCase()

  if (userAgent.includes("metamask")) return "metamask"
  if (userAgent.includes("coinbasewallet") || userAgent.includes("coinbase")) return "coinbase"
  if (userAgent.includes("trust")) return "trust"
  if (userAgent.includes("rainbow")) return "rainbow"
  if (userAgent.includes("phantom")) return "phantom"

  return null
}

// Wallet connection interface
export interface WalletConnection {
  address: string
  chainId: number
  walletName: string
  balance?: string
}

// Format wallet address for display
export const formatAddress = (address: string): string => {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Get current page URL for deep linking
export const getCurrentPageUrl = (): string => {
  if (typeof window === "undefined") return ""
  return window.location.href
}

// Enhanced mobile wallet connection with platform-specific handling
export const connectMobileWallet = async (walletId: string): Promise<any> => {
  const wallet = WALLETS.find((w) => w.id === walletId)
  if (!wallet) throw new Error("Wallet not found")

  console.log(`🚀 Attempting mobile connection to ${walletId}`)

  // Check if we're already in the wallet's browser
  const inWalletBrowser = isInWalletBrowser()
  if (inWalletBrowser === walletId) {
    console.log(`✅ Already in ${walletId} browser, using direct connection`)
    return requestWalletConnection(walletId)
  }

  // Enhanced mobile detection with platform-specific handling
  if (isMobile()) {
    const platform = isIOS() ? 'ios' : isAndroid() ? 'android' : 'mobile'
    console.log(`📱 Platform detected: ${platform}`)

    // Strategy 1: Try direct wallet detection and connection
    if (walletId === "metamask") {
      return await connectMetaMaskMobile(platform)
    } else if (walletId === "coinbase") {
      return await connectCoinbaseMobile(platform)
    } else if (walletId === "rainbow") {
      return await connectRainbowMobile(platform)
    } else if (walletId === "trust") {
      return await connectTrustMobile(platform)
    } else if (walletId === "phantom") {
      return await connectPhantomMobile(platform)
    }

    // Strategy 2: Try WalletConnect with enhanced mobile handling
    try {
      console.log("📱 Attempting WalletConnect mobile connection...")
      
      // Import WalletConnect dynamically
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider')
      
      const provider = await EthereumProvider.init({
        projectId: 'c4f79cc821944d9680842e34466bfbd9',
        chains: [8453], // Base Mainnet
        showQrModal: true,
        qrModalOptions: {
          themeMode: 'dark',
          themeVariables: {
            '--wcm-z-index': '9999',
            '--wcm-background-color': '#1a1a1a',
            '--wcm-accent-color': '#ff6b35', // Pizza Party orange
            '--wcm-background-border-radius': '16px',
          },
          explorerRecommendedWalletIds: [
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
            '4622a2b2d6af1c738494851a64cb958218379dfe6ea44443ddf4bf4fd6f6bc71', // Coinbase Wallet
            '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffa3c5e3e0b4c0d1d88', // Rainbow
            '4622a2b2d6af1c738494851a64cb958218379dfe6ea44443ddf4bf4fd6f6bc71', // Trust Wallet
            '33f145daa2f8f45b4c0b4c0b4c0b4c0b4c0b4c0b4c0b4c0b4c0b4c0b4c0b4c', // Phantom
          ],
          explorerExcludedWalletIds: 'ALL',
          mobileWallets: ['metamask', 'coinbase', 'rainbow', 'trust', 'phantom'],
        },
        metadata: {
          name: 'Pizza Party',
          description: 'Decentralized gaming platform on Base',
          url: 'https://pizza-party.vmfcoin.com',
          icons: ['https://pizza-party.vmfcoin.com/icon.png'],
        },
      })

      // Connect using WalletConnect with enhanced error handling
      await provider.connect()
      
      const accounts = await provider.request({ method: 'eth_accounts' })
      const chainId = await provider.request({ method: 'eth_chainId' })
      
      if (accounts && accounts.length > 0) {
        console.log(`✅ WalletConnect mobile connection successful: ${accounts[0]}`)
        return {
          accounts,
          chainId,
          provider: provider,
          walletName: "WalletConnect"
        }
      }
    } catch (error: any) {
      console.log("❌ WalletConnect mobile connection failed:", error.message)
      
      // Enhanced fallback with platform-specific handling
      if (window.ethereum) {
        return await connectGenericWeb3Mobile(platform)
      }
    }

    // Strategy 3: Show wallet-specific instructions with platform info
    return await showWalletInstructions(walletId, platform)
  }

  // Fallback to desktop connection
  return requestWalletConnection(walletId)
}

// MetaMask mobile connection
const connectMetaMaskMobile = async (platform: string): Promise<any> => {
  console.log(`📱 Connecting to MetaMask mobile on ${platform}...`)
  
  // Check if MetaMask is available
  if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })
      
      if (accounts && accounts.length > 0) {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        })
        
        console.log(`✅ MetaMask mobile connection successful: ${accounts[0]}`)
        return {
          accounts,
          chainId,
          provider: window.ethereum,
          walletName: "MetaMask"
        }
      }
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error("MetaMask connection rejected. Please approve in your wallet.")
      }
      throw new Error(`MetaMask connection failed: ${error.message}`)
    }
  }
  
  // MetaMask not available, show instructions
  throw new Error("MetaMask not detected. Please install MetaMask or open in MetaMask browser.")
}

// Coinbase Wallet mobile connection
const connectCoinbaseMobile = async (platform: string): Promise<any> => {
  console.log(`📱 Connecting to Coinbase Wallet mobile on ${platform}...`)
  
  // Check if Coinbase Wallet is available
  if (typeof window.ethereum !== 'undefined' && window.ethereum.isCoinbaseWallet) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })
      
      if (accounts && accounts.length > 0) {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        })
        
        console.log(`✅ Coinbase Wallet mobile connection successful: ${accounts[0]}`)
        return {
          accounts,
          chainId,
          provider: window.ethereum,
          walletName: "Coinbase Wallet"
        }
      }
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error("Coinbase Wallet connection rejected. Please approve in your wallet.")
      }
      throw new Error(`Coinbase Wallet connection failed: ${error.message}`)
    }
  }
  
  // Coinbase Wallet not available, show instructions
  throw new Error("Coinbase Wallet not detected. Please install Coinbase Wallet or open in Coinbase browser.")
}

// Rainbow Wallet mobile connection
const connectRainbowMobile = async (platform: string): Promise<any> => {
  console.log(`📱 Connecting to Rainbow Wallet mobile on ${platform}...`)
  
  // Check if Rainbow Wallet is available
  if (typeof window.ethereum !== 'undefined' && window.ethereum.isRainbow) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })
      
      if (accounts && accounts.length > 0) {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        })
        
        console.log(`✅ Rainbow Wallet mobile connection successful: ${accounts[0]}`)
        return {
          accounts,
          chainId,
          provider: window.ethereum,
          walletName: "Rainbow Wallet"
        }
      }
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error("Rainbow Wallet connection rejected. Please approve in your wallet.")
      }
      throw new Error(`Rainbow Wallet connection failed: ${error.message}`)
    }
  }
  
  // Rainbow Wallet not available, show instructions
  throw new Error("Rainbow Wallet not detected. Please install Rainbow Wallet or open in Rainbow browser.")
}

// Trust Wallet mobile connection
const connectTrustMobile = async (platform: string): Promise<any> => {
  console.log(`📱 Connecting to Trust Wallet mobile on ${platform}...`)
  
  // Check if Trust Wallet is available
  if (typeof window.ethereum !== 'undefined' && window.ethereum.isTrust) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })
      
      if (accounts && accounts.length > 0) {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        })
        
        console.log(`✅ Trust Wallet mobile connection successful: ${accounts[0]}`)
        return {
          accounts,
          chainId,
          provider: window.ethereum,
          walletName: "Trust Wallet"
        }
      }
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error("Trust Wallet connection rejected. Please approve in your wallet.")
      }
      throw new Error(`Trust Wallet connection failed: ${error.message}`)
    }
  }
  
  // Trust Wallet not available, show instructions
  throw new Error("Trust Wallet not detected. Please install Trust Wallet or open in Trust browser.")
}

// Phantom Wallet mobile connection
const connectPhantomMobile = async (platform: string): Promise<any> => {
  console.log(`📱 Connecting to Phantom mobile on ${platform}...`)
  
  // Check if Phantom is available
  if (typeof window.ethereum !== 'undefined' && window.ethereum.isPhantom) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })
      
      if (accounts && accounts.length > 0) {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        })
        
        console.log(`✅ Phantom mobile connection successful: ${accounts[0]}`)
        return {
          accounts,
          chainId,
          provider: window.ethereum,
          walletName: "Phantom"
        }
      }
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error("Phantom connection rejected. Please approve in your wallet.")
      }
      throw new Error(`Phantom connection failed: ${error.message}`)
    }
  }
  
  // Phantom not available, show instructions
  throw new Error("Phantom not detected. Please install Phantom or open in Phantom browser.")
}

// Generic Web3 provider connection
const connectGenericWeb3Mobile = async (platform: string): Promise<any> => {
  console.log(`📱 Connecting to generic Web3 provider on ${platform}...`)
  
  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    })
    
    if (accounts && accounts.length > 0) {
      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      })
      
      console.log(`✅ Generic Web3 mobile connection successful: ${accounts[0]}`)
      return {
        accounts,
        chainId,
        provider: window.ethereum,
        walletName: "Web3 Wallet"
      }
    }
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("Wallet connection rejected. Please approve in your wallet.")
    }
    throw new Error(`Wallet connection failed: ${error.message}`)
  }
  
  throw new Error("No Web3 provider detected.")
}

// Show wallet-specific instructions
const showWalletInstructions = async (walletId: string, platform: string): Promise<any> => {
  const wallet = WALLETS.find((w) => w.id === walletId)
  if (!wallet) throw new Error("Wallet not found")
  
  console.log(`📱 Showing instructions for ${walletId} on ${platform}`)
  
  // Create a simple instruction modal
  const instructions = {
    metamask: "Please install MetaMask or open this site in MetaMask browser",
    coinbase: "Please install Coinbase Wallet or open this site in Coinbase browser",
    rainbow: "Please install Rainbow Wallet or open this site in Rainbow browser",
    trust: "Please install Trust Wallet or open this site in Trust browser"
  }
  
  throw new Error(instructions[walletId as keyof typeof instructions] || "Please install a compatible wallet.")
}

// Enhanced wallet provider detection for mobile
export const getWalletProvider = (walletId: string): any => {
  if (typeof window === "undefined") return null

  // Check if we're in a specific wallet's browser
  const inWalletBrowser = isInWalletBrowser()
  if (inWalletBrowser && inWalletBrowser === walletId) {
    console.log(`✅ Detected ${walletId} browser environment`)
    return window.ethereum
  }

  // For mobile, be more permissive with provider detection
  if (isMobile() && window.ethereum) {
    console.log("📱 Using available mobile provider")
    return window.ethereum
  }

  // Desktop logic (existing)
  const allProviders = getAllProviders()

  switch (walletId) {
    case "metamask":
      return (
        allProviders.find((provider) => provider.isMetaMask && !provider.isCoinbaseWallet && !provider.isCoinbase) ||
        window.ethereum
      )
    case "coinbase":
      return allProviders.find((provider) => provider.isCoinbaseWallet || provider.isCoinbase) || window.ethereum
    case "rainbow":
      return allProviders.find((provider) => provider.isRainbow) || window.ethereum
    default:
      return window.ethereum
  }
}

// Get all available providers
export const getAllProviders = (): any[] => {
  if (typeof window === "undefined") return []

  const providers: any[] = []

  // Check if there are multiple providers
  if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
    providers.push(...window.ethereum.providers)
  } else if (window.ethereum) {
    providers.push(window.ethereum)
  }

  return providers
}

// Enhanced wallet connection request with better mobile support
export const requestWalletConnection = async (walletId: string): Promise<any> => {
  console.log(`🚀 Requesting connection from ${walletId}`)

  // For mobile, use simplified connection logic
  if (isMobile()) {
    if (!window.ethereum) {
      // Provide specific instructions for mobile users
      const wallet = WALLETS.find((w) => w.id === walletId)
      const walletName = wallet?.name || "wallet"

      throw new Error(`No Web3 wallet detected. Please:

1. Open your ${walletName} app
2. Go to the browser/dApp section  
3. Visit this page from within the app
4. Try connecting again

Make sure you have ${walletName} installed from your app store.`)
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from wallet")
      }

      // Get chain ID
      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      })

      console.log(`✅ Mobile connection successful: ${accounts[0]} on chain ${chainId}`)

      return {
        accounts,
        chainId,
        provider: window.ethereum,
      }
    } catch (error: any) {
      console.error(`❌ Mobile connection failed:`, error)

      // Provide more helpful error messages for mobile
      if (error.code === 4001) {
        throw new Error("Connection rejected. Please approve the connection in your wallet app.")
      } else if (error.code === -32002) {
        throw new Error("Connection request pending. Please check your wallet app and approve the connection.")
      } else {
        const wallet = WALLETS.find((w) => w.id === walletId)
        const walletName = wallet?.name || "wallet"

        throw new Error(`Connection failed. Please make sure you're browsing from within your ${walletName} app.`)
      }
    }
  }

  // Desktop logic - connect to specific wallet
  const provider = getWalletProvider(walletId)

  if (!provider) {
    throw new Error(`${getWalletDisplayName(walletId)} wallet not found. Please install the ${getWalletDisplayName(walletId)} extension or app.`)
  }

  try {
    // Request account access from the specific wallet
    const accounts = await provider.request({
      method: "eth_requestAccounts",
    })

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts returned from wallet")
    }

    // Ensure we're on Base network for desktop
    await ensureBaseNetwork(provider)

    const chainId = await provider.request({
      method: "eth_chainId",
    })

    console.log(`✅ Desktop connection to ${walletId} successful: ${accounts[0]} on chain ${chainId}`)

    return {
      accounts,
      chainId,
      provider,
    }
  } catch (error: any) {
    console.error(`❌ ${walletId} connection failed:`, error)
    
    // Provide specific error messages for different wallet types
    const wallet = WALLETS.find((w) => w.id === walletId)
    const walletName = wallet?.name || walletId
    
    if (error.code === 4001) {
      throw new Error(`Connection to ${walletName} was rejected. Please try again and approve the connection.`)
    } else if (error.code === -32002) {
      throw new Error(`Connection request to ${walletName} is pending. Please check your wallet and approve the connection.`)
    } else if (error.code === 4902) {
      throw new Error(`Base network not found in ${walletName}. Please add Base network to your wallet.`)
    } else {
      throw new Error(`Failed to connect to ${walletName}: ${error.message || "Unknown error"}`)
    }
  }
}

// Open wallet installation page
export const openWalletInstallPage = (walletId: string): void => {
  const wallet = WALLETS.find((w) => w.id === walletId)
  if (!wallet?.downloadUrl) return

  if (isMobile()) {
    // On mobile, try to open app store
    if (isIOS()) {
      // Try App Store first, fallback to direct link
      const appStoreUrl = `https://apps.apple.com/search?term=${encodeURIComponent(wallet.name)}`
      window.open(appStoreUrl, "_blank")
    } else if (isAndroid()) {
      // Try Play Store first, fallback to direct link
      const playStoreUrl = `https://play.google.com/store/search?q=${encodeURIComponent(wallet.name)}&c=apps`
      window.open(playStoreUrl, "_blank")
    } else {
      window.open(wallet.downloadUrl, "_blank")
    }
  } else {
    window.open(wallet.downloadUrl, "_blank")
  }
}

// Check if wallet is installed (enhanced for mobile)
export const isWalletInstalled = (walletId: string): boolean => {
  // On mobile, we can't reliably detect if apps are installed
  // Always return true to allow connection attempts
  if (isMobile()) {
    return true
  }

  // Desktop detection (unchanged)
  const provider = getWalletProvider(walletId)
  return !!provider
}

// Get wallet display name
export const getWalletDisplayName = (walletId: string): string => {
  const wallet = WALLETS.find((w) => w.id === walletId)
  return wallet?.name || walletId
}

// Mobile-specific utilities
export const handleMobileViewport = (): void => {
  if (typeof window === "undefined") return

  // Prevent zoom on input focus (iOS Safari)
  const viewport = document.querySelector('meta[name="viewport"]')
  if (viewport) {
    viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no")
  }

  // Handle iOS Safari bottom bar
  if (isIOS()) {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }

    setVH()
    window.addEventListener("resize", setVH)
    window.addEventListener("orientationchange", setVH)
  }
}

// Initialize mobile optimizations
export const initMobileOptimizations = (): void => {
  if (typeof window === "undefined") return

  handleMobileViewport()

  // Disable pull-to-refresh on mobile
  document.body.style.overscrollBehavior = "none"

  // Prevent horizontal scroll
  document.body.style.overflowX = "hidden"

  // Add mobile-specific classes
  if (isMobile()) {
    document.body.classList.add("mobile")
  }
  if (isIOS()) {
    document.body.classList.add("ios")
  }
  if (isAndroid()) {
    document.body.classList.add("android")
  }
  if (isFarcaster()) {
    document.body.classList.add("farcaster")
  }
}

// Ensure Base network is added/switched (enhanced for mobile)
export const ensureBaseNetwork = async (provider?: any): Promise<void> => {
  const targetProvider = provider || window.ethereum
  if (typeof window === "undefined" || !targetProvider) return

  try {
    // Try to switch to Base network
    await targetProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${BASE_NETWORK.chainId.toString(16)}` }],
    })
    console.log("✅ Switched to Base network")
  } catch (switchError: any) {
    console.log("⚠️ Switch failed, trying to add Base network...")

    // If Base network is not added, add it
    if (switchError.code === 4902) {
      try {
        await targetProvider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${BASE_NETWORK.chainId.toString(16)}`,
              chainName: BASE_NETWORK.chainName,
              nativeCurrency: BASE_NETWORK.nativeCurrency,
              rpcUrls: BASE_NETWORK.rpcUrls,
              blockExplorerUrls: BASE_NETWORK.blockExplorerUrls,
            },
          ],
        })
        console.log("✅ Added Base network")
      } catch (addError) {
        console.error("❌ Failed to add Base network:", addError)
        throw new Error("Please add Base network to your wallet manually")
      }
    } else {
      console.error("❌ Failed to switch to Base network:", switchError)
      // Don't throw error for mobile wallets, they might handle network switching differently
      if (!isMobile()) {
        throw new Error("Please switch to Base network in your wallet")
      }
    }
  }
}

// Ensure Base mainnet is added/switched (for production)
export const ensureBaseMainnetNetwork = async (provider?: any): Promise<void> => {
  const targetProvider = provider || window.ethereum
  if (typeof window === "undefined" || !targetProvider) return

  try {
    // Try to switch to Base mainnet
    await targetProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${BASE_MAINNET_NETWORK.chainId.toString(16)}` }],
    })
    console.log("✅ Switched to Base mainnet")
  } catch (switchError: any) {
    console.log("⚠️ Switch failed, trying to add Base mainnet...")

    // If Base mainnet is not added, add it
    if (switchError.code === 4902) {
      try {
        await targetProvider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${BASE_MAINNET_NETWORK.chainId.toString(16)}`,
              chainName: BASE_MAINNET_NETWORK.chainName,
              nativeCurrency: BASE_MAINNET_NETWORK.nativeCurrency,
              rpcUrls: BASE_MAINNET_NETWORK.rpcUrls,
              blockExplorerUrls: BASE_MAINNET_NETWORK.blockExplorerUrls,
            },
          ],
        })
        console.log("✅ Added Base mainnet")
      } catch (addError) {
        console.error("❌ Failed to add Base mainnet:", addError)
        throw new Error("Please add Base mainnet to your wallet manually")
      }
    } else {
      console.error("❌ Failed to switch to Base mainnet:", switchError)
      // Don't throw error for mobile wallets, they might handle network switching differently
      if (!isMobile()) {
        throw new Error("Please switch to Base mainnet in your wallet")
      }
    }
  }
}

// Helper function to generate a symmetric key for WalletConnect
function generateSymKey(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}
