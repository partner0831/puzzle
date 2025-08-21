import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { 
  metaMaskWallet, 
  coinbaseWallet, 
  rainbowWallet, 
  trustWallet, 
  phantomWallet
} from '@rainbow-me/rainbowkit/wallets'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { pizzaPartyChain } from './chains'

// WalletConnect v2 configuration with proper project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c4f79cc821944d9680842e34466bfbd9'

// Create connectors with mobile-optimized wallet support
const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet,
      coinbaseWallet,
      rainbowWallet,
      trustWallet,
      phantomWallet,
    ],
  },
], {
  appName: 'Pizza Party',
  projectId,
})

// Create wagmi config with RainbowKit connectors
export const config = createConfig({
  chains: [pizzaPartyChain, base],
  connectors,
  ssr: true,
  transports: {
    [pizzaPartyChain.id]: http('https://mainnet.base.org'),
    [base.id]: http('https://mainnet.base.org'),
  },
})

// Mobile detection utilities
export const isMobile = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export const isInWalletBrowser = () => {
  if (typeof window === 'undefined') return false
  return window.ethereum?.isMetaMask || 
         window.ethereum?.isCoinbaseWallet || 
         window.ethereum?.isTrust || 
         window.ethereum?.isRainbow || 
         window.ethereum?.isPhantom
}

// Network switching utilities
export const switchToBase = async (switchChain: any) => {
  try {
    await switchChain({ chainId: base.id })
  } catch (error) {
    console.error('Failed to switch to Base:', error)
  }
}

// Persistent connection management
export const persistentConnection = {
  save: (data: any) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('pizza-party-connection', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save connection:', error)
    }
  },
  load: () => {
    if (typeof window === 'undefined') return null
    try {
      const data = localStorage.getItem('pizza-party-connection')
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to load connection:', error)
      return null
    }
  },
  clear: () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem('pizza-party-connection')
    } catch (error) {
      console.error('Failed to clear connection:', error)
    }
  }
}

// Token refresh management
export const refreshTokenManager = {
  set: (address: string, token: string) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`token_${address}`, token)
    } catch (error) {
      console.error('Failed to set token:', error)
    }
  },
  get: (address: string) => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(`token_${address}`)
    } catch (error) {
      console.error('Failed to get token:', error)
      return null
    }
  },
  clear: (address: string) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(`token_${address}`)
    } catch (error) {
      console.error('Failed to clear token:', error)
    }
  },
  refresh: async (address: string) => {
    if (typeof window === 'undefined') return null
    try {
      const token = localStorage.getItem(`token_${address}`)
      if (token) {
        const newToken = `session_${address}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem(`token_${address}`, newToken)
        return newToken
      }
      return null
    } catch (error) {
      console.error('Failed to refresh token:', error)
      return null
    }
  }
}

// Error handling utilities
export const handleConnectionError = (error: any): string => {
  if (error.code === 4001) {
    return 'Connection rejected by user'
  } else if (error.code === -32002) {
    return 'Connection request already pending'
  } else if (error.message?.includes('User rejected')) {
    return 'Connection rejected by user'
  } else if (error.message?.includes('No provider')) {
    return 'No wallet provider found'
  } else if (error.message?.includes('Unsupported chain')) {
    return 'Unsupported network. Please switch to Base Mainnet'
  } else {
    return error.message || 'Failed to connect wallet'
  }
} 