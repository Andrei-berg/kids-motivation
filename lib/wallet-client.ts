// lib/wallet-client.ts
// Client-side fetch wrappers for the parent-only wallet write routes. Reads stay
// on the existing repo functions (RLS still allows SELECT); only mutations route
// through the server so they keep working after the wallet-table RLS lock.

async function post(url: string, body: unknown, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function addRewardApi(reward: Record<string, unknown>) {
  const { reward: created } = await post('/api/wallet/rewards', reward)
  return created
}

export async function updateRewardApi(rewardId: string, updates: Record<string, unknown>) {
  const { reward } = await post('/api/wallet/rewards', { rewardId, updates }, 'PATCH')
  return reward
}

export async function deleteRewardApi(rewardId: string) {
  await post('/api/wallet/rewards', { rewardId }, 'DELETE')
}

export async function updateWalletSettingsApi(updates: object) {
  const { settings } = await post('/api/wallet/settings', updates, 'PATCH')
  return settings
}
