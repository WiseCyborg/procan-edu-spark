import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Users, 
  Bot, 
  MessageSquare, 
  BarChart3,
  Shield,
  Zap,
  Eye
} from 'lucide-react';
import { HoverCallout } from '@/components/ui/hover-callout';
import { SimpleFAQManager } from '@/components/faq/SimpleFAQManager';
import { EnhancedDraggableChat } from '@/components/chat/EnhancedDraggableChat';

const EnhancedAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock chat messages for demo
  const mockMessages = [
    {
      id: '1',
      content: 'Welcome to the enhanced admin dashboard! You can now pin messages anywhere on screen.',
      isUser: false,
      timestamp: new Date(),
      pageContext: {
        route: '/admin-dashboard',
        title: 'Enhanced Admin Dashboard',
        description: 'Advanced admin controls with intelligent features'
      }
    },
    {
      id: '2',
      content: 'The new navigation system adapts based on user roles automatically.',
      isUser: false,
      timestamp: new Date(),
      pageContext: {
        route: '/admin-dashboard',
        title: 'Enhanced Admin Dashboard',
        description: 'Role-based navigation system'
      }
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Shield className="h-8 w-8 text-primary" />
            <span>Enhanced Admin Dashboard</span>
            <Badge variant="secondary" className="ml-2">
              <Zap className="h-3 w-3 mr-1" />
              Enhanced
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-2">
            Advanced platform management with intelligent features
          </p>
        </div>
        
        <div className="flex space-x-2">
          <HoverCallout content="View real-time platform analytics and performance metrics">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </HoverCallout>
          
          <HoverCallout content="Access system settings and configuration options">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </HoverCallout>
        </div>
      </div>

      {/* Enhanced Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <HoverCallout content="Intelligent navigation that adapts based on user roles, ensuring users only see relevant options for their permission level.">
          <Card className="hover:shadow-lg transition-shadow cursor-help">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Smart Navigation</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Role-Based</div>
              <p className="text-xs text-muted-foreground">
                Intelligent menu adaptation
              </p>
            </CardContent>
          </Card>
        </HoverCallout>

        <HoverCallout content="Enhanced draggable chat system with persistent positioning, collision detection, and improved visual feedback.">
          <Card className="hover:shadow-lg transition-shadow cursor-help">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enhanced Chat</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Draggable</div>
              <p className="text-xs text-muted-foreground">
                Pin messages anywhere
              </p>
            </CardContent>
          </Card>
        </HoverCallout>

        <HoverCallout content="Comprehensive hover call-out system that provides contextual help and guidance throughout the platform.">
          <Card className="hover:shadow-lg transition-shadow cursor-help">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hover Guidance</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Contextual</div>
              <p className="text-xs text-muted-foreground">
                Interactive help system
              </p>
            </CardContent>
          </Card>
        </HoverCallout>

        <HoverCallout content="AI-powered FAQ management system that automatically generates suggestions based on user behavior and platform changes.">
          <Card className="hover:shadow-lg transition-shadow cursor-help">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto FAQ</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">AI-Powered</div>
              <p className="text-xs text-muted-foreground">
                Smart content generation
              </p>
            </CardContent>
          </Card>
        </HoverCallout>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <HoverCallout content="Platform overview with key metrics and status indicators">
              <span>Overview</span>
            </HoverCallout>
          </TabsTrigger>
          <TabsTrigger value="users">
            <HoverCallout content="User management with role-based access control">
              <span>Users</span>
            </HoverCallout>
          </TabsTrigger>
          <TabsTrigger value="faq">
            <HoverCallout content="AI-powered FAQ management and content generation">
              <span>FAQ Manager</span>
            </HoverCallout>
          </TabsTrigger>
          <TabsTrigger value="features">
            <HoverCallout content="Showcase of enhanced platform features and capabilities">
              <span>Features</span>
            </HoverCallout>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Enhanced user management with role-based permissions and smart authentication.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Active Users</span>
                    <Badge>1,247</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Pending Verifications</span>
                    <Badge variant="outline">23</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>AI Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  AI-powered FAQ generation and smart content management.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">FAQ Suggestions</span>
                    <Badge>12</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Auto-Generated</span>
                    <Badge variant="outline">8</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Communication</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Enhanced chat system with draggable messages and contextual help.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Pinned Messages</span>
                    <Badge>5</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Chats</span>
                    <Badge variant="outline">15</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                This section would contain the enhanced user management interface with role-based controls.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Roles
                </Button>
                <Button variant="outline" className="justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Security Settings
                </Button>
                <Button variant="outline" className="justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  User Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="space-y-4">
          <SimpleFAQManager />
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Platform Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">✨ What's New</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Badge variant="secondary">NEW</Badge>
                    <span>Intelligent role-based navigation system</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Badge variant="secondary">NEW</Badge>
                    <span>Enhanced draggable chat with persistent positioning</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Badge variant="secondary">NEW</Badge>
                    <span>Comprehensive hover call-out system</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Badge variant="secondary">NEW</Badge>
                    <span>AI-powered FAQ management</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Badge variant="secondary">NEW</Badge>
                    <span>Enhanced play controls with better UX</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">🎯 Key Benefits</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Improved user experience with contextual guidance</li>
                  <li>• Streamlined navigation based on user permissions</li>
                  <li>• Enhanced productivity with draggable message system</li>
                  <li>• Automated content management reduces manual work</li>
                  <li>• Better accessibility and mobile responsiveness</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Draggable Chat Demo */}
      <EnhancedDraggableChat 
        messages={mockMessages}
        currentPageContext={{
          route: '/admin-dashboard',
          title: 'Enhanced Admin Dashboard',
          description: 'Advanced admin controls with intelligent features'
        }}
      />
    </div>
  );
};

export default EnhancedAdminDashboard;