"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV_DATA } from "./data";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import { useAuth } from "@/components/Auth/auth-context";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { user } = useAuth();
  const role = user?.role ?? "guest";

  const prevUserRef = useRef<typeof user | null>(null);
  useEffect(() => {
    prevUserRef.current = user ?? null;
  }, [user]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));
  };

  const AUTH_PATH = "/auth/sign-in";
  const SUBMIT_PATH = "/submit-movement";
  const DASHBOARD_PATH = "/dashboard";

  const normalize = (p?: string) => {
    if (!p) return "";
    const base = p.split("?")[0].split("#")[0];
    return base.startsWith("/") ? base : "/" + base;
  };

  const driverAllowedTokens = ["submit", "movement", "unfinished", "delivery", "auth", "sign-in"];
  const driverAllowedTitles = new Set(["submit movement", "unfinished delivery", "auth", "sign-in"]);

  const allowedForRole = (r: string, title?: string, url?: string) => {
    const t = (title ?? "").toLowerCase();
    const u = (url ?? "").toLowerCase();

    if (r === "supervisor") return true; // supervisor sees everything
    if (r === "driver" || r === "security") {
      if (driverAllowedTitles.has(t)) return true;
      for (const token of driverAllowedTokens) {
        if (u.includes(token) || t.includes(token)) return true;
      }
      return false;
    }

    return u === AUTH_PATH || t.includes("auth") || t.includes("sign-in");
  };

  const filteredNav = useMemo(() => {
    return NAV_DATA.map((section) => {
      const filteredItems = section.items
        .map((item) => {
          if (item.items && item.items.length) {
            const subFiltered = item.items.filter((sub) => allowedForRole(role, sub.title, sub.url ?? ""));
            if (!subFiltered.length) return null;
            return { ...item, items: subFiltered };
          }

          const href = "url" in item ? (item.url + "") : ("/" + item.title.toLowerCase().split(" ").join("-"));
          if (!allowedForRole(role, item.title, href)) return null;
          return item;
        })
        .filter(Boolean) as typeof section.items;

      return { ...section, items: filteredItems };
    }).filter((s) => s.items && s.items.length);
  }, [role]);

  const allowedUrls = useMemo(() => {
    const s = new Set<string>();
    filteredNav.forEach((section) => {
      section.items.forEach((item) => {
        if (item.items && item.items.length) {
          item.items.forEach((sub) => {
            if (sub.url) s.add(normalize(sub.url));
          });
        } else {
          const href = "url" in item ? (item.url + "") : ("/" + item.title.toLowerCase().split(" ").join("-"));
          s.add(normalize(href));
        }
      });
    });

    s.add(normalize(AUTH_PATH));
    s.add(normalize("/auth"));
    s.add(normalize(SUBMIT_PATH));
    s.add(normalize(DASHBOARD_PATH));

    return Array.from(s);
  }, [filteredNav]);

  /*
   * Redirect logic:
   *  - Guests -> /auth/sign-in (klo blom auth)
   *  - After login OR when on root/auth -> send to role specific target
   *  - If current pathname is not allowed for this role -> /auth/sign-in
  */

  useEffect(() => {
    if (!pathname) return;

    const cleanPath = normalize(pathname);
    const isAuthPath = cleanPath === normalize(AUTH_PATH) || cleanPath.startsWith("/auth");
    const isRoot = cleanPath === "/" || cleanPath === "";

    // 1) Guest -> auth
    if (!user) {
      if (!isAuthPath) {
        router.replace(AUTH_PATH);
      }
      return;
    }

    // 2)s role target
    const roleTarget =
      user.role === "supervisor"
        ? DASHBOARD_PATH
        : user.role === "driver" || user.role === "security"
        ? SUBMIT_PATH
        : AUTH_PATH;

    // stable key for session storage <role>:<target>
    const redirectKey = `${user.role}:${roleTarget}`;

    if (isAuthPath || isRoot) {
      // if target == !redirect
      if (cleanPath !== normalize(roleTarget)) {
        try {
          const already = sessionStorage.getItem("roleRedirectedTo");
          if (already !== redirectKey) {
            sessionStorage.setItem("roleRedirectedTo", redirectKey);
            router.replace(roleTarget);
            return;
          }
        } catch (e) {
          // fallback
          if (cleanPath !== normalize(roleTarget)) {
            router.replace(roleTarget);
            return;
          }
        }
      }
    }

    // 3) check if current path is allowed
    const matches = allowedUrls.some((u) => {
      if (!u) return false;
      if (cleanPath === u) return true;
      if (u !== "/" && cleanPath.startsWith(u + "/")) return true;
      return false;
    });

    if (!matches) {
      // If unauthorizedc clear  previous redirect flag
      try {
        sessionStorage.removeItem("roleRedirectedTo");
      } catch (e) {}
      if (cleanPath !== normalize(AUTH_PATH)) {
        router.replace(AUTH_PATH);
      }
      return;
    }
  }, [user, pathname, allowedUrls]);

  useEffect(() => {
    filteredNav.some((section) =>
      section.items.some((item) =>
        item.items?.some((subItem) => {
          if (subItem.url === pathname) {
            if (!expandedItems.includes(item.title)) toggleExpanded(item.title);
            return true;
          }
          return false;
        })
      )
    );
  }, [pathname, filteredNav]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "max-w-[290px] overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-linear dark:border-gray-800 dark:bg-gray-dark",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          isOpen ? "w-full" : "w-0",
        )}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="flex h-full flex-col py-10 pl-[25px] pr-[7px]">
          <div className="relative pr-4.5">
            <Link
              href={"/"}
              onClick={() => isMobile && toggleSidebar()}
              className="px-0 py-2.5 min-[850px]:py-0"
            >
              <Logo />
            </Link>

            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="absolute left-3/4 right-4.5 top-1/2 -translate-y-1/2 text-right"
              >
                <span className="sr-only">Close Menu</span>

                <ArrowLeftIcon className="ml-auto size-7" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="custom-scrollbar mt-6 flex-1 overflow-y-auto pr-3 min-[850px]:mt-10">
            {filteredNav.map((section) => (
              <div key={section.label} className="mb-6">
                <h2 className="mb-5 text-sm font-medium text-dark-4 dark:text-dark-6">
                  {section.label}
                </h2>

                <nav role="navigation" aria-label={section.label}>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item.title}>
                        {item.items && item.items.length ? (
                          <div>
                            <MenuItem
                              isActive={item.items.some(({ url }) => url === pathname)}
                              onClick={() => toggleExpanded(item.title)}
                            >
                              <item.icon
                                className="size-6 shrink-0"
                                aria-hidden="true"
                              />

                              <span>{item.title}</span>

                              <ChevronUp
                                className={cn(
                                  "ml-auto rotate-180 transition-transform duration-200 h-5 w-5",
                                  expandedItems.includes(item.title) && "rotate-0",
                                )}
                                aria-hidden="true"
                              />
                            </MenuItem>

                            {expandedItems.includes(item.title) && (
                              <ul
                                className="ml-9 mr-0 space-y-1.5 pb-[15px] pr-0 pt-2"
                                role="menu"
                              >
                                {item.items.map((subItem) => (
                                  <li key={subItem.title} role="none">
                                    <MenuItem
                                      as="link"
                                      href={subItem.url}
                                      isActive={pathname === subItem.url}
                                    >
                                      <span>{subItem.title}</span>
                                    </MenuItem>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          (() => {
                            const href =
                              "url" in item
                                ? item.url + ""
                                : "/" +
                                  item.title.toLowerCase().split(" ").join("-");

                            return (
                              <MenuItem
                                className="flex items-center gap-3 py-3"
                                as="link"
                                href={href}
                                isActive={pathname === href}
                              >
                                <item.icon
                                  className="size-6 shrink-0"
                                  aria-hidden="true"
                                />

                                <span>{item.title}</span>
                              </MenuItem>
                            );
                          })()
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
