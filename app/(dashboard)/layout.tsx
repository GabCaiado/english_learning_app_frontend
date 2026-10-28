import { Sidebar } from "@/components/layout/sidebar"
import { AuthGuard } from "@/components/auth-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 min-h-0 overflow-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}
