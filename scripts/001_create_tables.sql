-- Create profiles table for user management (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create components table (test components to be tested)
CREATE TABLE IF NOT EXISTS public.components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  guides_markdown TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

-- Components RLS: everyone can read, only admins can modify
CREATE POLICY "components_select_all" ON public.components FOR SELECT USING (true);
CREATE POLICY "components_insert_admin" ON public.components FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "components_update_admin" ON public.components FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "components_delete_admin" ON public.components FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Create user_component_status table (tracks user's testing status per component)
CREATE TABLE IF NOT EXISTS public.user_component_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  is_selected BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, component_id)
);

ALTER TABLE public.user_component_status ENABLE ROW LEVEL SECURITY;

-- User component status RLS
CREATE POLICY "user_component_status_select_all" ON public.user_component_status FOR SELECT USING (true);
CREATE POLICY "user_component_status_insert_own" ON public.user_component_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_component_status_update_own" ON public.user_component_status FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_component_status_delete_own" ON public.user_component_status FOR DELETE USING (auth.uid() = user_id);

-- Create bugs table
CREATE TABLE IF NOT EXISTS public.bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'closed', 'fixed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;

-- Bugs RLS: authenticated users can read all, create own, admin can update all
CREATE POLICY "bugs_select_authenticated" ON public.bugs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "bugs_insert_own" ON public.bugs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bugs_update_own_or_admin" ON public.bugs FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "bugs_delete_admin" ON public.bugs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
