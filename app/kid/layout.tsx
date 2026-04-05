import KidNav from '@/components/kid/KidNav'

export default function KidLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-amber-50 text-gray-800">
      <KidNav />
      <main className="pb-20 md:pb-0 md:pt-16">
        {children}
      </main>
    </div>
  )
}
