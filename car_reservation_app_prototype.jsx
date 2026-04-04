import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Car, Gauge, Plus, Trash2, AlertCircle, Search, Fuel, ChevronLeft, ChevronRight, Receipt, Wallet } from "lucide-react";

function formatDate(date) {
  if (!date) return "";
  return new Date(date + "T00:00:00").toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function formatMonth(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function minutesFromTime(t) {
  if (!t || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(a, b) {
  if (a.date !== b.date) return false;
  const aStart = minutesFromTime(a.startTime);
  const aEnd = minutesFromTime(a.endTime);
  const bStart = minutesFromTime(b.startTime);
  const bEnd = minutesFromTime(b.endTime);
  if ([aStart, aEnd, bStart, bEnd].some((v) => v === null)) return false;
  return aStart < bEnd && bStart < aEnd;
}

function buildCalendarDays(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const days = [];

  for (let i = 0; i < startOffset; i += 1) days.push(null);
  for (let d = 1; d <= totalDays; d += 1) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

const peopleOptions = ["たくま", "ぴ", "二人"];
const STORAGE_KEY = "car-reservation-app-data-v4";
const weekLabels = ["日", "月", "火", "水", "木", "金", "土"];

const initialData = {
  reservations: [
    {
      id: 1,
      user: "たくま",
      date: "2026-04-05",
      startTime: "10:00",
      endTime: "12:00",
      destination: "買い物",
      note: "",
      odometerStart: "15230",
      odometerEnd: "15258",
    },
    {
      id: 2,
      user: "ぴ",
      date: "2026-04-06",
      startTime: "14:00",
      endTime: "16:30",
      destination: "通院",
      note: "帰りに給油予定",
      odometerStart: "15258",
      odometerEnd: "15280",
    },
  ],
  fuelLogs: [
    { id: 101, date: "2026-04-06", user: "ぴ", amount: "4500", odometer: "15280", note: "満タン" },
  ],
  expenseLogs: [
    { id: 201, date: "2026-04-05", user: "二人", category: "駐車場", amount: "800", note: "駅前" },
  ],
};

export default function CarReservationApp() {
  const [reservations, setReservations] = useState(initialData.reservations);
  const [fuelLogs, setFuelLogs] = useState(initialData.fuelLogs);
  const [expenseLogs, setExpenseLogs] = useState(initialData.expenseLogs);
  const [form, setForm] = useState({
    user: "たくま",
    date: "",
    startTime: "",
    endTime: "",
    destination: "",
    note: "",
  });
  const [distanceForm, setDistanceForm] = useState({});
  const [fuelForm, setFuelForm] = useState({ date: "", user: "たくま", amount: "", odometer: "", note: "" });
  const [expenseForm, setExpenseForm] = useState({ date: "", user: "たくま", category: "", amount: "", note: "" });
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [userFilter, setUserFilter] = useState("全員");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.reservations) setReservations(parsed.reservations);
      if (parsed?.fuelLogs) setFuelLogs(parsed.fuelLogs);
      if (parsed?.expenseLogs) setExpenseLogs(parsed.expenseLogs);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ reservations, fuelLogs, expenseLogs })
    );
  }, [reservations, fuelLogs, expenseLogs]);

  const sortedReservations = useMemo(() => {
    return [...reservations].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    return sortedReservations.filter((r) => {
      const matchesUser = userFilter === "全員" ? true : r.user === userFilter;
      const keyword = searchText.trim().toLowerCase();
      const matchesText =
        keyword === ""
          ? true
          : [r.destination, r.note, r.date, r.startTime, r.endTime, r.user].join(" ").toLowerCase().includes(keyword);
      return matchesUser && matchesText;
    });
  }, [sortedReservations, userFilter, searchText]);

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const reservationsByDate = useMemo(() => {
    const map = {};
    reservations.forEach((r) => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    Object.keys(map).forEach((key) => map[key].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [reservations]);

  const totalDistance = filteredReservations.reduce((sum, r) => {
    const start = Number(r.odometerStart);
    const end = Number(r.odometerEnd);
    if (Number.isNaN(start) || Number.isNaN(end)) return sum;
    return sum + Math.max(0, end - start);
  }, 0);

  const latestOdometer = [...sortedReservations].reverse().find((r) => r.odometerEnd !== "" && !Number.isNaN(Number(r.odometerEnd)));
  const totalFuelAmount = fuelLogs.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalExpenseAmount = expenseLogs.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const nextReservation = sortedReservations.find((r) => `${r.date} ${r.startTime}` >= `${today} 00:00`);

  const handleAddReservation = () => {
    setError("");
    if (!form.date || !form.startTime || !form.endTime || !form.destination.trim()) {
      setError("日付・時間・目的地は必須です。");
      return;
    }
    if (minutesFromTime(form.startTime) >= minutesFromTime(form.endTime)) {
      setError("終了時間は開始時間より後にしてください。");
      return;
    }
    const newReservation = { id: Date.now(), ...form, odometerStart: "", odometerEnd: "" };
    const hasConflict = reservations.some((r) => overlaps(r, newReservation));
    if (hasConflict) {
      setError("その時間帯にはすでに予約があります。");
      return;
    }
    setReservations((prev) => [...prev, newReservation]);
    setForm({ user: "たくま", date: "", startTime: "", endTime: "", destination: "", note: "" });
  };

  const handleDeleteReservation = (id) => setReservations((prev) => prev.filter((r) => r.id !== id));
  const handleDeleteFuel = (id) => setFuelLogs((prev) => prev.filter((r) => r.id !== id));
  const handleDeleteExpense = (id) => setExpenseLogs((prev) => prev.filter((r) => r.id !== id));

  const handleDistanceSave = (id) => {
    const entry = distanceForm[id] || {};
    const start = Number(entry.odometerStart);
    const end = Number(entry.odometerEnd);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setError("オドメーターは数字で入力してください。");
      return;
    }
    if (end < start) {
      setError("利用後オドメーターは利用前以上にしてください。");
      return;
    }
    setError("");
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, odometerStart: String(start), odometerEnd: String(end) } : r)));
  };

  const handleAddFuelLog = () => {
    setError("");
    if (!fuelForm.date || !fuelForm.amount) {
      setError("給油日と金額は必須です。");
      return;
    }
    setFuelLogs((prev) => [...prev, { id: Date.now(), ...fuelForm }]);
    setFuelForm({ date: "", user: "たくま", amount: "", odometer: "", note: "" });
  };

  const handleAddExpenseLog = () => {
    setError("");
    if (!expenseForm.date || !expenseForm.category.trim() || !expenseForm.amount) {
      setError("経費日・項目・金額は必須です。");
      return;
    }
    setExpenseLogs((prev) => [...prev, { id: Date.now(), ...expenseForm }]);
    setExpenseForm({ date: "", user: "たくま", category: "", amount: "", note: "" });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <Car className="h-4 w-4" />
              たくま・ぴ・二人 用
            </div>
            <h1 className="text-2xl font-bold tracking-tight">車の予約・オドメーター・経費管理</h1>
            <p className="mt-2 text-sm text-slate-600">予約カレンダー、オドメーター記録、給油記録、その他経費記録をまとめた実用版です。</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-[460px]">
            <Card className="rounded-2xl shadow-none"><CardContent className="p-4"><div className="text-xs text-slate-500">予約件数</div><div className="mt-1 text-2xl font-semibold">{filteredReservations.length}</div></CardContent></Card>
            <Card className="rounded-2xl shadow-none"><CardContent className="p-4"><div className="text-xs text-slate-500">走行距離</div><div className="mt-1 text-2xl font-semibold">{totalDistance}km</div></CardContent></Card>
            <Card className="rounded-2xl shadow-none"><CardContent className="p-4"><div className="text-xs text-slate-500">給油合計</div><div className="mt-1 text-2xl font-semibold">¥{totalFuelAmount.toLocaleString()}</div></CardContent></Card>
            <Card className="rounded-2xl shadow-none"><CardContent className="p-4"><div className="text-xs text-slate-500">経費合計</div><div className="mt-1 text-2xl font-semibold">¥{totalExpenseAmount.toLocaleString()}</div></CardContent></Card>
          </div>
        </div>

        {error && <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-xl"><CalendarDays className="h-5 w-5" />予約カレンダー</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="min-w-28 text-center text-sm font-medium">{formatMonth(currentMonth)}</div>
                <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500">{weekLabels.map((label) => <div key={label} className="py-2 font-medium">{label}</div>)}</div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  if (!day) return <div key={`blank-${index}`} className="min-h-28 rounded-2xl bg-slate-100/70" />;
                  const dateKey = day.toISOString().slice(0, 10);
                  const items = reservationsByDate[dateKey] || [];
                  const isToday = dateKey === today;
                  return (
                    <div key={dateKey} className={`min-h-28 rounded-2xl border p-2 ${isToday ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}>
                      <div className="mb-2 flex items-center justify-between"><div className={`text-sm font-semibold ${isToday ? "text-slate-900" : "text-slate-700"}`}>{day.getDate()}</div>{items.length > 0 && <Badge className="rounded-xl">{items.length}件</Badge>}</div>
                      <div className="space-y-1">{items.slice(0, 3).map((item) => <div key={item.id} className="rounded-xl bg-slate-100 px-2 py-1 text-[11px] leading-4"><div className="font-medium">{item.startTime} {item.user}</div><div className="truncate text-slate-600">{item.destination}</div></div>)}{items.length > 3 && <div className="text-[11px] text-slate-500">ほか {items.length - 3} 件</div>}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="reserve" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 rounded-2xl">
              <TabsTrigger value="reserve">予約</TabsTrigger>
              <TabsTrigger value="list">一覧</TabsTrigger>
              <TabsTrigger value="fuel">給油</TabsTrigger>
              <TabsTrigger value="expense">経費</TabsTrigger>
            </TabsList>

            <TabsContent value="reserve">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Plus className="h-5 w-5" />新しい予約を追加</CardTitle></CardHeader>
                <CardContent className="grid gap-4">
                  <div className="space-y-2"><Label>使用者</Label><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })}>{peopleOptions.map((name) => <option key={name}>{name}</option>)}</select></div>
                  <div className="space-y-2"><Label>日付</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>開始時間</Label><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div><div className="space-y-2"><Label>終了時間</Label><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div></div>
                  <div className="space-y-2"><Label>目的地・用件</Label><Input placeholder="例：買い物、通院、送迎" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
                  <div className="space-y-2"><Label>メモ</Label><Textarea placeholder="任意" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
                  <Button onClick={handleAddReservation} className="w-full rounded-2xl">予約を追加</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              <div className="space-y-4">
                <Card className="rounded-3xl shadow-sm">
                  <CardContent className="p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" placeholder="目的地・メモ・日付で検索" value={searchText} onChange={(e) => setSearchText(e.target.value)} /></div>
                      <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}><option>全員</option>{peopleOptions.map((name) => <option key={name}>{name}</option>)}</select>
                    </div>
                  </CardContent>
                </Card>

                {filteredReservations.map((r) => {
                  const start = Number(r.odometerStart);
                  const end = Number(r.odometerEnd);
                  const hasDistance = !Number.isNaN(start) && !Number.isNaN(end) && r.odometerStart !== "" && r.odometerEnd !== "";
                  const distance = hasDistance ? Math.max(0, end - start) : null;
                  return (
                    <Card key={r.id} className="rounded-3xl shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="rounded-xl">{r.user}</Badge><span className="text-lg font-semibold">{r.destination}</span></div>
                            <div className="flex flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center md:gap-4"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDate(r.date)}</div><div>{r.startTime} 〜 {r.endTime}</div></div>
                            {r.note && <p className="text-sm text-slate-500">メモ：{r.note}</p>}
                          </div>
                          <Button variant="outline" size="icon" onClick={() => handleDeleteReservation(r.id)} className="rounded-2xl"><Trash2 className="h-4 w-4" /></Button>
                        </div>

                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700"><Gauge className="h-4 w-4" />オドメーター記録</div>
                          <div className="grid gap-3 md:grid-cols-4">
                            <div className="space-y-2"><Label>利用前</Label><Input type="number" placeholder="例：15280" value={distanceForm[r.id]?.odometerStart ?? r.odometerStart} onChange={(e) => setDistanceForm((prev) => ({ ...prev, [r.id]: { ...prev[r.id], odometerStart: e.target.value, odometerEnd: prev[r.id]?.odometerEnd ?? r.odometerEnd } }))} /></div>
                            <div className="space-y-2"><Label>利用後</Label><Input type="number" placeholder="例：15305" value={distanceForm[r.id]?.odometerEnd ?? r.odometerEnd} onChange={(e) => setDistanceForm((prev) => ({ ...prev, [r.id]: { ...prev[r.id], odometerStart: prev[r.id]?.odometerStart ?? r.odometerStart, odometerEnd: e.target.value } }))} /></div>
                            <div className="space-y-2"><Label>走行距離</Label><div className="flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">{distance !== null ? `${distance} km` : "未記録"}</div></div>
                            <div className="flex items-end"><Button onClick={() => handleDistanceSave(r.id)} className="w-full rounded-2xl">保存</Button></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredReservations.length === 0 && <Card className="rounded-3xl shadow-sm"><CardContent className="p-8 text-center text-sm text-slate-500">条件に合う予約はありません。</CardContent></Card>}
              </div>
            </TabsContent>

            <TabsContent value="fuel">
              <div className="space-y-4">
                <Card className="rounded-3xl shadow-sm">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Fuel className="h-5 w-5" />給油記録を追加</CardTitle></CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>日付</Label><Input type="date" value={fuelForm.date} onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} /></div><div className="space-y-2"><Label>使用者</Label><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={fuelForm.user} onChange={(e) => setFuelForm({ ...fuelForm, user: e.target.value })}>{peopleOptions.map((name) => <option key={name}>{name}</option>)}</select></div></div>
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>金額（円）</Label><Input type="number" value={fuelForm.amount} onChange={(e) => setFuelForm({ ...fuelForm, amount: e.target.value })} /></div><div className="space-y-2"><Label>オドメーター</Label><Input type="number" value={fuelForm.odometer} onChange={(e) => setFuelForm({ ...fuelForm, odometer: e.target.value })} /></div></div>
                    <div className="space-y-2"><Label>メモ</Label><Textarea value={fuelForm.note} onChange={(e) => setFuelForm({ ...fuelForm, note: e.target.value })} /></div>
                    <Button onClick={handleAddFuelLog} className="w-full rounded-2xl">給油記録を追加</Button>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl shadow-sm">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Wallet className="h-5 w-5" />給油履歴</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {fuelLogs.slice().reverse().map((item) => (
                      <div key={item.id} className="flex items-start justify-between rounded-2xl border border-slate-200 p-4">
                        <div className="space-y-1 text-sm"><div className="flex items-center gap-2"><Badge className="rounded-xl">{item.user}</Badge><span className="font-medium">{formatDate(item.date)}</span></div><div>¥{Number(item.amount || 0).toLocaleString()} / {item.odometer ? `${item.odometer}km` : "オドメーター未記録"}</div>{item.note && <div className="text-slate-500">{item.note}</div>}</div>
                        <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => handleDeleteFuel(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    {fuelLogs.length === 0 && <div className="text-sm text-slate-500">給油記録はまだありません。</div>}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="expense">
              <div className="space-y-4">
                <Card className="rounded-3xl shadow-sm">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Receipt className="h-5 w-5" />その他経費を追加</CardTitle></CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>日付</Label><Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} /></div><div className="space-y-2"><Label>使用者</Label><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={expenseForm.user} onChange={(e) => setExpenseForm({ ...expenseForm, user: e.target.value })}>{peopleOptions.map((name) => <option key={name}>{name}</option>)}</select></div></div>
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>項目</Label><Input placeholder="例：駐車場、高速代、洗車" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} /></div><div className="space-y-2"><Label>金額（円）</Label><Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></div></div>
                    <div className="space-y-2"><Label>メモ</Label><Textarea value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })} /></div>
                    <Button onClick={handleAddExpenseLog} className="w-full rounded-2xl">経費を追加</Button>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl shadow-sm">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Wallet className="h-5 w-5" />その他経費履歴</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {expenseLogs.slice().reverse().map((item) => (
                      <div key={item.id} className="flex items-start justify-between rounded-2xl border border-slate-200 p-4">
                        <div className="space-y-1 text-sm"><div className="flex items-center gap-2"><Badge className="rounded-xl">{item.user}</Badge><span className="font-medium">{item.category}</span></div><div>{formatDate(item.date)} / ¥{Number(item.amount || 0).toLocaleString()}</div>{item.note && <div className="text-slate-500">{item.note}</div>}</div>
                        <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => handleDeleteExpense(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    {expenseLogs.length === 0 && <div className="text-sm text-slate-500">経費記録はまだありません。</div>}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-3xl shadow-sm"><CardContent className="p-5"><div className="mb-2 text-sm text-slate-500">最新オドメーター</div><div className="text-2xl font-semibold">{latestOdometer ? `${latestOdometer.odometerEnd}km` : "未記録"}</div></CardContent></Card>
          <Card className="rounded-3xl shadow-sm"><CardContent className="p-5"><div className="mb-2 text-sm text-slate-500">次の予約</div><div className="text-lg font-semibold">{nextReservation ? `${formatDate(nextReservation.date)} ${nextReservation.startTime} ${nextReservation.user}` : "なし"}</div></CardContent></Card>
        </div>
      </div>
    </div>
  );
}
