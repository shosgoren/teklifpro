import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/shared/auth/authOptions'
import { prisma } from '@/shared/utils/prisma'
import PasskeyManager from './passkey-manager'

export const dynamic = 'force-dynamic'

export default async function SecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect(`/${locale}/login`)

  const passkeys = await prisma.authenticator.findMany({
    where: { userId: session.user.id as string },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      deviceType: true,
      backedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <Link
          href={`/${locale}/settings`}
          className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          ← Ayarlar
        </Link>
        <h1 className="text-2xl font-bold mt-1">Güvenlik</h1>
        <p className="text-sm text-gray-500">Passkey, oturum yönetimi, MFA</p>
      </header>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-3">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            🔐 Passkey
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Şifre yerine telefonunun yüz tanıma / parmak izi ile giriş yap.
            Cihaz çalınamaz, çok daha güvenli.
          </p>
        </div>

        <PasskeyManager
          initialPasskeys={passkeys.map((p) => ({
            ...p,
            createdAt: p.createdAt.toISOString(),
            lastUsedAt: p.lastUsedAt?.toISOString() ?? null,
          }))}
        />
      </section>
    </div>
  )
}
