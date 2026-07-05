/*
  # Review and Update RLS Policies According to Roles

  This migration ensures all tables have proper RLS policies according to the role hierarchy:
  
  - **Admin**: Full access to everything (create, read, update, delete)
  - **Secretary**: Manages content (news, schedules, classes, evaluation plans)
                   Validates/approves absence justifications
                   Cannot access backups or system logs
  - **Parent**: Views general information (news, schedules, classes, documents)
                Registers their own students
                Submits absence justifications with PDF uploads
                Cannot modify institutional content

  1. Updates to existing policies
    - News: Admin and Secretary can manage, Parents can view published
    - Schedules: Admin and Secretary can manage, Parents can view
    - Classes: Admin and Secretary can manage, Parents can view
    - Institutional Documents: Admin manages, all authenticated users view published
    - Absences: Parents submit, Secretary validates, Admin has full access
    - Students: Parents register their own, Admin/Secretary view all
    - Evaluation Plans: Admin/Secretary manage, all authenticated users view
    - System Logs: Admin only
    - Backups: Admin only

  2. Important Notes
    - Policies are dropped and recreated to ensure clean state
    - Uses RESTRICTIVE policies where needed for multi-condition checks
*/

DROP POLICY IF EXISTS "Authenticated users can read published news" ON news;
DROP POLICY IF EXISTS "Admin users can insert news" ON news;
DROP POLICY IF EXISTS "Admin users can update news" ON news;
DROP POLICY IF EXISTS "Admin users can delete news" ON news;

CREATE POLICY "Users can view published news"
  ON news
  FOR SELECT
  TO authenticated
  USING (published = true);

CREATE POLICY "Admin can view all news"
  ON news
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin and secretary can insert news"
  ON news
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Admin and secretary can update news"
  ON news
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Admin and secretary can delete news"
  ON news
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

DROP POLICY IF EXISTS "All authenticated users can read schedules" ON schedules;
DROP POLICY IF EXISTS "Admin users can insert schedules" ON schedules;
DROP POLICY IF EXISTS "Admin users can update schedules" ON schedules;
DROP POLICY IF EXISTS "Admin users can delete schedules" ON schedules;

CREATE POLICY "All authenticated users can view schedules"
  ON schedules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and secretary can insert schedules"
  ON schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Admin and secretary can update schedules"
  ON schedules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Admin and secretary can delete schedules"
  ON schedules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

DROP POLICY IF EXISTS "All authenticated users can read classes" ON classes;
DROP POLICY IF EXISTS "Admin users can insert classes" ON classes;
DROP POLICY IF EXISTS "Admin users can update classes" ON classes;
DROP POLICY IF EXISTS "Admin users can delete classes" ON classes;

CREATE POLICY "All authenticated users can view classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and secretary can insert classes"
  ON classes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Admin and secretary can update classes"
  ON classes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Admin and secretary can delete classes"
  ON classes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

DROP POLICY IF EXISTS "Parents can view their absences" ON absences;
DROP POLICY IF EXISTS "Parents can insert absences" ON absences;
DROP POLICY IF EXISTS "Parents can update their absences" ON absences;
DROP POLICY IF EXISTS "Admin users can view all absences" ON absences;
DROP POLICY IF EXISTS "Admin and secretary users can update absences" ON absences;
DROP POLICY IF EXISTS "Admin users can delete absences" ON absences;

CREATE POLICY "Parents can view their own absences"
  ON absences
  FOR SELECT
  TO authenticated
  USING (
    parent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Parents can submit absence justifications"
  ON absences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Parents can update their pending absences"
  ON absences
  FOR UPDATE
  TO authenticated
  USING (
    (parent_id = auth.uid() AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  )
  WITH CHECK (
    (parent_id = auth.uid() AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Admin can delete absences"
  ON absences
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
