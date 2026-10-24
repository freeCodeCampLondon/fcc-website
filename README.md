# freeCodeCamp London

Hello campers!

This is the source code for the [official website](https://freecodecamp.london/) of the freeCodeCamp London group.

Our group typically meets up once per month in locations around Central London. All abilities are welcome, from absolute beginner to professional!

**Everyone** is encouraged to contribute, whether you are new to coding or an experienced developer. Just bring a laptop and some enthusiasm!

## Join the community

- [Discord server](https://discord.gg/hmVycPYAue): chat, help and the `#meetups` channel
- [Luma calendar](https://luma.com/freecodecamp.london): upcoming events and sign-ups (also listed on [freecodecamp.london/events](https://freecodecamp.london/events/))
- [Meetup group](https://www.meetup.com/freecodecamp-london/): our community group on Meetup
- [Project board](https://github.com/orgs/freeCodeCampLondon/projects/1): open to-dos for this website

## Tech stack

- [Astro](https://astro.build/) 7 (static site)
- [Tailwind CSS](https://tailwindcss.com/) 4
- TypeScript
- ESLint and Prettier for linting and formatting

## Getting started

You will need [Node.js](https://nodejs.org/) (the LTS version in `.nvmrc`, currently 26) and npm. With [nvm](https://github.com/nvm-sh/nvm), run `nvm install` and `nvm use` in the project folder to switch to it.

```bash
git clone https://github.com/<your-username>/fcc-website.git
cd fcc-website
npm install
npm run dev
```

The site will be available at http://localhost:4321 and reloads as you edit files.

## Scripts

| Command              | What it does                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run dev`        | Start the local development server                                                                     |
| `npm run build`      | Type-check with `astro check`, then build to `dist/`                                                   |
| `npm run preview`    | Serve the built site from `dist/`                                                                      |
| `npm run lint`       | Run ESLint on `src/`                                                                                   |
| `npm run format`     | Check formatting with Prettier                                                                         |
| `npm run format:fix` | Fix formatting with Prettier                                                                           |
| `npm test`           | Build the site and run the Vitest test suite                                                           |
| `npm run test:e2e`   | Browser checks at phone to desktop widths (after a build; first run `npx playwright install chromium`) |

Every pull request runs `npm run lint`, `npm run format` and `npm test` automatically, so run them (and `npm run format:fix` if needed) before you push.

## Project structure

```text
src/
├── pages/        # One .astro file per page (file-based routing)
├── layouts/      # Shared page layout (HTML shell and global styles)
├── components/   # Reusable UI pieces (navbar, cards, FAQ, challenges)
├── data/         # Content: events, FAQs and coding challenges
└── assets/       # Images imported by components
public/           # Static files served as-is (favicon)
```

Want to update the events list or FAQs? You only need to edit the matching file in `src/data/`.

The coding challenges come from CodeWars and are refreshed with `npm run data:codewars`, which updates the titles, ranks and tags in `src/data/codewars.json` from the CodeWars API. To add a kata, run `npm run data:codewars -- <kata id>` (the id is the 24-character code in the kata's URL); to remove one, delete its entry from `src/data/codewars.json`. Katas still in beta are skipped.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for how to fork the repo, open a pull request and add yourself to the contributors list. New to Git and GitHub? It also has advice for getting started, and you can always ask in our Discord.

This repository is public, so never commit credentials, API keys, tokens or `.env` files.

## Using AI coding agents

If you use an AI coding assistant (Claude Code, Codex, Gemini CLI, Copilot, Cursor and others), it can read [AGENTS.md](AGENTS.md) for project guidance. `CLAUDE.md` imports the same file.
