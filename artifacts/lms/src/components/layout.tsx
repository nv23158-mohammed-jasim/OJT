import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import { useLogout } from "@workspace/api-client-react";
import { BookOpen, Home, Settings, Users, LogOut, FileText, Bell } from "lucide-react";
import { Button } from "./ui/button";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
      }
    });
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const navItems = [
    { label: "Dashboard", href: "/", icon: Home, roles: ["student", "teacher", "admin"] },
    { label: "Courses", href: "/courses", icon: BookOpen, roles: ["student", "teacher", "admin"] },
    { label: "Admin Panel", href: "/admin", icon: Users, roles: ["admin"] },
    { label: "Settings", href: "/settings", icon: Settings, roles: ["student", "teacher", "admin"] },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 font-bold text-lg border-b border-sidebar-border tracking-tight uppercase">
          NCST LMS
        </div>
        <div className="px-4 py-6 flex-1 space-y-1">
          {navItems.filter(item => item.roles.includes(user.role)).map(item => {
            const Icon = item.icon;
            const active = location === item.href || (location.startsWith(item.href) && item.href !== "/");
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{user.name}</span>
              <span className="text-xs text-sidebar-foreground/60 mt-1 capitalize">{user.role}</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">Nasser Centre for Science & Technology</h2>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="rounded-full relative text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full"></span>
            </Button>
          </div>
        </header>
        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-gray-50 dark:bg-background">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
