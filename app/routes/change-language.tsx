import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import i18next from "~/i18n.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const language = formData.get("language") as string;
  
  if (!language || !["en", "de"].includes(language)) {
    return redirect("/");
  }

  // Get the current URL to redirect back to the same page
  const referer = request.headers.get("referer") || "/";
  const url = new URL(referer);
  
  // Create a response with the language cookie
  const response = redirect(url.pathname + url.search);
  
  // Set the language cookie
  response.headers.set(
    "Set-Cookie",
    `lng=${language}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
  );
  
  return response;
}

export function loader() {
  return redirect("/");
} 