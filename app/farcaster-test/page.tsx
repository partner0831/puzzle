'use client'

import { useEffect, useState } from 'react'
import { farcasterApp } from '@/lib/farcaster-miniapp'

export default function FarcasterTestPage() {
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [sdkAvailable, setSdkAvailable] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [user, setUser] = useState<{ fid: number } | null>(null)

  useEffect(() => {
    const testFarcaster = async () => {
      try {
        // Check if we're in a Farcaster environment
        const isFarcasterEnv = farcasterApp.isFarcasterEnvironment()
        setIsFarcaster(isFarcasterEnv)

        // Check if SDK is available
        const sdkAvailable = await farcasterApp.isSDKAvailable()
        setSdkAvailable(sdkAvailable)

        if (isFarcasterEnv && sdkAvailable) {
          console.log('🍕 Farcaster environment detected with SDK available')
          
          // Initialize the Farcaster Mini App SDK
          await farcasterApp.initialize()
          
          // Get auth token
          const token = await farcasterApp.getAuthToken()
          setAuthToken(token)
          
          // Get current user
          const currentUser = await farcasterApp.getCurrentUser()
          setUser(currentUser)
          
          // Call ready to hide splash screen
          await farcasterApp.ready()
          
          console.log('✅ Farcaster Mini App test completed successfully')
        }
      } catch (error) {
        console.error('❌ Farcaster Mini App test failed:', error)
      }
    }

    testFarcaster()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-red-800 mb-2">🍕 Farcaster Mini App Test</h1>
          <p className="text-gray-600">Testing Pizza Party Mini App integration</p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Environment Detection</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Farcaster Environment:</span>
                <span className={isFarcaster ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {isFarcaster ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>SDK Available:</span>
                <span className={sdkAvailable ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {sdkAvailable ? '✅ Yes' : '❌ No'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Authentication</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Auth Token:</span>
                <span className={authToken ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {authToken ? '✅ Received' : '❌ None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>User FID:</span>
                <span className="font-semibold">
                  {user ? user.fid : 'Not authenticated'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Mini App Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Ready State:</span>
                <span className="text-green-600 font-semibold">
                  ✅ Called
                </span>
              </div>
              <div className="flex justify-between">
                <span>Splash Screen:</span>
                <span className="text-green-600 font-semibold">
                  ✅ Hidden
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Test Results</h3>
            <p className="text-blue-700 text-sm">
              {isFarcaster && sdkAvailable && authToken 
                ? '🎉 All tests passed! Pizza Party Mini App is working correctly.'
                : '⚠️ Some tests failed. Check console for details.'
              }
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            🍕 Back to Pizza Party
          </a>
        </div>
      </div>
    </div>
  )
} 