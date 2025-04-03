import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Share2, RefreshCw, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TransformedMessageCardProps = {
  transformedMessage: string;
  communicationElements: string[];
  deliveryTips: string[];
};

export default function TransformedMessageCard({
  transformedMessage,
  communicationElements,
  deliveryTips,
}: TransformedMessageCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(transformedMessage);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "The transformed message has been copied to your clipboard.",
    });
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Card className="bg-white rounded-lg shadow-card p-6 mb-6 border-l-4 border-secondary">
      <CardContent className="p-0">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-heading font-medium text-lg text-primary">Transformed Message</h3>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 text-neutral-500 hover:text-primary"
              onClick={handleCopyClick}
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 text-neutral-500 hover:text-primary"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mb-4 p-4 bg-neutral-100 rounded-lg">
          <p className="text-neutral-800 leading-relaxed">
            {transformedMessage}
          </p>
        </div>
        
        <div className="mb-5">
          <h4 className="text-sm font-medium text-neutral-700 mb-2">Communication Elements Used:</h4>
          <div className="flex flex-wrap gap-2">
            {communicationElements.map((element, index) => (
              <span key={index} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                {element}
              </span>
            ))}
          </div>
        </div>
        
        <div className="border-t border-neutral-200 pt-4">
          <h4 className="text-sm font-medium text-neutral-700 mb-2">Tips for Delivery:</h4>
          <ul className="text-sm text-neutral-700 space-y-2">
            {deliveryTips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <CheckCircle className="text-secondary h-4 w-4 mt-1 mr-2" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-5 text-center">
          <Button variant="link" className="text-primary text-sm hover:underline">
            <RefreshCw className="h-4 w-4 mr-1" /> Generate Alternative
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
