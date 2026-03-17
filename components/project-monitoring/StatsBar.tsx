"use client";

import React from "react";
import StatCard from "./StatCard";

interface StatsBarProps {
  totalProjects: number;
  totalBudget: number;
  totalCC: number;
  ccPercent: string;
  sectorsCount: number;
}

export default function StatsBar({
  totalProjects,
  totalBudget,
  totalCC,
  ccPercent,
  sectorsCount,
}: StatsBarProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Projects"
        value={totalProjects}
        sub="active programs"
        color="border-indigo-100 bg-indigo-50"
      />
      <StatCard
        label="Total Budget"
        value={`₱${(totalBudget / 1000).toFixed(1)}M`}
        sub="in thousands pesos"
        color="border-amber-100 bg-amber-50"
      />
      <StatCard
        label="Climate Change Exp."
        value={`₱${(totalCC / 1000).toFixed(1)}M`}
        sub={`${ccPercent}% of budget`}
        color="border-emerald-100 bg-emerald-50"
      />
      <StatCard
        label="Sectors Covered"
        value={sectorsCount}
        sub="program areas"
        color="border-blue-100 bg-blue-50"
      />
    </div>
  );
}
