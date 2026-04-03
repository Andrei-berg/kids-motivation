import ParentNav from '@/components/parent/ParentNav'

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <ParentNav />
      <main className="pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
