-- Run in Supabase SQL editor (or your migration tool) so Space card colors can be saved.
alter table public.goal_sets
  add column if not exists card_color text;

comment on column public.goal_sets.card_color is 'Hex from schedule event palette; UI blends with panel for a lighter card background.';
