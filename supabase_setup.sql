-- Supabase Setup SQL for CreatorsHub
-- Run this in the Supabase SQL Editor

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.reactions CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing bucket if exists
DELETE FROM storage.buckets WHERE id = 'post-images';
DELETE FROM storage.buckets WHERE id = 'profile-avatars';

-- Drop existing storage policies
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Creators and admins can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  document TEXT,
  avatar_url TEXT,
  role text[] DEFAULT '{}' CHECK (role <@ ARRAY['admin', 'moderator', 'creator', 'viewer']::text[])
);

-- Create posts table
CREATE TABLE public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reactions table
CREATE TABLE public.reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_id UUID NOT NULL, -- Can reference posts or comments
  entity_type TEXT CHECK (entity_type IN ('post', 'comment')) NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(entity_id, entity_type, user_id, emoji) -- Prevent duplicate reactions
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

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
-- Users can read their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Admins can update roles
CREATE POLICY "Admins can update user roles" ON public.users
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- RLS Policies for posts
-- Everyone can view posts
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);

-- Creators and admins can create posts
CREATE POLICY "Creators and admins can create posts" ON public.posts
  FOR INSERT WITH CHECK (public.is_creator_or_admin(auth.uid()));

-- Admins can delete posts
CREATE POLICY "Admins can delete posts" ON public.posts
  FOR DELETE USING (public.is_admin(auth.uid()));

-- RLS Policies for comments
-- Everyone can view comments
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);

-- Logged-in users can create comments
CREATE POLICY "Logged-in users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Admins and moderators can delete comments
CREATE POLICY "Admins and moderators can delete comments" ON public.comments
  FOR DELETE USING (public.is_moderator_or_admin(auth.uid()));

-- RLS Policies for reactions
-- Everyone can view reactions
CREATE POLICY "Anyone can view reactions" ON public.reactions FOR SELECT USING (true);

-- Logged-in users can create reactions
CREATE POLICY "Logged-in users can create reactions" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage buckets for media and avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-avatars', 'profile-avatars', true);

-- Storage policies for media bucket
-- Everyone can view media
CREATE POLICY "Anyone can view media" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');

-- Creators and admins can upload media
CREATE POLICY "Creators and admins can upload media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-images' AND public.is_creator_or_admin(auth.uid())
  );

-- Storage policies for profile avatars bucket
-- Everyone can view avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-avatars');

-- Authenticated users can upload avatars
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-avatars' AND auth.uid() IS NOT NULL
  );

-- Authenticated users can update their avatars
CREATE POLICY "Authenticated users can update avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-avatars' AND auth.uid() = owner
  ) WITH CHECK (
    bucket_id = 'profile-avatars' AND auth.uid() = owner
  );

-- Authenticated users can delete their avatars
CREATE POLICY "Authenticated users can delete avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-avatars' AND auth.uid() = owner
  );

-- Function to handle new user signup (set role to null)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, full_name, phone, document, avatar_url, role)
  VALUES (NEW.id, NEW.email, NULL, NULL, NULL, NULL, NULL, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();