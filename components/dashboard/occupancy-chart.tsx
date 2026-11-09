"use client";

import type { OccupancyDay } from "@/types";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function OccupancyChart({ data }: { data: OccupancyDay[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="occupancy-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c2d12" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#9a3412" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3dbd0" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#6b5d52" }}
            interval={1}
            dy={6}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#6b5d52" }}
            tickFormatter={(value) => `${value}%`}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: "#7c2d12", strokeOpacity: 0.2 }}
            contentStyle={{ borderRadius: 8, borderColor: "#e3dbd0", fontSize: 12 }}
            formatter={(value) => [`${value}%`, "Occupancy"]}
          />
          <Area
            type="monotone"
            dataKey="occupancyPct"
            stroke="#7c2d12"
            strokeWidth={2}
            fill="url(#occupancy-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
