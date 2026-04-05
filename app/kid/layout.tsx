import KidNav from '@/components/kid/KidNav'
import CelebrationOverlay from '@/components/kid/CelebrationOverlay'

export default function KidLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-amber-50 text-gray-800">
      <KidNav />
      <CelebrationOverlay />
      <main className="pb-20 md:pb-0 md:pt-16">
        {children}
      </main>
    </div>
  )
}
