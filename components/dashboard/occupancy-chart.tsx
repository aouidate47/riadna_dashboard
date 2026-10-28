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
              <stop offset="5%" stopColor="#ff3131" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#ff914d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e8ef" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#5c6278" }}
            interval={1}
            dy={6}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#5c6278" }}
            tickFormatter={(value) => `${value}%`}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: "#ff3131", strokeOpacity: 0.2 }}
            contentStyle={{ borderRadius: 8, borderColor: "#dfe2ea", fontSize: 12 }}
            formatter={(value) => [`${value}%`, "Occupancy"]}
          />
          <Area
            type="monotone"
            dataKey="occupancyPct"
            stroke="#ff3131"
            strokeWidth={2}
            fill="url(#occupancy-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
