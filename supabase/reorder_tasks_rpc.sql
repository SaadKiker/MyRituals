-- One transaction, two passes — avoids duplicate (task_list_id, sort_order) mid-update.
-- Run in Supabase SQL Editor once.

create or replace function public.reorder_tasks(p_task_list_id uuid, p_task_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  i int;
  n int;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  n := coalesce(array_length(p_task_ids, 1), 0);
  if n = 0 then
    return;
  end if;

  for i in 1..n loop
    update public.tasks
    set sort_order = 1000000 + (i - 1)
    where id = p_task_ids[i]
      and task_list_id = p_task_list_id
      and user_id = uid;
  end loop;

  for i in 1..n loop
    update public.tasks
    set sort_order = i - 1
    where id = p_task_ids[i]
      and task_list_id = p_task_list_id
      and user_id = uid;
  end loop;
end;
$$;

revoke all on function public.reorder_tasks(uuid, uuid[]) from public;
grant execute on function public.reorder_tasks(uuid, uuid[]) to authenticated;
