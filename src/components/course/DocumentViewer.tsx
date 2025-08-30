import React, { useState } from 'react';
import { Download, Eye, FileText, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

interface Document {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: 'pdf' | 'doc' | 'image' | 'link';
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

  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(document.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      onDocumentDownload?.(document.id);
      
      toast({
        title: "Download Complete",
        description: `${document.title} has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'doc':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'image':
        return <Eye className="w-5 h-5 text-green-500" />;
      case 'link':
        return <ExternalLink className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
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
                        onClick={() => handleDownload(document)}
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

      {/* PDF Viewer Modal */}
      {selectedDocument && selectedDocument.type === 'pdf' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">{selectedDocument.title}</h3>
              <Button
                variant="outline"
                onClick={() => setSelectedDocument(null)}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={selectedDocument.url}
                className="w-full h-full border-0"
                title={selectedDocument.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};