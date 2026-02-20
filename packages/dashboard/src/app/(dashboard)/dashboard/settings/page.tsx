import { auth } from '@/auth'
import { SettingsForm } from '@/components/settings/settings-form'

export default async function SettingsPage() {
  const session = await auth()
  const user = session!.user!

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>
      <SettingsForm
        accountId={user.accountId}
        name={user.name ?? ''}
        email={user.email ?? ''}
        tier={user.tier ?? 'FREE'}
      />
    </div>
  )
}
