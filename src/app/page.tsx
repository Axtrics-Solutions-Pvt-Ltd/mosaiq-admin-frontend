import { redirect } from "next/navigation";

import { env } from "@/config/env";
import { routes } from "@/config/routes";

export default function HomePage() {
  redirect(
    env.APP_ROOT_PREVIEW === "dashboard" ? routes.dashboard : routes.login,
  );
}
