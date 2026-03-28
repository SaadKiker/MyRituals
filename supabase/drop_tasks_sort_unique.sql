-- Reorder updates set sort_order 0..n-1 one row at a time; a UNIQUE (task_list_id, sort_order)
-- index makes those updates fail mid-flight. Habits use the same client loop without this constraint.
drop index if exists public.ux_tasks_list_sort;
