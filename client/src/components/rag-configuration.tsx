import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Trash2, Search, Database, Settings, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RAGConfig {
  enabled: boolean;
  knowledgeBase: string;
  documents: string[];
  queryMode: 'semantic' | 'keyword' | 'hybrid';
  chunkSize: number;
  overlap: number;
  maxResults: number;
  confidenceThreshold: number;
}

interface RAGConfigurationProps {
  value?: RAGConfig;
  onChange: (config: RAGConfig) => void;
  mode?: 'wizard' | 'manage';
}

export default function RAGConfiguration({ value, onChange, mode = 'wizard' }: RAGConfigurationProps) {
  const { toast } = useToast();
  
  const config = value || {
    enabled: false,
    knowledgeBase: '',
    documents: [],
    queryMode: 'hybrid',
    chunkSize: 1000,
    overlap: 200,
    maxResults: 5,
    confidenceThreshold: 0.7
  };

  const [uploadingFile, setUploadingFile] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);

  const handleConfigChange = (updates: Partial<RAGConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    try {
      // Simulate file upload
      const fileNames = Array.from(files).map(file => file.name);
      const updatedDocuments = [...config.documents, ...fileNames];
      
      handleConfigChange({ documents: updatedDocuments });
      
      toast({
        title: "Documents uploaded",
        description: `${fileNames.length} document(s) added to knowledge base`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const removeDocument = (index: number) => {
    const updatedDocuments = config.documents.filter((_, i) => i !== index);
    handleConfigChange({ documents: updatedDocuments });
  };

  const testKnowledgeBase = async () => {
    if (!testQuery.trim()) return;
    
    try {
      // Simulate RAG query
      const mockResults = [
        {
          content: "Sample knowledge base content related to: " + testQuery,
          confidence: 0.95,
          source: "document1.pdf",
          chunk: 1
        },
        {
          content: "Additional relevant information from knowledge base",
          confidence: 0.87,
          source: "document2.pdf", 
          chunk: 3
        }
      ];
      
      setTestResults(mockResults);
      toast({
        title: "Knowledge base tested",
        description: `Found ${mockResults.length} relevant results`,
      });
    } catch (error) {
      toast({
        title: "Test failed",
        description: "Failed to test knowledge base",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Enable RAG Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                RAG Knowledge Base
              </CardTitle>
              <CardDescription>
                Enable intelligent knowledge retrieval to make your agent smarter with custom data
              </CardDescription>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => handleConfigChange({ enabled })}
            />
          </div>
        </CardHeader>

        {config.enabled && (
          <CardContent className="space-y-6">
            {/* Knowledge Base Name */}
            <div className="space-y-2">
              <Label htmlFor="knowledgeBase">Knowledge Base Name</Label>
              <Input
                id="knowledgeBase"
                placeholder="e.g., Company Policy Guide, Product Documentation"
                value={config.knowledgeBase}
                onChange={(e) => handleConfigChange({ knowledgeBase: e.target.value })}
              />
            </div>

            {/* Document Upload */}
            <div className="space-y-4">
              <Label>Documents & Data Sources</Label>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Upload documents to build your knowledge base
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports PDF, DOC, TXT, CSV files up to 10MB each
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="rag-file-upload"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => document.getElementById('rag-file-upload')?.click()}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? "Uploading..." : "Choose Files"}
                  </Button>
                </div>
              </div>

              {/* Uploaded Documents */}
              {config.documents.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Documents ({config.documents.length})</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {config.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{doc}</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeDocument(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RAG Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Configuration
                </CardTitle>
                <CardDescription>
                  Fine-tune how your agent retrieves and uses knowledge
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="queryMode">Query Mode</Label>
                    <Select 
                      value={config.queryMode} 
                      onValueChange={(value: any) => handleConfigChange({ queryMode: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semantic">Semantic Search</SelectItem>
                        <SelectItem value="keyword">Keyword Search</SelectItem>
                        <SelectItem value="hybrid">Hybrid (Recommended)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxResults">Max Results</Label>
                    <Select 
                      value={config.maxResults.toString()} 
                      onValueChange={(value) => handleConfigChange({ maxResults: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 results</SelectItem>
                        <SelectItem value="5">5 results</SelectItem>
                        <SelectItem value="10">10 results</SelectItem>
                        <SelectItem value="15">15 results</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chunkSize">Chunk Size</Label>
                    <Select 
                      value={config.chunkSize.toString()} 
                      onValueChange={(value) => handleConfigChange({ chunkSize: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="500">500 tokens</SelectItem>
                        <SelectItem value="1000">1000 tokens</SelectItem>
                        <SelectItem value="1500">1500 tokens</SelectItem>
                        <SelectItem value="2000">2000 tokens</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confidenceThreshold">Confidence Threshold</Label>
                    <Select 
                      value={config.confidenceThreshold.toString()} 
                      onValueChange={(value) => handleConfigChange({ confidenceThreshold: parseFloat(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5 (Lenient)</SelectItem>
                        <SelectItem value="0.7">0.7 (Balanced)</SelectItem>
                        <SelectItem value="0.8">0.8 (Strict)</SelectItem>
                        <SelectItem value="0.9">0.9 (Very Strict)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Configuration Tips:</p>
                      <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                        <li>Hybrid mode provides the best balance of accuracy and coverage</li>
                        <li>Higher confidence thresholds reduce false positives</li>
                        <li>Larger chunk sizes preserve context but may reduce relevance</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Knowledge Base */}
            {mode === 'manage' && config.documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Test Knowledge Base
                  </CardTitle>
                  <CardDescription>
                    Test how your agent will retrieve information from the knowledge base
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask a question to test knowledge retrieval..."
                      value={testQuery}
                      onChange={(e) => setTestQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && testKnowledgeBase()}
                    />
                    <Button onClick={testKnowledgeBase} disabled={!testQuery.trim()}>
                      Test Query
                    </Button>
                  </div>

                  {testResults.length > 0 && (
                    <div className="space-y-3">
                      <Label>Retrieved Results</Label>
                      {testResults.map((result, index) => (
                        <Card key={index} className="border-l-4 border-l-primary">
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary">
                                  Confidence: {(result.confidence * 100).toFixed(1)}%
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {result.source} (chunk {result.chunk})
                                </span>
                              </div>
                              <p className="text-sm">{result.content}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}