'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'

interface Notification {
  id: string
  type: 'accepted' | 'rejected' | 'revised' | 'viewed' | 'synced' | 'expiring' | 'info' | 'warning'
  title: string
  description: string
  timestamp: string
  isRead: boolean
  proposalId?: string
}

type FilterType = 'all' | 'unread' | 'accepted' | 'rejected' | 'revised' | 'viewed'

const ITEMS_PER_PAGE = 20

export default function NotificationsPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('notificationsPage')

  const FILTER_OPTIONS: { value: FilterType; label: string; icon?: typeof Bell }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'unread', label: t('filterUnread') },
    { value: 'viewed', label: t('filterViewed'), icon: Eye },
    { value: 'accepted', label: t('filterAccepted'), icon: ThumbsUp },
    { value: 'rejected', label: t('filterRejected'), icon: ThumbsDown },
    { value: 'revised', label: t('filterRevised'), icon: RotateCcw },
  ]
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notifications')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setNotifications(data.data)
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    fetch('/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId: id, action: 'markRead' }),
    }).catch(() => {})
  }

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    fetch('/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markAllRead' }),
    }).catch(() => {})
  }

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id)
    if (notification.proposalId) {
      router.push(`/${locale}/proposals/${notification.proposalId}`)
    }
  }

  // Filter and search
  const filtered = notifications.filter((n) => {
    if (filter === 'unread' && n.isRead) return false
    if (filter !== 'all' && filter !== 'unread' && n.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [filter, search])

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0
              ? t('unreadCount', { count: unreadCount })
              : t('allRead')}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-mint-600 bg-mint-50 hover:bg-mint-100 dark:bg-mint-900/20 dark:text-mint-400 dark:hover:bg-mint-900/30 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-transparent"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-gray-400 mr-1 flex-shrink-0" />
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              aria-pressed={filter === opt.value}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                filter === opt.value
                  ? 'bg-mint-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
              {opt.value === 'unread' && unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-mint-500 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">{t('loading')}</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              {filter !== 'all' || search ? t('noMatchingNotifications') : t('noNotifications')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filter !== 'all' || search
                ? t('tryDifferentFilter')
                : t('newNotificationsWillAppear')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginated.map((notification) => (
              <li
                key={notification.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleNotificationClick(notification)
                  }
                }}
                className={`flex items-start gap-4 px-4 md:px-6 py-4 transition-colors cursor-pointer ${
                  notification.isRead
                    ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    : 'bg-mint-50/50 dark:bg-mint-900/10 hover:bg-mint-50 dark:hover:bg-mint-900/20'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getIconBg(
                    notification.type
                  )}`}
                >
                  {getIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4
                        className={`text-sm ${
                          notification.isRead
                            ? 'text-gray-700 dark:text-gray-300 font-medium'
                            : 'text-gray-900 dark:text-white font-semibold'
                        }`}
                      >
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {notification.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1.5">
                        {formatDate(notification.timestamp, locale, t)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <div className="w-2.5 h-2.5 rounded-full bg-mint-600 mr-1" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(notification.id)
                        }}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title={notification.isRead ? t('read') : t('markAsRead')}
                      >
                        {notification.isRead ? (
                          <CheckCheck className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Check className="w-4 h-4 text-mint-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 dark:border-gray-800 px-4 md:px-6 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {t('paginationInfo', { total: filtered.length, from: (page - 1) * ITEMS_PER_PAGE + 1, to: Math.min(page * ITEMS_PER_PAGE, filtered.length) })}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper functions

function getIcon(type: Notification['type']): JSX.Element {
  switch (type) {
    case 'accepted':
      return <ThumbsUp className="w-5 h-5 text-green-600" />
    case 'rejected':
      return <ThumbsDown className="w-5 h-5 text-red-600" />
    case 'revised':
      return <RotateCcw className="w-5 h-5 text-orange-600" />
    case 'viewed':
      return <Eye className="w-5 h-5 text-mint-600" />
    case 'synced':
      return <CheckCheck className="w-5 h-5 text-purple-600" />
    case 'expiring':
      return <Bell className="w-5 h-5 text-yellow-600" />
    default:
      return <Bell className="w-5 h-5 text-gray-600" />
  }
}

function getIconBg(type: Notification['type']): string {
  switch (type) {
    case 'accepted':
      return 'bg-green-100 dark:bg-green-900/30'
    case 'rejected':
      return 'bg-red-100 dark:bg-red-900/30'
    case 'revised':
      return 'bg-orange-100 dark:bg-orange-900/30'
    case 'viewed':
      return 'bg-mint-100 dark:bg-mint-900/30'
    case 'synced':
      return 'bg-purple-100 dark:bg-purple-900/30'
    case 'expiring':
      return 'bg-yellow-100 dark:bg-yellow-900/30'
    default:
      return 'bg-gray-100 dark:bg-gray-800'
  }
}

function formatDate(timestamp: string, locale: string, t: (key: string, values?: Record<string, string | number>) => string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return t('justNow')
  if (diffMin < 60) return t('minutesAgo', { count: diffMin })
  if (diffHours < 24) return t('hoursAgo', { count: diffHours })
  if (diffDays < 7) return t('daysAgo', { count: diffDays })

  return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  })
}
