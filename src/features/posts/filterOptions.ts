import type { FilterOption, Post } from './types'

function byLabel(a: FilterOption, b: FilterOption): number {
  return a.label.localeCompare(b.label, 'en')
}

/**
 * The options of the category and author filters, taken from the posts, in
 * alphabetical order. The API gives every post its own category record (the
 * same name under a different id), so categories are keyed by name and authors
 * by id: one option per name and per author.
 */
export function filterOptions(posts: Post[]): {
  categories: FilterOption[]
  authors: FilterOption[]
} {
  const categories = new Map<string, FilterOption>()
  const authors = new Map<string, FilterOption>()
  for (const post of posts) {
    for (const category of post.categories) {
      categories.set(category.name, { value: category.name, label: category.name })
    }
    authors.set(post.author.id, { value: post.author.id, label: post.author.name })
  }
  return {
    categories: [...categories.values()].sort(byLabel),
    authors: [...authors.values()].sort(byLabel),
  }
}
