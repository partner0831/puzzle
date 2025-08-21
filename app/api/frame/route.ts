import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { buttonIndex } = body

    // Handle different button actions
    switch (buttonIndex) {
      case 1: // Play Daily Game
        return NextResponse.json({
          frames: {
            version: "vNext",
            image: "https://pizzaparty.app/images/pizza-game.png",
            buttons: [
              { label: "Enter Game (1 VMF)" },
              { label: "View Jackpot" },
              { label: "Back to Home" }
            ],
            postUrl: "https://pizzaparty.app/api/frame/game"
          }
        })

      case 2: // View Jackpot
        return NextResponse.json({
          frames: {
            version: "vNext",
            image: "https://pizzaparty.app/images/jackpot-display.png",
            buttons: [
              { label: "Play Daily Game" },
              { label: "Claim Toppings" },
              { label: "Back to Home" }
            ],
            postUrl: "https://pizzaparty.app/api/frame/jackpot"
          }
        })

      case 3: // Connect Wallet
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

      case 4: // Share Pizza Party
        return NextResponse.json({
          frames: {
            version: "vNext",
            image: "https://pizzaparty.app/images/share-pizza.png",
            buttons: [
              { label: "Share on Farcaster" },
              { label: "Copy Link" },
              { label: "Back to Home" }
            ],
            postUrl: "https://pizzaparty.app/api/frame/share"
          }
        })

      default:
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
    }
  } catch (error) {
    console.error('Frame API error:', error)
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
  }
}

export async function GET() {
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
} 