// Types extracted from lib/api.ts — legacy children/days/grades/sport/goals/weeks

export type Child = {
  id: string
  name: string
  emoji: string
  age: number
  active: boolean
  base_weekly: number
  xp: number
  level: number
  created_at: string
  kid_fill_mode: 1 | 2 | 3
}

export type DayData = {
  id: string
  child_id: string
  date: string
  room_bed: boolean
  room_floor: boolean
  room_desk: boolean
  room_closet: boolean
  room_trash: boolean
  room_score: number
  room_ok: boolean
  good_behavior: boolean
  diary_not_done: boolean
  note_parent: string | null
  note_child: string | null
  is_sick: boolean
  home_help: boolean
  home_help_note: string | null
  homework_done: boolean
  filled_by: 'child' | 'parent' | null
  mood: string | null
}

export type SubjectGrade = {
  id: string
  child_id: string
  date: string
  subject: string
  subject_id?: string | null
  grade: number
  note: string | null
}

export type HomeSport = {
  id: string
  child_id: string
  date: string
  running: boolean
  exercises: boolean
  outdoor_games: boolean
  stretching: boolean
  total_minutes: number
  note: string | null
}

export type SportsSection = {
  id: string
  child_id: string
  name: string
  active: boolean
}

export type SectionAttendance = {
  id: string
  section_id: string
  child_id: string
  date: string
  attended: boolean
  coach_rating: number | null
  coach_comment: string | null
}

export type Goal = {
  id: string
  child_id: string
  title: string
  target: number
  current: number
  active: boolean
  archived: boolean
  completed: boolean
  completed_at: string | null
  created_at: string
}

export type Week = {
  id: string
  child_id: string
  week_start: string
  week_end: string
  all5_mode: boolean
  extra_bonus: number
  penalties_manual: number
  note_parent: string | null
  base: number
  study_total: number
  room_bonus: number
  sport_bonus: number
  streak_bonuses: number
  extra_applied: number
  penalties_total: number
  total: number
  finalized: boolean
  finalized_at: string | null
}
