-- 2026-09-27-section-schedule-time.sql
-- The TV board's "today's trainings" widget (lib/stats/tv-extras.ts) needs a
-- time-of-day per section to show alongside the day (sections.schedule_days
-- only has days, e.g. ['sat','sun'] — no time). Nullable: optional, parent
-- fills it in from Settings → Секции so the TV can show "13:00 Вольная борьба".

alter table sections add column if not exists schedule_time time null;

comment on column sections.schedule_time is
  'Optional time-of-day the section meets (same time every scheduled day — see schedule_days). Used by the TV board "today''s trainings" widget.';
