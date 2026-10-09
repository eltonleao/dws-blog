import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// These tests read the real files of src/content/posts/. They do not import the
// product parser, so they fail on the files and not on a missing module. The 26
// posts of the API are written out here, id and slug, so a missing, extra or
// renamed file shows up as a difference against this list.
// Vitest runs from the root of the repository (the jsdom environment has no file: URL for the test).
const POSTS_DIR = `${resolve(process.cwd(), 'src/content/posts')}/`

const POSTS = [
  { id: 'cc8a8c63-2f82-4745-8b6e-28f88ff73fdd', slug: 'tech-innovations-in-healthcare', title: 'Tech Innovations in Healthcare' },
  { id: '4b7c7be8-b6e0-40f4-a971-45fd1d8575c2', slug: 'climate-change-and-its-effects', title: 'Climate Change and Its Effects' },
  { id: '6799f738-8bb3-43fa-8ff2-2733c60bc46d', slug: 'fitness-routines-for-athletes', title: 'Fitness Routines for Athletes' },
  { id: '24c69a24-e582-4149-8307-6e2520cb50a6', slug: 'best-hiking-trails-in-asia', title: 'Best Hiking Trails in Asia' },
  { id: '82fdea80-5b49-44ea-99df-47814c564d1c', slug: 'healthy-eating-habits', title: 'Healthy Eating Habits' },
  { id: 'b5ac3cf0-7e43-48eb-9340-3f4e8ea31d94', slug: 'dressing-up-for-winter', title: 'Dressing Up for Winter' },
  { id: '9f8a8a6f-fb78-4329-bab5-b69dc0d45b5c', slug: 'impact-of-tech-on-education', title: 'Impact of Tech on Education' },
  { id: 'd17eac80-99d7-45be-81ab-24ad8c2ddc68', slug: 'summer-fashion-essentials', title: 'Summer Fashion Essentials' },
  { id: '03f92f4a-9828-472d-99cf-e87e1f4bc925', slug: 'the-future-of-ai-in-technology', title: 'The Future of AI in Technology' },
  { id: '6ed9bde4-96e7-4f12-a75a-73a4d2349e78', slug: 'fashion-trends-for-the-summer', title: 'Fashion Trends for the Summer' },
  { id: '568d5a32-9b2e-4906-84d2-e09af6f1ea1d', slug: 'gourmet-recipes-to-try-at-home', title: 'Gourmet Recipes to Try at Home' },
  { id: 'd7248c90-ec16-4aef-80f6-24e2caba55d3', slug: 'innovations-in-sports-technology', title: 'Innovations in Sports Technology' },
  { id: 'e9056b12-82f5-4869-80a6-5f788d238a45', slug: 'emerging-technologies-in-sports', title: 'Emerging Technologies in Sports' },
  { id: 'a70f64b8-6b76-41f7-97a7-0233c0b76189', slug: 'vegan-recipes-for-beginners', title: 'Vegan Recipes for Beginners' },
  { id: 'ac3e789d-c6e2-4d5d-a013-54c56b2fae2f', slug: 'breakthroughs-in-medical-science', title: 'Breakthroughs in Medical Science' },
  { id: 'c92f5a4c-0f4d-404b-8a5d-7225b82b8f7f', slug: 'health-benefits-of-regular-exercise', title: 'Health Benefits of Regular Exercise' },
  { id: 'e0f61859-6566-4b0b-93f6-4d9a4e1281c5', slug: 'best-road-trips-in-europe', title: 'Best Road Trips in Europe' },
  { id: '5e9989f4-8d56-42f1-9187-72ddcf3cf7e6', slug: 'understanding-quantum-physics', title: 'Understanding Quantum Physics' },
  { id: 'ce898da7-f0fb-4bff-aeeb-5f8e240e77a5', slug: 'technology-in-the-creative-indutries', title: 'Technology in the Creative Indutries' },
  { id: '7f20a58b-23c6-4b1a-8331-e0b758482c51', slug: 'cooking-tips-for-beginners', title: 'Cooking Tips for Beginners' },
  { id: 'b0b1f540-6b1b-4e6e-94a2-2d5d3d76c911', slug: 'hidden-gems-to-visit-worldwide', title: 'Hidden Gems to Visit Worldwide' },
  { id: '3e1f5c76-e3d2-4d5a-b5a3-774a3736473d', slug: 'athlete-nutrition-tips', title: 'Athlete Nutrition Tips' },
  { id: '32a244d2-c9e4-47e2-9f71-1877b67f292d', slug: 'how-to-style-your-wardrobe', title: 'How to Style Your Wardrobe' },
  { id: '1e758e26-d7f3-4dbb-8a7e-6b24a314fbb1', slug: 'latest-advances-in-space-exploration', title: 'Latest Advances in Space Exploration' },
  { id: '5c5c9c34-dc5b-41b5-82d6-3eb1c32896b8', slug: 'breakthroughs-in-genetics', title: 'Breakthroughs in Genetics' },
  { id: '3a66f5c7-c9d5-481e-9e4f-9fbb8b12c8e0', slug: 'top-travel-destinations-for-2024', title: 'Top Travel Destinations for 2024' },
] as const

const EXPECTED_FILES = POSTS.map((post) => `${post.slug}.en.md`).sort()

const actualFiles = () =>
  existsSync(POSTS_DIR) ? readdirSync(POSTS_DIR).filter((name) => name.endsWith('.en.md')).sort() : []

interface ParsedFile {
  id: string
  title: string
  paragraphs: string[]
}

// A minimal reading of the format of the design: front matter with the id, a "# " title, then the paragraphs.
function read(slug: string): ParsedFile {
  const raw = readFileSync(`${POSTS_DIR}${slug}.en.md`, 'utf8')
  const match = /^---\r?\nid: (.+?)\r?\n---\r?\n# (.+?)\r?\n([\s\S]*)$/.exec(raw)
  if (!match) throw new Error(`${slug}.en.md does not follow the file format`)
  const paragraphs = match[3]
    .split(/\r?\n\s*\r?\n/)
    .map((text) => text.trim())
    .filter(Boolean)
  return { id: match[1].trim(), title: match[2].trim(), paragraphs }
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length

const FORBIDDEN = ['study', 'studies', 'research', 'survey', 'percent', 'according to']
const WORDS_RANGE: [number, number] = [220, 380]
const QUOTES = /["\u201C\u201D\u00AB\u00BB]/

/** Every rule of the writing, for the body of one file; the list is empty when the file follows all of them. */
function violations(parsed: ParsedFile): string[] {
  const found: string[] = []
  const body = parsed.paragraphs.join('\n\n')
  if (/\d/.test(body)) found.push('has a digit')
  if (body.includes('%')) found.push('has a percent sign')
  if (QUOTES.test(body)) found.push('has a quotation mark')
  if (/https?:\/\/|www\./i.test(body)) found.push('has a URL')
  for (const word of FORBIDDEN) {
    if (new RegExp(`(?<![\\p{L}])${word}(?![\\p{L}])`, 'iu').test(body)) found.push(`has the word "${word}"`)
  }
  const count = parsed.paragraphs.length
  if (count < 4 || count > 6) found.push(`has ${count} paragraphs, wants 4 to 6`)
  const total = words(body)
  const [min, max] = WORDS_RANGE
  if (total < min || total > max) found.push(`has ${total} words, wants ${min} to ${max}`)
  const first = parsed.paragraphs[0] ? words(parsed.paragraphs[0]) : 0
  if (first === 0 || first > 60) found.push(`first paragraph has ${first} words, wants 1 to 60`)
  return found
}

describe('the post files', () => {
  it('K2 has exactly the 26 English files of the 26 posts, and no other', () => {
    expect(POSTS).toHaveLength(26)
    expect(actualFiles()).toEqual(EXPECTED_FILES)
  })

  for (const post of POSTS) {
    it(`K2 ${post.slug} carries the id and the title of the API`, () => {
      const en = read(post.slug)
      expect(en.id).toBe(post.id)
      expect(en.title).toBe(post.title)
    })
  }

  it('K2 uses each id once', () => {
    const ids = POSTS.map((post) => read(post.slug).id)
    expect(new Set(ids).size).toBe(26)
  })

  for (const post of POSTS) {
    it(`K3 ${post.slug} follows the writing rules`, () => {
      expect(violations(read(post.slug))).toEqual([])
    })
  }
})
