import { Card } from "@/components/ui/card";
import { Book, MessageSquare, Heart } from "lucide-react";

export default function SuggestedReading() {
  return (
    <div className="mt-6">
      <h3 className="font-heading font-medium text-lg text-neutral-700 mb-3">Suggested Reading</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="#" className="bg-white rounded-lg shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300">
          <div className="h-32 bg-primary/20 flex items-center justify-center">
            <Book className="text-primary text-3xl" />
          </div>
          <div className="p-4">
            <h4 className="font-medium text-neutral-900 mb-1">The Five Love Languages</h4>
            <p className="text-sm text-neutral-700">Understanding how you and your partner express and experience love.</p>
          </div>
        </a>
        
        <a href="#" className="bg-white rounded-lg shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300">
          <div className="h-32 bg-secondary/20 flex items-center justify-center">
            <MessageSquare className="text-secondary text-3xl" />
          </div>
          <div className="p-4">
            <h4 className="font-medium text-neutral-900 mb-1">Nonviolent Communication</h4>
            <p className="text-sm text-neutral-700">A language of compassion that strengthens our ability to inspire empathy.</p>
          </div>
        </a>
        
        <a href="#" className="bg-white rounded-lg shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300">
          <div className="h-32 bg-accent/20 flex items-center justify-center">
            <Heart className="text-accent text-3xl" />
          </div>
          <div className="p-4">
            <h4 className="font-medium text-neutral-900 mb-1">Emotional Intelligence in Relationships</h4>
            <p className="text-sm text-neutral-700">Building awareness of emotions to create deeper connections.</p>
          </div>
        </a>
      </div>
    </div>
  );
}
