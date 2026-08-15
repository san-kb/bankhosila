import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
  if (req.method === 'OPTIONS') return new Response('ok',{headers})
  try {
    const authHeader=req.headers.get('Authorization')||''
    const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const caller=createClient(url,anon,{global:{headers:{Authorization:authHeader}}})
    const {data:{user}}=await caller.auth.getUser()
    if(!user) throw new Error('กรุณาเข้าสู่ระบบ')
    const {data:profile}=await caller.from('profiles').select('role').eq('id',user.id).single()
    if(profile?.role!=='admin') throw new Error('เฉพาะผู้ดูแลระบบเท่านั้น')
    const body=await req.json()
    if(!/^[A-Za-z0-9._-]+$/.test(body.username)||String(body.password).length<8) throw new Error('ข้อมูลชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    const admin=createClient(url,service)
    const {data,error}=await admin.auth.admin.createUser({email:`${body.username.toLowerCase()}@bankhosila.local`,password:body.password,email_confirm:true,user_metadata:{username:body.username.toLowerCase(),full_name:body.full_name,personnel_type:body.personnel_type,position:body.position,role:body.role||'staff'}})
    if(error) throw error
    return new Response(JSON.stringify({id:data.user.id}),{headers})
  } catch(error){return new Response(JSON.stringify({error:error.message}),{status:400,headers})}
})
