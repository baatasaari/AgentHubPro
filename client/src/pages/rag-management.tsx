import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Database, MessageSquare, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FAQEntry {
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
}

interface FileUpload {
  filename: string;
  content: string;
  mimeType: string;
}

interface DatabaseConnection {
  type: 'mysql' | 'postgresql' | 'mongodb';
  host: string;
  database: string;
  tables?: string[];
  query?: string;
}

interface KnowledgeBaseStatus {
  configured: boolean;
  totalDocuments: number;
  sourceBreakdown: Record<string, number>;
  configuration?: {
    enabledSources: string[];
    embeddingModel: string;
    maxDocuments: number;
    autoUpdate: boolean;
  };
}

export default function RAGManagement() {
  const [customerId] = useState("customer_123"); // In production, get from auth
  const [agentId, setAgentId] = useState("1");
  const [status, setStatus] = useState<KnowledgeBaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testQuery, setTestQuery] = useState("");
  const [testResponse, setTestResponse] = useState<any>(null);
  
  // FAQ Management
  const [faqs, setFaqs] = useState<FAQEntry[]>([{ question: "", answer: "", category: "" }]);
  
  // File Upload
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  
  // Database Connection
  const [dbConnection, setDbConnection] = useState<DatabaseConnection>({
    type: 'postgresql',
    host: '',
    database: '',
    tables: []
  });

  const { toast } = useToast();

  useEffect(() => {
    if (agentId) {
      loadKnowledgeBaseStatus();
    }
  }, [agentId]);

  const loadKnowledgeBaseStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rag/status/${customerId}/${agentId}`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load knowledge base status:', error);
    } finally {
      setLoading(false);
    }
  };

  const configureKnowledgeBase = async () => {
    try {
      setLoading(true);
      const config = {
        enabledSources: ['file', 'faq', 'database', 'manual'],
        embeddingModel: 'text-embedding-3-small',
        maxDocuments: 1000,
        autoUpdate: true
      };

      const response = await apiRequest("POST", "/api/rag/configure", {
        customerId,
        agentId,
        config
      });

      if (response.ok) {
        toast({
          title: "Knowledge Base Configured",
          description: "Your knowledge base is ready for content upload."
        });
        await loadKnowledgeBaseStatus();
      }
    } catch (error) {
      toast({
        title: "Configuration Failed",
        description: "Failed to configure knowledge base.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFAQs = async () => {
    try {
      setLoading(true);
      const validFaqs = faqs.filter(faq => faq.question.trim() && faq.answer.trim());
      
      if (validFaqs.length === 0) {
        toast({
          title: "No Valid FAQs",
          description: "Please add at least one complete FAQ entry.",
          variant: "destructive"
        });
        return;
      }

      const response = await apiRequest("POST", "/api/rag/faq", {
        customerId,
        agentId,
        faqs: validFaqs
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "FAQs Added Successfully",
          description: `Added ${result.addedEntries} FAQ entries to knowledge base.`
        });
        setFaqs([{ question: "", answer: "", category: "" }]);
        await loadKnowledgeBaseStatus();
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload FAQ entries.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      setLoading(true);
      
      if (uploadFiles.length === 0) {
        toast({
          title: "No Files Selected",
          description: "Please select files to upload.",
          variant: "destructive"
        });
        return;
      }

      const fileData = await Promise.all(
        uploadFiles.map(async (file) => ({
          filename: file.name,
          content: await file.text(),
          mimeType: file.type
        }))
      );

      const response = await apiRequest("POST", "/api/rag/upload", {
        customerId,
        agentId,
        files: fileData
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Files Uploaded Successfully",
          description: `Processed ${result.processedFiles} files. Total documents: ${result.totalDocuments}`
        });
        setUploadFiles([]);
        await loadKnowledgeBaseStatus();
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload files.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const connectDatabase = async () => {
    try {
      setLoading(true);
      
      if (!dbConnection.host || !dbConnection.database) {
        toast({
          title: "Invalid Connection",
          description: "Please provide host and database name.",
          variant: "destructive"
        });
        return;
      }

      const response = await apiRequest("POST", "/api/rag/database", {
        customerId,
        agentId,
        connection: dbConnection
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Database Connected",
          description: `Imported ${result.importedRecords} records. Total documents: ${result.totalDocuments}`
        });
        await loadKnowledgeBaseStatus();
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testKnowledgeBase = async () => {
    try {
      setLoading(true);
      
      if (!testQuery.trim()) {
        toast({
          title: "Empty Query",
          description: "Please enter a test query.",
          variant: "destructive"
        });
        return;
      }

      const response = await apiRequest("POST", "/api/rag/customer-query", {
        customerId,
        agentId,
        query: testQuery
      });

      const result = await response.json();
      setTestResponse(result);
      
      toast({
        title: "Query Processed",
        description: `Found ${result.sources.length} relevant sources with ${(result.relevanceScore * 100).toFixed(1)}% relevance.`
      });
    } catch (error) {
      toast({
        title: "Query Failed",
        description: "Failed to process test query.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addFAQRow = () => {
    setFaqs([...faqs, { question: "", answer: "", category: "" }]);
  };

  const updateFAQ = (index: number, field: keyof FAQEntry, value: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFaqs(updated);
  };

  const removeFAQ = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">RAG Management</h1>
          <p className="text-muted-foreground">Configure customer-specific knowledge bases with file uploads and embeddings</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Label htmlFor="agentId">Agent ID:</Label>
          <Input
            id="agentId"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="w-32"
            placeholder="1"
          />
        </div>
      </div>

      {/* Knowledge Base Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Knowledge Base Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Status</Label>
                <Badge variant={status.configured ? "default" : "secondary"} className="ml-2">
                  {status.configured ? "Configured" : "Not Configured"}
                </Badge>
              </div>
              <div>
                <Label>Total Documents</Label>
                <p className="text-2xl font-bold">{status.totalDocuments}</p>
              </div>
              <div>
                <Label>Sources</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(status.sourceBreakdown).map(([source, count]) => (
                    <Badge key={source} variant="outline">
                      {source}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Button onClick={configureKnowledgeBase} disabled={loading}>
                <Settings className="h-4 w-4 mr-2" />
                Configure Knowledge Base
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="faq">
            <MessageSquare className="h-4 w-4 mr-2" />
            FAQ Management
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileText className="h-4 w-4 mr-2" />
            File Upload
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            Database Connect
          </TabsTrigger>
          <TabsTrigger value="test">
            <Upload className="h-4 w-4 mr-2" />
            Test & Query
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>FAQ Management</CardTitle>
              <CardDescription>Add frequently asked questions and answers to your knowledge base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg">
                  <div className="md:col-span-5">
                    <Label>Question</Label>
                    <Input
                      value={faq.question}
                      onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                      placeholder="What are your business hours?"
                    />
                  </div>
                  <div className="md:col-span-5">
                    <Label>Answer</Label>
                    <Textarea
                      value={faq.answer}
                      onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                      placeholder="We are open Monday to Friday 9 AM to 6 PM..."
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Category</Label>
                    <Input
                      value={faq.category}
                      onChange={(e) => updateFAQ(index, 'category', e.target.value)}
                      placeholder="General"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeFAQ(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="flex gap-2">
                <Button onClick={addFAQRow} variant="outline">
                  Add FAQ Row
                </Button>
                <Button onClick={uploadFAQs} disabled={loading}>
                  Upload FAQs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>File Upload</CardTitle>
              <CardDescription>Upload documents, PDFs, text files, or other content to your knowledge base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fileInput">Select Files</Label>
                <Input
                  id="fileInput"
                  type="file"
                  multiple
                  onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                  accept=".txt,.md,.json,.csv,.pdf,.doc,.docx"
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Supported formats: TXT, MD, JSON, CSV, PDF, DOC, DOCX
                </p>
              </div>
              
              {uploadFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files:</Label>
                  {uploadFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <Button onClick={handleFileUpload} disabled={loading || uploadFiles.length === 0}>
                Upload Files to Knowledge Base
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Connection</CardTitle>
              <CardDescription>Connect to your existing database to import knowledge</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Database Type</Label>
                  <select
                    value={dbConnection.type}
                    onChange={(e) => setDbConnection({...dbConnection, type: e.target.value as any})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="mongodb">MongoDB</option>
                  </select>
                </div>
                <div>
                  <Label>Host</Label>
                  <Input
                    value={dbConnection.host}
                    onChange={(e) => setDbConnection({...dbConnection, host: e.target.value})}
                    placeholder="localhost:5432"
                  />
                </div>
                <div>
                  <Label>Database Name</Label>
                  <Input
                    value={dbConnection.database}
                    onChange={(e) => setDbConnection({...dbConnection, database: e.target.value})}
                    placeholder="my_business_db"
                  />
                </div>
                <div>
                  <Label>Tables (Optional)</Label>
                  <Input
                    value={dbConnection.tables?.join(', ') || ''}
                    onChange={(e) => setDbConnection({...dbConnection, tables: e.target.value.split(',').map(t => t.trim())})}
                    placeholder="products, customers, orders"
                  />
                </div>
              </div>
              
              <Button onClick={connectDatabase} disabled={loading}>
                Connect & Import Database
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test Knowledge Base</CardTitle>
              <CardDescription>Query your knowledge base to test responses and relevance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Test Query</Label>
                <Textarea
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="What are your business hours? Do you offer consultations?"
                  rows={3}
                />
              </div>
              
              <Button onClick={testKnowledgeBase} disabled={loading || !testQuery.trim()}>
                Test Query
              </Button>
              
              {testResponse && (
                <div className="space-y-4 mt-6">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <Label className="text-sm font-medium">Response:</Label>
                    <p className="mt-2">{testResponse.response}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">
                      Sources ({testResponse.sources.length}) - Relevance: {(testResponse.relevanceScore * 100).toFixed(1)}%
                    </Label>
                    <div className="space-y-2 mt-2">
                      {testResponse.sources.map((source: any, index: number) => (
                        <div key={index} className="p-3 border rounded text-sm">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline">{source.metadata.source}</Badge>
                            <Badge variant="secondary">{(source.relevanceScore * 100).toFixed(1)}%</Badge>
                          </div>
                          <p className="text-muted-foreground">{source.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}