import { useMutation } from "@tanstack/react-query";

import { changePassword } from "./api";

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword, retry: false });
}
