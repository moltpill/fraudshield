import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AdminSidebar } from '@/components/layout/sidebar'
import { AdminHeader } from '@/components/layout/header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.adminId) {
    redirect('/login')
  }

  const { email, name, role } = session.user

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <AdminHeader
          email={email ?? ''}
          name={name ?? ''}
          role={role ?? 'READONLY'}
        />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
