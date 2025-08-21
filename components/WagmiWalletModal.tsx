"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useWagmiWallet } from '@/hooks/useWagmiWallet'
import { isMobile, isInWalletBrowser } from '@/lib/wagmi-config'
import { WALLETS } from '@/lib/wallet-config'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

interface WagmiWalletModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect?: (address: string) => void
}

export const WagmiWalletModal = ({ isOpen, onClose, onConnect }: WagmiWalletModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null)
  
  const {
    connectors,
    connectWallet,
    disconnectWallet,
    isConnecting,
    error,
    setError,
    isMobile: isMobileDevice,
    isInWalletBrowser: inWalletBrowser,
  } = useWagmiWallet()

  // Auto-close on successful connection
  useEffect(() => {
    if (isOpen && !isConnecting && !error) {
      onClose()
    }
  }, [isOpen, isConnecting, error, onClose])

  const handleConnect = async (connectorId: string) => {
    setIsProcessing(true)
    setSelectedConnector(connectorId)
    setError(null)

    try {
      const result = await connectWallet(connectorId)
      if (result?.address && onConnect) {
        onConnect(result.address)
      }
    } catch (error: any) {
      console.error('Connection failed:', error)
      setError(error.message)
    } finally {
      setIsProcessing(false)
      setSelectedConnector(null)
    }
  }

  const handleDisconnect = () => {
    disconnectWallet()
    onClose()
  }

  const getConnectorDisplayName = (connectorId: string) => {
    const names: Record<string, string> = {
      metaMask: 'MetaMask',
      coinbaseWallet: 'Coinbase Wallet',
      walletConnect: 'Rainbow',
      injected: 'Trust Wallet',
    }
    return names[connectorId] || connectorId
  }

  const getWalletIcon = (connectorId: string) => {
    const walletMap: Record<string, string> = {
      metaMask: '/images/metamask-icon.svg',
      coinbaseWallet: '/images/Coinbase-icon.png',
      walletConnect: '/images/rainbow-wallet-icon.svg',
      injected: '/images/trust-wallet-icon.svg',
    }
    return walletMap[connectorId] || '/images/metamask-icon.svg'
  }

  const getConnectorColor = (connectorId: string) => {
    const colors: Record<string, string> = {
      metaMask: 'bg-orange-500 hover:bg-orange-600',
      coinbaseWallet: 'bg-blue-600 hover:bg-blue-700',
      walletConnect: 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600',
      injected: 'bg-blue-600 hover:bg-blue-700', // Trust Wallet uses the same blue
    }
    return colors[connectorId] || 'bg-gray-500 hover:bg-gray-600'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-white border-2 border-red-500 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl text-red-800 flex items-center gap-2 justify-center">
            🍕 Connect Your Wallet 🍕
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4">
          <p className="text-center text-gray-800">
            Choose your preferred wallet to connect to Pizza Party
          </p>
          
          <div className="space-y-3">
            {/* Show all 5 wallets */}
            {[
              { id: 'metaMask', name: 'MetaMask', icon: '/images/metamask-official.png', color: '!bg-orange-500 hover:!bg-orange-600' },
              { id: 'coinbaseWallet', name: 'Coinbase Wallet', icon: '/images/Coinbase-icon.png', color: '!bg-blue-600 hover:!bg-blue-700' },
              { id: 'trust', name: 'Trust Wallet', icon: '/images/trust-wallet-official.png', color: '!bg-[#000F7E] hover:!bg-[#000F7E]/90' },
              { id: 'rainbow', name: 'Rainbow', icon: '/images/rainbow-wallet-official.png', color: '!bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600' },
              { id: 'phantom', name: 'Phantom', icon: '/images/phantom-wallet-official.png', color: '!bg-purple-600 hover:!bg-purple-700' }
            ].map((wallet) => (
                <Button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={isProcessing && selectedConnector === wallet.id}
                className={`w-full font-bold py-6 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all flex items-center justify-between text-lg ${wallet.color}`}
              >
                <div className="flex items-center gap-4">
                  <Image
                    src={wallet.icon}
                    alt={`${wallet.name} icon`}
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
                  <span 
                    className="text-xl"
                    style={{ display: 'none' }}
                  >
                    {wallet.id === 'metaMask' ? '🦊' : 
                     wallet.id === 'coinbaseWallet' ? '🪙' : 
                     wallet.id === 'trust' ? '🛡️' :
                     wallet.id === 'rainbow' ? '🌈' : '👻'}
                  </span>
                  <span className="text-lg font-bold">{wallet.name}</span>
                </div>
                <div className="flex-shrink-0">
                  {isProcessing && selectedConnector === wallet.id ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  ) : (
                    <ExternalLink className="h-5 w-5 text-white" />
                  )}
                </div>
                </Button>
              ))}
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 rounded-lg p-3 text-center">
              <p className="text-red-800 font-bold">{error}</p>
            </div>
          )}

          {/* Why Connect Your Wallet Section */}
          <div className="bg-blue-50 p-4 rounded-xl border border-gray-300">
            <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2">
              🔒 Why Connect Your Wallet?
            </h3>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• Earn VMF tokens and toppings</li>
              <li>• Participate in daily & weekly jackpots</li>
              <li>• Track your game history</li>
              <li>• Secure and decentralized</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 