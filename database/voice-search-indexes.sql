-- ============================================================================
-- SONUM RELATIONAL DATABASE SCHEMA & SEARCH INDEX MIGRATION
-- Target Database: PostgreSQL / Supabase Relational Engine
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Users Account Table (Supabase Auth-aligned)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL DEFAULT 'client' CHECK (user_role IN ('client', 'talent')),
    company_name VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE public.users DROP COLUMN password_hash;
    END IF;
END $$;

-- 2. Talent Vocal Profiles Table
CREATE TABLE IF NOT EXISTS public.talent_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    gender VARCHAR(50) NOT NULL,
    primary_language VARCHAR(100) NOT NULL,
    accent VARCHAR(100) NOT NULL,
    vocal_style VARCHAR(100) NOT NULL,
    tone VARCHAR(255) NOT NULL,
    sounding_age VARCHAR(50) NOT NULL,
    turnaround_hours INT DEFAULT 24,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    usage_rights_scope VARCHAR(100) DEFAULT 'local-radio',
    bio TEXT,
    microphone VARCHAR(255),
    audio_interface VARCHAR(255),
    room_treatment VARCHAR(255),
    rating DECIMAL(3, 2) DEFAULT 5.00,
    reviews_count INT DEFAULT 0,
    projects_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Dynamic Voice Tags Lookup Table
CREATE TABLE IF NOT EXISTS public.talent_tags (
    tag_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tag_name VARCHAR(100) UNIQUE NOT NULL
);

-- 4. Voice Tags Mapping Table
CREATE TABLE IF NOT EXISTS public.talent_profile_tags (
    talent_id UUID REFERENCES public.talent_profiles(user_id) ON DELETE CASCADE,
    tag_id INT REFERENCES public.talent_tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (talent_id, tag_id)
);

-- 5. Offloaded Cloud Audio Demo Reels Table
CREATE TABLE IF NOT EXISTS public.talent_demo_reels (
    reel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id UUID REFERENCES public.talent_profiles(user_id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    audio_url VARCHAR(1024) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Detailed Casting Calls Table
CREATE TABLE IF NOT EXISTS public.casting_calls (
    casting_call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    script_text TEXT,
    word_count INT NOT NULL,
    usage_rights_scope VARCHAR(100) NOT NULL,
    budget_range VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audition Submissions Table
CREATE TABLE IF NOT EXISTS public.auditions (
    audition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    casting_call_id UUID REFERENCES public.casting_calls(casting_call_id) ON DELETE CASCADE,
    talent_id UUID REFERENCES public.talent_profiles(user_id) ON DELETE CASCADE,
    file_url VARCHAR(1024) NOT NULL,
    rate_quote DECIMAL(10, 2) NOT NULL,
    delivery_hours INT NOT NULL,
    revision_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Detailed Job Postings Table
CREATE TABLE IF NOT EXISTS public.job_postings (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    word_count INT NOT NULL,
    usage_rights VARCHAR(255) NOT NULL,
    budget_range VARCHAR(100) NOT NULL,
    script_url VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Casting Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.job_postings(job_id) ON DELETE SET NULL,
    talent_id UUID REFERENCES public.talent_profiles(user_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'review', 'completed')),
    amount DECIMAL(10, 2) NOT NULL,
    deadline DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Secure Escrow Transactions Table
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(booking_id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded')),
    funded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP WITH TIME ZONE
);

-- 11. Usage Rights Pricing Matrix
CREATE TABLE IF NOT EXISTS public.usage_rights_pricing (
    scope VARCHAR(100) PRIMARY KEY,
    multiplier DECIMAL(4, 2) NOT NULL,
    description TEXT
);

INSERT INTO public.usage_rights_pricing (scope, multiplier, description) VALUES
    ('local-radio', 1.10, 'Local radio or single-market broadcast'),
    ('national-tv', 2.40, 'National television broadcast'),
    ('perpetual-buyout', 3.60, 'Permanent buyout or unlimited usage')
ON CONFLICT (scope) DO NOTHING;

-- ============================================================================
-- DATABASE OPTIMIZATION & INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_talent_profiles_voice_filters
ON public.talent_profiles (gender, primary_language, accent, vocal_style);

CREATE INDEX IF NOT EXISTS idx_talent_profiles_turnaround_rate
ON public.talent_profiles (turnaround_hours, hourly_rate);

CREATE INDEX IF NOT EXISTS idx_talent_profiles_usage_rights
ON public.talent_profiles (usage_rights_scope);

CREATE INDEX IF NOT EXISTS idx_talent_demo_reels_category
ON public.talent_demo_reels (talent_id, category);

CREATE INDEX IF NOT EXISTS idx_talent_profiles_trgm_search
ON public.talent_profiles USING gin (
    (primary_language || ' ' || accent || ' ' || vocal_style || ' ' || tone) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_profile_tags_talent ON public.talent_profile_tags (talent_id);
CREATE INDEX IF NOT EXISTS idx_profile_tags_tag ON public.talent_profile_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_bookings_talent_status ON public.bookings (talent_id, status);
CREATE INDEX IF NOT EXISTS idx_escrow_booking ON public.escrow_transactions (booking_id);

-- ============================================================================
-- Supabase Auth Replication Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (id, auth_user_id, email, full_name, user_role, metadata)
    VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data ->> 'user_role', 'client'),
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
