import React, { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useSearch } from "wouter";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { GraduationCap, ShieldCheck, Sparkles, ArrowRight, Mail } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const loginMutation = useLogin();
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const redirectTo = new URLSearchParams(search).get("redirect") ?? "/dashboard";

  const openForgot = () => { setForgotEmail(email); setForgotSent(false); setForgotOpen(true); };
  const submitForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSent(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        setUser(data.user);
        setLocation(redirectTo);
      }
    });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left — Branding panel */}
      <div className="hidden lg:flex relative overflow-hidden gradient-primary text-white p-12 flex-col justify-between">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="bg-white rounded-xl p-2 shadow-premium">
            <img src="/logo.png" alt="NCST" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <p className="font-bold text-lg leading-none">NCST</p>
            <p className="text-xs text-white/70 mt-1 leading-none">Campus Portal</p>
          </div>
        </div>

        <div className="relative space-y-8 max-w-md">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium mb-6 backdrop-blur">
              <Sparkles className="h-3 w-3" />
              Bahrain's leading STEM institution
            </div>
            <h1 className="font-serif text-5xl font-bold leading-[1.05] tracking-tight">
              Excellence in
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                every endeavor.
              </span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed mt-6">
              The official learning environment of the Nasser Centre for Science &amp; Technology — connecting students, lecturers, and administrators on a single secure platform.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            {[
              { icon: GraduationCap, text: "Accredited academic programs" },
              { icon: ShieldCheck, text: "Secure assessments & integrity monitoring" },
              { icon: Sparkles, text: "Modern, student-first experience" },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="flex items-center gap-3 text-sm text-white/85">
                  <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  {item.text}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative text-xs text-white/50">
          © {new Date().getFullYear()} Nasser Centre for Science &amp; Technology
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background relative">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="w-full max-w-sm relative">
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/logo.png" alt="NCST" className="h-16 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h2>
            <p className="text-muted-foreground text-sm">
              Sign in with your institutional credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@ncst.edu.bh"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11 bg-white shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <button type="button" onClick={openForgot} className="text-xs font-semibold text-primary hover:underline">Forgot?</button>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-11 bg-white shadow-sm"
              />
            </div>

            {loginMutation.isError && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-md">
                Invalid credentials. Please try again.
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-semibold gradient-primary text-white hover:opacity-95 shadow-elegant group" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in…" : (
                <>
                  Sign in to Campus
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80 mb-3 text-center">
              Demo accounts
            </p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: "Admin — admin@ncst.edu.bh", email: "admin@ncst.edu.bh" },
              ].map(d => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword("password123"); }}
                  className="text-xs font-medium border border-border rounded-md py-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-center text-muted-foreground mt-4">
              Need help? <a href="mailto:support@ncst.edu.bh" className="text-primary font-medium hover:underline">support@ncst.edu.bh</a>
            </p>
          </div>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your institutional email and IT will send you a reset link.
            </DialogDescription>
          </DialogHeader>
          {forgotSent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-md bg-primary/5 border border-primary/20">
                <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Request received</p>
                  <p className="text-muted-foreground mt-1">
                    If <strong>{forgotEmail}</strong> matches a registered account, a password
                    reset link will be sent shortly. If you don't receive it within a few
                    minutes, please email{" "}
                    <a href="mailto:support@ncst.edu.bh" className="text-primary underline">
                      support@ncst.edu.bh
                    </a>
                    .
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setForgotOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={submitForgot} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@ncst.edu.bh"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Send reset link</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
