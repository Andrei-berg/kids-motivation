-- Migration: family_id auto-fill triggers + backfill
-- Paste ENTIRE contents into Supabase SQL Editor → Run

CREATE OR REPLACE FUNCTION auto_family_id_from_child()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.family_id IS NULL AND NEW.child_id IS NOT NULL THEN
    SELECT family_id INTO NEW.family_id FROM children WHERE id = NEW.child_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subjects_family_id ON subjects;
DROP TRIGGER IF EXISTS trg_schedule_family_id ON schedule;
DROP TRIGGER IF EXISTS trg_goal_log_family_id ON goal_log;
DROP TRIGGER IF EXISTS trg_goals_family_id ON goals;
DROP TRIGGER IF EXISTS trg_home_exercises_family_id ON home_exercises;

CREATE TRIGGER trg_subjects_family_id BEFORE INSERT ON subjects FOR EACH ROW EXECUTE FUNCTION auto_family_id_from_child();
CREATE TRIGGER trg_schedule_family_id BEFORE INSERT ON schedule FOR EACH ROW EXECUTE FUNCTION auto_family_id_from_child();
CREATE TRIGGER trg_goal_log_family_id BEFORE INSERT ON goal_log FOR EACH ROW EXECUTE FUNCTION auto_family_id_from_child();
CREATE TRIGGER trg_goals_family_id BEFORE INSERT ON goals FOR EACH ROW EXECUTE FUNCTION auto_family_id_from_child();
CREATE TRIGGER trg_home_exercises_family_id BEFORE INSERT ON home_exercises FOR EACH ROW EXECUTE FUNCTION auto_family_id_from_child();

UPDATE subjects SET family_id = (SELECT family_id FROM children WHERE id = subjects.child_id) WHERE family_id IS NULL;
UPDATE schedule SET family_id = (SELECT family_id FROM children WHERE id = schedule.child_id) WHERE family_id IS NULL;
UPDATE goal_log SET family_id = (SELECT family_id FROM children WHERE id = goal_log.child_id) WHERE family_id IS NULL;
UPDATE goals SET family_id = (SELECT family_id FROM children WHERE id = goals.child_id) WHERE family_id IS NULL;
UPDATE home_exercises SET family_id = (SELECT family_id FROM children WHERE id = home_exercises.child_id) WHERE family_id IS NULL;
UPDATE days SET family_id = (SELECT family_id FROM children WHERE id = days.child_id) WHERE family_id IS NULL;
UPDATE streaks SET family_id = (SELECT family_id FROM children WHERE id = streaks.child_id) WHERE family_id IS NULL;
UPDATE badges SET family_id = (SELECT family_id FROM children WHERE id = badges.child_id) WHERE family_id IS NULL;
UPDATE wallet_transactions SET family_id = (SELECT family_id FROM children WHERE id = wallet_transactions.child_id) WHERE family_id IS NULL;
UPDATE weeks SET family_id = (SELECT family_id FROM children WHERE id = weeks.child_id) WHERE family_id IS NULL;
UPDATE subject_grades SET family_id = (SELECT family_id FROM children WHERE id = subject_grades.child_id) WHERE family_id IS NULL;
UPDATE sports_sections SET family_id = (SELECT family_id FROM children WHERE id = sports_sections.child_id) WHERE family_id IS NULL;
UPDATE section_attendance SET family_id = (SELECT family_id FROM children WHERE id = section_attendance.child_id) WHERE family_id IS NULL;
UPDATE home_sports SET family_id = (SELECT family_id FROM children WHERE id = home_sports.child_id) WHERE family_id IS NULL;
