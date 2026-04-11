import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const githubPagesBase = repositoryName ? `/${repositoryName}/` : "/";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? githubPagesBase : "/",
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
