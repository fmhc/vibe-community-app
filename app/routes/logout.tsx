import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { directusService } from "~/services/directus.server";

export async function action({ request }: ActionFunctionArgs) {
  const headers = await directusService.destroySession(request);
  return redirect("/", { headers });
}

export async function loader() {
  return redirect("/");
} 