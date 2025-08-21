'use client'

import { useEffect, useState } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

export default function TestSDKPage() {
  const [status, setStatus] = useState<string>('Testing...')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const testSDK = async () => {
      try {
        addLog('🚀 Starting Farcaster SDK test...')
        
        // Test 1: Check if SDK is imported
        addLog('📦 Testing SDK import...')
        if (typeof sdk !== 'undefined') {
          addLog('✅ SDK import successful')
        } else {
          addLog('❌ SDK import failed')
          setStatus('❌ SDK import failed')
          return
        }

        // Test 2: Check if sdk.actions exists
        addLog('🔧 Testing sdk.actions...')
        if (sdk && sdk.actions) {
          addLog('✅ sdk.actions exists')
        } else {
          addLog('❌ sdk.actions does not exist')
          setStatus('❌ sdk.actions not found')
          return
        }

        // Test 3: Check if sdk.actions.ready exists
        addLog('🎯 Testing sdk.actions.ready...')
        if (typeof sdk.actions.ready === 'function') {
          addLog('✅ sdk.actions.ready is a function')
        } else {
          addLog('❌ sdk.actions.ready is not a function')
          setStatus('❌ sdk.actions.ready not found')
          return
        }

        // Test 4: Try to call ready()
        addLog('🎯 Calling sdk.actions.ready()...')
        try {
          await sdk.actions.ready()
          addLog('✅ sdk.actions.ready() called successfully!')
          setStatus('✅ SDK test completed successfully!')
        } catch (error) {
          addLog(`❌ sdk.actions.ready() failed: ${error instanceof Error ? error.message : String(error)}`)
          setStatus('❌ sdk.actions.ready() failed')
        }

      } catch (error) {
        addLog(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`)
        setStatus('❌ Test failed')
      }
    }

    testSDK()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-red-800 mb-6 text-center">
            🍕 Farcaster SDK Test
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
              <li>• Checks if the Farcaster SDK is properly imported</li>
              <li>• Verifies sdk.actions exists</li>
              <li>• Confirms sdk.actions.ready is a function</li>
              <li>• Attempts to call sdk.actions.ready()</li>
              <li>• Logs all steps for debugging</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
