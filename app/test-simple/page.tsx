'use client'

import { useEffect, useState } from 'react'

export default function TestSimplePage() {
  const [status, setStatus] = useState<string>('Testing...')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const testEnvironment = async () => {
      try {
        addLog('🚀 Starting environment test...')
        
        // Test 1: Check if we're in a browser
        addLog('🌐 Testing browser environment...')
        if (typeof window !== 'undefined') {
          addLog('✅ Browser environment detected')
        } else {
          addLog('❌ Not in browser environment')
          setStatus('❌ Not in browser')
          return
        }

        // Test 2: Check URL for Farcaster indicators
        addLog('🔗 Testing URL for Farcaster indicators...')
        const url = window.location.href
        addLog(`📍 Current URL: ${url}`)
        
        const isFarcaster = url.includes('farcaster') || url.includes('warpcast') || url.includes('miniapp')
        addLog(`🌍 Farcaster environment: ${isFarcaster ? 'Yes' : 'No'}`)

        // Test 3: Check if global Farcaster SDK is available
        addLog('🔧 Testing for global Farcaster SDK...')
        if (typeof window !== 'undefined' && (window as any).farcaster) {
          addLog('✅ Global Farcaster SDK found')
        } else {
          addLog('⚠️ Global Farcaster SDK not found')
        }

        // Test 4: Try to dynamically import the SDK
        addLog('📦 Testing dynamic SDK import...')
        try {
          const { sdk } = await import('@farcaster/miniapp-sdk')
          addLog('✅ SDK imported successfully')
          
          if (sdk && sdk.actions) {
            addLog('✅ sdk.actions exists')
            
            if (typeof sdk.actions.ready === 'function') {
              addLog('✅ sdk.actions.ready is a function')
              
              // Test 5: Try to call ready()
              addLog('🎯 Calling sdk.actions.ready()...')
              try {
                await sdk.actions.ready()
                addLog('✅ sdk.actions.ready() called successfully!')
                setStatus('✅ All tests passed!')
              } catch (error) {
                addLog(`❌ sdk.actions.ready() failed: ${error instanceof Error ? error.message : String(error)}`)
                setStatus('❌ ready() call failed')
              }
            } else {
              addLog('❌ sdk.actions.ready is not a function')
              setStatus('❌ ready() not a function')
            }
          } else {
            addLog('❌ sdk.actions does not exist')
            setStatus('❌ sdk.actions not found')
          }
        } catch (error) {
          addLog(`❌ SDK import failed: ${error instanceof Error ? error.message : String(error)}`)
          setStatus('❌ SDK import failed')
        }

      } catch (error) {
        addLog(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`)
        setStatus('❌ Test failed')
      }
    }

    testEnvironment()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-red-800 mb-6 text-center">
            🍕 Simple Environment Test
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
              <li>• Checks browser environment</li>
              <li>• Detects Farcaster environment from URL</li>
              <li>• Looks for global Farcaster SDK</li>
              <li>• Dynamically imports the SDK</li>
              <li>• Tests sdk.actions.ready() function</li>
              <li>• Logs all steps for debugging</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
