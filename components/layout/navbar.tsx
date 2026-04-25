"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AvatarDropdown } from "./avatar-dropdown";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { IconBell } from "@tabler/icons-react";
import {
  fetchNotificationsAction,
  markNotificationReadAction,
} from "@/lib/services/projectMonitoringActions";
import { NotificationEntry } from "@/components/project-monitoring/types";

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isLead = role === "lead";
  const isNotificationActor = role === "admin" || role === "lead";

  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const notificationPanelRef = useRef<HTMLLIElement | null>(null);

  const dashboardTarget = isLead
    ? "/dashboard/annual-investment-plan"
    : "/dashboard";

  const showNav = pathname !== "/login" && status === "authenticated";

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications],
  );

  useEffect(() => {
    if (status !== "authenticated" || !isNotificationActor) return;

    void (async () => {
      try {
        const data = await fetchNotificationsAction();
        setNotifications(data.slice(0, 80));
      } catch {
        setNotifications([]);
      }
    })();
  }, [status, isNotificationActor, session?.user?.id, session?.user?.role]);

  useEffect(() => {
    if (!showNotifications) return;

    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (!notificationPanelRef.current?.contains(target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [showNotifications]);

  const markNotificationRead = async (entry: NotificationEntry): Promise<void> => {
    if (entry.read_at) return;
    try {
      const updated = await markNotificationReadAction(entry.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch {
      // Ignore read update failures so navigation stays uninterrupted.
    }
  };

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
                  <Link href="/dashboard/project-monitoring">Project Monitoring</Link>
                </li>
              ) : null}
              <li
                className={`h-full ${pathname === "/dashboard/annual-investment-plan" ? "bg-background text-black" : "text-white"}`}
              >
                <Link href="/dashboard/annual-investment-plan">
                  {isLead ? "Workspace" : "Annual Investment"}
                </Link>
              </li>
              {!isLead ? (
                <li
                  className={`h-full ${pathname === "/" ? "bg-background text-black" : "text-white"}`}
                >
                  <Link href="/">Home</Link>
                </li>
              ) : null}
            </ul>
            <ul className="flex items-center h-full mr-6 gap-2">
              {isNotificationActor ? (
                <li className="relative" ref={notificationPanelRef}>
                  <button
                    type="button"
                    onClick={() => setShowNotifications((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
                  >
                    <IconBell size={16} />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="inline-flex min-w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold items-center justify-center px-1">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 top-11 z-30 w-96 max-h-96 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-500">No notifications.</p>
                      ) : (
                        notifications.map((entry) => (
                          <button
                            type="button"
                            key={entry.id}
                            onClick={() => {
                              void markNotificationRead(entry);
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${entry.read_at ? "opacity-70" : ""}`}
                          >
                            <p className="text-xs text-gray-500">
                              {new Date(entry.created_at).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-800">{entry.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              by {entry.actor_name} ({entry.actor_role})
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </li>
              ) : null}
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
