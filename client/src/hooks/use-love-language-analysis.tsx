import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface LoveLanguageAnalysis {
  analysisText: string;
  personalizedTips: string[];
  appUsageSuggestions: string[];
}

export function useLoveLanguageAnalysis() {
  const { toast } = useToast();
  const [isPolling, setIsPolling] = useState(false);

  const {
    data: analysis,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["/api/user/love-language-analysis"],
    queryFn: getQueryFn(),
    enabled: false, // Don't run query on mount
    retry: 1,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Function to start analysis
  const startAnalysis = async () => {
    setIsPolling(true);
    try {
      const result = await refetch();
      if (result.data) {
        toast({
          title: "Analysis Complete",
          description: "Your love language analysis is ready to view!",
        });
      }
    } catch (err) {
      toast({
        title: "Analysis Error",
        description: err instanceof Error ? err.message : "Could not analyze love language. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsPolling(false);
    }
  };

  return {
    analysis: analysis as LoveLanguageAnalysis | undefined,
    isLoading,
    isPolling,
    isError,
    error,
    startAnalysis
  };
}