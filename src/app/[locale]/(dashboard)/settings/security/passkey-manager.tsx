'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { startRegistration } from '@simplewebauthn/browser'
import { Fingerprint } from 'lucide-react'

interface Passkey {
  id: string
  name: string
  deviceType: string | null
  backedUp: boolean
  createdAt: string
  lastUsedAt: string | null
}

export default function PasskeyManager({
  initialPasskeys,
  embedded,
}: {
  initialPasskeys?: Passkey[]
  embedded?: boolean
}) {
  const t = useTranslations('settings.security.passkey')
  const locale = useLocale()
  const [passkeys, setPasskeys] = useState<Passkey[]>(initialPasskeys ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [name, setName] = useState('')

  // Embedded modda (settings içinde) initialPasskeys gelmez, fetch'le
  useEffect(() => {
    if (initialPasskeys || !embedded) return
    fetch('/api/auth/passkey/list')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticators) {
          setPasskeys(
            data.authenticators.map((p: Passkey & { createdAt: string }) => ({
              ...p,
              createdAt: p.createdAt,
              lastUsedAt: p.lastUsedAt ?? null,
            })),
          )
        }
      })
      .catch(() => {})
  }, [initialPasskeys, embedded])

  async function addPasskey() {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const optsRes = await fetch('/api/auth/passkey/register/options', {
        method: 'POST',
      })
      if (!optsRes.ok) {
        setError(t('serverError'))
        return
      }
      const opts = await optsRes.json()

      let attResp
      try {
        attResp = await startRegistration({ optionsJSON: opts })
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string }
        if (e.name === 'InvalidStateError') {
          setError(t('alreadyRegistered'))
        } else if (e.name === 'NotAllowedError') {
          setError(t('cancelled'))
        } else {
          setError(e.message ?? t('deviceCreateFailed'))
        }
        return
      }

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          response: attResp,
        }),
      })
      const data = await verifyRes.json()
      if (!verifyRes.ok) {
        setError(data.message ?? data.error ?? t('verifyFailed'))
        return
      }

      setPasskeys([
        {
          id: data.authenticator.id,
          name: data.authenticator.name,
          deviceType: null,
          backedUp: false,
          createdAt: data.authenticator.createdAt,
          lastUsedAt: null,
        },
        ...passkeys,
      ])
      setSuccess(t('addedToast'))
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('serverError'))
    } finally {
      setBusy(false)
    }
  }

  async function removePasskey(id: string) {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/auth/passkey/list?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? t('deleteFailed'))
        return
      }
      setPasskeys(passkeys.filter((p) => p.id !== id))
      setSuccess(t('deletedToast'))
    } catch {
      setError(t('serverError'))
    } finally {
      setBusy(false)
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'short' })
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('deviceNamePlaceholder')}
          maxLength={40}
          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent px-3 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={addPasskey}
          disabled={busy}
          className="rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 disabled:opacity-50 font-medium px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center gap-2"
        >
          <Fingerprint className="w-4 h-4" />
          {busy ? '…' : t('addButton')}
        </button>
      </div>

      {success && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 px-3 py-2 text-sm mb-3">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-3 py-2 text-sm mb-3">
          {error}
        </div>
      )}

      {passkeys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 p-6 text-center text-sm text-gray-500">
          {t('noKeys')}
        </div>
      ) : (
        <ul className="space-y-2">
          {passkeys.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2">
                  <span aria-hidden>🔑</span>
                  {p.name}
                  {p.backedUp && (
                    <span className="text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 font-medium">
                      {t('cloudBackup')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {t('addedAt')}: {dateFormatter.format(new Date(p.createdAt))}
                  {p.lastUsedAt && (
                    <>
                      {' · '}
                      {t('lastUsedAt')}: {dateTimeFormatter.format(new Date(p.lastUsedAt))}
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removePasskey(p.id)}
                disabled={busy}
                className="rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-50 px-3 py-1.5 text-sm"
              >
                {t('deleteButton')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4 text-xs text-gray-500">
        <summary className="cursor-pointer font-medium">{t('howItWorks')}</summary>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
          <li>{t('step4')}</li>
          <li>{t('step5')}</li>
        </ul>
      </details>
    </div>
  )
}
