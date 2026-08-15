# ระบบการลา โรงเรียนบ้านคชศิลา

เว็บแอปสำหรับส่ง อนุมัติ ติดตาม และพิมพ์ใบลาของบุคลากร เชื่อมต่อ Supabase และพร้อม deploy บน GitHub Pages

## เริ่มพัฒนา

1. คัดลอก `.env.example` เป็น `.env`
2. ใส่ Supabase Project URL และ anon key
3. รัน `npm install` และ `npm run dev`

Schema และ Row Level Security อยู่ใน `supabase/migrations` ส่วนฟังก์ชันสำหรับผู้ดูแลสร้างบัญชีอยู่ใน `supabase/functions/create-personnel`

> ห้าม commit `.env`, service role key หรือ database password ลง repository
