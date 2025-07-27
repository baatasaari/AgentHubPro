import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Lightbulb } from "lucide-react";
import { AgentService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface CodeGeneratorProps {
  agentId: number;
}

export default function CodeGenerator({ agentId }: CodeGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: embedData, isPending } = useQuery<{ embedCode: string }>({
    queryKey: [`/api/agents/${agentId}/embed`],
    queryFn: () => AgentService.getEmbedCode(agentId),
    enabled: !!agentId,
  });

  const handleCopyCode = async () => {
    if (!embedData?.embedCode) return;

    try {
      await navigator.clipboard.writeText(embedData.embedCode);
      setCopied(true);
      toast({
        title: "Success",
        description: "Code copied to clipboard!",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy code to clipboard",
        variant: "destructive",
      });
    }
  };

  if (isPending) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!embedData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Generated Embed Code</CardTitle>
          <Button
            onClick={handleCopyCode}
            variant="outline"
            className="bg-slate-100 hover:bg-slate-200"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto mb-4">
          <pre className="text-green-400 text-sm">
            <code>{embedData.embedCode}</code>
          </pre>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Implementation Instructions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Copy and paste this code into your website's HTML</li>
                <li>The widget will appear automatically on page load</li>
                <li>Customize colors and position in the agent settings</li>
                <li>The widget is responsive and mobile-friendly</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Ready to Deploy
          </Badge>
          <div className="text-sm text-muted-foreground">
            Agent ID: agent_{agentId}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
