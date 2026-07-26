import { readFileSync } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export function GET() {
  const filePath = path.join(process.cwd(), 'public', 'cur8-feature-guide.html')
  const html = readFileSync(filePath, 'utf-8')
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
