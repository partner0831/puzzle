import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { buttonIndex } = body

    switch (buttonIndex) {
      case 1: // MetaMask
        return NextResponse.json({
          frames: {
            version: "vNext",
            image: "https://pizzaparty.app/images/metamask-connect.png",
            buttons: [
              { label: "Connect MetaMask" },
              { label: "Try Coinbase" },
              { label: "Back to Home" }
            ],
            postUrl: "https://pizzaparty.app/api/frame/wallet/metamask"
          }
        })

      case 2: // Coinbase Wallet
        return NextResponse.json({
          frames: {
            version: "vNext",
            image: "https://pizzaparty.app/images/coinbase-connect.png",
            buttons: [
              { label: "Connect Coinbase" },
              { label: "Try MetaMask" },
              { label: "Back to Home" }
            ],
            postUrl: "https://pizzaparty.app/api/frame/wallet/coinbase"
          }
        })

      case 3: // Back to Home
        return NextResponse.json({
          frames: {
            version: "vNext",
            image: "https://pizzaparty.app/images/pizza-transparent.png",
            buttons: [
              { label: "Play Daily Game" },
              { label: "View Jackpot" },
              { label: "Connect Wallet" },
              { label: "Share Pizza Party" }
            ],
            postUrl: "https://pizzaparty.app/api/frame"
          }
        })

      default:
        return NextResponse.json({
          frames: {
            version: "vNext",
            image: "https://pizzaparty.app/images/wallet-connect.png",
            buttons: [
              { label: "MetaMask" },
              { label: "Coinbase Wallet" },
              { label: "Back to Home" }
            ],
            postUrl: "https://pizzaparty.app/api/frame/wallet"
          }
        })
    }
  } catch (error) {
    console.error('Wallet Frame API error:', error)
    return NextResponse.json({
      frames: {
        version: "vNext",
        image: "https://pizzaparty.app/images/wallet-connect.png",
        buttons: [
          { label: "MetaMask" },
          { label: "Coinbase Wallet" },
          { label: "Back to Home" }
        ],
        postUrl: "https://pizzaparty.app/api/frame/wallet"
      }
    })
  }
} 