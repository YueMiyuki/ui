import { defineConfig } from "fumadocs-mdx/config";
import { codeTheme } from "./src/site/code-theme";

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: { light: codeTheme, dark: codeTheme },
    },
  },
});
