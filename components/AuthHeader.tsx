"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthHeader(){
  const [email, setEmail] = useState<string | null>(null);

  useEffect(()=>{
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setEmail(sess?.user?.email ?? null));
    return () => { sub.subscription.unsubscribe(); };
  },[]);

  async function signOut(){
    await supabase.auth.signOut();
  }

  return (
    <div className="ml-auto flex items-center gap-2 text-sm">
      {email ? (
        <>
          <span className="opacity-70">{email}</span>
          <button onClick={signOut} className="px-2 py-1 rounded border" style={{borderColor:"#1e1e22"}}>Sign out</button>
        </>
      ) : (
        <Link href="/sign-in" className="px-2 py-1 rounded border" style={{borderColor:"#1e1e22"}}>Sign in</Link>
      )}
    </div>
  );
}
