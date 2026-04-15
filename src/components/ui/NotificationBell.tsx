'use client'

import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { Bell as BellIcon, X as CloseIcon } from 'lucide-react'

const priorityColor: Record<string, string> = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-400',
  error: 'bg-red-500',
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    showPermissionBanner,
    requestPermission,
    dismissPermissionBanner,
    markRead,
    dismiss,
  } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-zinc-800 transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="w-5 h-5 text-zinc-400" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPermissionBanner && (
        <div className="absolute right-0 mt-2 w-72 p-3 bg-zinc-900 rounded-2xl border border-blue-500 shadow-xl text-xs">
          <div className="flex items-start gap-2">
            <BellIcon className="w-4 h-4 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-white">Activer les notifications</p>
              <p className="text-zinc-400 mt-0.5">Recevez des alertes en temps réel.</p>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  className="px-3 py-1 text-xs text-zinc-300 border border-zinc-700 rounded-xl"
                  onClick={dismissPermissionBanner}
                >
                  Non merci
                </button>
                <button
                  className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-xl"
                  onClick={requestPermission}
                >
                  Activer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs text-zinc-500">{unreadCount} non lue(s)</span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <div className="p-4 text-xs text-zinc-400 text-center">
                  Aucune notification
                </div>
              )}
              {notifications.map(notif => (
                <div key={notif.id} className="flex gap-3 px-4 py-3 border-b border-zinc-800 last:border-b-0">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${priorityColor[notif.type] ?? 'bg-zinc-800'}`}>
                    <span className="text-xs font-bold text-white">
                      {notif.type === 'success' ? '✓' : notif.type === 'error' ? '✕' : 'i'}
                    </span>
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-xs font-semibold text-white">{notif.title}</p>
                    <p className="text-[11px] text-zinc-400">{notif.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">
                        {new Date(notif.timestamp).toLocaleString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex gap-2">
                        {!notif.read && (
                          <button
                            className="text-[10px] text-blue-400"
                            onClick={() => markRead(notif.id)}
                          >
                            Lu
                          </button>
                        )}
                        <button
                          className="text-[10px] text-zinc-500"
                          onClick={() => dismiss(notif.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
