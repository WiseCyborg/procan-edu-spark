import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Download, Share2, Copy, Check, Printer } from 'lucide-react';
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
  const certNumber = searchParams.get('cert');
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

        const userEmail = user?.email || guestEmail;

        if (userEmail && certNumber) {
          query = query.or(`recipient_email.eq.${userEmail},certificate_number.eq.${certNumber}`);
        } else if (userEmail) {
          query = query.eq('recipient_email', userEmail);
        } else if (certNumber) {
          query = query.eq('certificate_number', certNumber);
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
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();  // 297
      const H = pdf.internal.pageSize.getHeight(); // 210

      // === BACKGROUND ===
      pdf.setFillColor(252, 250, 245); // warm cream
      pdf.rect(0, 0, W, H, 'F');

      // === OUTER BORDER (double line) ===
      pdf.setDrawColor(15, 82, 51); // dark green
      pdf.setLineWidth(3);
      pdf.rect(8, 8, W - 16, H - 16);
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(15, 82, 51);
      pdf.rect(12, 12, W - 24, H - 24);

      // === CORNER ORNAMENTS (simple cross marks) ===
      const drawCorner = (x: number, y: number) => {
        pdf.setDrawColor(15, 82, 51);
        pdf.setLineWidth(1);
        pdf.line(x - 6, y, x + 6, y);
        pdf.line(x, y - 6, x, y + 6);
      };
      drawCorner(20, 20);
      drawCorner(W - 20, 20);
      drawCorner(20, H - 20);
      drawCorner(W - 20, H - 20);

      // === DARK GREEN HEADER BAND ===
      pdf.setFillColor(15, 82, 51);
      pdf.rect(12, 12, W - 24, 28, 'F');

      // === HEADER TEXT ===
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text('MARYLAND CANNABIS ADMINISTRATION', W / 2, 22, { align: 'center' });
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ProCann Edu', W / 2, 34, { align: 'center' });

      // === SEAL CIRCLE (left side) ===
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(15, 82, 51);
      pdf.setLineWidth(1.5);
      pdf.circle(50, 110, 22, 'FD');
      pdf.setFillColor(15, 82, 51);
      pdf.circle(50, 110, 18, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROCANN', 50, 106, { align: 'center' });
      pdf.text('EDU', 50, 112, { align: 'center' });
      pdf.text('CERTIFIED', 50, 118, { align: 'center' });

      // === CERTIFICATE OF COMPLETION ===
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('CERTIFICATE OF COMPLETION', W / 2, 56, { align: 'center' });

      // thin gold divider line
      pdf.setDrawColor(180, 140, 60);
      pdf.setLineWidth(0.5);
      pdf.line(W / 2 - 60, 59, W / 2 + 60, 59);

      // === THIS CERTIFIES THAT ===
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text('This certifies that', W / 2, 70, { align: 'center' });

      // === RECIPIENT NAME ===
      pdf.setTextColor(15, 82, 51);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cert.recipient_name || 'Cannabis Consumer', W / 2, 88, { align: 'center' });

      // name underline
      pdf.setDrawColor(15, 82, 51);
      pdf.setLineWidth(0.5);
      const nameWidth = pdf.getTextWidth(cert.recipient_name || 'Cannabis Consumer');
      pdf.line(W / 2 - nameWidth / 2, 91, W / 2 + nameWidth / 2, 91);

      // === HAS SUCCESSFULLY COMPLETED ===
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text('has successfully completed the course', W / 2, 101, { align: 'center' });

      // === COURSE TITLE ===
      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cert.course_title, W / 2, 113, { align: 'center' });

      // === BADGE PILL ===
      const badgeText = cert.badge_name;
      const badgeW = 80;
      pdf.setFillColor(240, 253, 244);
      pdf.setDrawColor(15, 82, 51);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(W / 2 - badgeW / 2, 118, badgeW, 10, 3, 3, 'FD');
      pdf.setTextColor(15, 82, 51);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(badgeText, W / 2, 125, { align: 'center' });

      // === BOTTOM SECTION: 3 columns ===
      const issueDate = new Date(cert.issue_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      // Left col — Issue Date
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(W / 2 - 80, 148, W / 2 - 20, 148);
      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(issueDate, W / 2 - 50, 145, { align: 'center' });
      pdf.setTextColor(120, 120, 120);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('DATE OF COMPLETION', W / 2 - 50, 153, { align: 'center' });

      // Center col — Cert Number
      pdf.setDrawColor(200, 200, 200);
      pdf.line(W / 2 - 20, 148, W / 2 + 20, 148);
      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cert.certificate_number, W / 2, 145, { align: 'center' });
      pdf.setTextColor(120, 120, 120);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('CERTIFICATE NUMBER', W / 2, 153, { align: 'center' });

      // Right col — ProCann Edu Director
      pdf.setDrawColor(200, 200, 200);
      pdf.line(W / 2 + 20, 148, W / 2 + 80, 148);
      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ProCann Edu', W / 2 + 50, 145, { align: 'center' });
      pdf.setTextColor(120, 120, 120);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('ISSUING ORGANIZATION', W / 2 + 50, 153, { align: 'center' });

      // === VERIFY URL ===
      pdf.setTextColor(37, 99, 235);
      pdf.setFontSize(7);
      pdf.text(`Verify: ${cert.verification_url}`, W / 2, 163, { align: 'center' });

      // === FOOTER DISCLAIMER ===
      pdf.setFillColor(15, 82, 51);
      pdf.rect(12, H - 24, W - 24, 12, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        'This is a Certificate of Completion for consumer education only. This is NOT a Maryland RVT certification and does not satisfy dispensary employee compliance requirements.',
        W / 2, H - 16, { align: 'center' }
      );

      pdf.save(`${cert.certificate_number}-certificate.pdf`);

      toast({ title: 'Certificate Downloaded', description: 'Your certificate PDF is ready.' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Download Failed', description: 'Failed to generate PDF. Please try again.', variant: 'destructive' });
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
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          {certNumber && (
            <p className="text-muted-foreground text-sm">Generating your certificate...</p>
          )}
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    if (certNumber) {
      return (
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            <p className="text-muted-foreground text-sm">Generating your certificate...</p>
          </div>
        </div>
      );
    }

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
        {/* Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300 text-center">
            <strong>Important:</strong> These are Certificates of Completion for consumer education. 
            These are <strong>NOT</strong> Maryland RVT employee certifications and do not satisfy dispensary compliance requirements.
          </p>
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Your Completion Badges</h1>
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
              <Card key={cert.id} className="overflow-hidden print:shadow-none print:border print:border-gray-900">
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

                  <div className="flex flex-wrap gap-2 pt-4">
                    <Button
                      onClick={() => handleDownload(cert)}
                      variant="default"
                      className="flex-1 min-w-[120px]"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      onClick={() => window.print()}
                      variant="outline"
                      className="flex-1 min-w-[120px]"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      onClick={() => handleCopyLink(cert)}
                      variant="outline"
                      className="flex-1 min-w-[120px]"
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
