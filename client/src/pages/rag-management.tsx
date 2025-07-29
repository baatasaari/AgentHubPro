import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, MessageSquare, Database, Search, FileText, Bot, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RAGManagement = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [chatQuery, setChatQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    title: '',
    content: '',
    doc_type: 'knowledge_base',
    source: '',
    industry: '',
    metadata: {}
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ['/api/agents'],
  });

  // Fetch RAG stats
  const { data: ragStats } = useQuery({
    queryKey: ['/api/rag/stats'],
  });

  // Fetch RAG health
  const { data: ragHealth } = useQuery({
    queryKey: ['/api/rag/health'],
  });

  // Chat with agent using RAG
  const chatMutation = useMutation({
    mutationFn: async ({ agentId, query }: { agentId: string; query: string }) => {
      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Chat successful', description: 'RAG-enhanced response generated' });
    },
  });

  // Search RAG documents
  const searchMutation = useMutation({
    mutationFn: async ({ query, agentId }: { query: string; agentId?: string }) => {
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, agent_id: agentId, top_k: 5 }),
      });
      return response.json();
    },
  });

  // Add document
  const addDocumentMutation = useMutation({
    mutationFn: async (documentData: any) => {
      const response = await fetch('/api/rag/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Document added', description: 'Knowledge base updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/stats'] });
      setIsAddingDocument(false);
      setDocumentForm({
        title: '',
        content: '',
        doc_type: 'knowledge_base',
        source: '',
        industry: '',
        metadata: {}
      });
    },
  });

  const handleChat = () => {
    if (!selectedAgent || !chatQuery.trim()) {
      toast({ title: 'Error', description: 'Please select an agent and enter a query', variant: 'destructive' });
      return;
    }
    chatMutation.mutate({ agentId: selectedAgent, query: chatQuery });
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({ title: 'Error', description: 'Please enter a search query', variant: 'destructive' });
      return;
    }
    searchMutation.mutate({ query: searchQuery, agentId: selectedAgent });
  };

  const handleAddDocument = () => {
    if (!documentForm.title || !documentForm.content || !documentForm.source) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    
    addDocumentMutation.mutate({
      ...documentForm,
      agent_id: selectedAgent || undefined,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">RAG Knowledge Management</h1>
          <p className="text-muted-foreground">
            Manage knowledge bases and test RAG-enhanced conversations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {(ragHealth as any)?.status === 'healthy' && (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Zap className="h-3 w-3 mr-1" />
              RAG Active
            </Badge>
          )}
          {(ragHealth as any)?.openai_available && (
            <Badge variant="outline">
              <Bot className="h-3 w-3 mr-1" />
              OpenAI Connected
            </Badge>
          )}
        </div>
      </div>

      {/* RAG Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Database className="h-4 w-4 mr-2" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(ragStats as any)?.total_documents || 0}</div>
            <p className="text-xs text-muted-foreground">Total knowledge documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Chunks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(ragStats as any)?.total_chunks || 0}</div>
            <p className="text-xs text-muted-foreground">Searchable text chunks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Embedding Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono">{(ragStats as any)?.embedding_model || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Vector embeddings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono">{(ragStats as any)?.completion_model || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Response generation</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Test Chat
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            Search Knowledge
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Manage Documents
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Test RAG-Enhanced Chat</CardTitle>
              <CardDescription>
                Chat with agents using their knowledge base for enhanced responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agent-select">Select Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent to chat with" />
                  </SelectTrigger>
                  <SelectContent>
                    {(agents as any[]).map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.businessName} ({agent.industry})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="chat-query">Your Question</Label>
                <Textarea
                  id="chat-query"
                  placeholder="Ask something about the agent's business or services..."
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <Button onClick={handleChat} disabled={chatMutation.isPending}>
                <MessageSquare className="h-4 w-4 mr-2" />
                {chatMutation.isPending ? 'Generating...' : 'Send Message'}
              </Button>

              {chatMutation.data && (
                <div className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center justify-between">
                        Agent Response
                        {chatMutation.data.sources?.length > 0 && (
                          <Badge variant="secondary">
                            RAG Enhanced ({chatMutation.data.sources.length} sources)
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{chatMutation.data.response}</p>
                      
                      {chatMutation.data.sources?.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold mb-2">Sources:</h4>
                          {chatMutation.data.sources.map((source: any, idx: number) => (
                            <div key={idx} className="text-xs p-2 bg-muted rounded">
                              <div className="font-medium">{source.title}</div>
                              <div className="text-muted-foreground">{source.content_preview}</div>
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Relevance: {(source.relevance_score * 100).toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Search Knowledge Base</CardTitle>
              <CardDescription>
                Search through all documents to find relevant information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search-query">Search Query</Label>
                <Input
                  id="search-query"
                  placeholder="Enter keywords to search for..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                <Search className="h-4 w-4 mr-2" />
                {searchMutation.isPending ? 'Searching...' : 'Search'}
              </Button>

              {searchMutation.data && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2">
                    Search Results ({searchMutation.data.total_results})
                  </h3>
                  {searchMutation.data.results.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No relevant documents found.</p>
                  ) : (
                    <div className="space-y-2">
                      {searchMutation.data.results.map((result: any, idx: number) => (
                        <Card key={idx}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-medium">{result.document_title}</h4>
                              <Badge variant="outline">
                                {(result.relevance_score * 100).toFixed(1)}% match
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{result.content}</p>
                            <div className="text-xs text-muted-foreground">
                              Source: {result.document_source}
                              {result.metadata?.industry && ` • Industry: ${result.metadata.industry}`}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Management</CardTitle>
              <CardDescription>
                Add documents to enhance your agents' knowledge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isAddingDocument} onOpenChange={setIsAddingDocument}>
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Add Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Knowledge Document</DialogTitle>
                    <DialogDescription>
                      Add a new document to enhance agent responses
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="doc-title">Title *</Label>
                        <Input
                          id="doc-title"
                          placeholder="Document title"
                          value={documentForm.title}
                          onChange={(e) => setDocumentForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="doc-source">Source *</Label>
                        <Input
                          id="doc-source"
                          placeholder="Document source"
                          value={documentForm.source}
                          onChange={(e) => setDocumentForm(prev => ({ ...prev, source: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="doc-type">Document Type</Label>
                        <Select
                          value={documentForm.doc_type}
                          onValueChange={(value) => setDocumentForm(prev => ({ ...prev, doc_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="knowledge_base">Knowledge Base</SelectItem>
                            <SelectItem value="faq">FAQ</SelectItem>
                            <SelectItem value="company_docs">Company Docs</SelectItem>
                            <SelectItem value="webpage">Webpage</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="doc-industry">Industry</Label>
                        <Input
                          id="doc-industry"
                          placeholder="e.g., healthcare, retail"
                          value={documentForm.industry}
                          onChange={(e) => setDocumentForm(prev => ({ ...prev, industry: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="doc-content">Content *</Label>
                      <Textarea
                        id="doc-content"
                        placeholder="Enter the document content..."
                        value={documentForm.content}
                        onChange={(e) => setDocumentForm(prev => ({ ...prev, content: e.target.value }))}
                        className="min-h-[200px]"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingDocument(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddDocument} disabled={addDocumentMutation.isPending}>
                      {addDocumentMutation.isPending ? 'Adding...' : 'Add Document'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RAGManagement;