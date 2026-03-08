// Types extracted from lib/flexible-api.ts

export interface Subject {
  id: string
  child_id: string
  name: string
  active: boolean
  archived: boolean
  display_order: number
  created_at: string
  archived_at?: string
}

export interface ScheduleLesson {
  id: string
  child_id: string
  day_of_week: number // 1-5
  lesson_number: number
  subject_id: string
  subject?: Subject
  created_at: string
}

export interface ExerciseType {
  id: string
  name: string
  track_quantity: boolean
  unit: string
  display_order: number
  active: boolean
  created_at: string
}

export interface HomeExercise {
  id: string
  child_id: string
  date: string
  exercise_type_id: string
  exercise_type?: ExerciseType
  quantity: number | null
  note: string | null
  created_at: string
}
