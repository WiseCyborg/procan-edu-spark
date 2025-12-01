import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Download, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useGuestSession } from '@/hooks/useGuestSession';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import QRCode from 'react-qr-code';

interface Certificate {
  id: string;
  certificate_number: string;
  badge_name: string;
  recipient_name: string | null;
  recipient_email: string;
  course_title: string;
  issue_date: string;
  verification_url: string;
}

const ConsumerCertificates = () => {
  const { user } = useAuth();
  const { sessionId, email: guestEmail } = useGuestSession();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course');
  const { toast } = useToast();
  
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        let query = supabase
          .from('consumer_certificates')
          .select('*')
          .order('issue_date', { ascending: false });

        // Filter by user email or session
        if (user?.email) {
          query = query.eq('recipient_email', user.email);
        } else if (guestEmail) {
          query = query.eq('recipient_email', guestEmail);
        } else {
          // No way to identify user, can't fetch certificates
          setIsLoading(false);
          return;
        }

        const { data, error } = await query;

        if (error) throw error;

        setCertificates(data || []);
      } catch (error) {
        console.error('Error fetching certificates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificates();
  }, [user?.email, guestEmail]);

  const handleDownload = async (cert: Certificate) => {
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();

      // Background
      pdf.setFillColor(249, 250, 251);
      pdf.rect(0, 0, width, height, 'F');

      // Border
      pdf.setDrawColor(5, 150, 105);
      pdf.setLineWidth(2);
      pdf.rect(10, 10, width - 20, height - 20);

      // Header
      pdf.setFillColor(5, 150, 105);
      pdf.rect(0, 0, width, 25, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ProCann Edu', width / 2, 15, { align: 'center' });

      // Certificate Title
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(18);
      pdf.text('Certificate of Completion', width / 2, 40, { align: 'center' });

      // Badge
      pdf.setFillColor(254, 243, 199);
      pdf.roundedRect(width / 2 - 60, 50, 120, 20, 5, 5, 'F');
      pdf.setTextColor(146, 64, 14);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cert.badge_name, width / 2, 63, { align: 'center' });

      // Recipient
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('This certificate is awarded to', width / 2, 80, { align: 'center' });

      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cert.recipient_name || 'Cannabis Consumer', width / 2, 92, { align: 'center' });

      // Course Info
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('For completing the course', width / 2, 105, { align: 'center' });

      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cert.course_title, width / 2, 115, { align: 'center' });

      // Certificate Details
      const issueDate = new Date(cert.issue_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Certificate Number: ${cert.certificate_number}`, width / 2, 135, { align: 'center' });
      pdf.text(`Issue Date: ${issueDate}`, width / 2, 142, { align: 'center' });

      // Verification URL
      pdf.setTextColor(37, 99, 235);
      pdf.setFontSize(9);
      pdf.text(`Verify at: ${cert.verification_url}`, width / 2, 150, { align: 'center' });

      // Footer
      pdf.setTextColor(156, 163, 175);
      pdf.setFontSize(8);
      pdf.text('Maryland\'s Trusted Cannabis Education Provider', width / 2, height - 15, { align: 'center' });

      // Save PDF
      pdf.save(`${cert.certificate_number}-certificate.pdf`);

      toast({
        title: "PDF Downloaded",
        description: "Your certificate has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCopyLink = async (cert: Certificate) => {
    try {
      await navigator.clipboard.writeText(cert.verification_url);
      setCopiedId(cert.id);
      toast({
        title: "Link Copied",
        description: "Verification link copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link",
        variant: "destructive"
      });
    }
  };

  const handleShare = (cert: Certificate) => {
    const text = `I just earned my ${cert.badge_name} certificate from ProCann Edu! Verify it here: ${cert.verification_url}`;
    
    if (navigator.share) {
      navigator.share({
        title: cert.badge_name,
        text: text,
        url: cert.verification_url,
      }).catch(() => {
        // Fallback to copy
        handleCopyLink(cert);
      });
    } else {
      // Fallback to copy
      handleCopyLink(cert);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Award className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">No Certificates Yet</h1>
          <p className="text-muted-foreground">
            Complete a consumer education course to earn your first certificate!
          </p>
          <Button onClick={() => window.location.href = '/consumer-education'}>
            Browse Free Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Your Certificates</h1>
          <p className="text-muted-foreground">
            Congratulations on completing your cannabis education!
          </p>
        </div>

        <div className="grid gap-6">
          {certificates.map((cert) => {
            const completedDate = new Date(cert.issue_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            const userName = cert.recipient_name || 'Cannabis Consumer';

            return (
              <Card key={cert.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                        <Award className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{cert.badge_name}</CardTitle>
                        <CardDescription className="text-base mt-1">
                          {cert.course_title}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Recipient:</span>
                      <p className="font-medium text-foreground">{userName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Issue Date:</span>
                      <p className="font-medium text-foreground">{completedDate}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground">Certificate Number:</span>
                      <p className="font-mono font-medium text-foreground">{cert.certificate_number}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleDownload(cert)}
                      variant="default"
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      onClick={() => handleCopyLink(cert)}
                      variant="outline"
                      className="flex-1"
                    >
                      {copiedId === cert.id ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleShare(cert)}
                      variant="outline"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Anyone can verify at: <a href={cert.verification_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{cert.verification_url}</a>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center pt-8">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/consumer-education'}
          >
            Explore More Courses
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsumerCertificates;
