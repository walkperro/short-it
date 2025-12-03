import { NextResponse } from "next/server";
import { signUp } from "@/app/(auth)/sign-up/actions";
export async function POST(req: Request){
  const { email, password } = await req.json();
  const res = await signUp(email, password);
  return NextResponse.json(res);
}
