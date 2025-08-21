import { Metadata } from 'next'

// Frame metadata for Farcaster Mini App
export const metadata: Metadata = {
  title: 'Pizza Party - Farcaster Mini App',
  description: 'Play Pizza Party directly in Farcaster! Daily jackpots, weekly prizes, and VMF rewards.',
  openGraph: {
    title: 'Pizza Party - Farcaster Mini App',
    description: 'Play Pizza Party directly in Farcaster! Daily jackpots, weekly prizes, and VMF rewards.',
    images: ['/images/pizza-transparent.png'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://pizzaparty.app/images/pizza-transparent.png',
    'fc:frame:button:1': 'Play Daily Game',
    'fc:frame:button:2': 'View Jackpot',
    'fc:frame:button:3': 'Connect Wallet',
    'fc:frame:button:4': 'Share Pizza Party',
    'fc:frame:post_url': 'https://pizzaparty.app/api/frame',
  },
}

export default function FramePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <img 
            src="/images/pizza-transparent.png" 
            alt="Pizza Party" 
            className="w-24 h-24 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-red-800 mb-2">Pizza Party</h1>
          <p className="text-gray-600 mb-6">Play to win a slice of the pie! 🍕</p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-orange-100 rounded-xl p-4">
            <h3 className="font-bold text-orange-800 mb-2">Daily Jackpot</h3>
            <p className="text-2xl font-bold text-orange-600">1 VMF Entry</p>
          </div>
          
          <div className="bg-green-100 rounded-xl p-4">
            <h3 className="font-bold text-green-800 mb-2">Weekly Prize Pool</h3>
            <p className="text-2xl font-bold text-green-600">VMF Rewards</p>
          </div>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>Connect your wallet to start playing!</p>
          <p className="mt-2">Built on Base Network</p>
        </div>
      </div>
    </div>
  )
} 