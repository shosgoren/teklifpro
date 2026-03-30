'use client';

import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

export interface Notification {
  id: string;
  type: 'accepted' | 'rejected' | 'revised' | 'viewed' | 'synced' | 'expiring' | 'info' | 'warning';
  title: string;
  description: string;
  timestamp: Date;
  isRead: boolean;
  proposalId?: string;
}

interface NotificationCenterProps {
  notifications?: Notification[];
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

/**
 * NotificationCenter Component
 *
 * Displays in-app notifications with:
 * - Bell icon with unread count badge
 * - Dropdown panel with recent notifications
 * - Mark as read functionality
 * - Beautiful animations and color coding by type
 * - Empty state handling
 */
export function NotificationCenter({
  notifications: externalNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
}: NotificationCenterProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(
    externalNotifications || []
  );

  // Mock data when no notifications provided
  useEffect(() => {
    if (!externalNotifications || externalNotifications.length === 0) {
      setNotifications(getMockNotifications());
    } else {
      setNotifications(externalNotifications);
    }
  }, [externalNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      onMarkAsRead?.(notificationId);
    },
    [onMarkAsRead]
  );

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
    onMarkAllAsRead?.();
  }, [onMarkAllAsRead]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      handleMarkAsRead(notification.id);
      onNotificationClick?.(notification);
    },
    [handleMarkAsRead, onNotificationClick]
  );

  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-6 h-6" strokeWidth={1.5} />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Bildirimler</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500">
                  {unreadCount} okunmamış bildirim
                </p>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              // Empty State
              <div className="px-4 py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                  <Bell className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">Bildirim yok</p>
                <p className="text-sm text-gray-500">
                  Şimdilik görüntülenecek bildiriminiz bulunmuyor
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {sortedNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`px-4 py-3 transition-colors duration-200 cursor-pointer ${
                      notification.isRead
                        ? 'hover:bg-gray-50'
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationIconBg(
                          notification.type
                        )}`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm font-semibold ${
                              notification.isRead
                                ? 'text-gray-700'
                                : 'text-gray-900'
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                          {notification.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {getTimeAgo(notification.timestamp)}
                        </p>
                      </div>

                      {/* Read Status Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors duration-200"
                        aria-label={
                          notification.isRead ? 'Mark as unread' : 'Mark as read'
                        }
                      >
                        {notification.isRead ? (
                          <CheckCheck className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="flex-1 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Tümünü Okundu İşaretle
              </button>
              <a
                href="/notifications"
                className="flex-1 text-sm font-medium text-blue-600 hover:text-blue-700 text-right transition-colors duration-200"
              >
                Tüm Bildirimleri Gör
              </a>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-transparent z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Helper Functions

function getNotificationIcon(
  type: Notification['type']
): JSX.Element {
  const iconProps = { className: 'w-5 h-5', strokeWidth: 2 };

  switch (type) {
    case 'accepted':
      return <Check {...iconProps} className="w-5 h-5 text-green-600" />;
    case 'rejected':
      return <X {...iconProps} className="w-5 h-5 text-red-600" />;
    case 'revised':
      return <Bell {...iconProps} className="w-5 h-5 text-orange-600" />;
    case 'viewed':
      return <Bell {...iconProps} className="w-5 h-5 text-blue-600" />;
    case 'synced':
      return <CheckCheck {...iconProps} className="w-5 h-5 text-purple-600" />;
    case 'expiring':
      return <Bell {...iconProps} className="w-5 h-5 text-yellow-600" />;
    default:
      return <Bell {...iconProps} className="w-5 h-5 text-gray-600" />;
  }
}

function getNotificationIconBg(type: Notification['type']): string {
  switch (type) {
    case 'accepted':
      return 'bg-green-100';
    case 'rejected':
      return 'bg-red-100';
    case 'revised':
      return 'bg-orange-100';
    case 'viewed':
      return 'bg-blue-100';
    case 'synced':
      return 'bg-purple-100';
    case 'expiring':
      return 'bg-yellow-100';
    default:
      return 'bg-gray-100';
  }
}

function getTimeAgo(date: Date | string): string {
  const now = new Date();
  const notificationDate = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor(
    (now.getTime() - notificationDate.getTime()) / 1000
  );

  if (seconds < 60) {
    return 'Birkaç saniye önce';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? '1 dakika önce' : `${minutes} dakika önce`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 saat önce' : `${hours} saat önce`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? '1 gün önce' : `${days} gün önce`;
  }

  return notificationDate.toLocaleDateString('tr-TR', {
    month: 'short',
    day: 'numeric',
  });
}

function getMockNotifications(): Notification[] {
  const now = new Date();

  return [
    {
      id: '1',
      type: 'accepted',
      title: 'Teklif Kabul Edildi',
      description: 'Acme Corp. tarafından TKL-2026-001 nolu teklif kabul edildi.',
      timestamp: new Date(now.getTime() - 2 * 60000), // 2 minutes ago
      isRead: false,
      proposalId: 'prop-001',
    },
    {
      id: '2',
      type: 'rejected',
      title: 'Teklif Reddedildi',
      description: 'Global Industries tarafından TKL-2026-003 nolu teklif reddedildi.',
      timestamp: new Date(now.getTime() - 15 * 60000), // 15 minutes ago
      isRead: false,
      proposalId: 'prop-003',
    },
    {
      id: '3',
      type: 'revised',
      title: 'Revize Talep Edildi',
      description: 'Tech Solutions revize talebinde bulundu: Fiyat indirimini gözden geçir.',
      timestamp: new Date(now.getTime() - 45 * 60000), // 45 minutes ago
      isRead: false,
      proposalId: 'prop-002',
    },
    {
      id: '4',
      type: 'viewed',
      title: 'Teklif Görüntülendi',
      description: 'Star Ventures, TKL-2026-005 teklifini görüntüledi.',
      timestamp: new Date(now.getTime() - 2 * 3600000), // 2 hours ago
      isRead: true,
      proposalId: 'prop-005',
    },
    {
      id: '5',
      type: 'synced',
      title: 'Paraşüt Senkronizasyonu Tamamlandı',
      description: '245 müşteri başarıyla Paraşüt ile senkronize edildi.',
      timestamp: new Date(now.getTime() - 5 * 3600000), // 5 hours ago
      isRead: true,
    },
    {
      id: '6',
      type: 'expiring',
      title: 'Deneme Süresi Bitiyor',
      description: 'Deneme süreniz 3 gün içinde bitiyor. Planı yükselt.',
      timestamp: new Date(now.getTime() - 1 * 86400000), // 1 day ago
      isRead: true,
    },
    {
      id: '7',
      type: 'info',
      title: 'Sistem Güncellemesi',
      description: 'TeklifPro 2.1.0 sürümü dağıtıldı. Yeni özellikler kullanılabilir.',
      timestamp: new Date(now.getTime() - 2 * 86400000), // 2 days ago
      isRead: true,
    },
    {
      id: '8',
      type: 'warning',
      title: 'Ödeme Başarısız',
      description: 'Aylık faturanız işlenmedi. Ödeme yöntemini güncelleyin.',
      timestamp: new Date(now.getTime() - 3 * 86400000), // 3 days ago
      isRead: true,
    },
  ];
}
