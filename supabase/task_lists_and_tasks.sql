-- Tasks: list manager + tasks (ordering, completion, description)

create extension if not exists pgcrypto;

create table if not exists public.task_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  card_color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.task_lists
  add column if not exists card_color text;

create index if not exists idx_task_lists_user_sort
  on public.task_lists(user_id, sort_order);

create unique index if not exists ux_task_lists_user_sort
  on public.task_lists(user_id, sort_order);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_list_id uuid not null references public.task_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  description text,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_list_sort
  on public.tasks(task_list_id, sort_order);

create index if not exists idx_tasks_user
  on public.tasks(user_id);

create unique index if not exists ux_tasks_list_sort
  on public.tasks(task_list_id, sort_order);

alter table public.task_lists enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "task_lists_select_own" on public.task_lists;
create policy "task_lists_select_own"
  on public.task_lists for select
  using (auth.uid() = user_id);

drop policy if exists "task_lists_insert_own" on public.task_lists;
create policy "task_lists_insert_own"
  on public.task_lists for insert
  with check (auth.uid() = user_id);

drop policy if exists "task_lists_update_own" on public.task_lists;
create policy "task_lists_update_own"
  on public.task_lists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "task_lists_delete_own" on public.task_lists;
create policy "task_lists_delete_own"
  on public.task_lists for delete
  using (auth.uid() = user_id);

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);

