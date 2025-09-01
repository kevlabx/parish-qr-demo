import { createClient } from "@supabase/supabase-js";

// Protect with admin password
export default async function handler(req, res) {
  const { password } = req.query;

  if (password !== process.env.ADMIN_PWD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // service role key (secret)
  );

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("timestamp", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
