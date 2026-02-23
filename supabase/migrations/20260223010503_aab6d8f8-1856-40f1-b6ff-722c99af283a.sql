
-- Fix A: RLS policies for course_entitlements
ALTER TABLE public.course_entitlements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='course_entitlements'
      AND policyname='Role can insert entitlements'
  ) THEN
    CREATE POLICY "Role can insert entitlements"
    ON public.course_entitlements
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin','dispensary_manager','training_coordinator')
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='course_entitlements'
      AND policyname='Role can update entitlements'
  ) THEN
    CREATE POLICY "Role can update entitlements"
    ON public.course_entitlements
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin','dispensary_manager','training_coordinator')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin','dispensary_manager','training_coordinator')
      )
    );
  END IF;
END $$;

-- Fix B: Allow users to UPDATE their own course_completions
ALTER TABLE public.course_completions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='course_completions'
      AND policyname='Users can update their own completions'
  ) THEN
    CREATE POLICY "Users can update their own completions"
    ON public.course_completions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='course_completions'
      AND policyname='Users can insert their own completions'
  ) THEN
    CREATE POLICY "Users can insert their own completions"
    ON public.course_completions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Fix C: Remove duplicate unique constraint
ALTER TABLE public.course_completions
DROP CONSTRAINT IF EXISTS course_completions_user_id_course_id_key;
