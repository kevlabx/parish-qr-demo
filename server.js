/* server.js — Parish QR Demo with Supabase
   Run:  node server.js
   Example (PowerShell):
     $env:DOOR_CODE="1234"; `
     $env:ADMIN_PWD="demo123"; `
     $env:SUPABASE_URL="https://qgnbvktvgogtniegzmni.supabase.co"; `
     $env:SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY"; `
     node .\server.js
*/

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const os = require("os");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(bodyParser.json());

// Serve the static UI from /public
app.use(express.static(path.join(__dirname, "public")));

// Supabase client (server-side, uses service_role key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ----- API: Check-in (POST /api/checkin) -----
app.post("/api/checkin", async (req, res) => {
  const { name, phone, email, household, kids, doorCode } = req.body || {};

  if (!name || !doorCode) {
    return res.status(400).json({ error: "Name and Door Code required" });
  }

  const DOOR_CODE = process.env.DOOR_CODE || "1234";
  if (doorCode !== DOOR_CODE) {
    return res.status(403).json({ error: "Invalid Door Code" });
  }

  const entry = {
    name: String(name).trim(),
    phone: phone ? String(phone).trim() : null,
    email: email ? String(email).trim() : null,
    household: household ? String(household).trim() : null,
    kids: !!kids,
    source: "qr-demo"
  };

  const { data, error } = await supabase.from("submissions").insert([entry]);

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ ok: true, entry: data[0] });
});

// ----- API: Admin read (GET /api/submissions?pwd=...) -----
app.get("/api/submissions", async (req, res) => {
  const pwd = (req.query.pwd || "").trim();
  const ADMIN_PWD = process.env.ADMIN_PWD || "demo123";
  if (pwd !== ADMIN_PWD) return res.status(401).json({ error: "unauthorized" });

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Supabase read error:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ ok: true, submissions: data });
});

// ----- API: Admin CSV export (GET /api/export.csv?pwd=...) -----
app.get("/api/export.csv", async (req, res) => {
  const pwd = (req.query.pwd || "").trim();
  const ADMIN_PWD = process.env.ADMIN_PWD || "demo123";
  if (pwd !== ADMIN_PWD) return res.status(401).send("unauthorized");

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Supabase CSV error:", error);
    return res.status(500).send("error exporting CSV");
  }

  let csv = "id,name,phone,email,household,kids,timestamp,source\n";
  data.forEach((s) => {
    csv += `${s.id},"${(s.name || "").replace(/"/g, '""')}","${(s.phone || "").replace(/"/g, '""')}","${(s.email || "").replace(/"/g, '""')}","${(s.household || "").replace(/"/g, '""')}",${s.kids},"${s.timestamp}","${s.source}"\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=submissions.csv"
  );
  res.send(csv);
});

// Direct routes to files
app.get("/", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);
app.get("/admin", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin.html"))
);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Demo server running on http://localhost:${PORT}`);
  const ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach((ifname) => {
    ifaces[ifname]
      .filter((i) => i.family === "IPv4" && !i.internal)
      .forEach((i) =>
        console.log(` -> network URL: http://${i.address}:${PORT}`)
      );
  });
});
