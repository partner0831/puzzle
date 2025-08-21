'use client'

import { useEffect, useState } from 'react'

export default function TestFarcasterPage() {
  const [status, setStatus] = useState<string>('Testing...')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const testFarcaster = async () => {
      try {
        addLog('🚀 Starting comprehensive Farcaster test...')
        
        // Test 1: Check environment
        addLog('🌍 Testing environment detection...')
        const url = window.location.href
        addLog(`📍 Current URL: ${url}`)
        
        const isFarcaster = url.includes('farcaster') || url.includes('warpcast') || url.includes('miniapp')
        addLog(`🌍 Farcaster environment: ${isFarcaster ? 'Yes' : 'No'}`)

        // Test 2: Check all possible global objects
        addLog('🔍 Testing global objects...')
        
        // Check window.farcaster
        if (typeof window !== 'undefined' && (window as any).farcaster) {
          addLog('✅ window.farcaster exists')
          console.log('window.farcaster:', (window as any).farcaster)
        } else {
          addLog('❌ window.farcaster does not exist')
        }

        // Check window.sdk
        if (typeof window !== 'undefined' && (window as any).sdk) {
          addLog('✅ window.sdk exists')
          console.log('window.sdk:', (window as any).sdk)
        } else {
          addLog('❌ window.sdk does not exist')
        }

        // Check global sdk
        if (typeof sdk !== 'undefined') {
          addLog('✅ global sdk exists')
          console.log('global sdk:', sdk)
        } else {
          addLog('❌ global sdk does not exist')
        }

        // Test 3: Check all window properties
        addLog('🔍 Checking all window properties...')
        const windowProps = Object.getOwnPropertyNames(window)
        const farcasterProps = windowProps.filter(prop => 
          prop.toLowerCase().includes('farcaster') || 
          prop.toLowerCase().includes('sdk') ||
          prop.toLowerCase().includes('miniapp')
        )
        addLog(`🔍 Found ${farcasterProps.length} relevant window properties: ${farcasterProps.join(', ')}`)

        // Test 4: Try to find any ready function
        addLog('🎯 Looking for ready function...')
        
        // Check window.farcaster.sdk.actions.ready
        if ((window as any).farcaster?.sdk?.actions?.ready) {
          addLog('✅ Found window.farcaster.sdk.actions.ready')
          try {
            await (window as any).farcaster.sdk.actions.ready()
            addLog('✅ Successfully called window.farcaster.sdk.actions.ready()')
          } catch (error) {
            addLog(`❌ Error calling window.farcaster.sdk.actions.ready(): ${error}`)
          }
        } else {
          addLog('❌ window.farcaster.sdk.actions.ready not found')
        }

        // Check window.sdk.actions.ready
        if ((window as any).sdk?.actions?.ready) {
          addLog('✅ Found window.sdk.actions.ready')
          try {
            await (window as any).sdk.actions.ready()
            addLog('✅ Successfully called window.sdk.actions.ready()')
          } catch (error) {
            addLog(`❌ Error calling window.sdk.actions.ready(): ${error}`)
          }
        } else {
          addLog('❌ window.sdk.actions.ready not found')
        }

        // Check global sdk.actions.ready
        if (typeof sdk !== 'undefined' && sdk?.actions?.ready) {
          addLog('✅ Found global sdk.actions.ready')
          try {
            await sdk.actions.ready()
            addLog('✅ Successfully called global sdk.actions.ready()')
          } catch (error) {
            addLog(`❌ Error calling global sdk.actions.ready(): ${error}`)
          }
        } else {
          addLog('❌ global sdk.actions.ready not found')
        }

        // Test 5: Try dynamic import
        addLog('📦 Testing dynamic import...')
        try {
          const { sdk: importedSdk } = await import('@farcaster/miniapp-sdk')
          addLog('✅ Successfully imported @farcaster/miniapp-sdk')
          
          if (importedSdk?.actions?.ready) {
            addLog('✅ Found imported sdk.actions.ready')
            try {
              await importedSdk.actions.ready()
              addLog('✅ Successfully called imported sdk.actions.ready()')
            } catch (error) {
              addLog(`❌ Error calling imported sdk.actions.ready(): ${error}`)
            }
          } else {
            addLog('❌ imported sdk.actions.ready not found')
          }
        } catch (error) {
          addLog(`❌ Failed to import @farcaster/miniapp-sdk: ${error}`)
        }

        // Test 6: Check if we're in an iframe
        addLog('🖼️ Checking iframe status...')
        if (window.self !== window.top) {
          addLog('✅ Running in iframe')
        } else {
          addLog('❌ Not running in iframe')
        }

        // Test 7: Check user agent
        addLog('📱 Checking user agent...')
        const userAgent = navigator.userAgent
        addLog(`📱 User Agent: ${userAgent}`)
        
        if (userAgent.includes('Farcaster') || userAgent.includes('Warpcast')) {
          addLog('✅ User agent indicates Farcaster environment')
        } else {
          addLog('❌ User agent does not indicate Farcaster environment')
        }

        setStatus('✅ Test completed!')

      } catch (error) {
        addLog(`❌ Test failed: ${error}`)
        setStatus('❌ Test failed')
      }
    }

    testFarcaster()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-red-800 mb-6 text-center">
            🍕 Comprehensive Farcaster Test
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
              <li>• Checks environment detection</li>
              <li>• Tests all possible global objects (window.farcaster, window.sdk, global sdk)</li>
              <li>• Lists all window properties containing 'farcaster', 'sdk', or 'miniapp'</li>
              <li>• Tries to find and call ready() function from multiple sources</li>
              <li>• Tests dynamic import of @farcaster/miniapp-sdk</li>
              <li>• Checks iframe status and user agent</li>
              <li>• Provides comprehensive logging for debugging</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
