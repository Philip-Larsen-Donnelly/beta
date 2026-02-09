-- Create component_resources table to store component-specific resources
CREATE TABLE IF NOT EXISTS public.component_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('testpad', 'markdown', 'video')),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.component_resources ENABLE ROW LEVEL SECURITY;

-- RLS: everyone can read, only admins can insert/update/delete
CREATE POLICY "component_resources_select_all" ON public.component_resources FOR SELECT USING (true);
CREATE POLICY "component_resources_insert_admin" ON public.component_resources FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "component_resources_update_admin" ON public.component_resources FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "component_resources_delete_admin" ON public.component_resources FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
