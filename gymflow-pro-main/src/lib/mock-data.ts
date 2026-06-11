export type MemberStatus = "active" | "expired" | "expiring";

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  plan: string;
  joinDate: string;
  expiry: string;
  status: MemberStatus;
  points: number;
  streak: number;
  gender: "Male" | "Female" | "Other";
  trainer: string;
  goals: string[];
}

const namesPool = [
  "Arjun Mehta", "Priya Sharma", "Rohan Verma", "Sneha Iyer", "Vikram Singh",
  "Anjali Kapoor", "Kabir Khanna", "Meera Joshi", "Aditya Rao", "Ishita Bose",
  "Yash Patel", "Tara Nair", "Dev Malhotra", "Riya Chawla", "Sahil Gupta",
  "Neha Reddy", "Karan Bhatt", "Pooja Saxena", "Rahul Menon", "Aisha Khan",
  "Manav Desai", "Simran Kaur", "Ayaan Sheikh", "Diya Pillai", "Aryan Jain",
];
const plans = ["Monthly", "Quarterly", "Half-Year", "Annual"];
const trainers = ["Coach Ramesh", "Coach Tanvi", "Coach Aakash", "Coach Leela"];
const goalsList = ["Weight Loss", "Muscle Gain", "Maintenance", "Flexibility"];

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length]; }

export const members: Member[] = Array.from({ length: 25 }).map((_, i) => {
  const join = new Date(2025, (i * 2) % 12, ((i * 7) % 27) + 1);
  const expiry = new Date(2026, 5 + (i % 6), ((i * 5) % 27) + 1);
  const daysLeft = Math.floor((expiry.getTime() - Date.now()) / 86400000);
  const status: MemberStatus =
    daysLeft < 0 ? "expired" : daysLeft <= 7 ? "expiring" : "active";
  return {
    id: `M${1000 + i}`,
    name: namesPool[i % namesPool.length],
    phone: `+91 ${90000 + i * 137}`.slice(0, 14),
    email: namesPool[i % namesPool.length].toLowerCase().replace(" ", ".") + "@gym.in",
    plan: pick(plans, i),
    joinDate: join.toISOString().slice(0, 10),
    expiry: expiry.toISOString().slice(0, 10),
    status,
    points: 200 + ((i * 53) % 1800),
    streak: (i * 3) % 30,
    gender: i % 3 === 0 ? "Female" : i % 5 === 0 ? "Other" : "Male",
    trainer: pick(trainers, i),
    goals: [pick(goalsList, i), pick(goalsList, i + 1)],
  };
});

export const stats = {
  totalMembers: members.length,
  activeMembers: members.filter((m) => m.status === "active").length,
  expiringMembers: members.filter((m) => m.status === "expiring").length,
  monthlyRevenue: 124500,
  pendingDues: 18200,
  pendingCount: 23,
};

export const revenueByMonth = [
  { month: "Jan", revenue: 86000 },
  { month: "Feb", revenue: 92500 },
  { month: "Mar", revenue: 104200 },
  { month: "Apr", revenue: 98000 },
  { month: "May", revenue: 115400 },
  { month: "Jun", revenue: 124500 },
];

export const membershipDistribution = [
  { name: "Active", value: stats.activeMembers, color: "var(--success)" },
  { name: "Expiring", value: stats.expiringMembers, color: "var(--gold)" },
  { name: "Expired", value: stats.totalMembers - stats.activeMembers - stats.expiringMembers, color: "var(--danger)" },
];

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  plan: string;
  amount: number;
  date: string;
  method: "Cash" | "UPI" | "Card";
  status: "Paid" | "Pending" | "Overdue";
}

export const payments: Payment[] = members.slice(0, 18).map((m, i) => ({
  id: `P${2000 + i}`,
  memberId: m.id,
  memberName: m.name,
  plan: m.plan,
  amount: [1500, 4000, 7500, 14000][i % 4],
  date: new Date(2026, 4, ((i * 3) % 27) + 1).toISOString().slice(0, 10),
  method: ["Cash", "UPI", "Card"][i % 3] as Payment["method"],
  status: (i % 5 === 0 ? "Pending" : i % 7 === 0 ? "Overdue" : "Paid") as Payment["status"],
}));

export const membershipPlans = [
  { id: "p1", name: "Monthly", price: 1500, duration: "1 month", perks: ["Gym access", "Locker"] },
  { id: "p2", name: "Quarterly", price: 4000, duration: "3 months", perks: ["Gym access", "Locker", "1 PT session"] },
  { id: "p3", name: "Half-Year", price: 7500, duration: "6 months", perks: ["Full access", "Diet plan", "3 PT sessions"] },
  { id: "p4", name: "Annual", price: 14000, duration: "12 months", perks: ["Full access", "Diet plan", "Monthly PT", "Free merch"] },
];

export const trainersList = trainers.map((name, i) => ({
  id: `T${300 + i}`,
  name,
  specialty: ["Strength", "Cardio", "Yoga", "CrossFit"][i % 4],
  members: 12 + i * 4,
  experience: `${3 + i} yrs`,
  phone: `+91 9${800000000 + i * 1111}`,
}));

export const exercisePlans = [
  { id: "e1", name: "Lean & Cut", goal: "Weight Loss", days: 5, exercises: 24 },
  { id: "e2", name: "Mass Builder", goal: "Muscle Gain", days: 6, exercises: 32 },
  { id: "e3", name: "Iron Core", goal: "Muscle Gain", days: 4, exercises: 20 },
  { id: "e4", name: "Marathon Prep", goal: "Endurance", days: 5, exercises: 18 },
  { id: "e5", name: "Flex & Flow", goal: "Flexibility", days: 3, exercises: 14 },
  { id: "e6", name: "Maintain Strong", goal: "Maintenance", days: 4, exercises: 22 },
];

export const mealPlans = [
  {
    id: "m1", goal: "Weight Loss", calories: 1600,
    macros: { protein: 35, carbs: 40, fat: 25 },
    meals: [
      { name: "Breakfast", items: "Oats + berries + black coffee", kcal: 350 },
      { name: "Snack", items: "Apple + 10 almonds", kcal: 180 },
      { name: "Lunch", items: "Grilled chicken + quinoa + salad", kcal: 480 },
      { name: "Snack", items: "Greek yogurt", kcal: 150 },
      { name: "Dinner", items: "Baked fish + roasted veg", kcal: 440 },
    ],
  },
  {
    id: "m2", goal: "Muscle Gain", calories: 2800,
    macros: { protein: 40, carbs: 40, fat: 20 },
    meals: [
      { name: "Breakfast", items: "5 egg whites + 2 whole eggs + oats", kcal: 620 },
      { name: "Snack", items: "Whey shake + banana", kcal: 380 },
      { name: "Lunch", items: "Chicken breast + rice + dal", kcal: 780 },
      { name: "Snack", items: "Peanut butter toast", kcal: 380 },
      { name: "Dinner", items: "Paneer + roti + sabzi", kcal: 640 },
    ],
  },
  {
    id: "m3", goal: "Maintenance", calories: 2200,
    macros: { protein: 30, carbs: 45, fat: 25 },
    meals: [
      { name: "Breakfast", items: "Poha + tea", kcal: 420 },
      { name: "Snack", items: "Fruit bowl", kcal: 200 },
      { name: "Lunch", items: "Roti + dal + sabzi + curd", kcal: 620 },
      { name: "Snack", items: "Sprouts chaat", kcal: 250 },
      { name: "Dinner", items: "Khichdi + salad", kcal: 580 },
    ],
  },
];

export const attendanceToday = members.slice(0, 10).map((m, i) => ({
  id: m.id, name: m.name,
  checkInTime: `${6 + Math.floor(i / 2)}:${(i * 7) % 60}`.padEnd(5, "0").slice(0, 5),
  status: "Present" as const,
}));

export function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function avatarColor(seed: string) {
  const hues = ["#3a3a3a", "#444", "#2f2f2f", "#3d3530", "#2f3a35"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return hues[h % hues.length];
}