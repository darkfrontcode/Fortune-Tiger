export const findDueForUpdateQuery = `
  select *
  from "outbox_messages"
  where "published_at" is null
    and ("next_attempt_at" is null or "next_attempt_at" <= ?)
  order by "occurred_at" asc
  limit ?
  for update skip locked
`
