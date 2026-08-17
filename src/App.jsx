import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Printer,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { configured, supabase } from "./lib/supabase";

const THAI_TYPES = {
  sick: "ลาป่วย",
  personal: "ลากิจส่วนตัว",
  maternity: "ลาคลอดบุตร",
};
const STATUS = {
  draft: "ฉบับร่าง",
  pending_personnel: "รอหัวหน้ากลุ่มบริหารงานบุคคล",
  pending_executive: "รอผู้บริหารพิจารณา",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
};
const PEOPLE_TYPES = ["ครูข้าราชการ", "ครูอัตราจ้าง", "เจ้าหน้าที่", "ลูกจ้าง"];
const ORGANIZATION_ROLES = {
  staff: "บุคลากรทั่วไป",
  personnel_head: "หัวหน้ากลุ่มบริหารงานบุคคล",
  executive: "ผู้บริหาร",
};
const SUBJECT_GROUPS = [
  "ภาษาไทย",
  "คณิตศาสตร์",
  "วิทยาศาสตร์และเทคโนโลยี",
  "สังคมศึกษา ศาสนาและวัฒนธรรม",
  "สุขศึกษาและพลศึกษา",
  "ศิลปะ",
  "การงานอาชีพ",
  "ภาษาต่างประเทศ",
  "ปฐมวัย",
  "กิจกรรมพัฒนาผู้เรียน",
  "บริหารและงานสนับสนุน",
];
const now = new Date(),
  todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const emptyLeave = {
  leave_type: "sick",
  written_at: "โรงเรียนบ้านคชศิลา",
  subject: "ขอลา",
  recipient: "ผู้อำนวยการโรงเรียนบ้านคชศิลา",
  start_date: todayISO,
  end_date: todayISO,
  reason: "",
  contact: "",
};
const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

async function withAvatarUrl(person) {
  if (!person?.avatar_path) return person;
  const { data } = await supabase.storage
    .from("avatars")
    .createSignedUrl(person.avatar_path, 3600);
  return { ...person, avatar_url: data?.signedUrl };
}

async function uploadAvatar(userId, file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return error;
  const result = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", userId);
  return result.error;
}

function ThaiDateInput({ value, onChange, min }) {
  const today = new Date(),
    parts = value ? value.split("-").map(Number) : [],
    year = parts[0] || today.getFullYear(),
    month = parts[1] || today.getMonth() + 1,
    day = parts[2] || today.getDate();
  const years = Array.from(
      { length: 7 },
      (_, i) => today.getFullYear() - 2 + i,
    ),
    daysInMonth = new Date(year, month, 0).getDate();
  const update = (part, next) => {
    const values = { year, month, day, [part]: Number(next) },
      safeDay = Math.min(
        values.day,
        new Date(values.year, values.month, 0).getDate(),
      ),
      iso = `${values.year}-${String(values.month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
    if (!min || iso >= min) onChange(iso);
  };
  return (
    <div className="thai-date-input">
      <select
        aria-label="วัน"
        value={day}
        onChange={(e) => update("day", e.target.value)}
      >
        {Array.from({ length: daysInMonth }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
      <select
        aria-label="เดือน"
        value={month}
        onChange={(e) => update("month", e.target.value)}
      >
        {THAI_MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="ปี พ.ศ."
        value={year}
        onChange={(e) => update("year", e.target.value)}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            พ.ศ. {y + 543}
          </option>
        ))}
      </select>
    </div>
  );
}

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const email = username.includes("@")
      ? username
      : `${username.toLowerCase()}@bankhosila.local`;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    setBusy(false);
  };
  return (
    <main className="login-page">
      <section className="login-brand">
        <span className="school-logo-frame large">
          <img
            src={`${import.meta.env.BASE_URL}images/bankhosila-logo-3d.webp`}
            alt="ตราโรงเรียนบ้านคชศิลา"
          />
        </span>
        <p className="eyebrow">BAN KHOSILA SCHOOL</p>
        <h1>
          ระบบการลา
          <br />
          <span className="login-school-name">โรงเรียนบ้านคชศิลา</span>
        </h1>
        <p>ส่งใบลา ติดตามสถานะ และรับใบลาที่อนุมัติแล้วได้ในที่เดียว</p>
      </section>
      <section className="login-card">
        <h2>เข้าสู่ระบบ</h2>
        <p className="muted">สำหรับบุคลากรของโรงเรียน</p>
        <form onSubmit={login}>
          <label>
            ชื่อผู้ใช้
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              placeholder="เช่น somchai"
            />
          </label>
          <label>
            รหัสผ่าน
            <span className="password-input">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </span>
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="primary" disabled={busy} aria-busy={busy}>
            {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Sidebar({ page, setPage, profile, open, setOpen }) {
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  };
  const items = [
    { id: "home", label: "ภาพรวม", icon: CalendarDays },
    { id: "new", label: "เขียนใบลา", icon: Plus },
    { id: "mine", label: "ใบลาของฉัน", icon: FileText },
    { id: "profile", label: "ข้อมูลและลายเซ็น", icon: UserRound },
  ];
  if (["personnel_head", "executive"].includes(profile.organization_role))
    items.push({
      id: "approvals",
      label: "รายการรออนุมัติ",
      icon: CheckCircle2,
    });
  if (profile.role === "admin" || profile.organization_role === "executive")
    items.push({ id: "statistics", label: "สถิติการลา", icon: BarChart3 });
  if (profile.role === "admin")
    items.push({ id: "people", label: "จัดการบุคลากร", icon: Users });
  return (
    <>
      <div
        className={`scrim ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
      />
      <aside className={open ? "open" : ""}>
        <div className="side-head">
          <span className="school-logo-frame small">
            <img
              src={`${import.meta.env.BASE_URL}images/bankhosila-logo-3d.webp`}
              alt="ตราโรงเรียนบ้านคชศิลา"
            />
          </span>
          <div>
            <strong>บ้านคชศิลา</strong>
            <small>ระบบการลา</small>
          </div>
        </div>
        <nav>
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => {
                setPage(id);
                setOpen(false);
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="side-user">
          <div className="avatar">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`รูปของ ${profile.full_name}`}
              />
            ) : (
              profile.full_name?.slice(0, 1)
            )}
          </div>
          <div>
            <strong>{profile.full_name}</strong>
            <small>{profile.position || profile.personnel_type}</small>
          </div>
          <button
            title={signingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
            onClick={signOut}
            disabled={signingOut}
            aria-busy={signingOut}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}

function Dashboard({ profile, leaves, setPage }) {
  const pending = leaves.filter((x) => x.status.startsWith("pending_")).length,
    approved = leaves.filter((x) => x.status === "approved").length;
  return (
    <>
      <div className="welcome">
        <div>
          <p className="eyebrow">ยินดีต้อนรับ</p>
          <h2>{profile.full_name}</h2>
          <p>จัดการการลาของคุณอย่างเป็นระบบและตรวจสอบได้</p>
        </div>
        <button className="primary inline" onClick={() => setPage("new")}>
          <Plus size={18} />
          เขียนใบลา
        </button>
      </div>
      <div className="stats">
        <article>
          <span className="stat-icon amber">
            <FileText />
          </span>
          <div>
            <small>ใบลาทั้งหมด</small>
            <strong>{leaves.length}</strong>
          </div>
        </article>
        <article>
          <span className="stat-icon blue">
            <CalendarDays />
          </span>
          <div>
            <small>รอพิจารณา</small>
            <strong>{pending}</strong>
          </div>
        </article>
        <article>
          <span className="stat-icon green">
            <CheckCircle2 />
          </span>
          <div>
            <small>อนุมัติแล้ว</small>
            <strong>{approved}</strong>
          </div>
        </article>
      </div>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h3>รายการล่าสุด</h3>
            <p>สถานะใบลาของคุณ</p>
          </div>
        </div>
        <LeaveTable leaves={leaves.slice(0, 5)} />
      </section>
    </>
  );
}

function Statistics({ canDelete = false }) {
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [deleteId, setDeleteId] = useState(null),
    [deleteMsg, setDeleteMsg] = useState(""),
    [filters, setFilters] = useState({
      year: "all",
      month: "all",
      personnel: "all",
      status: "all",
    });
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select(
          "*,profiles!leave_requests_user_id_fkey(full_name,personnel_type,position)",
        )
        .order("start_date", { ascending: false });
      if (active) {
        setRows(data || []);
        setError(error?.message || "");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const deleteLeave = async (row) => {
    if (!canDelete || deleteId) return;
    if (
      !confirm(
        `ยืนยันลบข้อมูลใบลาของ ${row.profiles?.full_name || "บุคลากร"}?\n\nข้อมูลนี้จะถูกนำออกจากสถิติและไม่สามารถกู้คืนจากหน้าเว็บได้`,
      )
    )
      return;
    setDeleteId(row.id);
    setDeleteMsg("");
    const { data, error } = await supabase.functions.invoke("manage-leave", {
      body: { action: "delete", leave_id: row.id },
    });
    if (error || data?.error) setDeleteMsg(data?.error || error.message);
    else {
      setRows((current) => current.filter((item) => item.id !== row.id));
      setDeleteMsg("ลบข้อมูลใบลาและปรับสถิติเรียบร้อยแล้ว");
    }
    setDeleteId(null);
  };
  const years = useMemo(
    () =>
      [
        ...new Set(
          rows.map((x) =>
            String(new Date(`${x.start_date}T00:00:00`).getFullYear()),
          ),
        ),
      ].sort((a, b) => b - a),
    [rows],
  );
  const filtered = useMemo(
    () =>
      rows.filter((x) => {
        const date = new Date(`${x.start_date}T00:00:00`);
        return (
          (filters.year === "all" ||
            String(date.getFullYear()) === filters.year) &&
          (filters.month === "all" ||
            String(date.getMonth() + 1) === filters.month) &&
          (filters.personnel === "all" ||
            x.profiles?.personnel_type === filters.personnel) &&
          (filters.status === "all" || x.status === filters.status)
        );
      }),
    [rows, filters],
  );
  const totalDays = filtered.reduce(
      (sum, x) => sum + Number(x.total_days || 0),
      0,
    ),
    approved = filtered.filter((x) => x.status === "approved").length,
    pending = filtered.filter((x) => x.status.startsWith("pending_")).length;
  const typeCounts = Object.keys(THAI_TYPES).map((type) => ({
      label: THAI_TYPES[type],
      count: filtered.filter((x) => x.leave_type === type).length,
    })),
    maxType = Math.max(1, ...typeCounts.map((x) => x.count));
  const monthly = Array.from({ length: 12 }, (_, index) => ({
      label: new Intl.DateTimeFormat("th-TH", { month: "short" }).format(
        new Date(2026, index, 1),
      ),
      count: filtered.filter(
        (x) => new Date(`${x.start_date}T00:00:00`).getMonth() === index,
      ).length,
    })),
    maxMonth = Math.max(1, ...monthly.map((x) => x.count));
  const people = Object.values(
    filtered.reduce((acc, x) => {
      const id = x.user_id;
      if (!acc[id])
        acc[id] = {
          name: x.profiles?.full_name || "ไม่ระบุชื่อ",
          position: x.profiles?.position || "",
          requests: 0,
          days: 0,
        };
      acc[id].requests += 1;
      acc[id].days += Number(x.total_days || 0);
      return acc;
    }, {}),
  )
    .sort((a, b) => b.days - a.days || b.requests - a.requests)
    .slice(0, 8);
  if (loading)
    return (
      <section className="panel statistics-loading">
        <div className="spinner" />
        <p>กำลังโหลดสถิติ…</p>
      </section>
    );
  if (error)
    return (
      <section className="panel">
        <div className="alert error">โหลดสถิติไม่สำเร็จ: {error}</div>
      </section>
    );
  return (
    <>
      <section className="panel statistics-head">
        <div className="panel-title">
          <div>
            <h2>สถิติการลา</h2>
            <p>ข้อมูลล่าสุดจากใบลาของบุคลากรทั้งหมด</p>
          </div>
          <small>อัปเดตเมื่อเปิดหน้านี้</small>
        </div>
        <div className="statistics-filters">
          <label>
            ปี
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            >
              <option value="all">ทุกปี</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {Number(y) + 543}
                </option>
              ))}
            </select>
          </label>
          <label>
            เดือน
            <select
              value={filters.month}
              onChange={(e) =>
                setFilters({ ...filters, month: e.target.value })
              }
            >
              <option value="all">ทุกเดือน</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Intl.DateTimeFormat("th-TH", { month: "long" }).format(
                    new Date(2026, i, 1),
                  )}
                </option>
              ))}
            </select>
          </label>
          <label>
            ประเภทบุคลากร
            <select
              value={filters.personnel}
              onChange={(e) =>
                setFilters({ ...filters, personnel: e.target.value })
              }
            >
              <option value="all">ทุกประเภท</option>
              {PEOPLE_TYPES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            สถานะ
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="all">ทุกสถานะ</option>
              {Object.entries(STATUS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <div className="statistics-kpis">
        <article>
          <span className="stat-icon blue">
            <FileText />
          </span>
          <div>
            <small>ใบลาทั้งหมด</small>
            <strong>{filtered.length}</strong>
            <em>รายการ</em>
          </div>
        </article>
        <article>
          <span className="stat-icon amber">
            <CalendarDays />
          </span>
          <div>
            <small>รวมวันลา</small>
            <strong>{totalDays.toLocaleString("th-TH")}</strong>
            <em>วัน</em>
          </div>
        </article>
        <article>
          <span className="stat-icon green">
            <CheckCircle2 />
          </span>
          <div>
            <small>อนุมัติแล้ว</small>
            <strong>{approved}</strong>
            <em>รายการ</em>
          </div>
        </article>
        <article>
          <span className="stat-icon violet">
            <Clock3 />
          </span>
          <div>
            <small>รอพิจารณา</small>
            <strong>{pending}</strong>
            <em>รายการ</em>
          </div>
        </article>
      </div>
      <div className="statistics-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h3>สัดส่วนประเภทการลา</h3>
              <p>จำนวนคำขอแยกตามประเภท</p>
            </div>
          </div>
          <div className="bar-list">
            {typeCounts.map((x) => (
              <div key={x.label}>
                <div>
                  <span>{x.label}</span>
                  <strong>{x.count}</strong>
                </div>
                <i>
                  <b style={{ width: `${(x.count / maxType) * 100}%` }} />
                </i>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h3>สถานะคำขอ</h3>
              <p>ภาพรวมผลการพิจารณา</p>
            </div>
          </div>
          <div className="status-summary">
            {Object.entries(STATUS).map(([status, label]) => (
              <div key={status}>
                <Badge status={status} />
                <strong>
                  {filtered.filter((x) => x.status === status).length}
                </strong>
                <small>
                  {label === "ฉบับร่าง" ? "รายการที่ยังไม่ส่ง" : "รายการ"}
                </small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h3>แนวโน้มรายเดือน</h3>
            <p>จำนวนใบลาในแต่ละเดือนตามตัวกรอง</p>
          </div>
        </div>
        <div className="monthly-chart">
          {monthly.map((x) => (
            <div key={x.label}>
              <span>{x.count || ""}</span>
              <i
                style={{
                  height: `${Math.max(x.count ? 12 : 2, (x.count / maxMonth) * 100)}%`,
                }}
              />
              <small>{x.label}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h3>สรุปรายบุคคล</h3>
            <p>เรียงตามจำนวนวันลาสูงสุด</p>
          </div>
        </div>
        {people.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>บุคลากร</th>
                  <th>ตำแหน่ง</th>
                  <th>จำนวนครั้ง</th>
                  <th>จำนวนวัน</th>
                </tr>
              </thead>
              <tbody>
                {people.map((x) => (
                  <tr key={x.name}>
                    <td>
                      <strong>{x.name}</strong>
                    </td>
                    <td>{x.position}</td>
                    <td>{x.requests}</td>
                    <td>
                      <strong>{x.days.toLocaleString("th-TH")}</strong> วัน
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <BarChart3 size={34} />
            <p>ไม่พบข้อมูลตามตัวกรอง</p>
          </div>
        )}
      </section>
      {canDelete && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <h3>จัดการข้อมูลที่ใช้คำนวณสถิติ</h3>
              <p>เฉพาะแอดมิน สามารถลบข้อมูลจำลองหรือรายการที่ไม่ต้องการได้</p>
            </div>
          </div>
          {deleteMsg && (
            <div
              className={`alert ${deleteMsg.includes("เรียบร้อย") ? "success" : "error"}`}
            >
              {deleteMsg}
            </div>
          )}
          {filtered.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>บุคลากร</th>
                    <th>ประเภท</th>
                    <th>ช่วงวันที่ลา</th>
                    <th>จำนวน</th>
                    <th>สถานะ</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      <td>{row.profiles?.full_name || "ไม่ระบุชื่อ"}</td>
                      <td>{THAI_TYPES[row.leave_type]}</td>
                      <td>
                        {dateTH(row.start_date)} – {dateTH(row.end_date)}
                      </td>
                      <td>{row.total_days} วัน</td>
                      <td>
                        <Badge status={row.status} />
                      </td>
                      <td>
                        <button
                          className="delete-button"
                          disabled={Boolean(deleteId)}
                          aria-busy={deleteId === row.id}
                          onClick={() => deleteLeave(row)}
                        >
                          <Trash2 size={15} />
                          {deleteId === row.id ? "กำลังลบ…" : "ลบ"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <BarChart3 size={34} />
              <p>ไม่มีข้อมูลตามตัวกรอง</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function LeaveForm({ profile, onSaved }) {
  const [form, setForm] = useState(emptyLeave),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(""),
    [preview, setPreview] = useState(null);
  const days = useMemo(
    () =>
      form.start_date && form.end_date
        ? Math.max(
            0,
            Math.round(
              (new Date(form.end_date) - new Date(form.start_date)) / 86400000,
            ) + 1,
          )
        : 0,
    [form.start_date, form.end_date],
  );
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const { error } = await supabase.from("leave_requests").insert({
      ...form,
      user_id: profile.id,
      total_days: days,
      status: "pending_personnel",
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setMsg("ส่งใบลาเรียบร้อยแล้ว");
      setForm(emptyLeave);
      onSaved();
    }
  };
  if (preview)
    return (
      <PrintLeave
        leave={preview}
        profile={profile}
        onClose={() => setPreview(null)}
        preview
      />
    );
  const canPreview =
    days &&
    form.written_at &&
    form.subject &&
    form.recipient &&
    form.reason &&
    form.contact;
  return (
    <section className="panel form-panel">
      <div className="panel-title">
        <div>
          <h2>เขียนใบลา</h2>
          <p>กรอกข้อมูลให้ครบถ้วนก่อนส่งพิจารณา</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <label>
          เขียนที่
          <input
            value={form.written_at}
            onChange={(e) => setForm({ ...form, written_at: e.target.value })}
            required
          />
        </label>
        <label>
          ประเภทการลา
          <select
            value={form.leave_type}
            onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
          >
            {Object.entries(THAI_TYPES).map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          เรื่อง
          <input
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
          />
        </label>
        <label>
          เรียน
          <input
            value={form.recipient}
            onChange={(e) => setForm({ ...form, recipient: e.target.value })}
            required
          />
        </label>
        <label>
          ตั้งแต่วันที่ (พ.ศ.)
          <ThaiDateInput
            value={form.start_date}
            onChange={(start_date) =>
              setForm({
                ...form,
                start_date,
                end_date:
                  form.end_date && form.end_date < start_date
                    ? start_date
                    : form.end_date,
              })
            }
          />
        </label>
        <label>
          ถึงวันที่ (พ.ศ.)
          <ThaiDateInput
            min={form.start_date}
            value={form.end_date || form.start_date}
            onChange={(end_date) => setForm({ ...form, end_date })}
          />
        </label>
        <label className="full">
          เนื่องจาก
          <textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            rows="4"
            required
          />
        </label>
        <label className="full">
          ระหว่างลาติดต่อได้ที่
          <textarea
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            rows="2"
            required
          />
        </label>
        <div className="days full">
          รวมวันลา <strong>{days}</strong> วัน
        </div>
        {msg && (
          <div
            className={`alert full ${msg.includes("เรียบร้อย") ? "success" : "error"}`}
          >
            {msg}
          </div>
        )}
        <div className="actions full">
          <button
            type="button"
            className="preview-button"
            disabled={!canPreview || busy}
            onClick={() =>
              setPreview({
                ...form,
                total_days: days,
                status: "draft",
                created_at: new Date().toISOString(),
              })
            }
          >
            <FileText size={17} />
            ดูตัวอย่างใบลา
          </button>
          <button className="primary" disabled={busy || !days} aria-busy={busy}>
            {busy ? "กำลังส่ง…" : "ส่งใบลาเพื่อพิจารณา"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Badge({ status }) {
  return <span className={`badge ${status}`}>{STATUS[status] || status}</span>;
}
function LeaveTable({ leaves, onView }) {
  if (!leaves.length)
    return (
      <div className="empty">
        <FileText size={34} />
        <p>ยังไม่มีรายการใบลา</p>
      </div>
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ประเภท</th>
            <th>ช่วงวันที่ลา</th>
            <th>จำนวน</th>
            <th>สถานะ</th>
            {onView && <th />}
          </tr>
        </thead>
        <tbody>
          {leaves.map((x) => (
            <tr key={x.id}>
              <td>
                <strong>{THAI_TYPES[x.leave_type]}</strong>
              </td>
              <td>
                {dateTH(x.start_date)} – {dateTH(x.end_date)}
              </td>
              <td>{x.total_days} วัน</td>
              <td>
                <Badge status={x.status} />
              </td>
              {onView && (
                <td>
                  <button className="link" onClick={() => onView(x)}>
                    ดูใบลา
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Approvals({ rows, profile, onRefresh }) {
  const [busyId, setBusyId] = useState(null);
  const [busyDecision, setBusyDecision] = useState(null);
  const isPersonnelHead = profile.organization_role === "personnel_head";
  const decide = async (row, status) => {
    if (busyId) return;
    const comment =
      prompt(
        status === "forwarded"
          ? "ความเห็นหัวหน้ากลุ่มบริหารงานบุคคล (เว้นว่างได้)"
          : status === "approved"
            ? "ความเห็น/คำสั่งผู้บริหาร (เว้นว่างได้)"
            : "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
      ) ?? null;
    if (comment === null) return;
    setBusyId(row.id);
    setBusyDecision(status);
    const { error } = await supabase.rpc("decide_leave", {
      request_id: row.id,
      decision: status,
      decision_comment: comment,
    });
    if (error) alert(error.message);
    else await onRefresh();
    setBusyId(null);
    setBusyDecision(null);
  };
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>รายการรออนุมัติ</h2>
          <p>
            {isPersonnelHead
              ? "ตรวจสอบและเสนอใบลาให้ผู้บริหาร"
              : "พิจารณาใบลาที่ผ่านหัวหน้ากลุ่มบริหารงานบุคคลแล้ว"}
          </p>
        </div>
      </div>
      {!rows.length ? (
        <div className="empty">
          <ShieldCheck size={34} />
          <p>ไม่มีรายการที่รอพิจารณา</p>
        </div>
      ) : (
        <div className="approval-list">
          {rows.map((x) => (
            <article key={x.id}>
              <div>
                <span className="type-label">{THAI_TYPES[x.leave_type]}</span>
                <h3>{x.profiles?.full_name}</h3>
                <p>
                  {dateTH(x.start_date)} – {dateTH(x.end_date)} · {x.total_days}{" "}
                  วัน
                </p>
                <small>เหตุผล: {x.reason}</small>
              </div>
              <div className="approval-actions">
                <button
                  className="reject"
                  onClick={() => decide(x, "rejected")}
                  disabled={Boolean(busyId)}
                  aria-busy={busyId === x.id && busyDecision === "rejected"}
                >
                  <XCircle size={17} />
                  {busyId === x.id && busyDecision === "rejected"
                    ? "กำลังบันทึก…"
                    : "ไม่อนุมัติ"}
                </button>
                <button
                  className="approve"
                  onClick={() =>
                    decide(x, isPersonnelHead ? "forwarded" : "approved")
                  }
                  disabled={Boolean(busyId)}
                  aria-busy={
                    busyId === x.id &&
                    busyDecision === (isPersonnelHead ? "forwarded" : "approved")
                  }
                >
                  <CheckCircle2 size={17} />
                  {busyId === x.id &&
                  busyDecision === (isPersonnelHead ? "forwarded" : "approved")
                    ? "กำลังบันทึก…"
                    : isPersonnelHead
                      ? "เสนอผู้บริหาร"
                      : "อนุมัติ"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function People({ currentUserId }) {
  const [people, setPeople] = useState([]),
    [show, setShow] = useState(false),
    [editing, setEditing] = useState(null),
    [editAvatar, setEditAvatar] = useState(null),
    [showInitialPassword, setShowInitialPassword] = useState(false),
    [deleteCandidate, setDeleteCandidate] = useState(null),
    [busy, setBusy] = useState(false),
    [busyTarget, setBusyTarget] = useState({ id: null, type: null }),
    [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    personnel_type: PEOPLE_TYPES[0],
    subject_group: "",
    is_admin: false,
    organization_role: "staff",
  });
  const load = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_active", true)
      .order("full_name");
    setPeople(await Promise.all((data || []).map(withAvatarUrl)));
  };
  useEffect(() => {
    load();
  }, []);
  const add = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase.functions.invoke(
      "create-personnel",
      { body: form },
    );
    if (error || data?.error) setMsg(data?.error || error.message);
    else {
      setMsg("เพิ่มบุคลากรเรียบร้อยแล้ว");
      setShow(false);
      setShowInitialPassword(false);
      await load();
    }
    setBusy(false);
  };
  const saveEdit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase.functions.invoke(
      "manage-personnel",
      {
        body: {
          action: "update",
          target_id: editing.id,
          full_name: editing.full_name,
          personnel_type: editing.personnel_type,
          subject_group: editing.subject_group,
          organization_role: editing.organization_role,
          is_admin: editing.is_admin,
        },
      },
    );
    if (error || data?.error) setMsg(data?.error || error.message);
    else {
      if (editAvatar) {
        const avatarError = await uploadAvatar(editing.id, editAvatar);
        if (avatarError) {
          setMsg(
            `บันทึกข้อมูลแล้ว แต่อัปโหลดรูปไม่สำเร็จ: ${avatarError.message}`,
          );
          setBusy(false);
          return;
        }
      }
      setMsg(`แก้ไขข้อมูลของ ${editing.full_name} เรียบร้อยแล้ว`);
      setEditing(null);
      setEditAvatar(null);
      await load();
    }
    setBusy(false);
  };
  const deletePerson = async (person, mode) => {
    if (busy) return;
    if (person.id === currentUserId) {
      setMsg("ไม่สามารถลบบัญชีของตนเองได้");
      return;
    }
    if (
      mode === "hard_delete" &&
      !confirm(
        `ยืนยันลบ ${person.full_name} ถาวร?\n\nบัญชี ประวัติใบลา รูป ลายเซ็น และไฟล์แนบทั้งหมดจะถูกลบและกู้คืนไม่ได้`,
      )
    ) return;
    setBusy(true);
    setBusyTarget({ id: person.id, type: "delete" });
    setMsg("");
    const { data, error } = await supabase.functions.invoke(
      "manage-personnel",
      { body: { action: mode, target_id: person.id } },
    );
    if (error || data?.error) setMsg(data?.error || error.message);
    else {
      setMsg(
        mode === "hard_delete"
          ? `ลบข้อมูลของ ${person.full_name} ถาวรเรียบร้อยแล้ว`
          : `ระงับบัญชีของ ${person.full_name} และเก็บประวัติไว้เรียบร้อยแล้ว`,
      );
      setDeleteCandidate(null);
      await load();
    }
    setBusy(false);
    setBusyTarget({ id: null, type: null });
  };
  const resetPassword = async (person) => {
    if (busy) return;
    const temporary = prompt(
      `กรอกเลขบัตรประชาชน 13 หลัก เพื่อเป็นรหัสผ่านชั่วคราวของ ${person.full_name}`,
    );
    if (temporary === null) return;
    if (!/^\d{13}$/.test(temporary)) {
      setMsg("รหัสผ่านชั่วคราวต้องเป็นตัวเลข 13 หลัก");
      return;
    }
    if (!confirm(`ยืนยันรีเซ็ตรหัสผ่านของ ${person.full_name}?`)) return;
    setBusy(true);
    setBusyTarget({ id: person.id, type: "reset" });
    setMsg("");
    const { data, error } = await supabase.functions.invoke(
      "reset-personnel-password",
      { body: { user_id: person.id, temporary_password: temporary } },
    );
    if (error || data?.error) setMsg(data?.error || error.message);
    else {
      setMsg(`รีเซ็ตรหัสผ่านของ ${person.full_name} เรียบร้อยแล้ว`);
      await load();
    }
    setBusy(false);
    setBusyTarget({ id: null, type: null });
  };
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>จัดการบุคลากร</h2>
            <p>บัญชีผู้ใช้งานและข้อมูลตำแหน่ง</p>
          </div>
          <button
            className="primary inline"
            onClick={() => {
              setShowInitialPassword(false);
              setShow(true);
            }}
            disabled={busy}
          >
            <Plus size={18} />
            เพิ่มบุคลากร
          </button>
        </div>
        {msg && (
          <div
            className={`alert ${msg.includes("เรียบร้อย") ? "success" : "error"}`}
          >
            {msg}
          </div>
        )}
        <div className="people-grid">
          {people.map((p) => (
            <article key={p.id}>
              <div className="avatar large">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={`รูปของ ${p.full_name}`} />
                ) : (
                  p.full_name?.[0]
                )}
              </div>
              <div>
                <h3>
                  {p.full_name}
                  {p.role === "admin" && (
                    <span className="admin-label">แอดมิน</span>
                  )}
                </h3>
                <p>
                  {p.position || "ยังไม่ระบุตำแหน่ง"} ·{" "}
                  {ORGANIZATION_ROLES[p.organization_role] ||
                    ORGANIZATION_ROLES.staff}
                </p>
                <small>
                  {p.subject_group ? `กลุ่มสาระ${p.subject_group} · ` : ""}
                  {p.personnel_type} · @{p.username}
                  {p.must_change_password ? " · รอเปลี่ยนรหัสผ่าน" : ""}
                </small>
              </div>
              <div className="person-actions">
                <button
                  className="edit-button"
                  onClick={() => {
                    setEditing({ ...p, is_admin: p.role === "admin" });
                    setEditAvatar(null);
                  }}
                  disabled={busy}
                >
                  <Pencil size={15} />
                  แก้ไข
                </button>
                <button
                  className="reset-button"
                  onClick={() => resetPassword(p)}
                  disabled={busy}
                  aria-busy={
                    busyTarget.id === p.id && busyTarget.type === "reset"
                  }
                >
                  <KeyRound size={15} />
                  {busyTarget.id === p.id && busyTarget.type === "reset"
                    ? "กำลังรีเซ็ต…"
                    : "รีเซ็ต"}
                </button>
                {p.id !== currentUserId && (
                  <button
                    className="delete-button"
                    onClick={() => setDeleteCandidate(p)}
                    disabled={busy}
                    aria-busy={
                      busyTarget.id === p.id && busyTarget.type === "delete"
                    }
                  >
                    <Trash2 size={15} />
                    {busyTarget.id === p.id && busyTarget.type === "delete"
                      ? "กำลังลบ…"
                      : "ลบ"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      {deleteCandidate && (
        <div className="modal">
          <section className="modal-card delete-choice" role="dialog" aria-modal="true">
            <div className="panel-title">
              <div>
                <h3>ต้องการลบแบบใด?</h3>
                <p>{deleteCandidate.full_name}</p>
              </div>
              <button
                type="button"
                className="icon"
                onClick={() => setDeleteCandidate(null)}
                disabled={busy}
              >
                ×
              </button>
            </div>
            <button
              type="button"
              className="delete-option keep-history"
              onClick={() => deletePerson(deleteCandidate, "deactivate")}
              disabled={busy}
              aria-busy={busyTarget.type === "delete"}
            >
              <strong>เก็บประวัติไว้</strong>
              <span>ระงับการเข้าสู่ระบบ แต่เก็บบัญชีและใบลาไว้ใน Supabase</span>
            </button>
            <button
              type="button"
              className="delete-option permanent"
              onClick={() => deletePerson(deleteCandidate, "hard_delete")}
              disabled={busy}
              aria-busy={busyTarget.type === "delete"}
            >
              <strong>ลบถาวร</strong>
              <span>ลบบัญชี ประวัติใบลา รูป ลายเซ็น และไฟล์แนบทั้งหมด</span>
            </button>
            <p className="delete-warning">การลบถาวรไม่สามารถกู้คืนข้อมูลได้</p>
          </section>
        </div>
      )}
      {show && (
        <div className="modal">
          <form className="modal-card" onSubmit={add}>
            <div className="panel-title">
              <h3>เพิ่มบุคลากร</h3>
              <button
                type="button"
                className="icon"
                onClick={() => {
                  setShowInitialPassword(false);
                  setShow(false);
                }}
              >
                ×
              </button>
            </div>
            <label>
              ชื่อ–นามสกุล
              <input
                required
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
              />
            </label>
            <label>
              ชื่อผู้ใช้
              <input
                required
                pattern="[A-Za-z0-9._-]+"
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </label>
            <label>
              รหัสผ่านเริ่มต้น (เลขบัตรประชาชน 13 หลัก)
              <span className="password-input">
                <input
                  required
                  type={showInitialPassword ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]{13}"
                  minLength="13"
                  maxLength="13"
                  autoComplete="new-password"
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  aria-label={
                    showInitialPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"
                  }
                  title={showInitialPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  onClick={() => setShowInitialPassword((visible) => !visible)}
                >
                  {showInitialPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </span>
              <small>
                ระบบไม่บันทึกเลขบัตรประชาชนเป็นข้อความ
                และจะบังคับให้เปลี่ยนทันที
              </small>
            </label>
            <label>
              ประเภทบุคลากร
              <select
                onChange={(e) =>
                  setForm({ ...form, personnel_type: e.target.value })
                }
              >
                {PEOPLE_TYPES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              กลุ่มสาระ
              <select
                value={form.subject_group}
                onChange={(e) =>
                  setForm({ ...form, subject_group: e.target.value })
                }
              >
                <option value="">ไม่ระบุ / ไม่สังกัดกลุ่มสาระ</option>
                {SUBJECT_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>
            <label>
              บทบาทในโรงเรียน
              <select
                onChange={(e) =>
                  setForm({ ...form, organization_role: e.target.value })
                }
              >
                {Object.entries(ORGANIZATION_ROLES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={form.is_admin}
                onChange={(e) =>
                  setForm({ ...form, is_admin: e.target.checked })
                }
              />
              <span>แต่งตั้งเป็นผู้ดูแลระบบ (แอดมิน)</span>
              <small>สิทธิ์อื่นจะกำหนดอัตโนมัติตามบทบาทในโรงเรียน</small>
            </label>
            <button className="primary" disabled={busy} aria-busy={busy}>
              {busy ? "กำลังเพิ่ม…" : "สร้างบัญชี"}
            </button>
          </form>
        </div>
      )}
      {editing && (
        <div className="modal">
          <form className="modal-card" onSubmit={saveEdit}>
            <div className="panel-title">
              <h3>แก้ไขข้อมูลบุคลากร</h3>
              <button
                type="button"
                className="icon"
                onClick={() => setEditing(null)}
              >
                ×
              </button>
            </div>
            <label>
              ชื่อ–นามสกุล
              <input
                required
                value={editing.full_name}
                onChange={(e) =>
                  setEditing({ ...editing, full_name: e.target.value })
                }
              />
            </label>
            <label>
              รูปโปรไฟล์
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setEditAvatar(e.target.files?.[0] || null)}
              />
              <small>PNG, JPG หรือ WebP ไม่เกิน 2 MB</small>
            </label>
            <label>
              ประเภทบุคลากร
              <select
                value={editing.personnel_type}
                onChange={(e) =>
                  setEditing({ ...editing, personnel_type: e.target.value })
                }
              >
                {PEOPLE_TYPES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              กลุ่มสาระ
              <select
                value={editing.subject_group || ""}
                onChange={(e) =>
                  setEditing({ ...editing, subject_group: e.target.value })
                }
              >
                <option value="">ไม่ระบุ / ไม่สังกัดกลุ่มสาระ</option>
                {SUBJECT_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>
            <label>
              บทบาทในโรงเรียน
              <select
                value={editing.organization_role || "staff"}
                onChange={(e) =>
                  setEditing({ ...editing, organization_role: e.target.value })
                }
              >
                {Object.entries(ORGANIZATION_ROLES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={Boolean(editing.is_admin)}
                disabled={editing.id === currentUserId}
                onChange={(e) =>
                  setEditing({ ...editing, is_admin: e.target.checked })
                }
              />
              <span>แต่งตั้งเป็นผู้ดูแลระบบ (แอดมิน)</span>
              {editing.id === currentUserId && (
                <small>ไม่สามารถยกเลิกสิทธิ์แอดมินของบัญชีที่กำลังใช้งาน</small>
              )}
              {editing.id !== currentUserId && (
                <small>สิทธิ์อื่นจะกำหนดอัตโนมัติตามบทบาทในโรงเรียน</small>
              )}
            </label>
            <button className="primary" disabled={busy} aria-busy={busy}>
              {busy ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function ChangePassword({ forced = false, onDone }) {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (password !== confirmPassword) {
      setMsg("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }
    if (password.length < 8 || /^\d+$/.test(password)) {
      setMsg("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัว และต้องมีตัวอักษรร่วมด้วย");
      return;
    }
    if (password === current) {
      setMsg("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password,
      currentPassword: current,
    });
    if (error) {
      setMsg("เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาตรวจสอบรหัสผ่านเดิม");
      setBusy(false);
      return;
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", (await supabase.auth.getUser()).data.user.id);
    setBusy(false);
    if (profileError) setMsg(profileError.message);
    else {
      setMsg("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
      setCurrent("");
      setPassword("");
      setConfirmPassword("");
      onDone?.();
    }
  };
  return (
    <section className={forced ? "password-gate" : "panel password-panel"}>
      <div className="password-card">
        <span className="password-icon">
          <KeyRound />
        </span>
        <h2>{forced ? "กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน" : "เปลี่ยนรหัสผ่าน"}</h2>
        <p>
          {forced
            ? "เพื่อความปลอดภัย รหัสผ่านชั่วคราวใช้เข้าสู่ระบบได้ครั้งแรกเท่านั้น"
            : "กรอกรหัสผ่านเดิมและตั้งรหัสผ่านใหม่"}
        </p>
        <form onSubmit={submit}>
          <label>
            รหัสผ่านเดิม
            <input
              type="password"
              required
              value={current}
              autoComplete="current-password"
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label>
            รหัสผ่านใหม่
            <input
              type="password"
              required
              minLength="8"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <small>อย่างน้อย 8 ตัว และต้องมีตัวอักษรร่วมด้วย</small>
          </label>
          <label>
            ยืนยันรหัสผ่านใหม่
            <input
              type="password"
              required
              minLength="8"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          {msg && (
            <div
              className={`alert ${msg.includes("เรียบร้อย") ? "success" : "error"}`}
            >
              {msg}
            </div>
          )}
          <button className="primary" disabled={busy} aria-busy={busy}>
            {busy ? "กำลังบันทึก…" : "เปลี่ยนรหัสผ่าน"}
          </button>
        </form>
        {forced && (
          <button
            className="logout-link"
            onClick={() => supabase.auth.signOut()}
          >
            ออกจากระบบ
          </button>
        )}
      </div>
    </section>
  );
}

function ProfilePage({ profile, onRefresh }) {
  const [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(""),
    [avatarFile, setAvatarFile] = useState(null),
    [avatarBusy, setAvatarBusy] = useState(false),
    [avatarMsg, setAvatarMsg] = useState("");
  const saveAvatar = async (e) => {
    e.preventDefault();
    if (!avatarFile || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarMsg("");
    const error = await uploadAvatar(profile.id, avatarFile);
    if (error) setAvatarMsg(error.message);
    else {
      setAvatarMsg("บันทึกรูปโปรไฟล์เรียบร้อยแล้ว");
      setAvatarFile(null);
      await onRefresh();
    }
    setAvatarBusy(false);
  };
  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMsg("");
    const ext = file.name.split(".").pop().toLowerCase();
    const path = `${profile.id}/signature.${ext}`;
    const { error } = await supabase.storage
      .from("signatures")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      const result = await supabase
        .from("profiles")
        .update({ signature_path: path })
        .eq("id", profile.id);
      if (result.error) setMsg(result.error.message);
      else {
        setMsg("บันทึกลายเซ็นเรียบร้อยแล้ว");
        onRefresh();
      }
    } else setMsg(error.message);
    setBusy(false);
  };
  return (
    <>
      <section className="panel profile-panel">
        <div className="panel-title">
          <div>
            <h2>ข้อมูล รูปโปรไฟล์ และลายเซ็น</h2>
            <p>อัปโหลดรูปของตนเองและลายเซ็นสำหรับใช้บนใบลา</p>
          </div>
        </div>
        <div className="profile-summary">
          <div className="avatar profile-avatar">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`รูปของ ${profile.full_name}`}
              />
            ) : (
              profile.full_name?.[0]
            )}
          </div>
          <div>
            <h3>{profile.full_name}</h3>
            <p>
              {profile.position} · {profile.personnel_type}
            </p>
          </div>
        </div>
        <form
          className="signature-upload profile-photo-upload"
          onSubmit={saveAvatar}
        >
          <label>
            อัปโหลดหรือเปลี่ยนรูปโปรไฟล์ (PNG, JPG หรือ WebP ไม่เกิน 2 MB)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </label>
          {avatarMsg && (
            <div
              className={`alert ${avatarMsg.includes("เรียบร้อย") ? "success" : "error"}`}
            >
              {avatarMsg}
            </div>
          )}
          <button
            className="primary inline"
            disabled={avatarBusy || !avatarFile}
            aria-busy={avatarBusy}
          >
            <Upload size={17} />
            {avatarBusy ? "กำลังอัปโหลด…" : "บันทึกรูปโปรไฟล์"}
          </button>
        </form>
        <form className="signature-upload" onSubmit={upload}>
          <label>
            อัปโหลดลายเซ็น (PNG, JPG หรือ WebP ไม่เกิน 2 MB)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={(e) => setFile(e.target.files?.[0])}
            />
          </label>
          {profile.signature_url && (
            <div className="signature-preview">
              <img src={profile.signature_url} alt="ลายเซ็นปัจจุบัน" />
              <span>ลายเซ็นปัจจุบัน</span>
            </div>
          )}
          {msg && (
            <div
              className={`alert ${msg.includes("เรียบร้อย") ? "success" : "error"}`}
            >
              {msg}
            </div>
          )}
          <button
            className="primary inline"
            disabled={busy || !file}
            aria-busy={busy}
          >
            <Upload size={17} />
            {busy ? "กำลังอัปโหลด…" : "บันทึกลายเซ็น"}
          </button>
        </form>
      </section>
      <ChangePassword onDone={onRefresh} />
    </>
  );
}

function PrintLeave({ leave, profile, onClose, preview = false }) {
  const [leaders, setLeaders] = useState({ head: null, executive: null });
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "full_name,position,subject_group,organization_role,signature_path",
        )
        .in("organization_role", ["personnel_head", "executive"])
        .eq("is_active", true)
        .order("full_name");
      const enriched = await Promise.all(
        (data || []).map(async (person) => {
          if (!person.signature_path) return person;
          const { data: signed } = await supabase.storage
            .from("signatures")
            .createSignedUrl(person.signature_path, 3600);
          return { ...person, signature_url: signed?.signedUrl };
        }),
      );
      if (active)
        setLeaders({
          head:
            enriched.find(
              (x) => x.organization_role === "personnel_head",
            ) ||
            null,
          executive:
            enriched.find((x) => x.organization_role === "executive") || null,
        });
    })();
    return () => {
      active = false;
    };
  }, [profile.subject_group]);
  const decision =
    leave.status === "approved"
      ? "☑ อนุญาต　☐ ไม่อนุญาต"
      : leave.status === "rejected" && leave.decision_stage !== "personnel"
        ? "☐ อนุญาต　☑ ไม่อนุญาต"
        : "☐ อนุญาต　☐ ไม่อนุญาต";
  const signatureName = (person) =>
    person
      ? `( ${person.full_name} )`
      : "( ................................................ )";
  return (
    <div className="print-overlay">
      <div className="print-toolbar">
        <button onClick={onClose}>กลับไปแก้ไข</button>
        <div>
          {preview && <span className="preview-label">ตัวอย่างก่อนเสนอ</span>}
          <button className="primary inline" onClick={() => print()}>
            <Printer size={17} />
            พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>
      <article className="paper">
        <div className="paper-place">
          เขียนที่ <u>{leave.written_at}</u>
          <br />
          วันที่ {dateTH(leave.created_at, true)}
        </div>
        <p>
          <b>เรื่อง</b> {leave.subject}
        </p>
        <p>
          <b>เรียน</b> {leave.recipient}
        </p>
        <p className="indent">
          ข้าพเจ้า <u>{profile.full_name}</u> ตำแหน่ง <u>{profile.position}</u>
          <br />
          สังกัด โรงเรียนบ้านคชศิลา
        </p>
        <p>
          ขอลา　
          {Object.entries(THAI_TYPES)
            .map(([k, v]) => <span key={k}>☐ {v.replace("ลา", "")}　</span>)
            .map((x, i) =>
              leave.leave_type === Object.keys(THAI_TYPES)[i] ? (
                <b key={i}>{String(x.props.children).replace("☐", "☑")}</b>
              ) : (
                x
              ),
            )}{" "}
          เนื่องจาก {leave.reason}
        </p>
        <p>
          ตั้งแต่วันที่ <u>{dateTH(leave.start_date)}</u> ถึงวันที่{" "}
          <u>{dateTH(leave.end_date)}</u> มีกำหนด <u>{leave.total_days}</u> วัน
        </p>
        <p>ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ {leave.contact}</p>
        <div className="signature">
          <p>ขอแสดงความนับถือ</p>
          {profile.signature_url && <img src={profile.signature_url} />}
          <p>( {profile.full_name} )</p>
        </div>
        <h4>สถิติการลาในปีงบประมาณนี้</h4>
        <table className="paper-table">
          <tbody>
            <tr>
              <th>ประเภทการลา</th>
              <th>ลามาแล้ว</th>
              <th>ลาครั้งนี้</th>
              <th>รวมเป็น</th>
            </tr>
            {Object.entries(THAI_TYPES).map(([k, v]) => (
              <tr key={k}>
                <td>{v.replace("ลา", "")}</td>
                <td>–</td>
                <td>{leave.leave_type === k ? leave.total_days : "–"}</td>
                <td>{leave.leave_type === k ? leave.total_days : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="decision">
          <div className="approval-block">
            <h4>ความเห็นผู้บังคับบัญชาขั้นต้น</h4>
            <p className="comment-lines">
              {leave.personnel_comment ||
                "................................................................"}
              <br />
              ................................................................
            </p>
            <div className="approval-signature">
              <span>ลงชื่อ</span>
              {leaders.head?.signature_url && (
                <img src={leaders.head.signature_url} />
              )}
              <p>{signatureName(leaders.head)}</p>
              <strong>หัวหน้ากลุ่มบริหารงานบุคคล</strong>
            </div>
          </div>
          <div className="approval-block">
            <h4>คำสั่งผู้บริหาร</h4>
            <p>{decision}</p>
            <p className="comment-lines">
              {leave.decision_comment ||
                "................................................................"}
            </p>
            <div className="approval-signature">
              <span>ลงชื่อ</span>
              {leave.decision_stage !== "personnel" &&
                leaders.executive?.signature_url && (
                  <img src={leaders.executive.signature_url} />
                )}
              <p>
                {leave.decision_stage === "personnel"
                  ? signatureName(null)
                  : signatureName(leaders.executive)}
              </p>
              <strong>ผู้บริหารสถานศึกษา</strong>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null),
    [profile, setProfile] = useState(null),
    [page, setPage] = useState("home"),
    [leaves, setLeaves] = useState([]),
    [pending, setPending] = useState([]),
    [menu, setMenu] = useState(false),
    [view, setView] = useState(null);
  const load = async (user = session?.user) => {
    if (!user) return;
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (!p) {
      await supabase.auth.signOut();
      return;
    }
    if (p?.signature_path) {
      const { data: signed } = await supabase.storage
        .from("signatures")
        .createSignedUrl(p.signature_path, 3600);
      p.signature_url = signed?.signedUrl;
    }
    setProfile(await withAvatarUrl(p));
    const { data: l } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLeaves(l || []);
    if (["personnel_head", "executive"].includes(p?.organization_role)) {
      const expectedStatus =
        p.organization_role === "personnel_head"
          ? "pending_personnel"
          : "pending_executive";
      const { data: a } = await supabase
        .from("leave_requests")
        .select("*,profiles!leave_requests_user_id_fkey(full_name,position)")
        .eq("status", expectedStatus)
        .order("created_at");
      setPending(a || []);
    }
  };
  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) load(data.session.user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) setTimeout(() => load(s.user), 0);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);
  if (!configured)
    return (
      <main className="setup">
        <ShieldCheck size={50} />
        <h1>รอเชื่อมต่อ Supabase</h1>
        <p>
          คัดลอก <code>.env.example</code> เป็น <code>.env</code> แล้วใส่
          Project URL และ anon key
        </p>
      </main>
    );
  if (!session) return <Login />;
  if (!profile)
    return (
      <main className="setup">
        <div className="spinner" />
        <p>กำลังโหลดข้อมูล…</p>
      </main>
    );
  if (profile.must_change_password)
    return <ChangePassword forced onDone={() => load()} />;
  if (view)
    return (
      <PrintLeave
        leave={view}
        profile={profile}
        onClose={() => setView(null)}
      />
    );
  const titles = {
    home: "ภาพรวม",
    new: "เขียนใบลา",
    mine: "ใบลาของฉัน",
    profile: "ข้อมูลและลายเซ็น",
    approvals: "รายการรออนุมัติ",
    statistics: "สถิติการลา",
    people: "จัดการบุคลากร",
  };
  return (
    <div className="app">
      <Sidebar
        page={page}
        setPage={setPage}
        profile={profile}
        open={menu}
        setOpen={setMenu}
      />
      <main className="content">
        <header>
          <button className="menu" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div>
            <p className="eyebrow">ระบบการลา</p>
            <h1>{titles[page]}</h1>
          </div>
          <div className="school-name">โรงเรียนบ้านคชศิลา</div>
        </header>
        {page === "home" && (
          <Dashboard profile={profile} leaves={leaves} setPage={setPage} />
        )}{" "}
        {page === "new" && (
          <LeaveForm
            profile={profile}
            onSaved={() => {
              load();
              setPage("mine");
            }}
          />
        )}
        {page === "mine" && (
          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>ใบลาของฉัน</h2>
                <p>เปิดดูและพิมพ์ใบลาที่ได้รับอนุมัติ</p>
              </div>
            </div>
            <LeaveTable
              leaves={leaves}
              onView={(x) =>
                x.status === "approved" || x.status === "rejected"
                  ? setView(x)
                  : alert("ใบลาจะพิมพ์ได้เมื่อมีคำสั่งแล้ว")
              }
            />
          </section>
        )}
        {page === "profile" && (
          <ProfilePage profile={profile} onRefresh={load} />
        )}{" "}
        {page === "approvals" && (
          <Approvals rows={pending} profile={profile} onRefresh={load} />
        )}{" "}
        {page === "statistics" && (
          <Statistics canDelete={profile.role === "admin"} />
        )}{" "}
        {page === "people" && <People currentUserId={profile.id} />}
      </main>
    </div>
  );
}

function dateTH(value, long = false) {
  if (!value) return "–";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
  }).format(new Date(value));
}
