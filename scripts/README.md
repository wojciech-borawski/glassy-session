# Scripts

Code that the tooling runs, outside the extension itself.

- `setup-tests.ts` runs before every Vitest file. It adds the jest-dom matchers and applies the Storybook preview, so tests that render stories get the same setup as Storybook.
- `render-icons.ts` renders `assets/icon.svg` into the PNG icons in `public/icon`, at every size the manifests and the system notifications use. Run it with `npm run icons` after changing the SVG.
