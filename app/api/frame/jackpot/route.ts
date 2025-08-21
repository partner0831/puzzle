import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { buttonIndex } = body

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

      case 2: // Claim Toppings
        return NextResponse.json({
          frames: {
            version: "vNext",
            image: "https://pizzaparty.app/images/toppings-claim.png",
            buttons: [
              { label: "Claim Toppings" },
              { label: "View Jackpot" },
              { label: "Back to Home" }
            ],
            postUrl: "https://pizzaparty.app/api/frame/jackpot/claim"
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
            image: "https://pizzaparty.app/images/jackpot-display.png",
            buttons: [
              { label: "Play Daily Game" },
              { label: "Claim Toppings" },
              { label: "Back to Home" }
            ],
            postUrl: "https://pizzaparty.app/api/frame/jackpot"
          }
        })
    }
  } catch (error) {
    console.error('Jackpot Frame API error:', error)
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
  }
} 