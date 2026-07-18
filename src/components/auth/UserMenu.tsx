"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  FileText,
  Bug,
  ChevronDown,
  Ticket,
  Shield,
} from "lucide-react";

export function UserMenu() {
  const { user, signOut, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  const initials = (user.name || user.email || "US")
    .split("@")[0]
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Desktop user menu */}
      <div className="hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 h-9 rounded-full px-2.5 py-0 border border-border/40 hover:bg-primary/10 transition-all cursor-pointer focus:outline-none bg-transparent select-none">
              <Avatar className="h-7 w-7">
                <AvatarImage
                  src={user.picture}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 bg-popover border-border/80 text-foreground p-2"
          >
            <div className="flex items-center gap-3 px-2 py-1.5">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={user.picture}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator className="my-1 bg-border/40" />
            <DropdownMenuItem asChild>
              <a
                href="/applications"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer rounded px-2 py-1.5 transition-colors text-sm w-full font-medium"
              >
                <FileText className="h-4 w-4" />
                <span>My Applications</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href="/orders"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer rounded px-2 py-1.5 transition-colors text-sm w-full font-medium"
              >
                <Ticket className="h-4 w-4" />
                <span>My Event Orders</span>
              </a>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <a
                  href="/admin"
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer rounded px-2 py-1.5 transition-colors text-sm w-full font-medium"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin Dashboard</span>
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="my-1 bg-border/40" />
            <DropdownMenuItem
              onClick={() => {
                if ((window as any).formbricks) {
                  (window as any).formbricks.track("submit-bug");
                } else {
                  console.warn("[UserMenu] Formbricks SDK not loaded yet.");
                }
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer rounded px-2 py-1.5 transition-colors text-sm w-full font-medium focus:outline-none"
            >
              <Bug className="h-4 w-4" />
              <span>Submit a Bug</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-border/40" />
            <DropdownMenuItem
              onClick={signOut}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer rounded px-2 py-1.5 transition-colors text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile user menu (bottom sheet) */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex items-center gap-1.5 h-9 rounded-full px-2.5 py-0 border border-border/40 hover:bg-primary/10 transition-all cursor-pointer focus:outline-none bg-transparent">
              <Avatar className="h-7 w-7">
                <AvatarImage
                  src={user.picture}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="bg-card border-border/80 text-foreground p-6 rounded-t-xl max-h-[50vh] overflow-y-auto"
          >
            <SheetHeader className="text-left flex flex-row items-center gap-3 pb-4 border-b border-border/40">
              <Avatar className="h-11 w-11">
                <AvatarImage
                  src={user.picture}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <SheetTitle className="text-base font-bold truncate">
                  {user.name || user.email}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground truncate">
                  {user.email}
                </SheetDescription>
              </div>
            </SheetHeader>
            <div className="py-4 space-y-2">
              <Button
                asChild
                variant="ghost"
                className="w-full flex items-center justify-start gap-3 text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <a href="/applications">
                  <FileText className="h-4 w-4" />
                  <span>My Applications</span>
                </a>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full flex items-center justify-start gap-3 text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <a href="/orders">
                  <Ticket className="h-4 w-4" />
                  <span>My Event Orders</span>
                </a>
              </Button>
              {isAdmin && (
                <Button
                  asChild
                  variant="ghost"
                  className="w-full flex items-center justify-start gap-3 text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <a href="/admin">
                    <Shield className="h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  if ((window as any).formbricks) {
                    (window as any).formbricks.track("submit-bug");
                  } else {
                    console.warn("[UserMenu] Formbricks SDK not loaded yet.");
                  }
                }}
                className="w-full flex items-center justify-start gap-3 text-muted-foreground hover:text-primary hover:bg-primary/10 focus:outline-none"
              >
                <Bug className="h-4 w-4" />
                <span>Submit a Bug</span>
              </Button>
              <Button
                variant="ghost"
                onClick={signOut}
                className="w-full flex items-center justify-start gap-3 text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
