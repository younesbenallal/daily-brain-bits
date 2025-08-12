import { useMutation } from "@tanstack/react-query";
import { saveNotionDatabase } from "./notion-database.service";

export const useSaveNotionDatabase = () => {
  return useMutation({
    mutationFn: saveNotionDatabase,
  });
};
