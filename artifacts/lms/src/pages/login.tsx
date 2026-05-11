import React, { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "wouter";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { BookOpen } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useLogin();
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        setUser(data.user);
        setLocation("/");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        
        <Card className="border-border shadow-xl">
          <CardHeader className="space-y-2 text-center border-b border-border pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight">NCST Portal</CardTitle>
            <CardDescription className="text-base">
              Nasser Centre for Science & Technology
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Institutional Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="student@ncst.edu.bh" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-gray-50 dark:bg-input"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm font-medium text-primary hover:underline">Forgot password?</a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-gray-50 dark:bg-input"
                />
              </div>
              <Button type="submit" className="w-full mt-4" size="lg" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in..." : "Sign in to Campus"}
              </Button>
              {loginMutation.isError && (
                <div className="text-sm font-medium text-destructive mt-2 text-center bg-destructive/10 p-2 rounded-md">
                  Invalid credentials. Please try again.
                </div>
              )}
            </form>
          </CardContent>
          <CardFooter className="flex flex-col bg-gray-50 dark:bg-sidebar/50 rounded-b-xl border-t border-border mt-6">
            <div className="text-sm text-center text-muted-foreground mt-4 mb-4">
              Need help? Contact the IT Helpdesk at support@ncst.edu.bh
            </div>
            
            <div className="w-full pt-4 border-t border-border flex justify-center gap-2 text-xs text-muted-foreground pb-2">
              <button type="button" onClick={() => { setEmail("student@example.com"); setPassword("password123"); }} className="underline">Student</button>
              <span>|</span>
              <button type="button" onClick={() => { setEmail("teacher@example.com"); setPassword("password123"); }} className="underline">Teacher</button>
              <span>|</span>
              <button type="button" onClick={() => { setEmail("admin@example.com"); setPassword("password123"); }} className="underline">Admin</button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
