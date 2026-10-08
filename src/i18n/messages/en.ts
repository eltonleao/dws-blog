/**
 * The texts of the interface in English, the language every other one falls
 * back to. Keys are flat and dotted by the part of the interface that says
 * them. A plural is two keys, `base.one` and `base.other`, and `t(base, {
 * count })` picks one; `{name}` marks a value filled at run time.
 */
export const en = {
  'language.label': 'Language',

  'search.label': 'Search',
  'search.close': 'Close search',
  'search.clear': 'Clear search',

  'list.title': 'DWS blog',
  'list.loading': 'Loading posts',
  'list.empty': 'No posts found',
  'list.count.one': '{count} post',
  'list.count.other': '{count} posts',

  'filters.title': 'Filters',
  'filters.category': 'Category',
  'filters.author': 'Author',
  'filters.apply': 'Apply filters',
  'filters.clear': 'Clear filters',
  'filters.clearCategory': 'Clear category',
  'filters.clearAuthor': 'Clear author',

  'sort.label': 'Sort by:',
  'sort.newest': 'Newest first',
  'sort.oldest': 'Oldest first',
  'sort.sortedNewest': 'Sorted by newest first',
  'sort.sortedOldest': 'Sorted by oldest first',

  'status.error': 'Something went wrong',
  'status.retry': 'Try again',

  'post.loading': 'Loading post',
  'post.writtenBy': 'Written by:',
  'post.latest': 'Latest articles',

  'notFound.title': 'Post not found',
  'notFound.text':
    'There is no post at this address. It may have been removed, or the link may be wrong.',
  'notFound.seeAll': 'See all posts',

  'footer.back': 'Back to the blog',
} as const

export type MessageKey = keyof typeof en
