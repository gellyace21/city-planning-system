"use client";

import { FC } from "react";
import { SECTOR_COLORS } from "./constants";

const SectorBadge: FC<{ sector: string }> = ({ sector }) => {
  const c = SECTOR_COLORS[sector] ?? { badge: "bg-gray-100 text-gray-700" };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}
    >
      {sector || <span className="italic text-gray-400">—</span>}
    </span>
  );
};

export default SectorBadge;
