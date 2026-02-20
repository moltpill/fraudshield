import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ApiKeysManager } from '@/components/api-keys/api-keys-manager'

export default async function ApiKeysPage() {
  const session = await auth()
  const accountId = session!.user!.accountId

  const keys = await prisma.apiKey.findMany({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      key: true,
      status: true,
      createdAt: true,
    },
  })

  // Serialize dates for client component
  const serializedKeys = keys.map((k: typeof keys[number]) => ({
    ...k,
    createdAt: k.createdAt.toISOString(),
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-muted-foreground mt-1">
          Manage your API keys for SDK authentication
        </p>
      </div>
      <ApiKeysManager initialKeys={serializedKeys} />
    </div>
  )
}
