"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useWallet } from "@/hooks/useWallet"
import { CONTRACT_ADDRESSES } from "@/lib/contract-config"
import { createPizzaPartyContract } from "@/lib/contract-interactions"

export default function TestContractsPage() {
  const [testResults, setTestResults] = useState<any>({})
  const [isTesting, setIsTesting] = useState(false)
  const { connection, isConnected } = useWallet()

  const testContracts = async () => {
    if (!isConnected || !connection) {
      alert("Please connect your wallet first")
      return
    }

    setIsTesting(true)
    const results: any = {}

    try {
      const contract = createPizzaPartyContract(connection)

      // Test 1: Get jackpots
      try {
        const jackpots = await contract.getJackpots()
        results.jackpots = { success: true, data: jackpots }
      } catch (error) {
        results.jackpots = { success: false, error: error.message }
      }

      // Test 2: Get entry fee
      try {
        const entryFee = await contract.getCurrentEntryFee()
        results.entryFee = { success: true, data: entryFee }
      } catch (error) {
        results.entryFee = { success: false, error: error.message }
      }

      // Test 3: Get VMF price
      try {
        const vmfPrice = await contract.getCurrentVMFPrice()
        results.vmfPrice = { success: true, data: vmfPrice }
      } catch (error) {
        results.vmfPrice = { success: false, error: error.message }
      }

      // Test 4: Get player data
      try {
        const accounts = await connection.request({ method: 'eth_requestAccounts' })
        const playerData = await contract.getPlayerData(accounts[0])
        results.playerData = { success: true, data: playerData }
      } catch (error) {
        results.playerData = { success: false, error: error.message }
      }

    } catch (error) {
      console.error('Test failed:', error)
    }

    setTestResults(results)
    setIsTesting(false)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-800 mb-4">🍕 Beta Testing Page</h1>
          <p className="text-lg text-gray-600">
            Testing Pizza Party contracts on Base Mainnet
          </p>
          <Badge variant="secondary" className="mt-2">
            🚀 Production Mode - Base Mainnet
          </Badge>
        </div>

        <div className="grid gap-6 mb-8">
          {/* Contract Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📋 Deployed Contract Addresses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">PizzaParty:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {CONTRACT_ADDRESSES.PIZZA_PARTY}
                    </code>
                    <a href={`https://basescan.org/address/${CONTRACT_ADDRESSES.PIZZA_PARTY}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">FreeRandomness:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {CONTRACT_ADDRESSES.FREE_RANDOMNESS}
                    </code>
                    <a href={`https://basescan.org/address/${CONTRACT_ADDRESSES.FREE_RANDOMNESS}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">FreePriceOracle:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {CONTRACT_ADDRESSES.FREE_PRICE_ORACLE}
                    </code>
                    <a href={`https://basescan.org/address/${CONTRACT_ADDRESSES.FREE_PRICE_ORACLE}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Button */}
          <Card>
            <CardHeader>
              <CardTitle>🧪 Test Contract Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={testContracts} 
                disabled={!isConnected || isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing Contracts...
                  </>
                ) : (
                  'Test Contract Functions'
                )}
              </Button>
              {!isConnected && (
                <p className="text-sm text-gray-500 mt-2">
                  Please connect your wallet to test contracts
                </p>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>📊 Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(testResults).map(([testName, result]: [string, any]) => (
                    <div key={testName} className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium capitalize">
                          {testName.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                      {result.success ? (
                        <div className="text-sm text-gray-600">
                          <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>📖 Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>
                <strong>1. Connect Wallet:</strong> Make sure your wallet is connected to Base Sepolia testnet
              </p>
              <p>
                <strong>2. Get Test ETH:</strong> Use Chainlink or QuickNode faucet to get Base Sepolia ETH
              </p>
              <p>
                <strong>3. Test Functions:</strong> Click the test button to verify contract interactions
              </p>
              <p>
                <strong>4. Check Results:</strong> Review the test results to ensure everything works
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 