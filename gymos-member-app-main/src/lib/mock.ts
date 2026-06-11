export const member = {
  name: "Shadan",
  memberId: "GYM-00482",
  goal: "Muscle Gain",
  plan: "Pro Plan",
  trainer: "Raj Kumar",
  joined: "Jan 1, 2025",
  expiry: "Mar 31, 2026",
  height: 178,
  weight: 74,
  daysRemaining: 18,
  streak: 12,
  points: 2450,
  rank: 3,
};

export type Exercise = {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  rest: number;
  points: number;
  done: boolean;
};

export const todayWorkout: { day: string; title: string; exercises: Exercise[] } = {
  day: "Monday",
  title: "Chest & Triceps",
  exercises: [
    { id: "1", name: "Bench Press", muscle: "Chest", sets: 4, reps: 10, rest: 60, points: 15, done: true },
    { id: "2", name: "Incline Dumbbell Press", muscle: "Chest", sets: 4, reps: 12, rest: 60, points: 15, done: true },
    { id: "3", name: "Cable Fly", muscle: "Chest", sets: 3, reps: 15, rest: 45, points: 15, done: true },
    { id: "4", name: "Tricep Pushdown", muscle: "Triceps", sets: 4, reps: 12, rest: 45, points: 15, done: false },
    { id: "5", name: "Skull Crushers", muscle: "Triceps", sets: 3, reps: 10, rest: 60, points: 15, done: false },
    { id: "6", name: "Dips", muscle: "Triceps", sets: 3, reps: 12, rest: 60, points: 15, done: false },
  ],
};

export const weekPlan = [
  { day: "Mon", short: "Chest & Tri", rest: false },
  { day: "Tue", short: "Back & Bi", rest: false },
  { day: "Wed", short: "Rest", rest: true },
  { day: "Thu", short: "Legs", rest: false },
  { day: "Fri", short: "Shoulders", rest: false },
  { day: "Sat", short: "Arms + Core", rest: false },
  { day: "Sun", short: "Rest", rest: true },
];

export const meals = [
  {
    icon: "🌅",
    name: "Breakfast",
    time: "7:00 - 9:00 AM",
    cal: 320,
    items: ["Oats with banana and honey", "2 boiled eggs", "Green tea"],
  },
  { icon: "☀️", name: "Mid-Morning Snack", time: "10:30 AM", cal: 150, items: ["Mixed nuts (30g)", "1 apple"] },
  {
    icon: "🌞",
    name: "Lunch",
    time: "12:00 - 2:00 PM",
    cal: 520,
    items: ["Brown rice (1 cup)", "Grilled chicken (150g)", "Mixed vegetables", "Dal"],
  },
  { icon: "🌆", name: "Evening Snack", time: "5:00 PM", cal: 180, items: ["Protein shake or sprouts"] },
  {
    icon: "🌙",
    name: "Dinner",
    time: "7:00 - 9:00 PM",
    cal: 430,
    items: ["Roti (2)", "Paneer / Fish curry", "Salad"],
  },
];

export const leaderboard = [
  { rank: 1, name: "Aarav Mehta", points: 3210, streak: 22, badge: "🏆" },
  { rank: 2, name: "Priya Sharma", points: 2890, streak: 18, badge: "💪" },
  { rank: 3, name: "Shadan", points: 2450, streak: 12, badge: "🔥", me: true },
  { rank: 4, name: "Karan Patel", points: 2310, streak: 9, badge: "⭐" },
  { rank: 5, name: "Neha Iyer", points: 2180, streak: 14, badge: "💪" },
  { rank: 6, name: "Vikram S.", points: 2050, streak: 7, badge: "🔥" },
  { rank: 7, name: "Anjali R.", points: 1840, streak: 5, badge: "⭐" },
  { rank: 8, name: "Rohit Das", points: 1720, streak: 4, badge: "⭐" },
];

export const badges = [
  { icon: "🔥", name: "On Fire", earned: true, hint: "Earned Jan 15" },
  { icon: "⭐", name: "Consistent", earned: false, hint: "12 / 30 days" },
  { icon: "💪", name: "Beast Mode", earned: true, hint: "Earned Feb 02" },
  { icon: "🏆", name: "Champion", earned: false, hint: "Reach rank #1" },
];

export const pointsHistory = [
  { date: "Today", items: [
    { label: "Workout Complete", pts: 50 },
    { label: "Bench Press done", pts: 15 },
    { label: "Attendance marked", pts: 10 },
  ]},
  { date: "Yesterday", items: [
    { label: "Squats done", pts: 15 },
    { label: "Attendance marked", pts: 10 },
  ]},
];

export const notifications = [
  { icon: "🏆", title: "New badge earned!", body: "You unlocked Beast Mode.", time: "2h ago", unread: true, accent: "gold" as const },
  { icon: "🏋️", title: "Workout reminder", body: "Don't forget your evening session.", time: "5h ago", unread: true, accent: "default" as const },
  { icon: "💰", title: "Fee due in 3 days", body: "Renew your Pro Plan to avoid lapse.", time: "1d ago", unread: false, accent: "red" as const },
  { icon: "🔥", title: "Streak alert", body: "Check in today to keep your 12-day streak.", time: "1d ago", unread: false, accent: "default" as const },
];
