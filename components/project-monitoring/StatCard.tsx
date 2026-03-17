"use client";

import { FC } from "react";

const StatCard: FC<{
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}> = ({ label, value, sub, color }) => (
  <div className={`rounded-2xl p-5 border ${color} flex flex-col gap-1`}>
    <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">
      {label}
    </span>
    <span className="text-2xl font-bold text-gray-900">{value}</span>
    {sub && <span className="text-xs text-gray-400">{sub}</span>}
  </div>
);

export default StatCard;
