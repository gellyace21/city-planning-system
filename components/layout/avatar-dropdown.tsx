"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProfileModal from "@/components/ProfileModal";
import { signOut } from "next-auth/react";

export function AvatarDropdown() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar size="xl" className="border-2 border-solid border-black">
              <AvatarImage
                src="https://imgs.search.brave.com/PTDKA8huS0FV4v_n3nJ1SSVPAxnja6EyDMP3Jbdz5FE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9kaW1z/LmFwbmV3cy5jb20v/ZGltczQvZGVmYXVs/dC8xM2JmZTZjLzIx/NDc0ODM2NDcvc3Ry/aXAvdHJ1ZS9jcm9w/LzgwMDB4NTMzMysw/KzAvcmVzaXplLzI0/MHgxNjAhL3F1YWxp/dHkvOTAvP3VybD1o/dHRwczovL2Fzc2V0/cy5hcG5ld3MuY29t/LzI2LzMwL2U4ZmQ5/YTJjZTliOTJmMjMz/ZGQxYzA2N2ViMGQv/ODBjOGJkZjhmODdm/NGMwMWJlMjFmZDk4/NjkyNDc5ZmU"
                alt="shadcn"
              />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          alignOffset={-8}
          side="bottom"
          sideOffset={8}
          collisionPadding={12}
          className="w-40 max-w-[calc(100vw-1rem)]"
        >
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
