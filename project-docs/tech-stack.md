# Tech Stack

## Core Framework

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.x (App Router) | Full-stack React framework, PWA base |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |

## Backend / Database

| Technology | Version | Purpose |
|---|---|---|
| Supabase | latest | PostgreSQL + Auth + Realtime + Storage |
| PostgreSQL | 15 | Primary database (via Supabase) |
| @supabase/ssr | latest | SSR-safe Supabase client |
| @supabase/supabase-js | 2.x | Supabase JavaScript client |

## State Management

| Technology | Version | Purpose |
|---|---|---|
| Zustand | 4.x | Global client state (childId, familyId) |

## UI / Animation

| Technology | Version | Purpose |
|---|---|---|
| Framer Motion | latest | Animations, transitions |
| Custom CSS | — | globals.css with premium-* classes |

## Infrastructure

| Technology | Purpose |
|---|---|
| Vercel | Deployment, Edge Network |
| Supabase Cloud | Database, Auth, Storage hosting |

## Push Notifications

| Technology | Purpose |
|---|---|
| Web Push API | Browser push subscriptions |
| web-push (npm) | Server-side push sending in Server Actions |

## Key npm Dependencies

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "latest",
    "zustand": "^4.x",
    "framer-motion": "latest",
    "web-push": "latest"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "@types/react": "^18.x",
    "@types/node": "^20.x",
    "eslint": "latest",
    "eslint-config-next": "14.x"
  }
}
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public>
VAPID_PRIVATE_KEY=<vapid-private>
VAPID_SUBJECT=mailto:admin@example.com
CRON_SECRET=<secret>   # optional, for production cron security
```

## Browser Support

- Chrome 90+ (primary)
- Safari 15+ (iOS PWA)
- Firefox 90+
- Mobile-first: 375px base breakpoint
