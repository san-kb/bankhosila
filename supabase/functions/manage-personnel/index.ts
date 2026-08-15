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
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .single();
    if (callerProfile?.role !== "admin" || !callerProfile.is_active)
      throw new Error("เฉพาะผู้ดูแลระบบเท่านั้น");

    const body = await req.json();
    if (!body.target_id) throw new Error("ไม่พบบัญชีบุคลากร");
    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", body.target_id)
      .single();
    if (targetError || !target) throw new Error("ไม่พบบัญชีบุคลากร");

    if (body.action === "delete") {
      if (target.id === user.id) throw new Error("ไม่สามารถลบบัญชีของตนเองได้");
      if (target.role === "admin") {
        const { count } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin")
          .eq("is_active", true);
        if ((count || 0) <= 1)
          throw new Error("ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้");
      }
      const { error: profileError } = await admin
        .from("profiles")
        .update({ is_active: false })
        .eq("id", target.id);
      if (profileError) throw profileError;
      const { error: banError } = await admin.auth.admin.updateUserById(
        target.id,
        { ban_duration: "876000h" },
      );
      if (banError) {
        await admin
          .from("profiles")
          .update({ is_active: true })
          .eq("id", target.id);
        throw banError;
      }
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    if (body.action === "update") {
      const personnelTypes = [
          "ครูข้าราชการ",
          "ครูอัตราจ้าง",
          "เจ้าหน้าที่",
          "ลูกจ้าง",
        ],
        roles = ["staff", "approver", "admin"],
        organizationRoles = ["staff", "subject_head", "executive"];
      if (
        !body.full_name?.trim() ||
        !body.position?.trim() ||
        !personnelTypes.includes(body.personnel_type) ||
        !roles.includes(body.role) ||
        !organizationRoles.includes(body.organization_role)
      )
        throw new Error("ข้อมูลบุคลากรไม่ถูกต้อง");
      if (target.id === user.id && body.role !== "admin")
        throw new Error("ไม่สามารถลดสิทธิ์แอดมินของตนเองได้");
      if (target.role === "admin" && body.role !== "admin") {
        const { count } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin")
          .eq("is_active", true);
        if ((count || 0) <= 1)
          throw new Error("ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน");
      }
      const { error } = await admin
        .from("profiles")
        .update({
          full_name: body.full_name.trim(),
          personnel_type: body.personnel_type,
          position: body.position.trim(),
          subject_group: body.subject_group || null,
          organization_role: body.organization_role,
          role: body.role,
        })
        .eq("id", target.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers });
    }
    throw new Error("คำสั่งไม่ถูกต้อง");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers,
    });
  }
});
