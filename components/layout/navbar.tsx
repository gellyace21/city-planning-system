"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AvatarDropdown } from "./avatar-dropdown";
import { Cinzel } from "next/font/google";

const merriweather = Cinzel({
  subsets: ["latin"],
});

const Navbar = () => {
  const pathname = usePathname();

  return (
    <header className="w-full h-21 z-50 fixed top-0 left-0">
      <nav className="h-full w-full flex items-center justify-between bg-(--primary) ">
        <div className="flex items-center">
          <img
            className="self-center ml-4"
            src="/logos/logoplanning.webp"
            alt=""
            width={74}
          />
          <h2
            className={`${merriweather.className} ml-2 text-white font-bold text-lg`}
          >
            City Planning Development Office
          </h2>
        </div>

        {/* List Items */}
        {pathname !== "/login" ? (
          <div className="flex items-end gap-4 h-full">
            <ul className="flex items-end h-8 gap-4 [&>li]:pb-4 [&>li]:pt-1 [&>li]:px-4 [&>li]:rounded-sm [&>li]:rounded-b-none">
              <li
                className={`h-full ${pathname === "/project-monitoring" ? "bg-[var(--background)] text-black" : "text-white"}`}
              >
                <a href="/project-monitoring">Project Monitoring</a>
              </li>
              <li
                className={`h-full ${pathname === "/annual-investment-plan" ? "bg-[var(--background)] text-black" : "text-white"}`}
              >
                <a href="/annual-investment-plan">Annual Investment</a>
              </li>
              <li
                className={`h-full ${pathname === "/" ? "bg-[var(--background)] text-black" : "text-white"}`}
              >
                <a href="/">Home</a>
              </li>
            </ul>
            <ul className="flex items-center h-full mr-6">
              <li className="flex items-center h-full">
                <AvatarDropdown />
              </li>
            </ul>
          </div>
        ) : null}
      </nav>
    </header>
  );
};

export default Navbar;

// Remarks, issues, problems
