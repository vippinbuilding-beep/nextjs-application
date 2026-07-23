-- Raises the product description limit from 255 to 5000 characters so
-- creators can write more detailed descriptions. Long descriptions are
-- truncated with a "Mostrar mais" toggle in the UI, not capped this low.

alter table public.products
  drop constraint if exists products_description_len;
alter table public.products
  add constraint products_description_len
  check (description is null or char_length(description) <= 5000);
