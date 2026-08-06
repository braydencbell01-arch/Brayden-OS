# PlateQuest

Separate product from BrayStats and Jersey Deals.

- **Source:** `platequest/` in the Brayden-OS monorepo (own `package.json` / lockfile)
- **Live URL:** https://braydencbell01-arch.github.io/PlateQuest/
- **Pages repo:** [braydencbell01-arch/PlateQuest](https://github.com/braydencbell01-arch/PlateQuest) (`gh-pages`) — must exist as an empty public repo before the first deploy
- **Deploy:** `.github/workflows/deploy-platequest.yml` (does not publish into BrayStats or Jersey Deals paths)

```bash
cd platequest
npm ci
npm run dev -- --port 5175
```
