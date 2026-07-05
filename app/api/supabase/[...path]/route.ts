import { NextRequest, NextResponse } from 'next/server'

// Upstream Supabase origin. Prefer an env var so staging/other projects can be
// pointed elsewhere; fall back to the production ref for backward compatibility.
const SUPABASE_ORIGIN =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://eitfkatezsmeqhiqioaj.supabase.co'

export const dynamic = 'force-dynamic'

async function proxy(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const search = new URL(req.url).search
  const target = `${SUPABASE_ORIGIN}/${params.path.join('/')}${search}`

  const headers = new Headers(req.headers)
  headers.delete('host')
  // Remove accept-encoding so upstream returns uncompressed body,
  // avoiding double-decompress when we stream response.body through NextResponse
  headers.delete('accept-encoding')

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    // @ts-expect-error duplex is required for streaming request bodies in Node 18+
    duplex: 'half',
  })

  const resHeaders = new Headers(upstream.headers)
  resHeaders.delete('content-encoding')
  resHeaders.delete('transfer-encoding')

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
