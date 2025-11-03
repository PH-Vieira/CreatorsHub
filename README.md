# CreatorsHub

A social platform for creators to share their work, built with Vue 3, Supabase, and Tailwind CSS.

## Features

- User authentication with role-based access
- Image uploads (up to 50MB)
- Creator feed with posts
- Role management via Supabase admin dashboard

## Tech Stack

- **Frontend**: Vue 3 + Composition API
- **Backend**: Supabase (Auth, Database, Storage)
- **State Management**: Pinia
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## Implementation Plan

### Phase 1: Core Functionality (Priority)

#### 1. Database Schema Setup
- **Users Table**: Extend auth.users with profile data
  - `user_id` (UUID, FK to auth.users)
  - `username` (text, unique)
  - `full_name` (text)
  - `role` (text: 'creator', 'admin', 'viewer')
  - `avatar_url` (text, nullable)
  - `bio` (text, nullable)
  - `created_at` (timestamp)

- **Posts Table**:
  - `id` (UUID, PK)
  - `user_id` (UUID, FK to profiles)
  - `title` (text)
  - `content` (text)
  - `image_url` (text, nullable)
  - `image_size` (bigint, nullable) - for validation
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

#### 2. Supabase Configuration
- **Storage Bucket**: `post-images`
  - Public access: true
  - File size limit: 50MB
  - Allowed MIME types: image/*

- **Row Level Security (RLS) Policies**:
  - Users can read all profiles
  - Users can update their own profile
  - Only admins can change user roles
  - Users can create posts
  - Users can update/delete their own posts
  - All users can read posts

#### 3. Authentication & Role Management
- Implement role-based routing guards
- Create user profile management
- Admin dashboard access for role assignment

#### 4. File Upload System
- Image upload component with validation
- Progress indicators
- Error handling for oversized files
- Supabase Storage integration

#### 5. Post Creation & Feed
- Post creation form with image upload
- Real-time feed updates
- Basic post display with images

### Phase 2: UI Polish & Enhancements (After Core Works)

#### 6. Enhanced UI Components
- Improved image galleries
- Better loading states
- Error boundaries
- Responsive design optimization

#### 7. Advanced Features
- Image compression/optimization
- Post likes/comments
- User following system
- Search functionality
- Notifications

## Setup Instructions

### Prerequisites
- Node.js 20+ or 22+
- Supabase account and project

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd CreatorsHub
```

2. Install dependencies
```bash
npm install
```

3. Configure Supabase
- Update `src/lib/supabase.js` with your project URL and anon key
- Set up database tables and policies in Supabase dashboard

4. Run development server
```bash
npm run dev
```

### Database Setup

Run the following SQL in your Supabase SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('creator', 'admin', 'viewer')),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  image_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Posts policies
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true);

-- Storage policies
CREATE POLICY "Images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'post-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, raw_user_meta_data->>'username', raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development Workflow

1. **Start with core functionality**: Focus on getting authentication, basic posting, and image uploads working
2. **Test thoroughly**: Ensure role checks and upload validation work correctly
3. **UI polish**: Only after core features are stable, improve the visual design
4. **Performance**: Optimize image loading and feed performance before adding advanced features

## Deployment

```bash
npm run build
npm run preview
```

Deploy the `dist` folder to your hosting provider.
