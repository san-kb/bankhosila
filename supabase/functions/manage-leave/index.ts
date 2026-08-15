import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

Deno.serve(async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const publishable =
      JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default ||
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const secret =
      JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const caller = createClient(url, publishable, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await caller.auth.getUser();
    if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

    const admin = createClient(url, secret);
    const { data: profile } = await admin
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin" || !profile.is_active)
      throw new Error("เฉพาะผู้ดูแลระบบเท่านั้น");

    const body = await req.json();
    if (body.action !== "delete" || !body.leave_id)
      throw new Error("คำสั่งไม่ถูกต้อง");
    const { data: leave, error: leaveError } = await admin
      .from("leave_requests")
      .select("id,user_id,leave_type,start_date,end_date,total_days,status")
      .eq("id", body.leave_id)
      .single();
    if (leaveError || !leave) throw new Error("ไม่พบข้อมูลใบลา");

    const { data: attachments } = await admin
      .from("leave_attachments")
      .select("storage_path")
      .eq("leave_request_id", leave.id);
    const paths = (attachments || [])
      .map((item) => item.storage_path)
      .filter(Boolean);
    if (paths.length) {
      const { error: storageError } = await admin.storage
        .from("leave-attachments")
        .remove(paths);
      if (storageError) throw storageError;
    }

    const { error: deleteError } = await admin
      .from("leave_requests")
      .delete()
      .eq("id", leave.id);
    if (deleteError) throw deleteError;
    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "delete",
      entity_type: "leave_request",
      entity_id: leave.id,
      details: { deleted_leave: leave },
    });
    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers,
    });
  }
});
