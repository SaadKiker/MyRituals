/**
 * Reassign sort_order to 0..n-1 without violating unique (scope, sort_order) indexes.
 * Updating rows in place would temporarily duplicate sort_order values; staging avoids that.
 *
 * Task lists / tasks use unique indexes (see supabase/task_lists_and_tasks.sql). Goal sets use
 * the same naive loop in the UI but typically have no such unique index, so simple updates succeed.
 */
export const SORT_ORDER_STAGING_BASE = 1_000_000

export async function applySequentialSortOrders<T extends { id: string }>(
  items: T[],
  patch: (id: string, sortOrder: number) => Promise<{ error: { message?: string } | null }>,
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const { error } = await patch(items[i].id, SORT_ORDER_STAGING_BASE + i)
    if (error) return
  }
  for (let i = 0; i < items.length; i++) {
    const { error } = await patch(items[i].id, i)
    if (error) return
  }
}
