import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LandingLogo } from "@/components/landing-logo";
import { MessageSquareHeart, GitMerge, TrendingUp, BookOpen } from "lucide-react";

const features = [
  {
    icon: MessageSquareHeart,
    title: "Transform Your Words",
    description:
      "Rewrite heated messages with empathy. Our AI helps you say what you mean without saying something you'll regret.",
  },
  {
    icon: GitMerge,
    title: "Resolve Conflicts Together",
    description:
      "Guided resolution threads help you and your partner work through disagreements constructively, step by step.",
  },
  {
    icon: TrendingUp,
    title: "Track Emotional Growth",
    description:
      "Visualize your communication patterns over time and celebrate the progress you're making together.",
  },
  {
    icon: BookOpen,
    title: "Therapy-Inspired Sessions",
    description:
      "Structured exercises drawn from proven therapeutic frameworks to deepen understanding and connection.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <LandingLogo className="h-10 w-auto text-foreground" />
        <Link href="/auth">
          <Button variant="outline" size="sm">
            Sign In
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28 max-w-4xl mx-auto text-center">
        <h1 className="font-landing font-bold text-4xl md:text-6xl tracking-tight leading-tight">
          <span className="landing-gradient-text">Clarity</span> when it matters most.
        </h1>
        <p className="mt-4 font-landing font-semibold text-lg md:text-xl text-foreground/80">
          AI-powered support for emotionally smart conversations.
        </p>
        <p className="mt-4 max-w-2xl mx-auto text-muted-foreground text-base md:text-lg leading-relaxed">
          Arguments are inevitable. Misunderstandings? Not so much. CoupleClarity
          helps you and your partner communicate with empathy, resolve conflicts
          constructively, and grow together.
        </p>
        <div className="mt-8">
          <Link href="/auth">
            <Button size="lg" className="landing-cta-btn text-base px-8 py-6 rounded-full">
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 md:pb-28 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card border shadow-sm">
              <CardContent className="pt-6">
                <feature.icon className="h-8 w-8 text-brand-blue mb-4" />
                <h3 className="font-landing font-semibold text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} CoupleClarity. All rights reserved.</span>
          <div className="flex gap-6">
            <span className="hover:text-foreground cursor-pointer">Privacy</span>
            <span className="hover:text-foreground cursor-pointer">Terms</span>
            <span className="hover:text-foreground cursor-pointer">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
