import { obsidianRouter } from "./routes/obsidian";

export const router = {
  v1: {
    integrations: {
      obsidian: obsidianRouter,
    },
  },
};

export type Router = typeof router;
