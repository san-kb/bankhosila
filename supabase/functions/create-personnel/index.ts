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
    const { data: profile } = await caller
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") throw new Error("เฉพาะผู้ดูแลระบบเท่านั้น");
    const body = await req.json();
    const personnelTypes = [
        "ครูข้าราชการ",
        "ครูอัตราจ้าง",
        "เจ้าหน้าที่",
        "ลูกจ้าง",
      ],
      roles = ["staff", "approver", "admin"],
      organizationRoles = ["staff", "subject_head", "executive"];
    if (
      !/^[A-Za-z0-9._-]+$/.test(body.username) ||
      !/^\d{13}$/.test(String(body.password)) ||
      !personnelTypes.includes(body.personnel_type) ||
      !roles.includes(body.role) ||
      !organizationRoles.includes(body.organization_role || "staff")
    )
      throw new Error(
        "ข้อมูลบุคลากรไม่ถูกต้อง หรือรหัสผ่านเริ่มต้นไม่ใช่ตัวเลข 13 หลัก",
      );
    const admin = createClient(url, secret);
    const { data, error } = await admin.auth.admin.createUser({
      email: `${body.username.toLowerCase()}@bankhosila.local`,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        username: body.username.toLowerCase(),
        full_name: body.full_name,
        personnel_type: body.personnel_type,
        position: body.personnel_type,
      },
    });
    if (error) throw error;
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        role: body.role,
        organization_role: body.organization_role || "staff",
        subject_group: body.subject_group || null,
        must_change_password: true,
      })
      .eq("id", data.user.id);
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw profileError;
    }
    return new Response(JSON.stringify({ id: data.user.id }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers,
    });
  }
});
