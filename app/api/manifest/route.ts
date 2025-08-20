import { NextResponse } from "next/server"

export async function GET() {
  const manifest = {
    accountAssociation: {
      header:
        "eyJmaWQiOjEyMzQ1LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4MTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3OCJ9",
      payload: "eyJkb21haW4iOiJ2MC1mYXJjYXN0ZXItcHJldmlldy1pc3N1ZS52ZXJjZWwuYXBwIn0",
      signature: "MHg5ODc2NTQzMjEwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVm",
    },
    frame: {
      name: "Pizza Party Game",
      version: "1.0.0",
      iconUrl: `${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/pizza-party-background.png`,
      splashImageUrl: `${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/pizza-party-background.png`,
      splashBackgroundColor: "#1a1a2e",
      homeUrl: process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000",
    },
    metadata: {
      name: "Pizza Party Game",
      description:
        "Join the ultimate pizza party! Collect ingredients, build your perfect pizza, and compete with friends in this delicious blockchain game.",
      image: `${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/pizza-party-background.png`,
      url: process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000",
    },
  }

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
