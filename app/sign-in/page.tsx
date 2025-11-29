"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function SignInPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); return; }
    setOk(true);
    window.location.href = "/";
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(false);

    const redirect = typeof window !== "undefined"
      ? `${window.location.origin}/reset`
      : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined }
    });

    if (error) { setErr(error.message); return; }
    setOk(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl p-6 border"
           style={{borderColor:"#1e1e22", background:"#111113"}}>

        <h1 className="text-xl font-semibold mb-4">
          {mode === "signin" ? "Sign in to SHORT-IT" : "Create your SHORT-IT account"}
        </h1>

        {mode === "signin" ? (
          <form onSubmit={onSignIn} className="space-y-3">
            <input type="email" required placeholder="Email" value={email}
              onChange={(e)=>setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded bg-transparent border"
              style={{borderColor:"#1e1e22"}} />

            <input type="password" required placeholder="Password" value={password}
              onChange={(e)=>setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded bg-transparent border"
              style={{borderColor:"#1e1e22"}} />

            <button className="w-full px-3 py-2 rounded border font-medium"
              style={{borderColor:"#1e1e22"}}>Sign in</button>

            <div className="text-right text-xs mt-1">
              <a href="/reset-request" className="opacity-80 hover:opacity-100 underline">
                Forgot password?
              </a>
            </div>

            <div className="text-center text-sm opacity-70 mt-4">
              Don't have an account?
              <button type="button" onClick={()=>setMode("signup")}
                className="underline ml-1">Sign up</button>
            </div>
          </form>
        ) : (
          <form onSubmit={onSignUp} className="space-y-3">
            <input type="email" required placeholder="Email" value={email}
              onChange={(e)=>setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded bg-transparent border"
              style={{borderColor:"#1e1e22"}} />

            <input type="password" required placeholder="Password" value={password}
              onChange={(e)=>setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded bg-transparent border"
              style={{borderColor:"#1e1e22"}} />

            <button className="w-full px-3 py-2 rounded border font-medium"
              style={{borderColor:"#1e1e22"}}>Sign up</button>

            <div className="text-center text-sm opacity-70 mt-4">
              Already have an account?
              <button type="button" onClick={()=>setMode("signin")}
                className="underline ml-1">Sign in</button>
            </div>
          </form>
        )}

        {err && <div className="mt-3 text-sm text-red-400">{err}</div>}
        {ok && <div className="mt-3 text-sm text-green-400">Check your email.</div>}
      </div>
    </div>
  );
}
