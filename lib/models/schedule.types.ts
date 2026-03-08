// Types extracted from lib/schedule-api.ts

export interface ScheduleItem {
  id: string
  family_id: string
  child_member_id: string
  type: 'lesson' | 'section' | 'routine'
  title: string
  day_of_week: number[]   // 1=Mon, 2=Tue, ..., 7=Sun
  start_time: string | null   // "HH:MM:SS"
  end_time: string | null     // "HH:MM:SS"
  location: string | null
  reminder_offset: number     // minutes before start_time
  has_reminder: boolean
  sort_order: number
  is_active: boolean
  created_at: string
}
