import { createHash, randomBytes, randomInt } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
export const newSecret = () => randomBytes(32).toString('base64url')
// No 0/O/1/I ambiguity is needed for digits-only codes; 6 digits, entered by a parent on a phone.
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')
export const CODE_TTL_MS = 15 * 60 * 1000

/** Resolve an ACTIVE device from its secret. Returns null for unknown/pending/revoked. */
export async function deviceFromSecret(secret: string | null) {
  if (!secret || secret.length < 20) return null
  const admin = createAdminClient()
  const { data } = await admin.from('tv_devices')
    .select('id,family_id,status').eq('secret_hash', sha256(secret)).maybeSingle()
  return { admin, device: data as { id: string; family_id: string | null; status: string } | null }
}
