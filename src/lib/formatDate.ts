// UTC on purpose: the API dates are UTC instants, and the reader has to see the
// same day in every time zone (2026-09-19T02:26:27Z is still the 18th in São Paulo).
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatDate(iso: string): string {
  const date = new Date(iso)
  // sortPosts keeps a post with a broken date in the list, so it has to render
  // too: Intl throws a RangeError on an invalid date.
  return Number.isNaN(date.getTime()) ? '' : formatter.format(date)
}
