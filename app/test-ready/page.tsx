'use client'

import { useEffect, useState } from 'react'
import { farcasterApp } from '@/lib/farcaster-miniapp'

export default function TestReadyPage() {
  const [status, setStatus] = useState<string>('Initializing...')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const testReady = async () => {
      try {
        addLog('🚀 Starting Farcaster Mini App ready test...')
        
        // Initialize the app
        addLog('📱 Initializing Farcaster Mini App...')
        await farcasterApp.initialize()
        addLog('✅ Initialization complete')
        
        // Check environment
        const isFarcaster = farcasterApp.isFarcasterEnvironment()
        addLog(`🌍 Environment check: ${isFarcaster ? 'Farcaster' : 'Regular web'}`)
        
        // Check SDK availability
        const sdkAvailable = await farcasterApp.isSDKAvailable()
        addLog(`🔧 SDK Available: ${sdkAvailable ? 'Yes' : 'No'}`)
        
        // Call ready() - this is the critical part
        addLog('🎯 Calling sdk.actions.ready()...')
        await farcasterApp.ready()
        addLog('✅ sdk.actions.ready() called successfully!')
        
        setStatus('✅ Ready test completed successfully!')
        
      } catch (error) {
        addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
        setStatus('❌ Ready test failed')
      }
    }

    testReady()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-red-800 mb-6 text-center">
            🍕 Farcaster Mini App Ready Test
          </h1>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Status:</h2>
            <div className={`p-4 rounded-lg ${
              status.includes('✅') ? 'bg-green-100 text-green-800' : 
              status.includes('❌') ? 'bg-red-100 text-red-800' : 
              'bg-yellow-100 text-yellow-800'
            }`}>
              {status}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Test Logs:</h2>
            <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="font-mono text-sm mb-1">
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-500">No logs yet...</div>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">What this test does:</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Initializes the Farcaster Mini App SDK</li>
              <li>• Checks if we're in a Farcaster environment</li>
              <li>• Verifies SDK availability</li>
              <li>• Calls sdk.actions.ready() to hide splash screen</li>
              <li>• Logs all steps for debugging</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
