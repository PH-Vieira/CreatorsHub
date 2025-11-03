-- Add indexes to optimize queries in CreatorsHub
-- Run this in Supabase SQL Editor

-- Index for posts ordering (is_pinned, pinned_at, created_at)
CREATE INDEX IF NOT EXISTS idx_posts_ordering ON public.posts (is_pinned DESC, pinned_at DESC NULLS LAST, created_at DESC);

-- Index for posts user_id (for joins)
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts (user_id);

-- Index for comments post_id
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);

-- Index for comments created_at (for ordering)
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments (created_at DESC);

-- Index for post_votes post_id
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON public.post_votes (post_id);

-- Index for comment_votes comment_id
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON public.comment_votes (comment_id);

-- Index for favorite_posts user_id
CREATE INDEX IF NOT EXISTS idx_favorite_posts_user_id ON public.favorite_posts (user_id);

-- Index for reactions entity
CREATE INDEX IF NOT EXISTS idx_reactions_entity ON public.reactions (entity_id, entity_type);