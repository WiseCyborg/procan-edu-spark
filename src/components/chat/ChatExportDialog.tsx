import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, FileJson, Image } from 'lucide-react';
import { useChatExport } from '@/hooks/useChatExport';
import { toast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  pageContext?: {
    route: string;
    title: string;
    description: string;
  };
}

interface ChatExportDialogProps {
  messages: Message[];
  children: React.ReactNode;
}

export const ChatExportDialog: React.FC<ChatExportDialogProps> = ({
  messages,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportTitle, setExportTitle] = useState('');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'txt' | 'json'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  
  const { exportToPDF, exportToTXT, exportToJSON } = useChatExport();

  const handleExport = async () => {
    if (messages.length === 0) {
      toast({
        title: "No Messages",
        description: "There are no messages to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    
    try {
      const title = exportTitle || `Chat Conversation - ${new Date().toLocaleDateString()}`;
      
      switch (exportFormat) {
        case 'pdf':
          exportToPDF(messages, title);
          break;
        case 'txt':
          exportToTXT(messages, title);
          break;
        case 'json':
          exportToJSON(messages, title);
          break;
      }

      toast({
        title: "Export Successful",
        description: `Conversation exported as ${exportFormat.toUpperCase()}`,
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your conversation.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    {
      value: 'pdf',
      label: 'PDF Document',
      description: 'Formatted document with proper styling',
      icon: FileText,
      recommended: true
    },
    {
      value: 'txt',
      label: 'Text File',
      description: 'Plain text format for basic sharing',
      icon: FileText,
      recommended: false
    },
    {
      value: 'json',
      label: 'JSON Data',
      description: 'Structured data for developers',
      icon: FileJson,
      recommended: false
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Conversation
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Messages</span>
                <Badge variant="secondary">{messages.length}</Badge>
              </div>
              
              {messages.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  From {messages[0].timestamp.toLocaleDateString()} to{' '}
                  {messages[messages.length - 1].timestamp.toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Title */}
          <div className="space-y-2">
            <Label htmlFor="export-title">Export Title (Optional)</Label>
            <Input
              id="export-title"
              placeholder="Chat Conversation"
              value={exportTitle}
              onChange={(e) => setExportTitle(e.target.value)}
            />
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <div className="grid gap-2">
              {formatOptions.map((option) => (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-all hover:bg-muted/50 ${
                    exportFormat === option.value
                      ? 'ring-2 ring-primary bg-muted/30'
                      : ''
                  }`}
                  onClick={() => setExportFormat(option.value as any)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <option.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{option.label}</span>
                          {option.recommended && (
                            <Badge variant="default" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || messages.length === 0}
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};