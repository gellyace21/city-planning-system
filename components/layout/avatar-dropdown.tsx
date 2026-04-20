"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
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

export function AvatarDropdown() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { data: session } = useSession();
  const avatarSrc = session?.user?.profile_pic || "";
  const avatarFallback = session?.user?.name?.slice(0, 2).toUpperCase() || "U";

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
                src={avatarSrc}
                alt={session?.user?.name || "User"}
              />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
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
