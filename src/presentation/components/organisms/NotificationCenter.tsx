'use client';

import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

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
  const locale = useLocale();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(
    externalNotifications || []
  );
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setNotifications(data.data.map((n: Omit<Notification, 'timestamp'> & { timestamp: string }) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          })));
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      onMarkAsRead?.(notificationId);
      // Persist to server
      fetch('/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: notificationId, action: 'markRead' }),
      }).catch(() => {});
    },
    [onMarkAsRead]
  );

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
    onMarkAllAsRead?.();
    // Persist to server
    fetch('/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markAllRead' }),
    }).catch(() => {});
  }, [onMarkAllAsRead]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      handleMarkAsRead(notification.id);
      onNotificationClick?.(notification);
      if (notification.proposalId) {
        setIsOpen(false);
        router.push(`/${locale}/proposals/${notification.proposalId}`);
      }
    },
    [handleMarkAsRead, onNotificationClick, router, locale]
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
            {isLoading ? (
              // Loading State
              <div className="px-4 py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3 animate-pulse">
                  <Bell className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">Bildirimler yükleniyor...</p>
              </div>
            ) : notifications.length === 0 ? (
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
                href={`/${locale}/notifications`}
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

