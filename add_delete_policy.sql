-- Add policy for post owners to delete their own posts
CREATE POLICY "Post owners can delete own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);