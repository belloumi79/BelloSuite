// Notification system for BelloSuite
// Handles browser Notification API + in-app notifications

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: number
  read: boolean
  action?: {
    label: string
    href?: string
    onClick?: string // function name stored as string
  }
  persistent: boolean // if true, stays until dismissed
}

const NOTIF_STORAGE_KEY = 'bellosuite_notifications'
const PERMISSION_KEY = 'bellosuite_notification_permission'
const MAX_STORED_NOTIFICATIONS = 50

// ─── Browser Notification API ────────────────────────────────────────────────

export async function requestBrowserPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  if (Notification.permission === 'granted') {
    savePermission('granted')
    return 'granted'
  }
  if (Notification.permission === 'denied') {
    savePermission('denied')
    return 'denied'
  }
  const permission = await Notification.requestPermission()
  savePermission(permission)
  return permission
}

export function getBrowserPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

export function savePermission(permission: NotificationPermission): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PERMISSION_KEY, permission)
  // Also set a cookie
  document.cookie = `bellosuite_notif_perm=${permission}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`
}

export function loadSavedPermission(): NotificationPermission | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(PERMISSION_KEY)
  return stored as NotificationPermission | null
}

export function sendBrowserNotification(title: string, options?: NotificationOptions): Notification | null {
  if (getBrowserPermission() !== 'granted') return null
  try {
    const notif = new Notification(title, {
      icon: '/bell-icon.svg',
      badge: '/bell-icon.svg',
      ...options,
    })
    // Auto-close after 5 seconds
    setTimeout(() => notif.close(), 5000)
    return notif
  } catch {
    return null
  }
}

// ─── In-App Notifications ────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(NOTIF_STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored) as AppNotification[]
  } catch {
    return []
  }
}

export function saveNotifications(notifs: AppNotification[]): void {
  if (typeof window === 'undefined') return
  // Keep only last MAX_STORED_NOTIFICATIONS
  const trimmed = notifs.slice(-MAX_STORED_NOTIFICATIONS)
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(trimmed))
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
  const notification: AppNotification = {
    ...notif,
    id: generateId(),
    timestamp: Date.now(),
    read: false,
  }
  const all = getNotifications()
  all.push(notification)
  saveNotifications(all)

  // Also send browser notification if permitted
  if (notif.type !== 'error') {
    sendBrowserNotification(notif.title, { body: notif.message })
  }

  // Dispatch custom event for real-time UI update
  window.dispatchEvent(new CustomEvent('bello:notification', { detail: notification }))

  return notification
}

export function markAsRead(id: string): void {
  const all = getNotifications()
  const idx = all.findIndex(n => n.id === id)
  if (idx !== -1) {
    all[idx].read = true
    saveNotifications(all)
    window.dispatchEvent(new CustomEvent('bello:notification-read', { detail: { id } }))
  }
}

export function markAllAsRead(): void {
  const all = getNotifications()
  all.forEach(n => { n.read = true })
  saveNotifications(all)
  window.dispatchEvent(new CustomEvent('bello:notification-read-all'))
}

export function removeNotification(id: string): void {
  const all = getNotifications()
  const filtered = all.filter(n => n.id !== id)
  saveNotifications(filtered)
  window.dispatchEvent(new CustomEvent('bello:notification-removed', { detail: { id } }))
}

export function clearAllNotifications(): void {
  localStorage.removeItem(NOTIF_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('bello:notification-clear-all'))
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length
}

// ─── Convenience helpers for common notification types ─────────────────────

export function notifySuccess(title: string, message: string, persistent = false): AppNotification {
  return addNotification({ type: 'success', title, message, persistent })
}

export function notifyError(title: string, message: string, persistent = false): AppNotification {
  return addNotification({ type: 'error', title, message, persistent })
}

export function notifyWarning(title: string, message: string, persistent = false): AppNotification {
  return addNotification({ type: 'warning', title, message, persistent })
}

export function notifyInfo(title: string, message: string, persistent = false): AppNotification {
  return addNotification({ type: 'info', title, message, persistent })
}
