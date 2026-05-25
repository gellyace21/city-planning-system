"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AvatarDropdown } from "./avatar-dropdown";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { IconBell, IconHome } from "@tabler/icons-react";
import {
  fetchNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/services/projectMonitoringActions";
import { NotificationEntry } from "@/components/project-monitoring/types";

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isSuperadmin = role === "superadmin";
  const isLeadAccessRoute = pathname.startsWith("/lead-access");
  const isLead = role === "lead" && isLeadAccessRoute;
  const isNotificationActor = role === "admin" || role === "lead";

  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const notificationPanelRef = useRef<HTMLLIElement | null>(null);

  const dashboardTarget = isLead
    ? "/dashboard/annual-investment-plan"
    : "/dashboard";

  const showNav = pathname !== "/login" && status === "authenticated";
  const showNavItems = !isSuperadmin && pathname !== "/dashboard" && !isLead;

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

  const markNotificationRead = async (
    entry: NotificationEntry,
  ): Promise<void> => {
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

  const markAllNotificationsRead = async (): Promise<void> => {
    if (unreadCount < 2) return;
    setMarkingAll(true);
    try {
      const updated = await markAllNotificationsReadAction();
      setNotifications(updated.slice(0, 80));
    } catch {
      // Ignore bulk update failures so navigation stays uninterrupted.
    } finally {
      setMarkingAll(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    await signOut({ redirect: true, callbackUrl: "/superadmin-login" });
  };

  return (
    <header className="w-full h-16 z-50 fixed top-0 left-0 font-josefin">
      <nav className="h-full w-full flex items-center justify-between bg-(--background-plain) pr-8 pl-8 drop-shadow-md drop-shadow-gray-500:5">
        <div
          className="flex items-center hover:cursor-pointer"
          onClick={() => router.push(dashboardTarget)}
        >
          <img
            className="self-center ml-4 mr-2"
            src="/logos/logoplanning.webp"
            alt=""
            width={38}
          />
          <h2
            className={`uppercase ml-2 text-(--foreground) tracking-widest text-m mt-1`}
          >
            City Planning and Development Office
          </h2>
        </div>

        {/* List Items */}
        {showNav ? (
          <div className="flex items-center gap-4 h-full">
            {!isLead && (
              <ul
                className={`flex items-center h-8 mr-8 gap-4 [&>li>a]:tracking-widest [&>li]:pb-4 [&>li]:pt-1 [&>li]:px-4 [&>li]:text-(--foreground) [&>li]:hover:border-b-2 [&>li]:hover:border-b-(--primary) [&>li]:hover:text-(--primary) [&>li]:transition [&>li]:duration-100`}
              >
                {showNavItems && (
                  <>
                    {!isLead ? (
                      <li
                        className={`h-full group ${pathname === "/dashboard/project-monitoring" ? "border-b-2 border-b-(--primary) text-(--foreground)" : "text-(--foreground)"}`}
                      >
                        <Link
                          href="/dashboard/project-monitoring"
                          className="flex items-center justify-center gap-2"
                        >
                          <img
                            src="/icons/chart.png"
                            alt=""
                            width={16}
                            height={16}
                            className="invert-0 dark:invert group-hover:filter-[brightness(0)_saturate(100%)_invert(47%)_sepia(71%)_saturate(499%)_hue-rotate(123deg)_brightness(87%)_contrast(97%)] dark:group-hover:filter-[brightness(0)_saturate(100%)_invert(47%)_sepia(71%)_saturate(499%)_hue-rotate(123deg)_brightness(87%)_contrast(97%)] transition duration-200"
                          />
                          Project Monitoring
                        </Link>
                      </li>
                    ) : null}
                    <li
                      className={`h-full group ${pathname === "/dashboard/annual-investment-plan" ? "border-b-2 border-b-(--primary) [&>span]:text-(--primary)" : "text-black"}`}
                    >
                      <Link
                        href="/dashboard/annual-investment-plan"
                        className="flex items-center justify-center gap-2"
                      >
                        {isLead ? (
                          "Workspace"
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              width={16}
                              className="stroke-(--foreground) group-hover:stroke-(--primary)"
                            >
                              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                              <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                            </svg>
                            <span>Annual Investment Plan</span>
                          </>
                        )}
                      </Link>
                    </li>
                    {!isLead ? (
                      <li
                        className={`h-full group ${pathname === "/dashboard" ? "border-b-2 border-b-(--primary) text-(--foreground)" : "text-(--foreground)"}`}
                      >
                        <Link
                          href="/dashboard"
                          className="flex items-center justify-center gap-2"
                        >
                          <IconHome
                            width={16}
                            className="stroke-(--foreground) group-hover:stroke-(--primary)"
                          />
                          Home
                        </Link>
                      </li>
                    ) : null}
                  </>
                )}
              </ul>
            )}
            <ul className="flex items-center h-full mr-6 gap-6">
              {isSuperadmin ? (
                <li className="flex items-center h-full">
                  <button
                    type="button"
                    onClick={() => {
                      void handleLogout();
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition duration-200"
                  >
                    Log out
                  </button>
                </li>
              ) : null}
              {!isLead && isNotificationActor ? (
                <li className="relative" ref={notificationPanelRef}>
                  <button
                    type="button"
                    onClick={() => setShowNotifications((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-lg border border-(--muted-foreground)/25 bg-(--foreground)/15 px-3 py-1.5 text-sm font-semibold text-(--foreground) hover:bg-(--muted-foreground)/15  hover:cursor-pointer active:scale-95 transition-transform group"
                  >
                    {/*Notification Icon*/}
                    <IconBell
                      className="stroke-black group-hover:stroke-(--primary) transition duration-200"
                      size={16}
                    />

                    {unreadCount > 0 && (
                      <span className="inline-flex min-w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold items-center justify-center px-1">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 top-11 z-30 w-96 max-h-96 overflow-auto rounded-xl border border-(--background-plain) bg-background shadow-lg">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-500">
                          No notifications.
                        </p>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          <div className="px-4 py-2 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {unreadCount} unread
                            </span>
                            {unreadCount > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  void markAllNotificationsRead();
                                }}
                                disabled={markingAll}
                                className="text-[10px] font-semibold text-sky-700 hover:underline disabled:opacity-60"
                              >
                                {markingAll ? "Marking..." : "Mark all as read"}
                              </button>
                            )}
                          </div>
                          {notifications.map((entry) => (
                            <div
                              key={entry.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                void markNotificationRead(entry);
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  void markNotificationRead(entry);
                                }
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${entry.read_at ? "opacity-70" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs text-gray-500">
                                    {new Date(
                                      entry.created_at,
                                    ).toLocaleString()}
                                  </p>
                                  <p className="text-sm text-gray-800">
                                    {entry.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    by {entry.actor_name} ({entry.actor_role})
                                  </p>
                                </div>
                                {!entry.read_at && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void markNotificationRead(entry);
                                    }}
                                    className="text-[10px] font-semibold text-sky-700 hover:underline"
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ) : null}
              {!isLeadAccessRoute && !isSuperadmin ? (
                <li className="flex items-center h-full">
                  <AvatarDropdown />
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </nav>
    </header>
  );
};

export default Navbar;

// Remarks, issues, problems
