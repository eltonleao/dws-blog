# DWS Blog

[![CI](https://github.com/eltonleao/dws-blog/actions/workflows/ci.yml/badge.svg)](https://github.com/eltonleao/dws-blog/actions/workflows/ci.yml)

The Dentsu World Services (DWS) front-end test. The brief asks for the two views of the design, the post list and a single post, pixel-perfect and mobile first, in pure React with hooks and no framework, styled without libraries like Material or Tailwind, with some form of state management for the reader's choices and a README that runs the app with `npm start`. Unit tests are a bonus.

This implementation builds both views from 320 to 1920 px wide, with the category and author filters, the search and the sort order the design draws, all of them mirrored in the URL. It is tested at four levels, the tests were written before the code, and every line of the test matrix has a mutant its test kills.

Live: https://dentsu.eltonleao.dev

Bug hunt: https://dentsu.eltonleao.dev/proof

Quick map: [Run it](#run-it) · [Design decisions](#design-decisions) · [Accessibility](#accessibility) · [Tests](#tests)

## Run it

```sh
nvm use      # Node 22, from .nvmrc
npm install
npm start    # http://localhost:5173
```

React Router 8 declares Node 22.22 or later. On an older Node 22, `npm install` warns `EBADENGINE` and everything still runs.

| Command | What it does |
|---|---|
| `npm start` | Vite dev server on http://localhost:5173 (`npm run dev` is the same) |
| `npm test` | unit and component tests: Vitest in jsdom, offline |
| `npm run test:watch` | the same, in watch mode |
| `npm run e2e` | builds the app, serves the build on port 4173 and runs the Playwright specs in Chromium |
| `npm run build` | type-checks the app and builds it to `dist/` |
| `npm run preview` | serves `dist/` |
| `npm run lint` | oxlint |
| `npm run typecheck` | the app, the tests and the configs |

Before the first `npm run e2e`, install the browser with `npx playwright install chromium`. With `E2E_BASE_URL` set, the specs run against that server and start none. It has to be a local address, such as a preview someone else started: the fixture refuses every request that leaves localhost, the deployed site included.

The app calls the live API at `https://tech-test-backend.dwsbrazil.io`. The tests never do. `npm test` prints one `MaxListenersExceededWarning` (11 `secureConnect` listeners on a `TLSSocket`), and it is not a network call: it comes from `@mswjs/interceptors` 0.45.7, the interceptor under MSW, which adds a listener on every request to a socket that keep-alive reuses. Only `PostListPage.test.tsx` makes enough requests to cross the limit of 10. It is not silenced, so a real leak would still show.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, the unit and component tests, the e2e suite and the build on every push and pull request to `master`, and keeps the Playwright report when something fails.

## Stack

| Piece | Why |
|---|---|
| React 19, TypeScript, Vite 8 | Pure React with hooks, as the brief asks. Vite builds and serves; there is no framework. React 19 hoists the post's `<title>` into `<head>`. |
| React Router 8, declarative mode | Four routes (`/`, `/posts/:id`, `/proof`, `*`) inside one layout route, which keeps the header and its search mounted from page to page. `/proof` loads in a chunk of its own, through `React.lazy`. `<BrowserRouter>`, `<Routes>` and `<Outlet />` are all it takes. |
| Redux Toolkit 2, React Redux 9 | One slice for the UI state the pages share. Why Redux at all is answered below. |
| RTK Query, inside Redux Toolkit | The server cache: one request feeds the list and the post page, with loading, error and retry, and no fetch in `useEffect`. |
| React Compiler 1.0 | Memoization at build time, through `@rolldown/plugin-babel` and `babel-plugin-react-compiler`. No hand-written `useMemo`, `useCallback` or `memo`. |
| CSS Modules over CSS custom properties | Scoped class names, no runtime, no UI library. The design tokens live in `src/styles/tokens.css`, the only file in `src/` with color values. |
| `@fontsource/open-sans` | The design's typeface, bundled with the app in the three weights it uses. |
| Vitest 5, Testing Library, MSW 3, jsdom | Unit and component tests on the same Vite config as the app, so they run the compiled components. |
| Playwright, `@axe-core/playwright` | End-to-end flows, layout measurements and accessibility scans in a real browser. |
| oxlint | Lint, with the Rules of Hooks as errors. |

**Why Redux.** The Redux FAQ quotes Dan Abramov: "Don't use Redux until you have problems with vanilla React." It says Redux pays off when there are "large amounts of application state that are needed in many places in the app". This app is small, and React state with a context would work. Two things tipped it. The posts are shared by two routes, and RTK Query gives that cache, with its loading and error states, without hand-written fetching. The browse state (search, filters, order and the list's scroll position) is read by the header's search on every page, the filters, the sort button, the search panel and the grid, and it has to survive the trip to a post and back. Everything else stays in component state.

## Project layout

```
src/
  app/          makeStore, typed hooks, App, the routes and AppLayout (header, search, background)
  api/          postsApi (RTK Query) and parsePosts
  features/
    posts/      sort, filter, search, filter options, latest posts, selectors
    browse/     browseSlice, the URL codec, useBrowseUrlSync, useSearch
  components/   one folder per component: the .tsx, and a .module.css when it has styles
  pages/        PostListPage, PostPage, NotFoundPage, ProofPage
  proof/        the data of the bug hunt (proof.json), its types and its parsers
  lib/          formatDate, paragraphs, normalize, useMediaQuery
  styles/       tokens.css and global.css
  test/         setup, MSW server, renderApp, the API snapshot
public/         favicon.svg
e2e/            Playwright specs and fixtures
```

## State, in three layers

| Layer | Where | What it holds |
|---|---|---|
| Server | RTK Query, `src/api/postsApi.ts` | `getPosts`: every post in one request, cached across routes, with loading and error |
| Shared UI | `browseSlice`, `src/features/browse/` | `search`, `categories` (names), `authors` (ids), `order` and `listScrollY` |
| Local | `useState` in the component that owns it | the sidebar draft, the open dropdown and its active option, a broken image, the sort announcement; the open search panel belongs to `AppLayout` |

The slice's actions are events, not setters: `searchChanged`, `categoryToggled`, `authorToggled`, `filtersApplied`, `filtersCleared`, `orderToggled` and `listScrollSaved`. What the list shows is derived, never stored: `selectVisiblePosts` (`createSelector`) applies the search, then the filters, then the order. The filter options come from all the posts, and "Latest articles" from `latestPosts`.

## The URL mirrors the state

The query string carries `q` for the search, `category` repeated by name, `author` repeated by id, and `order=oldest`. Defaults stay out, so the initial state is a clean `/`. A filtered list reads like `/?q=a&category=Technology&order=oldest`, and a reload or a shared link opens it as it was.

The URL is read once, when the store is created: `makeStore({ search: window.location.search })` in `src/main.tsx`. From then on the store writes the URL, through `useBrowseUrlSync` on the list page, with `replace: true`, so typing adds no history entries. The one exception is the first key typed on a post: it opens the list with the term in a new entry, so Back returns to the post. The parser never throws: unknown keys and an unknown `order` are ignored.

The store stays the source. The post page has no query string, and Back still finds the list as it was, scroll position included. The logo links to `/` and keeps the filters; the URL catches up on the next render. The scroll position stays out of the URL on purpose, so a reload opens at the top. A post always opens at the top, and Back on a post opened directly goes to the list instead of leaving the site.

A reload on `/posts/{id}` works because routing happens on the client: `vite preview` falls back to `index.html`, and `vercel.json` rewrites every path to it.

## React Compiler instead of hand-written memoization

`vite.config.ts` adds the compiler next to the React plugin:

```ts
plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
```

`vitest.config.ts` merges that config, so the component tests run the compiled components. There is no `useMemo`, `useCallback` or `memo` in `src/`. Two checks show the compiler at work:

- With `npm start` running, the module the dev server sends imports the compiler runtime: `curl -s http://localhost:5173/src/components/PostCard/PostCard.tsx | grep compiler-runtime`.
- Test C20 renders the list at 375 px, counts the calls to `PostCard`, opens and closes the search panel, and the count must not move. Today it holds first because of where the state lives: `searchOpen` belongs to `AppLayout`, the page in its `<Outlet />` receives nothing from it, and opening the panel does not render the list page again, with or without the compiler. The compiler is what holds the grid when the page does render again, and the C20 mutant proves it: with the list page reading the panel's state through the Outlet context, C20 passes with the compiler and fails without it, the 26 cards rendered three times ("expected 78 to be 26").

## The API, and what the code does about it

Measured on Oct 6, 2026. `src/test/fixtures/posts.json` is the API as it answered that day.

| What the API does | What the code does |
|---|---|
| Every post has the same `createdAt`, so sorting by date alone changes nothing | `sortPosts` breaks ties by the position in the response (`apiIndex`): Newest is the API order, Oldest its reverse. An invalid date goes last in both orders. |
| The query string is ignored | One request for all posts. Search, filters and order run on the client. `/authors/` and `/categories/` go unused: the filter options come from the posts. |
| `GET /posts/{id}` answers 500 for an unknown id | The app never calls it. The post comes from the cached list through `selectFromResult`, so opening one costs no request, and an id the list lacks is "Post not found", not a server error. |
| Every post has the same body | Search looks at the title, the author name and the category names, never the body, where any word would match every post. |
| Six posts carry one category each, a record tied to that post; the rest have none | Categories are matched by name. Any category filter leaves out the posts without one. |
| Timestamps are UTC instants at 02:26 | Dates are formatted in UTC: "Sep 19, 2026" in every time zone. In São Paulo the local date would be the 18th. |

The response goes through `parsePosts` before it reaches the cache. A body that is not a list (an HTML page, an object, `null`) becomes the error screen with "Try again", not a crash. An item without an id, a title or an author name is dropped. A request that takes longer than 10 s is an error too.

## Design decisions

The design is a vector PDF, with no Figma link. Its screens are drawn at 1 pt per px, so sizes, colors, radii and the background glows were read from the vector, not estimated from screenshots. It has two frames, 375 and 1440, and no declared breakpoint. Where a screen and the component panel disagree, the screen of that breakpoint wins, because that is what a reviewer compares against.

| What the design leaves open | Decision |
|---|---|
| Screen or component panel | The screen: the card meta is 14 px on mobile and 12 px on desktop; Back is 32 px high on mobile and 48 px on desktop. |
| Sizes off the type scale | Mobile post title 26 px, "Filters" 24 px, post body on a 22 px line on mobile and 26 px on desktop. |
| When a filter applies | Mobile filters on each choice, with no apply button. Desktop waits for "Apply filters". Each screen shows it that way. |
| What the mobile search lists | The titles that match. Tapping one opens the post. |
| Search on the post | The design draws the post's header with the search, like the list's. The header lives in a layout route mounted once for every page: typing on a post opens the list with the term, the field keeps its focus, and Back returns to the post. |
| Card size | Fluid in the grid: one column, 343 x 369 px at 375, and three columns, 314 x 425 at 1440. The image is 150 px high on mobile and 196 px on desktop. |
| Summary length | Three lines under a one-line title, two under a two-line title, never half a line. The cut is the browser's line clamp, which ends on a whole word: "Etiam…". The PDF cuts mid-word, "Etiam d…"; matching it would take script that trims the text, so the summary stays cut by CSS. |
| Line breaks | Where the browser puts them, from the font's metrics: the text has no manual breaks. At 375 px the post's first paragraph fits "sed" at the end of its fourth line, where the PDF starts the fifth with it. |
| Post column on desktop | 875 px from x 281, for the image, the text, the divider and the "Latest articles" row, as the vector draws the image. Eight columns of the 1440 grid would give 877.3, and the vector's divider and card row measure 874; the code keeps one column. M5, written before the vector was read, expects 877 ± 2, so 875 sits on its lower edge. |
| Dropdown trigger | Click, never hover. |
| Breakpoint | 1024 px. From 320 to 1023, the mobile layout, fluid. The hook and the CSS use the same media query. |
| Pagination | None in the design: every post on the list, three under "Latest articles". |
| Wording | "Latest articles" at both sizes. The mobile screen says "Last articles", which reads as a typo, and copying it on one size only would be faithful to a mistake. The byline shows the author's name from the API, not the design's sample "Dentusu". |
| Data mapping | Date from `createdAt`, in UTC. Summary from the start of `content`, cut by CSS. Author from the `author` embedded in each post. |
| Background | The design's glows, with the position, size and opacity of the vector, under every page and moving with it, on a white base on mobile. A script renders the PDF and the app at the same size and compares the color, pixel by pixel, wherever no content covers the background, plus the mobile card's shadow and the desktop card's stroke, in four frames: the list and the post at 375 and 1440. |
| States the design does not draw | Loading: skeleton cards of card size and a `role="status"` text. Empty: "No posts found" with "Clear filters". Error: "Something went wrong" with "Try again", plus Back on the post. The messages are Primary Dark, like the titles: the gray of the Sort label fell to 4.19:1 on the pink glow at 768 px, and Primary Dark measures 13.41:1 at its lowest. Broken image: a Neutral Extra-Light block of the same size. Focus: a 2 px Accent 1 Medium outline, 2 px away. |
| Logo and favicon | The logo is one SVG path, merged from the 20 paths of the logo group on page 5 of the PDF and drawn in `currentColor` in the design's 203.69 x 21.6 box; against the PDF it differs by 0 px at 2x. The favicon, `public/favicon.svg`, is the logo's "d", white on a dark tab through `prefers-color-scheme`. |
| Icons | The control icons in `src/components/Icon/` are the paths of the vector, taken from the PDF the way the logo is, except the check and the bug, which the design does not draw. SVG, with no icon font and no icon library. |

The footer is the one element the design does not draw. Every page ends with it, under a hairline like the header's, and its one control is an outlined pill that leads to `/proof`, the bug hunt: "How this blog was tested: hunt the 56 planted bugs". It uses only the colors of `tokens.css` and the type of the blog, is at least 44 px high on a phone, and adds nothing above the end of the page, so the screens of the design stay as they were. On `/proof` the same pill reads "Back to the blog" and returns to the list as it was left.

Three deliberate deviations, for contrast (WCAG 1.4.3):

| Where | Design | Code |
|---|---|---|
| Dropdown pill text, hovered or with a choice (320 to 1023 px) | Secondary Medium `#D31450`. Measured pixel by pixel over the final background, it passes at 320 and 375 px (4.61:1 at its lowest), but from 768 to 1023 px a chosen author's whole name reaches the most saturated glow: 4.30:1 (4.45:1 at 414) | Secondary Dark `#8C1038`: 7.63:1 on the same worst pixel |
| Sort button, hovered | Light text on Accent 1 Medium `#009598`: 2.81:1 | Accent 1 Dark `#006C6E`: 4.80:1 |
| "See all posts", the link on the not-found page, which the design does not draw | Secondary Medium `#D31450`, the color of Back: 3.94:1 on the pink glow | Secondary Dark `#8C1038`: 6.91:1 at the worst point of a 102-width sweep |

Each one is one declaration in the component's CSS module, so going back to the design's color is a one-line change. The sidebar item is not a deviation: the pixel measurement first found it at 4.33:1 because the panel lacked the vector's `#EFEFF2` fill and a glow showed through it. With the fill, the design's colors give 5.23:1.

Two parts of the component panel have no room on the screens, and the code does not draw them:

| Where | Panel | Code |
|---|---|---|
| Author dropdown at 375 px, open or with a choice | The list opens at x 134, 314 px wide, and the chosen pill, 272 px, sits beside Category: both run past a 375 px screen | The list opens at the screen's 16 px margin, and the chosen pill wraps to the next row |
| Second look of the search button | A 48 px square at 15% Primary Dark, under a state name the PDF leaves unreadable | No separate button: the icon sits inside the field, which filters as you type, so nothing apart from the field takes hover or press |

The author's photo on the post follows the vector's box, not the photo's: the vector draws it whole, 91.8% of the circle's width and 109.75% of its height, 3.97% from its left and 10.5% from its top, and lets the circle cut it. That box falls on fractions of a pixel, where a browser lays an image out on whole ones, so the photo fills the circle's square and a CSS transform takes it to the vector's box. What is left is resampling: measured pixel by pixel against the PDF, outside the text, the byline differs in 0.526% of its pixels at 375 px, all of them inside the photo, and in 0.097% at 1440 px.

## Accessibility

Each control follows a pattern of the WAI-ARIA Authoring Practices Guide (APG).

| Control | APG pattern | In the code |
|---|---|---|
| Category and Author dropdowns, mobile | Listbox, multi-select | A button with `aria-haspopup="listbox"` and `aria-expanded` opens a `listbox` with `aria-multiselectable="true"` and `aria-selected` on each option. The list holds the focus and points at the active option with `aria-activedescendant`. Arrows, Home and End move; Space and Enter choose; Esc closes and returns the focus to the button. The button's name keeps the filter: "Category: Technology, Science". |
| Filter items, desktop sidebar | Button, toggle | `aria-pressed`, because the label never changes. |
| Sort | Button | The label says the current order, so there is no `aria-pressed`: the APG requires a toggle's label to stay the same. A polite live region announces the change: "Sorted by oldest first". |
| Search button, mobile | Disclosure | `aria-expanded`, and the name "Search". |
| Search panel, mobile | Dialog (modal) | `role="dialog"` with `aria-modal="true"`. The focus starts in the field. Esc and "Close search" close it, and the focus returns to the search button. The page under it is `inert`. |
| Search field, desktop | Search landmark | `<form role="search">` around an `<input type="search">` named "Search", in the header of every page. Enter does nothing. |
| Post card | Link | One native link per card, named by the title and stretched over the card, so a click anywhere opens the post and Tab stops once. The image is decorative (`alt=""`). |
| Result count | Live region | A visually hidden `aria-live="polite"` region says how many posts the list shows ("12 posts") when the search or the filters change it. |
| Loading, empty and error | Live region | `role="status"` for loading and empty, `role="alert"` for errors. |

The count has one known gap: the first count after arriving at the list from a post, by the first key typed there or by Back, is not announced. The region is created with its text when the list mounts, and NVDA and JAWS usually do not announce what a live region already holds when it appears. The keys after that are announced. The fix is to keep the region in the layout, which stays mounted between routes, as technique ARIA22 asks.

Opening a post moves the focus to its `h1` and sets the document title to "{title} | DWS Blog"; the not-found page does the same. Every focus stop shows a 2 px outline through `:focus-visible`, except the field of the mobile search panel, which shows the design's teal border instead. Mobile and desktop mount different controls, so only one set is ever in the accessibility tree. The skeleton cards stop pulsing under `prefers-reduced-motion`.

E9 walks the page with Tab and checks the outline at every stop. E10 runs axe on the list and the post at 375 and 1440, and on the open dropdown and the search panel at 375, the only size where they exist, and fails on any serious or critical violation.

axe does not compute contrast over a gradient, so every text of the app was also measured against each pixel behind it, against the 4.5:1 floor: first the list, the post and the not-found page at nine widths from 320 to 1920 px, then the open menus, Tab focus, the loading, error and empty states, the other 25 posts and a sweep of 102 widths from 320 to 1920 px, 654 states and 2877 text nodes in that second pass. Every process also measured a control case that must fail, the dropdown text forced back to `#D31450` with an author chosen at 768 px, and it read 4.30:1 each time.

## Tests

| Level | Ids | Where | Tools | What it covers |
|---|---|---|---|---|
| Unit | D | `src/**/*.test.ts`, next to each function | Vitest | sort, filter, search, the parser, dates, paragraphs, the URL codec |
| Component | C | `src/pages/*.test.tsx` | Vitest, Testing Library, MSW, jsdom | loading, error, empty and not-found screens; every control by its role and accessible name; the URL; the render count of C20 |
| End-to-end | E | `e2e/*.spec.ts` | Playwright, Chromium, axe | Back, scroll, focus, one request for a whole visit, reload and shared links, the search from a post, no horizontal scroll from 320 to 1920, keyboard, axe |
| Measurement | M | `e2e/*.spec.ts` | Playwright | sizes, spacing, type and colors from the design, at 375 and 1440, within 1 px (2 px for the post column) |

Every test of the matrix starts with its id, so one line runs alone: `npm test -- -t '^D1 '`. The two tests in `e2e/search-from-post.spec.ts` came later, with the search in the post's header: they failed by their assertion before that change and pass after it, but they have no id and no mutant. The component tests go through `renderApp`, which mounts the real routes on a `MemoryRouter` with a fresh store.

**The frozen fixture.** Both suites run offline on the snapshot of the API in `src/test/fixtures/posts.json`. In the component tests, MSW serves it and fails the test on any request without a handler. In the browser, `page.route` serves it, with a local PNG for every image, and aborts any other outside request; a page or console error fails the test. The component tests pin the time zone to `America/Sao_Paulo`, where a local date would be a day off, and switch a simulated `matchMedia` between 375 and 1440. The e2e suite runs on the production build, one worker at a time, because it measures layout and scroll.

**The proof.** The tests came first, in two rounds, and `git log` shows it: the data and list tests land in two `test:` commits before the first `feat` commit, and the post's tests (`test(post): ...`) before `feat(post)`. Each round was run red before the code existed, with the result recorded per test. The test files were then frozen by SHA-256 hash, and the hash is checked again before each green run, so no test was bent to fit the code. Last, every line of the matrix has one mutant: a deliberate break of the code that line guards, such as dropping the tie-break by API position for D1. A line counts only if its test fails on the mutant by its assertion, not by a crash. On the current code all 56 die, 45 for the list and 11 for the post. Two mutants had turned equivalent when the code gained a second guard, and were rewritten to break both: C20, above, and M5, whose post column is also capped at 875 px. The records of these runs, like the pixel measurements, are kept outside this repository.

**The bug hunt.** `/proof` shows every bug planted in the mutation runs, one closed card per line of the matrix, grouped by area, and the test that caught it: open a card for the change, before and after, and for how the test failed. `src/proof/proof.json` is built by `scripts/build-proof.ts` from the records of the run, which stay outside this repository with the notes of the project; `src/proof/proof-count.json` holds only the total, so the footer can show it without pulling the data into the main chunk.

## What comes next

- **Pagination with `/posts/{id}`.** The API ignores the query string, so today one request brings every post. With a backend that pages, the list would ask for one page at a time, and the post page would look in the cached pages first and fall back to `GET /posts/{id}` for a link opened directly. That endpoint would need a 404 for an unknown id first: a 500 says the server failed, not that the post is missing.
- **Prefetch.** RTK Query's `usePrefetch` on a card's hover and focus would load the post before the click, and the next page before the reader reaches the end of the list.
- **The count's live region in the layout**, so the first count after arriving from a post is announced too.
- **Two gaps in the tests.** The URL codec reads every `author` (`getAll`), but each URL test uses one author, so no test fails if a second one is dropped. E9 checks that every focus stop has an outline style; the card's visible ring is drawn on the link's `::after`, and E9 would not notice if it went away.
