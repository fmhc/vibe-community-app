import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  
  return json({ 
    success: true, 
    message: `Received email: ${email}`,
    timestamp: new Date().toISOString()
  });
}

export default function TestAction() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Test Action Route</h1>
      <form method="post">
        <label>
          Email: <input type="email" name="email" required />
        </label>
        <br /><br />
        <button type="submit">Test Submit</button>
      </form>
    </div>
  );
} 