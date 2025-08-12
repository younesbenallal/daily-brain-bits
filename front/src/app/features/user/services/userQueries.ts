import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "./user.service";

export const useUsersQuery = (enabled = true) => {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
