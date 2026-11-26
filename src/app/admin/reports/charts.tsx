"use client";
// Charts for the admin reports page. Client component because Recharts draws in the browser.
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type MonthPoint = { month: string; charity: number; prizePool: number; platform: number; users: number };

const rupees = (v: unknown) => `₹${Number(v).toLocaleString("en-IN")}`;

export function MoneyChart({ data }: { data: MonthPoint[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Monthly revenue split into charity, prize pool and platform">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#27272a" vertical={false} />
          <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} />
          <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={rupees} width={72} />
          <Tooltip formatter={rupees} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
          <Legend />
          <Bar dataKey="charity" name="Charity" stackId="a" fill="#34d399" />
          <Bar dataKey="prizePool" name="Prize pool" stackId="a" fill="#fbbf24" />
          <Bar dataKey="platform" name="Platform" stackId="a" fill="#71717a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UsersChart({ data }: { data: MonthPoint[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="New users per month">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#27272a" vertical={false} />
          <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} />
          <YAxis stroke="#a1a1aa" fontSize={12} allowDecimals={false} width={32} />
          <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
          <Line type="monotone" dataKey="users" name="New users" stroke="#34d399" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
