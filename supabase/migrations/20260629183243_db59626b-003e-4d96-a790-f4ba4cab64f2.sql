
-- =========================================================
-- SE7EN FIT — Stage 2: Foundation schema, roles, RLS
-- =========================================================

-- ---------- Helpers ----------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- Enums ----------
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','gym_owner','gym_staff','member');
CREATE TYPE public.gym_status AS ENUM ('pending','active','suspended','cancelled');
CREATE TYPE public.request_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.code_status AS ENUM ('unused','used','revoked','expired');

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- user_roles ----------
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  gym_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, gym_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.owns_gym(_user_id UUID, _gym_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'gym_owner' AND gym_id = _gym_id
  );
$$;

-- profiles policies
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_roles policies (read own; super_admin manages)
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Super admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- ---------- gyms ----------
CREATE TABLE public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  country TEXT,
  gym_type TEXT,
  member_capacity INT,
  status public.gym_status NOT NULL DEFAULT 'pending',
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gyms TO authenticated;
GRANT ALL ON public.gyms TO service_role;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER gyms_updated BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Owners read own gym" ON public.gyms
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));
CREATE POLICY "Owners update own gym" ON public.gyms
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id AND status = 'active')
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins manage gyms" ON public.gyms
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------- gym_owner_requests (public submit) ----------
CREATE TABLE public.gym_owner_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_name TEXT NOT NULL,
  owner_full_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_phone TEXT,
  city TEXT,
  country TEXT,
  gym_type TEXT,
  estimated_members INT,
  current_software TEXT,
  requirements TEXT,
  status public.request_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  source_ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.gym_owner_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.gym_owner_requests TO authenticated;
GRANT ALL ON public.gym_owner_requests TO service_role;
ALTER TABLE public.gym_owner_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER gym_requests_updated BEFORE UPDATE ON public.gym_owner_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone can submit request" ON public.gym_owner_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read requests" ON public.gym_owner_requests
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update requests" ON public.gym_owner_requests
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------- unique_access_codes (server-only) ----------
CREATE TABLE public.unique_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.gym_owner_requests(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  code_prefix TEXT NOT NULL,
  status public.code_status NOT NULL DEFAULT 'unused',
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.unique_access_codes TO service_role;
ALTER TABLE public.unique_access_codes ENABLE ROW LEVEL SECURITY;
-- No client policies: validation happens only via edge function with service role.

-- ---------- gym_members ----------
CREATE TABLE public.gym_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  membership_tier TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_members TO authenticated;
GRANT ALL ON public.gym_members TO service_role;
ALTER TABLE public.gym_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER gym_members_updated BEFORE UPDATE ON public.gym_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Owner manages members" ON public.gym_members
  FOR ALL TO authenticated
  USING (public.owns_gym(auth.uid(), gym_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.owns_gym(auth.uid(), gym_id) OR public.is_admin(auth.uid()));
CREATE POLICY "Member reads own record" ON public.gym_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---------- attendance ----------
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.gym_members(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  method TEXT
);
GRANT SELECT, INSERT, UPDATE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (public.owns_gym(auth.uid(), gym_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.owns_gym(auth.uid(), gym_id) OR public.is_admin(auth.uid()));
CREATE POLICY "Member reads own attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gym_members m WHERE m.id = attendance.member_id AND m.user_id = auth.uid()));

-- ---------- equipment ----------
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  quantity INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'operational',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER equipment_updated BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Owner manages equipment" ON public.equipment
  FOR ALL TO authenticated
  USING (public.owns_gym(auth.uid(), gym_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.owns_gym(auth.uid(), gym_id) OR public.is_admin(auth.uid()));

-- ---------- system_settings (admin-only) ----------
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read settings" ON public.system_settings
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admins write settings" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- ---------- admin_unlock_attempts ----------
CREATE TABLE public.admin_unlock_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_code_prefix TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_unlock_attempts TO service_role;
ALTER TABLE public.admin_unlock_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read unlock attempts" ON public.admin_unlock_attempts
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ---------- login_attempts ----------
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  user_id UUID,
  scope TEXT NOT NULL, -- 'gym_owner' | 'admin'
  success BOOLEAN NOT NULL DEFAULT false,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read login attempts" ON public.login_attempts
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ---------- audit_logs ----------
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ---------- admin_2fa_secrets ----------
CREATE TABLE public.admin_2fa_secrets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_2fa_secrets TO service_role;
ALTER TABLE public.admin_2fa_secrets ENABLE ROW LEVEL SECURITY;
-- No client policies: edge functions only.

CREATE TRIGGER admin_2fa_updated BEFORE UPDATE ON public.admin_2fa_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Indexes ----------
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_gyms_owner ON public.gyms(owner_id);
CREATE INDEX idx_gym_members_gym ON public.gym_members(gym_id);
CREATE INDEX idx_attendance_gym ON public.attendance(gym_id);
CREATE INDEX idx_attendance_member ON public.attendance(member_id);
CREATE INDEX idx_equipment_gym ON public.equipment(gym_id);
CREATE INDEX idx_codes_request ON public.unique_access_codes(request_id);
CREATE INDEX idx_requests_status ON public.gym_owner_requests(status);
