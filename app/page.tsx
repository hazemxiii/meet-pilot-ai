import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, BrainCircuit, FileText, Sparkles } from "lucide-react";

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  async function logout() {
    "use server";
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome back, {user.user_metadata?.full_name || user.email}
          </h1>
          <p className="text-muted-foreground">
            Start analyzing your meetings with AI-powered insights
          </p>
        </div>
        <form action={logout}>
          <Button variant="outline" type="submit">
            Logout
          </Button>
        </form>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/tasks">
            <CardHeader>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>
                Manage your AI-generated action items
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/notes">
            <CardHeader>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Review your meeting summaries</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/memory">
            <CardHeader>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BrainCircuit className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Memory</CardTitle>
              <CardDescription>Update your personal context</CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Analyze New Meeting
            </CardTitle>
            <CardDescription>
              Upload a recording or transcript to let Meet Pilot AI generate
              notes and tasks for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
