# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Install and play offline

Build and deploy the production app over HTTPS:

```sh
npm run build
npx wrangler --cwd . deploy
```

Open the deployed app while online once so it can cache the game. Then install it
from the browser's install icon or menu (on iOS, use Safari's **Add to Home
Screen**). The production build includes the app shell, game assets, fonts, and
icons for offline use; game progress is saved on the device. New versions wait
for you to choose **Refresh** before they replace the running app.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
