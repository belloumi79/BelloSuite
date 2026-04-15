'use client'

import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { Bell as BellIcon, X as CloseIcon } from 'lucide-react'

const priorityColor: Record<string, string> = {
  info: 'bg-blue-500 text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-400 text-zinc-950',
  error: 'bg-red-500 text-white',
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    browserPermission,
    showPermissionBanner,
    requestPermission,
    dismissPermissionBanner,
    markRead,
    clearAll,
    dismiss,
  } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-zinc-800 border border-blue-500 text-white shadow-lg hover:scale-105 transition-transform"
        aria-label="Afficher les notifications"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {showPermissionBanner && (
        <div className="w-80 p-4 bg-zinc-900 rounded-2xl border border-blue-500 shadow-xl text-xs text-zinc-200">
          <p className="font-semibold">Autorisez les notifications</p>
          <p className="text-zinc-400 mt-1">Recevez une alerte en cas d'échéance, paiement ou anomalie.</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              className="px-3 py-1 text-xs font-medium text-zinc-300 border border-zinc-700 rounded-xl"
              onClick={dismissPermissionBanner}
            >
              Plus tard
            </button>
            <button
              className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-xl"
              onClick={requestPermission}
            >
              Autoriser
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="w-96 max-h-[480px] overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 shadow-[0_25px_80px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
            <span className="text-sm font-semibold text-white">Notifications</span>
            <button
              className="flex items-center gap-1 text-xs text-zinc-400"
              onClick={clearAll}
            >
              Tout effacer
            </button>
          </div>
          <div className="max-h-[430px] overflow-y-auto">
            {notifications.length === 0 && (
              <div className="p-4 text-xs text-zinc-400">Aucune notification récente.</div>
            )}
            {notifications.map(notif => (
              <div key={notif.id} className="flex gap-3 px-4 py-3 border-b border-zinc-800 last:border-b-0">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${priorityColor[notif.type] ?? 'bg-zinc-800'}`}>
                  <span className="text-sm font-semibold">{notif.type.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{notif.title}</p>
                    <button
                      className="text-xs text-zinc-500"
                      onClick={() => dismiss(notif.id)}
                    >
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400">{notif.message}</p>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{new Date(notif.timestamp).toLocaleString('fr-TN')}</span>
                    {!notif.read && (
                      <button
                        className="text-blue-400"
                        onClick={() => markRead(notif.id)}
                      >
                        Marquer lu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
