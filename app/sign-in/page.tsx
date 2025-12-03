"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function Banner({ kind, children }: { kind:"ok"|"warn", children: React.ReactNode }) {
  const color = kind==="ok" ? "green" : "yellow";
  return (
    <div className={`mt-4 rounded-2xl border border-${color}-500/30 bg-${color}-500/10 px-4 py-3 text-sm`}>
      <span className={`font-semibold text-${color}-300`}>{kind==="ok"?"Success":"Check your email"}</span>
      <span className="text-zinc-300"> — {children}</span>
    </div>
  );
}

export default function SignInPage(){
  const r = useRouter();
  const supa = createClient();
  const [mode, setMode] = useState<"in"|"up">("in");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [msg,setMsg] = useState<{kind:"ok"|"warn", text:string}|null>(null);
  const [loading,setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent){
    e.preventDefault(); setMsg(null); setLoading(true);
    try {
      if (mode==="in"){
        const { error } = await supa.auth.signInWithPassword({ email, password });
        if (error) setMsg({kind:"warn", text:error.message});
        else r.replace("/");
      } else {
        const res = await fetch("/api/auth/sign-up", {
          method:"POST", headers:{"content-type":"application/json"},
          body: JSON.stringify({ email, password })
        });
        const { error } = await res.json();
        if (error) setMsg({kind:"warn", text:error});
        else setMsg({kind:"warn", text:"click the SHORT-IT link to finish sign-up."});
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">SHORT-IT Account</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input required type="email" placeholder="you@email.com"
          value={email} onChange={e=>setEmail(e.target.value)}
          className="w-full rounded-xl bg-zinc-900/60 px-3 py-2 outline-none ring-1 ring-zinc-700 focus:ring-red-500"/>
        <input required type="password" placeholder="password"
          value={password} onChange={e=>setPassword(e.target.value)}
          className="w-full rounded-xl bg-zinc-900/60 px-3 py-2 outline-none ring-1 ring-zinc-700 focus:ring-red-500"/>
        <button disabled={loading}
          className="w-full rounded-xl bg-red-600 px-3 py-2 font-semibold text-black disabled:opacity-50">
          {mode==="in" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <div className="mt-3 text-sm text-zinc-400">
        {mode==="in"
          ? <>Need an account? <button className="text-red-400" onClick={()=>setMode("up")}>Sign up</button></>
          : <>Already have an account? <button className="text-red-400" onClick={()=>setMode("in")}>Sign in</button></>}
      </div>
      <div className="mt-2"><Link className="text-zinc-400" href="/">← Back</Link></div>
      {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}
    </div>
  );
}
