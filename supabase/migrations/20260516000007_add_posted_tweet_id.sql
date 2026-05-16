-- scheduled_posts に posted_tweet_id カラムを追加
ALTER TABLE scheduled_posts
  ADD COLUMN posted_tweet_id TEXT;

COMMENT ON COLUMN scheduled_posts.posted_tweet_id IS '投稿完了時のX tweet ID（投稿失敗・未投稿時はNULL）';
