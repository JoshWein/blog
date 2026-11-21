# blog

Josh Wein's blog, built with Jekyll and published with GitHub Pages at
https://www.joshwein.xyz/blog/.

## Running locally

You need Ruby (3.x works) and Bundler (`gem install bundler`).

```sh
bundle install
bundle exec jekyll serve --livereload
```

Then open http://localhost:4000/blog/. Jekyll rebuilds the site when you save a
file, and the open page reloads by itself.

The `Gemfile` uses the `github-pages` gem, so the local build uses the same
Jekyll version and plugins as the deployed site.

If the build fails with `Invalid US-ASCII character`, your shell's locale isn't
UTF-8. Run `export LANG=en_US.UTF-8` (or `C.UTF-8`) and try again.

## Accessibility check

Every pull request runs `.github/workflows/a11y.yml`, which builds the site and
runs [axe-core](https://github.com/dequelabs/axe-core) (WCAG 2.2 AA plus best
practices) on every page at desktop and phone widths. Any violation fails the
check. To run it locally (needs Node 20+):

```sh
bundle exec jekyll build -d _site/blog
npm ci
npx playwright install chromium   # first time only
npm run a11y
```

A few patterns that keep posts passing:

- Headings go up one level at a time (`##`, then `###`). To keep a smaller
  look, add `{: .as-h3}` or `{: .as-h4}` under the heading.
- "Back to top" links are a plain paragraph, not a heading:
  `[back to top](#top)` followed by `{: .back-top}`.
- Wide code blocks get `tabindex="0"` from `_layouts/post.html` so keyboard
  users can scroll them.

## Deploying

Pushing to `main` runs `.github/workflows/jekyll-gh-pages.yml`, which builds
the site and deploys it to GitHub Pages.

## Ads

Posts have one small "sponsored" slot at the end, above the comments. It is off
until you turn it on in `_config.yml`:

```yaml
ads:
  enabled: true
  provider: ethicalads          # or adsense
  ethicalads_publisher: "your-id"
  adsense_client: ""            # only for adsense, e.g. "ca-pub-..."
  adsense_slot: ""              # only for adsense
```

Nothing loads until `enabled` is true and the chosen provider's ID is set. The
blog index never shows an ad, and a single post can opt out with `ads: false`
in its front matter. For AdSense, `ads.txt` has to live at the domain root,
which is the main site repo (JoshWein/joshwein.github.io), not this one.
