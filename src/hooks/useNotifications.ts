'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type AppNotification,
  type NotificationType,
  getNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  getUnreadCount,
  requestBrowserPermission,
  getBrowserPermission,
  loadSavedPermission,
} from '@/lib/notifications'

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default')
  const [showPermissionBanner, setShowPermissionBanner] = useState(false)

  // Load initial data
  useEffect(() => {
    setNotifications(getNotifications())
    setUnreadCount(getUnreadCount())

    // Check browser notification permission
    const current = getBrowserPermission()
    setBrowserPermission(current)

    // Show banner if permission hasn't been asked or is default
    const saved = loadSavedPermission()
    if (!saved || saved === 'default') {
      // Show banner after 3 seconds to not annoy user
      const timer = setTimeout(() => {
        setShowPermissionBanner(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Listen for real-time updates
  useEffect(() => {
    const handleNew = (e: CustomEvent<AppNotification>) => {
      setNotifications(prev => [...prev, e.detail])
      setUnreadCount(prev => prev + 1)
    }
    const handleRead = (e: CustomEvent<{ id: string }>) => {
      setNotifications(prev =>
        prev.map(n => n.id === e.detail.id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    const handleReadAll = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    }
    const handleRemove = (e: CustomEvent<{ id: string }>) => {
      setNotifications(prev => prev.filter(n => n.id !== e.detail.id))
    }
    const handleClear = () => {
      setNotifications([])
      setUnreadCount(0)
    }

    window.addEventListener('bello:notification', handleNew as EventListener)
    window.addEventListener('bello:notification-read', handleRead as EventListener)
    window.addEventListener('bello:notification-read-all', handleReadAll)
    window.addEventListener('bello:notification-removed', handleRemove as EventListener)
    window.addEventListener('bello:notification-clear-all', handleClear)

    return () => {
      window.removeEventListener('bello:notification', handleNew as EventListener)
      window.removeEventListener('bello:notification-read', handleRead as EventListener)
      window.removeEventListener('bello:notification-read-all', handleReadAll)
      window.removeEventListener('bello:notification-removed', handleRemove as EventListener)
      window.removeEventListener('bello:notification-clear-all', handleClear)
    }
  }, [])

  const notify = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    persistent = false
  ) => {
    return addNotification({ type, title, message, persistent })
  }, [])

  const dismissPermissionBanner = useCallback(() => {
    setShowPermissionBanner(false)
  }, [])

  const requestPermission = useCallback(async () => {
    const result = await requestBrowserPermission()
    setBrowserPermission(result)
    setShowPermissionBanner(false)
    return result
  }, [])

  const dismiss = useCallback((id: string) => {
    removeNotification(id)
  }, [])

  const clearAll = useCallback(() => {
    clearAllNotifications()
  }, [])

  const markRead = useCallback((id: string) => {
    markAsRead(id)
  }, [])

  return {
    notifications,
    unreadCount,
    browserPermission,
    showPermissionBanner,
    notify,
    markRead,
    markAllRead: markAllAsRead,
    dismiss,
    clearAll,
    dismissPermissionBanner,
    requestPermission,
    hasBrowserPermission: browserPermission === 'granted',
    hasAskedPermission: browserPermission !== 'default',
  }
}
