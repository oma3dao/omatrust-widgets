import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "OMATrust Review Widget",
  description: "Hosted OMATrust review widget builder and embed application.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
