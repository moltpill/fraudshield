import Link from 'next/link'
import { Eye } from 'lucide-react'
import { SidebarNav } from './sidebar-nav'

export function AdminSidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 border-r bg-background">
      <div className="flex h-16 items-center gap-2 px-6 border-b shrink-0">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <div className="p-1 rounded-md bg-gradient-to-br from-violet-500 to-purple-600">
            <Eye className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">Eyes</span>
          <span className="text-xs text-violet-400 font-bold bg-violet-500/10 px-1.5 py-0.5 rounded">ADMIN</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
    </aside>
  )
}
