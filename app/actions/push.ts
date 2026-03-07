// app/actions/push.ts
// Server Action: send Web Push notifications via web-push npm + VAPID.
// Called from: app/api/push/send/route.ts (for programmatic sends)
// Called from: NotificationSettings test button (direct Server Action call)
//
// REQUIRES env vars:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY — generated via: npx web-push generate-vapid-keys
//   VAPID_PRIVATE_KEY            — generated via: npx web-push generate-vapid-keys
//   VAPID_MAILTO                 — contact email (e.g. mailto:admin@kidscoins.app)
'use server'

import webpush from 'web-push'

// Initialize VAPID details once. If env vars are missing, functions throw clearly.
function getVapidConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_MAILTO
  )
}

/**
 * Send a push notification to a single subscription endpoint.
 * subscriptionJson: the full PushSubscription object serialized to JSON string.
 */
export async function sendPushToSubscription(
  subscriptionJson: string,
  title: string,
  body: string,
  url: string = '/dashboard',
  icon: string = '/icon-192x192.png'
): Promise<void> {
  if (!getVapidConfigured()) {
    throw new Error(
      'Push notifications not configured: set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_MAILTO in .env.local'
    )
  }

  webpush.setVapidDetails(
    process.env.VAPID_MAILTO!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const subscription = JSON.parse(subscriptionJson)
  const payload = JSON.stringify({ title, body, icon, url })

  await webpush.sendNotification(subscription, payload)
}

/**
 * Send a test push notification to verify the setup works.
 * Called from NotificationSettings "Отправить тестовое уведомление" button.
 */
export async function sendTestNotification(subscriptionJson: string): Promise<void> {
  await sendPushToSubscription(
    subscriptionJson,
    'KidsCoins — Тест ✅',
    'Уведомления работают! Отличная настройка.',
    '/dashboard'
  )
}
