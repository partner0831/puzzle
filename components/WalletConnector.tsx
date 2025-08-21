'use client'

import { useConnect, useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState, useEffect } from 'react'
import { formatAddress } from '@/lib/wallet-config'

export default function WalletConnector() {
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile devices
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent))
  }, [])

  if (!isConnected) {
    return (
      <div className="wallet-connector">
        <ConnectButton 
          chainStatus="icon"
          showBalance={false}
          accountStatus={{
            smallScreen: 'avatar',
            largeScreen: 'full',
          }}
        />
        {error && (
          <p className="error-message">
            {error.message.includes('User rejected')
              ? 'Connection cancelled'
              : 'Failed to connect wallet. Please try again.'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
        ✅ Connected {formatAddress(address || '')}
      </div>
      <button
        onClick={() => disconnect()}
        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors"
      >
        Disconnect
      </button>
    </div>
  )
} 