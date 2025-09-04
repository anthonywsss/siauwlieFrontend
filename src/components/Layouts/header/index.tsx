"use client";

import { SearchIcon } from "@/assets/icons";
import Image from "next/image";
import Link from "next/link";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { UserInfo } from "./user-info";
import { useAuth } from "@/components/Auth/auth-context";

export function Header() {
  const { toggleSidebar, isMobile } = useSidebarContext();
  const { user } = useAuth();

  return (
    <header className="sticky z-50 top-0 flex items-center justify-between border-b border-stroke bg-white px-4 py-5 shadow-1 dark:border-stroke-dark dark:bg-gray-dark md:px-5 2xl:px-10">
      <button
        onClick={toggleSidebar}
        className="rounded-lg border px-1.5 py-1 dark:border-stroke-dark dark:bg-[#020D1A] hover:dark:bg-[#FFFFFF1A] lg:hidden"
      >
        <MenuIcon />
        <span className="sr-only">Toggle Sidebar</span>
      </button>

      {isMobile && (
        <Link href={"/"} className="ml-2 max-[430px]:hidden min-[375px]:ml-4">
          <Image
            src={"/images/logo/logo-icon.svg"}
            width={32}
            height={32}
            alt=""
            role="presentation"
          />
        </Link>
      )}

      <div className="max-xl:hidden">
        <h1 className="mb-0.5 text-heading-5 font-bold text-dark dark:text-white">
          Dashboard
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 min-[375px]:gap-4">

        <p className="text-sm font-medium">
          {user ? (user.role ?? user.username) : "Guest"}
        </p>



        <div className="shrink-0">
          <UserInfo />
        </div>
      </div>
    </header>
  );
}
