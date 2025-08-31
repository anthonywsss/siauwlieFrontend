"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/components/Auth/auth-context";
import { Dropdown, DropdownTrigger, DropdownContent } from "@/components/ui/dropdown";
import { ChevronUpIcon } from "@/assets/icons";
import { LogOutIcon } from "./icons";
import { cn } from "@/lib/utils";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();

  const USER = {
    name: user ? (user.username) : "Guest",
    img: user?.img ?? "/images/user/user-03.png",
  };

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1">
        <span className="sr-only">My Account</span>
        <figure className="flex items-center gap-3">
          <Image src={USER.img} className="size-12" alt={`Avatar of ${USER.name}`} width={40} height={40} />
          <figcaption className="flex items-center gap-1 font-medium max-[1024px]:sr-only">
            <span>{USER.name}</span>
            <ChevronUpIcon
              aria-hidden
              className={cn("rotate-180 transition-transform", isOpen && "rotate-0")}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent className="border border-stroke bg-white shadow-md min-[230px]:min-w-[17.5rem]" align="end">
        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          <Image src={USER.img} alt={`Avatar for ${USER.name}`} width={48} height={48} />
          <figcaption className="text-base font-medium">
            <div className="mb-2 leading-none">{USER.name}</div>
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8]" />

        <div className="p-2 text-base text-[#4B5563]">
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark"
            onClick={() => {
              setIsOpen(false);
              signOut();
            }}
          >
            <LogOutIcon />
            <span className="text-base font-medium">Log out</span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
