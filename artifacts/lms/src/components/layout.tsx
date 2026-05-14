import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import { useLogout } from "@workspace/api-client-react";
import {
  Settings, Users, LogOut, Bell, Menu,
  Upload, LayoutDashboard, GraduationCap, BookOpen, Search,
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./ui/sheet";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["student", "teacher", "admin"] },
      { label: "Courses", href: "/courses", icon: BookOpen, roles: ["student", "teacher", "admin"] },
    ],
  },
  {
    label: "Student",
    items: [
      { label: "My Submissions", href: "/submissions", icon: Upload, roles: ["student"] },
    ],
  },
  {
    label: "Teaching",
    items: [
      { label: "My Panel", href: "/teacher", icon: GraduationCap, roles: ["teacher", "admin"] },
      { label: "Review Files", href: "/submissions", icon: Upload, roles: ["teacher", "admin"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Admin Panel", href: "/admin", icon: Users, roles: ["admin"] },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, roles: ["student", "teacher", "admin"] },
    ],
  },
];

const roleColors: Record<string, string> = {
  student: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
  teacher: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  admin: "bg-violet-500/15 text-violet-300 border border-violet-500/20",
};

function SidebarContent({
  userRole,
  userName,
  userEmail,
  location,
  onLogout,
  onNavigate,
}: {
  userRole: string;
  userName: string;
  userEmail: string;
  location: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const isActive = (href: string) =>
    href === "/dashboard"
      ? location === "/dashboard"
      : location.startsWith(href);

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "20px 20px",
      }} />

      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border gap-3 relative flex-shrink-0">
        <div className="bg-white rounded-lg p-1 shadow-sm flex-shrink-0">
          <img src="/logo.png" alt="NCST" className="h-7 w-7 object-contain" />
        </div>
        <div className="leading-none">
          <span className="font-bold text-sm tracking-tight block">NCST Portal</span>
          <span className="text-[10px] text-sidebar-foreground/60 mt-1 block uppercase tracking-widest">Campus LMS</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto relative">
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(item => item.roles.includes(userRole));
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi} className={gi > 0 ? "pt-5" : ""}>
              {group.label && (
                <p className="px-2.5 mb-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">
                  {group.label}
                </p>
              )}
              {visibleItems.map(item => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative group ${
                      active
                        ? "bg-sidebar-accent text-white shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-sidebar-primary" />}
                    <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${active ? "text-sidebar-primary" : ""}`} />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3 relative flex-shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/30">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-sm ring-1 ring-white/10">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none truncate text-white">{userName}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate mt-0.5">{userEmail}</p>
            <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${roleColors[userRole] ?? ""}`}>
              {userRole}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/60 hover:text-white hover:bg-destructive/20 flex-shrink-0"
            onClick={onLogout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMobileOpen(false); }, [location]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => setUser(null) });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-7 h-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="w-64 border-r border-sidebar-border hidden md:flex flex-shrink-0">
        <SidebarContent
          userRole={user.role}
          userName={user.name}
          userEmail={user.email}
          location={location}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-white/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9 flex-shrink-0"
                  aria-label="Open navigation menu"
                  data-testid="mobile-nav-toggle"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 border-r-sidebar-border">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarContent
                  userRole={user.role}
                  userName={user.name}
                  userEmail={user.email}
                  location={location}
                  onLogout={handleLogout}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold truncate">
                Nasser Centre for Science &amp; Technology
              </p>
              <p className="text-sm font-semibold mt-0.5 capitalize text-foreground truncate">
                {location === "/dashboard" ? "Dashboard"
                  : location.startsWith("/courses") ? "Courses"
                  : location.startsWith("/submissions") ? "Submissions"
                  : location.startsWith("/teacher") ? "Teaching Panel"
                  : location.startsWith("/admin") ? "Administration"
                  : location.startsWith("/settings") ? "Settings"
                  : "Workspace"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 h-9 w-72 rounded-lg border border-border bg-background text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1">Search courses, files, students…</span>
              <kbd className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border">⌘ K</kbd>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
