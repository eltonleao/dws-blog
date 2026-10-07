import type { FilterSelection, Post } from './types'

/** An empty selection matches everything; otherwise any one of the selected values is enough. */
function matchesAny(selected: string[], values: string[]): boolean {
  return selected.length === 0 || selected.some((value) => values.includes(value))
}

/**
 * Categories are matched by name and authors by id. Inside one list the
 * selection is an OR (a post needs any of them); between the two lists it is
 * an AND. A list that is empty does not filter.
 */
export function filterPosts(
  posts: Post[],
  { categories, authors }: FilterSelection,
): Post[] {
  return posts.filter(
    (post) =>
      matchesAny(categories, post.categories.map((category) => category.name)) &&
      matchesAny(authors, [post.author.id]),
  )
}
