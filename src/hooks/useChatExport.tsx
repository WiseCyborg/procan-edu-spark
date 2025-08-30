import { useCallback } from 'react';
import jsPDF from 'jspdf';

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

export const useChatExport = () => {
  const exportToPDF = useCallback((messages: Message[], title: string = 'Chat Conversation') => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;
    
    // Title
    doc.setFontSize(16);
    doc.text(title, 20, yPosition);
    yPosition += 15;
    
    // Date
    doc.setFontSize(10);
    doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 20;
    
    // Messages
    doc.setFontSize(12);
    messages.forEach((message, index) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      
      const timestamp = message.timestamp.toLocaleTimeString();
      const sender = message.isUser ? 'You' : 'Charm AI';
      
      // Sender and timestamp
      doc.setFont(undefined, 'bold');
      doc.text(`${sender} (${timestamp}):`, 20, yPosition);
      yPosition += 8;
      
      // Message content
      doc.setFont(undefined, 'normal');
      const splitText = doc.splitTextToSize(message.content, 170);
      doc.text(splitText, 20, yPosition);
      yPosition += splitText.length * 5 + 10;
    });
    
    doc.save(`chat-conversation-${new Date().toISOString().split('T')[0]}.pdf`);
  }, []);
  
  const exportToTXT = useCallback((messages: Message[], title: string = 'Chat Conversation') => {
    let content = `${title}\n`;
    content += `Exported on: ${new Date().toLocaleString()}\n`;
    content += '='.repeat(50) + '\n\n';
    
    messages.forEach((message) => {
      const timestamp = message.timestamp.toLocaleString();
      const sender = message.isUser ? 'You' : 'Charm AI';
      content += `${sender} (${timestamp}):\n${message.content}\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);
  
  const exportToJSON = useCallback((messages: Message[], title: string = 'Chat Conversation') => {
    const exportData = {
      title,
      exportDate: new Date().toISOString(),
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.isUser,
        timestamp: msg.timestamp.toISOString(),
        pageContext: msg.pageContext
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-conversation-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);
  
  return {
    exportToPDF,
    exportToTXT,
    exportToJSON
  };
};