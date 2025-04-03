import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

type WelcomeCardProps = {
  activeTab: "express" | "history";
  onChangeTab: (tab: "express" | "history") => void;
};

export default function WelcomeCard({ activeTab, onChangeTab }: WelcomeCardProps) {
  return (
    <Card className="bg-white rounded-lg shadow-card p-6 mb-6 text-center">
      <CardContent className="p-0">
        <h2 className="font-heading font-semibold text-xl md:text-2xl mb-3 text-primary">Welcome to CoupleClarity</h2>
        <p className="text-neutral-700 mb-5 max-w-2xl mx-auto">
          Express your feelings authentically, and our AI will help transform them into empathetic communication that strengthens your relationship.
        </p>
        <div className="inline-flex rounded-md bg-neutral-200 p-1 mb-3">
          <Link href="/">
            <button 
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === "express" 
                  ? "bg-white shadow-sm text-primary" 
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
              onClick={() => onChangeTab("express")}
            >
              Express
            </button>
          </Link>
          <Link href="/history">
            <button 
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === "history" 
                  ? "bg-white shadow-sm text-primary" 
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
              onClick={() => onChangeTab("history")}
            >
              History
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
