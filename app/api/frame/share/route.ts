import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { buttonIndex } = body

    switch (buttonIndex) {
      case 1: // Share on Farcaster
        return NextResponse.json({
          frames: {
            version: "vNext",
            image: "https://pizzaparty.app/images/share-farcaster.png",
            buttons: [
              { label: "Cast to Farcaster" },
              { label: "Copy Link" },
              { label: "Back to Home" }
            ],
            postUrl: "https://pizzaparty.app/api/frame/share/farcaster"
          }
        })

      case 2: // Copy Link
        return NextResponse.json({
          frames: {
            version: "vNext",
            image: "https://pizzaparty.app/images/link-copied.png",
            buttons: [
              { label: "Link Copied!" },
              { label: "Share on Farcaster" },
              { label: "Back to Home" }
            ],
            postUrl: "https://pizzaparty.app/api/frame/share/copy"
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
            image: "https://pizzaparty.app/images/share-pizza.png",
            buttons: [
              { label: "Share on Farcaster" },
              { label: "Copy Link" },
              { label: "Back to Home" }
            ],
            postUrl: "https://pizzaparty.app/api/frame/share"
          }
        })
    }
  } catch (error) {
    console.error('Share Frame API error:', error)
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
  }
} 