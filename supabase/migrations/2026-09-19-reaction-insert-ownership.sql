-- Fix: reaction INSERT policies on family_event_reactions and chat_reactions
-- checked only family_id, never member_id — unlike their own DELETE policies
-- and the sibling family_event_comments INSERT policy. Any authenticated
-- family member (including a child) could forge another member's reaction
-- via a direct API call. Found in phase 09.2 security audit (T-092-17 / CR-01).

DROP POLICY IF EXISTS "Family members add event reactions" ON family_event_reactions;
CREATE POLICY "Family members add event reactions" ON family_event_reactions
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
    AND member_id IN (SELECT id::text FROM family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Family members can insert reactions" ON chat_reactions;
CREATE POLICY "Family members can insert reactions" ON chat_reactions
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
    AND member_id IN (SELECT id::text FROM family_members WHERE user_id = auth.uid())
  );
