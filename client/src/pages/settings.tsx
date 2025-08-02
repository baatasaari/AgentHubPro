import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Database,
  Globe,
  Moon,
  Sun,
  Save,
  RefreshCw,
  AlertTriangle,
  Check
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const [profileData, setProfileData] = useState({
    name: "John Smith",
    email: "john.smith@company.com",
    company: "Acme Corporation",
    timezone: "UTC-5",
    language: "en"
  });

  const [apiSettings, setApiSettings] = useState({
    openaiKey: "sk-••••••••••••••••••••••••",
    anthropicKey: "",
    googleKey: "",
    webhookUrl: `${import.meta.env.VITE_BUSINESS_BASE_URL || 'https://yourdomain.com'}/webhook`,
    rateLimitEnabled: true,
    maxRequestsPerMinute: 100
  });

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile settings have been saved successfully."
    });
  };

  const handleSaveAPISettings = () => {
    toast({
      title: "API Settings Updated", 
      description: "Your API configuration has been saved successfully."
    });
  };

  const handleResetSettings = () => {
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values.",
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account, preferences, and platform configuration
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleResetSettings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save All
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="api">
            <Database className="h-4 w-4 mr-2" />
            API & Keys
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={profileData.company}
                    onChange={(e) => setProfileData({...profileData, company: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={profileData.timezone} onValueChange={(value) => setProfileData({...profileData, timezone: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                      <SelectItem value="UTC-7">Mountain Time (UTC-7)</SelectItem>
                      <SelectItem value="UTC-6">Central Time (UTC-6)</SelectItem>
                      <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                      <SelectItem value="UTC+0">UTC+0 (London)</SelectItem>
                      <SelectItem value="UTC+5:30">IST (UTC+5:30)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveProfile}>
                <Save className="h-4 w-4 mr-2" />
                Update Profile
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Email Verified</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Pro Plan Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>API Access Enabled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about your agents and conversations
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Slack Integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Send alerts to your Slack workspace
                  </p>
                </div>
                <Switch
                  checked={slackNotifications}
                  onCheckedChange={setSlackNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Real-time Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable live analytics and monitoring
                  </p>
                </div>
                <Switch
                  checked={analyticsEnabled}
                  onCheckedChange={setAnalyticsEnabled}
                />
              </div>

              {emailNotifications && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <Label>Email Frequency</Label>
                    <Select defaultValue="daily">
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instant">Instant</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" placeholder="Enter current password" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" placeholder="Enter new password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" placeholder="Confirm new password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable 2FA</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Badge variant="outline">Not Enabled</Badge>
              </div>
              <Button variant="outline" className="mt-4">
                <Shield className="h-4 w-4 mr-2" />
                Setup 2FA
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Pro Plan</h3>
                  <p className="text-muted-foreground">Unlimited agents and conversations</p>
                </div>
                <Badge>Active</Badge>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Usage</p>
                    <p className="text-lg font-semibold">$45.67</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Billing</p>
                    <p className="text-lg font-semibold">Feb 15, 2024</p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2 mt-4">
                <Button variant="outline">View Usage Details</Button>
                <Button variant="outline">Download Invoice</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/25</p>
                  </div>
                </div>
                <Button variant="outline">Update</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>OpenAI API Key</Label>
                <Input
                  type="password"
                  value={apiSettings.openaiKey}
                  onChange={(e) => setApiSettings({...apiSettings, openaiKey: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Anthropic API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter Anthropic API key"
                  value={apiSettings.anthropicKey}
                  onChange={(e) => setApiSettings({...apiSettings, anthropicKey: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Google AI API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter Google AI API key"
                  value={apiSettings.googleKey}
                  onChange={(e) => setApiSettings({...apiSettings, googleKey: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  value={apiSettings.webhookUrl}
                  onChange={(e) => setApiSettings({...apiSettings, webhookUrl: e.target.value})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Rate Limiting</Label>
                  <p className="text-sm text-muted-foreground">
                    Limit API requests per minute
                  </p>
                </div>
                <Switch
                  checked={apiSettings.rateLimitEnabled}
                  onCheckedChange={(checked) => setApiSettings({...apiSettings, rateLimitEnabled: checked})}
                />
              </div>
              {apiSettings.rateLimitEnabled && (
                <div className="space-y-2">
                  <Label>Max Requests per Minute</Label>
                  <Input
                    type="number"
                    value={apiSettings.maxRequestsPerMinute}
                    onChange={(e) => setApiSettings({...apiSettings, maxRequestsPerMinute: parseInt(e.target.value)})}
                  />
                </div>
              )}
              <Button onClick={handleSaveAPISettings}>
                <Save className="h-4 w-4 mr-2" />
                Save API Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interface Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark themes
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4" />
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={setIsDarkMode}
                  />
                  <Moon className="h-4 w-4" />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-save</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save changes as you work
                  </p>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Default Language</Label>
                <Select value={profileData.language} onValueChange={(value) => setProfileData({...profileData, language: value})}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="hi">हिन्दी</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Usage Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Help improve AgentHub by sharing usage data
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="destructive">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}