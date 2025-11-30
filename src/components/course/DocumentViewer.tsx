import React, { useState } from 'react';
import { Download, Eye, FileText, ExternalLink, CheckCircle, X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getDocumentContent } from '@/data/moduleDocuments';
import { sanitizeHtml } from '@/utils/sanitize-html';

interface Document {
  id: string;
  title: string;
  description?: string;
  contentId?: string; // References moduleDocuments.ts
  url?: string;
  type: 'html' | 'link';
  size?: string;
  required?: boolean;
}

interface DocumentViewerProps {
  documents: Document[];
  onDocumentView?: (documentId: string) => void;
  onDocumentDownload?: (documentId: string) => void;
  viewedDocuments?: string[];
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documents,
  onDocumentView,
  onDocumentDownload,
  viewedDocuments = []
}) => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const handleView = (document: Document) => {
    setSelectedDocument(document);
    onDocumentView?.(document.id);
    
    if (document.type === 'link') {
      window.open(document.url, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast({
      title: "Print to PDF",
      description: "Use your browser's Print function (Ctrl/Cmd + P) and select 'Save as PDF' to download this document.",
    });
    handlePrint();
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'html':
        return <FileText className="w-5 h-5 text-primary" />;
      case 'link':
        return <ExternalLink className="w-5 h-5 text-primary" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const renderDocumentContent = () => {
    if (!selectedDocument || selectedDocument.type === 'link') return null;

    const contentData = selectedDocument.contentId 
      ? getDocumentContent(selectedDocument.contentId)
      : null;

    if (!contentData) {
      return (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Document content not available.</p>
        </div>
      );
    }

    const sanitizedContent = sanitizeHtml(contentData.content);

    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-2">
          <div className="flex gap-4">
            <span>Version {contentData.version}</span>
            <span>Last Updated: {new Date(contentData.lastUpdated).toLocaleDateString()}</span>
          </div>
          {contentData.comarReferences && (
            <div className="flex gap-2">
              {contentData.comarReferences.map(ref => (
                <Badge key={ref} variant="outline" className="text-xs">
                  COMAR {ref}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div 
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {documents.map((document) => {
          const isViewed = viewedDocuments.includes(document.id);
          
          return (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getDocumentIcon(document.type)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{document.title}</h4>
                        {document.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                        {isViewed && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      {document.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {document.description}
                        </p>
                      )}
                      {document.size && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Size: {document.size}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(document)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    
                    {document.type !== 'link' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDocument(document);
                          handleDownload();
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && selectedDocument.type === 'html' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-5xl h-[85vh] flex flex-col shadow-xl">
            <CardHeader className="border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle>{selectedDocument.title}</CardTitle>
                  {selectedDocument.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedDocument.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Save PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedDocument(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1">
              {renderDocumentContent()}
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  );
};