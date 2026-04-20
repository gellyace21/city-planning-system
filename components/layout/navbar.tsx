"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AvatarDropdown } from "./avatar-dropdown";
import { Cinzel } from "next/font/google";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const merriweather = Cinzel({
  subsets: ["latin"],
});

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isLead = role === "lead";

  const dashboardTarget = isLead
    ? "/dashboard/annual-investment-plan"
    : "/dashboard";

  const showNav = pathname !== "/login" && status === "authenticated";

  return (
    <header className="w-full h-21 z-50 fixed top-0 left-0">
      <nav className="h-full w-full flex items-center justify-between bg-primary ">
        <div
          className="flex items-center hover:cursor-pointer"
          onClick={() => router.push(dashboardTarget)}
        >
          <img
            className="self-center ml-4"
            src="/logos/logoplanning.webp"
            alt=""
            width={56}
          />
          <h2
            className={`uppercase font-montserrat ml-2 text-white font-bold tracking-widest text-lg`}
          >
            City Planning Development Office
          </h2>
        </div>

        {/* List Items */}
        {showNav ? (
          <div className="flex items-end gap-4 h-full">
            <ul className="flex items-end h-8 mr-8 gap-4 [&>li>a]:font-montserrat [&>li>a]:tracking-widest [&>li>a]:font-semibold [&>li]:pb-4 [&>li]:pt-1 [&>li]:px-4 [&>li]:rounded-sm [&>li]:rounded-b-none">
              {!isLead ? (
                <li
                  className={`h-full ${pathname === "/dashboard/project-monitoring" ? "bg-background text-black" : "text-white"}`}
                >
                  <a href="/dashboard/project-monitoring">Project Monitoring</a>
                </li>
              ) : null}
              <li
                className={`h-full ${pathname === "/dashboard/annual-investment-plan" ? "bg-background text-black" : "text-white"}`}
              >
                <a href="/dashboard/annual-investment-plan">
                  {isLead ? "Workspace" : "Annual Investment"}
                </a>
              </li>
              {!isLead ? (
                <li
                  className={`h-full ${pathname === "/" ? "bg-background text-black" : "text-white"}`}
                >
                  <a href="/">Home</a>
                </li>
              ) : null}
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
