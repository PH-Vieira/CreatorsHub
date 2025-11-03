-- Supabase Setup SQL for CreatorsHub (non-destructive)
-- Run this in the Supabase SQL Editor
-- Script uses CREATE IF NOT EXISTS / ALTER so existing dados são preservados.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  document TEXT,
  avatar_url TEXT,
  role text[] DEFAULT ARRAY['viewer', 'creator']::text[] CHECK (role <@ ARRAY['admin', 'moderator', 'creator', 'viewer']::text[])
);

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT ARRAY['viewer', 'creator']::text[];

UPDATE public.users
  SET role = ARRAY['viewer', 'creator']::text[]
  WHERE COALESCE(array_length(role, 1), 0) = 0;

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_id UUID NOT NULL, -- Can reference posts or comments
  entity_type TEXT CHECK (entity_type IN ('post', 'comment')) NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(entity_id, entity_type, user_id, emoji) -- Prevent duplicate reactions
);

ALTER TABLE public.reactions
  DROP CONSTRAINT IF EXISTS reactions_entity_type_check,
  ADD CONSTRAINT reactions_entity_type_check CHECK (entity_type IN ('post', 'comment'));

-- Create votes tables for posts and comments
CREATE TABLE IF NOT EXISTS public.post_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  value SMALLINT CHECK (value IN (-1, 1)) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.comment_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  value SMALLINT CHECK (value IN (-1, 1)) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.post_votes
  DROP CONSTRAINT IF EXISTS post_votes_value_check,
  ADD CONSTRAINT post_votes_value_check CHECK (value IN (-1, 1));

ALTER TABLE public.comment_votes
  DROP CONSTRAINT IF EXISTS comment_votes_value_check,
  ADD CONSTRAINT comment_votes_value_check CHECK (value IN (-1, 1));

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorite_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_posts ENABLE ROW LEVEL SECURITY;

-- Function to check if user is admin (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  roles TEXT[];
BEGIN
  SELECT role INTO roles FROM public.users WHERE id = user_id;
  RETURN roles IS NOT NULL AND 'admin' = ANY(roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is creator or admin
CREATE OR REPLACE FUNCTION public.is_creator_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  roles TEXT[];
BEGIN
  SELECT role INTO roles FROM public.users WHERE id = user_id;
  RETURN roles IS NOT NULL AND ('creator' = ANY(roles) OR 'admin' = ANY(roles));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is moderator or admin
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  roles TEXT[];
BEGIN
  SELECT role INTO roles FROM public.users WHERE id = user_id;
  RETURN roles IS NOT NULL AND ('moderator' = ANY(roles) OR 'admin' = ANY(roles));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can view own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view own profile" ON public.users
      FOR SELECT USING (auth.uid() = id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Admins can view all users'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all users" ON public.users
      FOR SELECT USING (public.is_admin(auth.uid()))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Admins can update user roles'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update user roles" ON public.users
      FOR UPDATE USING (public.is_admin(auth.uid()))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can update own profile data'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own profile data" ON public.users
      FOR UPDATE USING (auth.uid() = id)
      WITH CHECK (
        auth.uid() = id
        AND NOT (ARRAY[''admin'', ''moderator'']::text[] && COALESCE(role, ARRAY[]::text[]))
      )';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Anyone can view public profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view public profiles" ON public.users
      FOR SELECT USING (true)';
  END IF;
END;
$$;

-- RLS Policies for posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Anyone can view posts'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Creators and admins can create posts'
  ) THEN
    EXECUTE 'CREATE POLICY "Creators and admins can create posts" ON public.posts
      FOR INSERT WITH CHECK (public.is_creator_or_admin(auth.uid()))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Admins can update posts'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update posts" ON public.posts
      FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Admins can delete posts'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can delete posts" ON public.posts
      FOR DELETE USING (public.is_admin(auth.uid()))';
  END IF;
END;
$$;

-- RLS Policies for comments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'Anyone can view comments'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'Logged-in users can create comments'
  ) THEN
    EXECUTE 'CREATE POLICY "Logged-in users can create comments" ON public.comments
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'Admins and moderators can delete comments'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins and moderators can delete comments" ON public.comments
      FOR DELETE USING (public.is_moderator_or_admin(auth.uid()))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'Post owners can update comments'
  ) THEN
    EXECUTE 'CREATE POLICY "Post owners can update comments" ON public.comments
      FOR UPDATE USING (
        auth.uid() = (
          SELECT user_id FROM public.posts WHERE id = post_id
        ) OR public.is_admin(auth.uid())
      ) WITH CHECK (
        auth.uid() = (
          SELECT user_id FROM public.posts WHERE id = post_id
        ) OR public.is_admin(auth.uid())
      )';
  END IF;
END;
$$;

-- RLS Policies for reactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reactions' AND policyname = 'Anyone can view reactions'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view reactions" ON public.reactions FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reactions' AND policyname = 'Logged-in users can create reactions'
  ) THEN
    EXECUTE 'CREATE POLICY "Logged-in users can create reactions" ON public.reactions
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reactions' AND policyname = 'Users can delete own reactions'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete own reactions" ON public.reactions
      FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END;
$$;

-- Policies for votes and favorites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_votes' AND policyname = 'Anyone can view post votes'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view post votes" ON public.post_votes FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_votes' AND policyname = 'Users can manage own post votes'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can manage own post votes" ON public.post_votes
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comment_votes' AND policyname = 'Anyone can view comment votes'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view comment votes" ON public.comment_votes FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comment_votes' AND policyname = 'Users can manage own comment votes'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can manage own comment votes" ON public.comment_votes
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_posts' AND policyname = 'Users can view own favorites'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view own favorites" ON public.favorite_posts
      FOR SELECT USING (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_posts' AND policyname = 'Users can manage own favorites'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can manage own favorites" ON public.favorite_posts
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END;
$$;

-- Create storage buckets for media and avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, public = EXCLUDED.public;

-- Storage policies for media bucket
-- Everyone can view media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can view media'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view media" ON storage.objects
      FOR SELECT USING (bucket_id = ''post-images'')';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Creators and admins can upload media'
  ) THEN
    EXECUTE 'CREATE POLICY "Creators and admins can upload media" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = ''post-images'' AND public.is_creator_or_admin(auth.uid())
      )';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can view avatars'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view avatars" ON storage.objects
      FOR SELECT USING (bucket_id = ''profile-avatars'')';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload avatars'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = ''profile-avatars'' AND auth.uid() IS NOT NULL
      )';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update avatars'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can update avatars" ON storage.objects
      FOR UPDATE USING (
        bucket_id = ''profile-avatars'' AND auth.uid() = owner
      ) WITH CHECK (
        bucket_id = ''profile-avatars'' AND auth.uid() = owner
      )';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can delete avatars'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can delete avatars" ON storage.objects
      FOR DELETE USING (
        bucket_id = ''profile-avatars'' AND auth.uid() = owner
      )';
  END IF;
END;
$$;

-- Function to handle new user signup (set role to null)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta JSONB := NEW.raw_user_meta_data;
BEGIN
  INSERT INTO public.users (id, email, username, full_name, phone, document, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(meta->>'username', ''),
    NULLIF(meta->>'full_name', ''),
    NULLIF(meta->>'phone', ''),
    NULL,
    NULLIF(meta->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;