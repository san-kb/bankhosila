import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3'

Deno.serve(async (req) => {
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
  if(req.method==='OPTIONS') return new Response('ok',{headers})
  try{
    const authHeader=req.headers.get('Authorization')||''
    const url=Deno.env.get('SUPABASE_URL')!
    const publishable=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||Deno.env.get('SUPABASE_ANON_KEY')!
    const secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const caller=createClient(url,publishable,{global:{headers:{Authorization:authHeader}}})
    const {data:{user}}=await caller.auth.getUser()
    if(!user) throw new Error('กรุณาเข้าสู่ระบบ')
    const {data:profile}=await caller.from('profiles').select('role').eq('id',user.id).single()
    if(profile?.role!=='admin') throw new Error('เฉพาะผู้ดูแลระบบเท่านั้น')
    const {user_id,temporary_password}=await req.json()
    if(!/^[0-9]{13}$/.test(String(temporary_password))) throw new Error('รหัสผ่านชั่วคราวต้องเป็นตัวเลข 13 หลัก')
    const admin=createClient(url,secret)
    const {error}=await admin.auth.admin.updateUserById(user_id,{password:String(temporary_password)})
    if(error) throw error
    const {error:profileError}=await admin.from('profiles').update({must_change_password:true}).eq('id',user_id)
    if(profileError) throw profileError
    return new Response(JSON.stringify({success:true}),{headers})
  }catch(error){return new Response(JSON.stringify({error:error.message}),{status:400,headers})}
})
