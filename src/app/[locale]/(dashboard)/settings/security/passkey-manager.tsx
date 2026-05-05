'use client'

import { useState } from 'react'
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
}: {
  initialPasskeys: Passkey[]
}) {
  const [passkeys, setPasskeys] = useState(initialPasskeys)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [name, setName] = useState('')

  async function addPasskey() {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const optsRes = await fetch('/api/auth/passkey/register/options', {
        method: 'POST',
      })
      if (!optsRes.ok) {
        setError('Sunucu kayıt seçeneklerini hazırlayamadı')
        return
      }
      const opts = await optsRes.json()

      let attResp
      try {
        attResp = await startRegistration({ optionsJSON: opts })
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string }
        if (e.name === 'InvalidStateError') {
          setError('Bu cihazda zaten passkey kayıtlı.')
        } else if (e.name === 'NotAllowedError') {
          setError('İptal edildi.')
        } else {
          setError(e.message ?? 'Cihaz passkey oluşturmadı')
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
        setError(data.message ?? data.error ?? 'Doğrulama başarısız')
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
      setSuccess('✓ Passkey eklendi. Bir sonraki girişte yüz/parmak izinle gireceksin.')
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir şeyler ters gitti')
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
        setError(data.error ?? 'Silme başarısız')
        return
      }
      setPasskeys(passkeys.filter((p) => p.id !== id))
      setSuccess('Passkey silindi.')
    } catch {
      setError('Sunucuya ulaşılamadı')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cihaz adı (örn: iPhone Sercan)"
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
          {busy ? '…' : 'Passkey ekle'}
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
          Henüz passkey kayıtlı değil. Yukarıdan ekle, bir sonraki girişte
          parolasız gir.
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
                      Cloud yedek
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Eklendi:{' '}
                  {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' }).format(
                    new Date(p.createdAt),
                  )}
                  {p.lastUsedAt && (
                    <>
                      {' · '}
                      Son kullanım:{' '}
                      {new Intl.DateTimeFormat('tr-TR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(p.lastUsedAt))}
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
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4 text-xs text-gray-500">
        <summary className="cursor-pointer font-medium">Nasıl çalışır?</summary>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li>Passkey ekledikten sonra çıkış yap, tekrar giriş ekranına gel.</li>
          <li>&quot;Passkey ile giriş&quot; butonuna bas — cihazın yüz/parmak izini ister.</li>
          <li>Tek seferde girersin, şifre yok.</li>
          <li>Birden fazla cihazda kayıtlı olabilir (telefon + bilgisayar).</li>
          <li>iCloud Keychain veya Google Password Manager ile cihazlar arası senkron olur.</li>
        </ul>
      </details>
    </div>
  )
}
