'use client'

import { useState, useEffect } from 'react'
import { savePushSubscription, deletePushSubscription } from '@/lib/push-api'
import { sendTestNotification } from '@/app/actions/push'

interface Props {
  familyId: string
  memberId: string | null
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export default function NotificationSettings({ familyId, memberId }: Props) {
  const [subscribed, setSubscribed] = useState(false)
  const [currentSubscription, setCurrentSubscription] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testSuccess, setTestSuccess] = useState<string | null>(null)
  const [showIOSBanner, setShowIOSBanner] = useState(false)

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  // Check existing subscription on mount
  useEffect(() => {
    const checkSubscription = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
      try {
        const reg = await navigator.serviceWorker.getRegistration('/')
        if (reg) {
          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            setSubscribed(true)
            setCurrentSubscription(sub)
          }
        }
      } catch {
        // Ignore — browser may not support push
      }
    }
    checkSubscription()
  }, [])

  const handleSubscribe = async () => {
    setError(null)

    if (!vapidKey) {
      setError('Для включения уведомлений настройте NEXT_PUBLIC_VAPID_PUBLIC_KEY в .env.local')
      return
    }

    if (!memberId) {
      setError('Не удалось определить пользователя. Обновите страницу и попробуйте снова.')
      return
    }

    // iOS standalone check
    if (isIOS() && !isStandalone()) {
      setShowIOSBanner(true)
      return
    }

    if (!('serviceWorker' in navigator)) {
      setError('Ваш браузер не поддерживает push-уведомления')
      return
    }

    setLoading(true)
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })

      // Wait for SW to be ready
      await navigator.serviceWorker.ready

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      // Save to Supabase
      await savePushSubscription(familyId, memberId, subscription)

      setSubscribed(true)
      setCurrentSubscription(subscription)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка подписки'
      if (msg.includes('permission') || msg.includes('denied')) {
        setError('Разрешение на уведомления отклонено. Включите их в настройках браузера.')
      } else {
        setError(`Не удалось подключить уведомления: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!currentSubscription || !memberId) return
    setLoading(true)
    setError(null)
    try {
      const endpoint = currentSubscription.endpoint
      await currentSubscription.unsubscribe()
      await deletePushSubscription(memberId, endpoint)
      setSubscribed(false)
      setCurrentSubscription(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка отписки'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleTestNotification = async () => {
    setError(null)
    setTestSuccess(null)
    setTestLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) {
        setError('Сначала включите уведомления')
        return
      }
      await sendTestNotification(JSON.stringify(sub))
      setTestSuccess('Уведомление отправлено!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка отправки'
      setError(`Ошибка: проверьте VAPID ключи в .env.local (${msg})`)
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Уведомления</h2>

      {/* iOS banner */}
      {showIOSBanner && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">📱</span>
            <div>
              <p className="text-sm font-medium text-amber-400 mb-1">Добавьте приложение на главный экран</p>
              <p className="text-xs text-gray-300">
                На iPhone сначала добавьте приложение на главный экран (Поделиться → На экран «Домой»),
                затем откройте его и вернитесь сюда.
              </p>
              <button
                onClick={() => setShowIOSBanner(false)}
                className="mt-2 text-xs text-amber-400 underline"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Push status */}
      <div className="bg-gray-700/50 rounded-xl p-4 mb-4">
        <h3 className="text-sm font-medium text-white mb-3">Push-уведомления</h3>

        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${subscribed ? 'bg-green-400' : 'bg-gray-500'}`} />
          <span className={`text-sm ${subscribed ? 'text-green-400' : 'text-gray-400'}`}>
            {subscribed ? 'Подключено' : 'Отключено'}
          </span>
        </div>

        {/* No VAPID key warning */}
        {!vapidKey && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-xs">
            Для включения уведомлений настройте VAPID ключи в .env.local:
            <br />
            <code className="font-mono">NEXT_PUBLIC_VAPID_PUBLIC_KEY=...</code>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline text-xs">Закрыть</button>
          </div>
        )}

        {/* Subscribe / Unsubscribe buttons */}
        {!subscribed ? (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {loading ? 'Подключение...' : 'Включить уведомления'}
          </button>
        ) : (
          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="w-full py-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-gray-300 text-sm font-medium rounded-xl transition-colors"
          >
            {loading ? 'Отключение...' : 'Отключить уведомления'}
          </button>
        )}
      </div>

      {/* Section 2: Test notification */}
      <div className="bg-gray-700/50 rounded-xl p-4 mb-4">
        <h3 className="text-sm font-medium text-white mb-3">Тест уведомления</h3>
        {testSuccess && (
          <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
            {testSuccess}
          </div>
        )}
        <button
          onClick={handleTestNotification}
          disabled={testLoading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {testLoading ? 'Отправка...' : 'Отправить тестовое уведомление'}
        </button>
      </div>

      {/* Section 3: Task reminders info */}
      <div className="bg-gray-700/50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-white mb-2">Напоминания по задачам</h3>
        <p className="text-sm text-gray-400">
          Настройте время напоминания для каждой задачи в разделе «Задачи».
        </p>
      </div>
    </div>
  )
}
