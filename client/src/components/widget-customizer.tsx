import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Palette, Download } from "lucide-react";

interface WidgetCustomizerProps {
  agentId: number;
  onUpdate?: (config: WidgetConfig) => void;
}

interface WidgetConfig {
  primaryColor: string;
  position: string;
  size: string;
  borderRadius: number;
  showBranding: boolean;
  openByDefault: boolean;
}

const colorOptions = [
  { value: "#2563eb", label: "Blue", color: "bg-blue-600" },
  { value: "#059669", label: "Green", color: "bg-green-600" },
  { value: "#dc2626", label: "Red", color: "bg-red-600" },
  { value: "#7c3aed", label: "Purple", color: "bg-purple-600" },
  { value: "#ea580c", label: "Orange", color: "bg-orange-600" },
  { value: "#0891b2", label: "Cyan", color: "bg-cyan-600" },
];

const positionOptions = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
];

const sizeOptions = [
  { value: "small", label: "Small (300px)" },
  { value: "medium", label: "Medium (400px)" },
  { value: "large", label: "Large (500px)" },
];

export default function WidgetCustomizer({ agentId, onUpdate }: WidgetCustomizerProps) {
  const [config, setConfig] = useState<WidgetConfig>({
    primaryColor: "#2563eb",
    position: "bottom-right",
    size: "medium",
    borderRadius: 12,
    showBranding: true,
    openByDefault: false,
  });

  const updateConfig = (updates: Partial<WidgetConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onUpdate?.(newConfig);
  };

  const generateCustomCode = () => {
    const widgetCode = `<!-- AgentHub Widget - Customized -->
<script>
(function() {
    var agentConfig = {
        agentId: 'agent_${agentId}',
        theme: {
            primaryColor: '${config.primaryColor}',
            position: '${config.position}',
            size: '${config.size}',
            borderRadius: ${config.borderRadius},
            showBranding: ${config.showBranding},
            openByDefault: ${config.openByDefault}
        }
    };
    
    var script = document.createElement('script');
    script.src = (import.meta.env.VITE_WIDGET_CDN_URL || 'https://cdn.agenthub.com') + '/widget.js';
    script.onload = function() {
        if (typeof AgentHub !== 'undefined') {
            AgentHub.init(agentConfig);
        }
    };
    document.head.appendChild(script);
})();
</script>`;

    navigator.clipboard.writeText(widgetCode);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Palette className="w-5 h-5 mr-2" />
            Widget Customization
          </CardTitle>
          <Button onClick={generateCustomCode} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Copy Custom Code
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Color */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Primary Color</Label>
          <div className="grid grid-cols-3 gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                onClick={() => updateConfig({ primaryColor: color.value })}
                className={`flex items-center space-x-2 p-2 rounded-lg border transition-colors ${
                  config.primaryColor === color.value 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${color.color}`}></div>
                <span className="text-xs">{color.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Position */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Position</Label>
          <Select value={config.position} onValueChange={(value) => updateConfig({ position: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {positionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Widget Size</Label>
          <Select value={config.size} onValueChange={(value) => updateConfig({ size: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Border Radius */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Border Radius: {config.borderRadius}px</Label>
          <Slider
            value={[config.borderRadius]}
            onValueChange={([value]) => updateConfig({ borderRadius: value })}
            max={24}
            min={0}
            step={2}
            className="w-full"
          />
        </div>

        {/* Switches */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Show AgentHub Branding</Label>
            <Switch
              checked={config.showBranding}
              onCheckedChange={(checked) => updateConfig({ showBranding: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Open by Default</Label>
            <Switch
              checked={config.openByDefault}
              onCheckedChange={(checked) => updateConfig({ openByDefault: checked })}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-muted/30 border-2 border-dashed border-border rounded-lg p-4">
          <div className="text-sm font-medium text-muted-foreground mb-2">Preview</div>
          <div 
            className="relative h-32 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden"
          >
            <div 
              className={`absolute w-16 h-12 shadow-lg rounded-lg flex items-center justify-center text-white text-xs font-medium ${
                config.position.includes('bottom') ? 'bottom-2' : 'top-2'
              } ${
                config.position.includes('right') ? 'right-2' : 'left-2'
              }`}
              style={{ 
                backgroundColor: config.primaryColor,
                borderRadius: `${config.borderRadius}px`
              }}
            >
              Chat
            </div>
            {config.openByDefault && (
              <div 
                className={`absolute w-24 h-20 bg-white shadow-xl rounded-lg border ${
                  config.position.includes('bottom') ? 'bottom-16' : 'top-16'
                } ${
                  config.position.includes('right') ? 'right-2' : 'left-2'
                }`}
                style={{ borderRadius: `${config.borderRadius}px` }}
              >
                <div className="p-2 text-xs text-slate-600">Chat opened</div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}