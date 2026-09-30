import { defineConfig } from "vite";

// GitHub Pages serves this repo at https://dalmaer.github.io/duo/, so every
// asset URL is under /duo/. Locally `npm run dev` serves the same path.
//
// The build stamps the commit it was made from into the page, so the deploy
// workflow can ask the live site which build it is serving rather than
// assuming (docs/lessons.md, 2).
const BUILD = process.env.GITHUB_SHA ?? "dev";

export default defineConfig({
  base: "/duo/",
  build: { target: "es2023", outDir: "dist" },
  plugins: [
    {
      name: "build-stamp",
      transformIndexHtml: (html) => html.replace("</head>", `  <meta name="duo-build" content="${BUILD}" />\n  </head>`),
    },
  ],
});
