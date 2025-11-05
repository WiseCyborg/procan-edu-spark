import { QuickSearchResult } from '@/hooks/useQuickSearch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  User, 
  Award, 
  FileText,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Users
} from 'lucide-react';

interface ContextInfoPanelProps {
  selectedItem: QuickSearchResult | null;
}

export const ContextInfoPanel = ({ selectedItem }: ContextInfoPanelProps) => {
  if (!selectedItem) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div className="space-y-3">
          <div className="text-4xl">👈</div>
          <p className="text-sm text-muted-foreground">
            Select an item from the main workspace<br />to view details here
          </p>
        </div>
      </div>
    );
  }

  const renderOrganizationDetails = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">{selectedItem.primary_text}</h3>
        <p className="text-sm text-muted-foreground">{selectedItem.secondary_text}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Seats Used</span>
            <span className="font-medium">15/20</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Certified</span>
            <span className="font-medium">12 employees</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Spent</span>
            <span className="font-medium">$3,500</span>
          </div>
        </CardContent>
      </Card>

      <div>
        <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
        <div className="space-y-1">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Users className="h-4 w-4 mr-2" />
            View All Employees
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <DollarSign className="h-4 w-4 mr-2" />
            Add Training Seats
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Mail className="h-4 w-4 mr-2" />
            Contact Manager
          </Button>
        </div>
      </div>
    </div>
  );

  const renderUserDetails = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">{selectedItem.primary_text}</h3>
        <p className="text-sm text-muted-foreground">{selectedItem.secondary_text}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Training Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">85%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Module</span>
            <span className="font-medium">15 of 18</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Certificate</span>
            <Badge variant="outline" className="bg-success/10 text-success">Valid</Badge>
          </div>
        </CardContent>
      </Card>

      <div>
        <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
        <div className="space-y-1">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <FileText className="h-4 w-4 mr-2" />
            View Progress
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Mail className="h-4 w-4 mr-2" />
            Send Reminder
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Award className="h-4 w-4 mr-2" />
            Issue Certificate
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCertificateDetails = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">{selectedItem.primary_text}</h3>
        <Badge variant="outline" className="bg-success/10 text-success">{selectedItem.status}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Certificate Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Holder</span>
            <span className="font-medium">{selectedItem.secondary_text}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Issued</span>
            <span className="font-medium">Jan 15, 2025</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expires</span>
            <span className="font-medium">Jan 15, 2027</span>
          </div>
        </CardContent>
      </Card>

      <div>
        <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
        <div className="space-y-1">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <FileText className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Mail className="h-4 w-4 mr-2" />
            Email to Holder
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4">
      {selectedItem.type === 'organization' && renderOrganizationDetails()}
      {selectedItem.type === 'user' && renderUserDetails()}
      {selectedItem.type === 'certificate' && renderCertificateDetails()}
      {selectedItem.type === 'application' && (
        <div className="text-sm text-muted-foreground">
          Application details view
        </div>
      )}
    </div>
  );
};
