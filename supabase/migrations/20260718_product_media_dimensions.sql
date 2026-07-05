-- Persist thumbnail and media dimensions so banners and the video player
-- can reserve the correct aspect ratio before images/videos load in the browser.

alter table public.products
  add column if not exists thumbnail_width integer,
  add column if not exists thumbnail_height integer,
  add column if not exists media_width integer,
  add column if not exists media_height integer;
