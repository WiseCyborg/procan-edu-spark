import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Calendar as CalendarIcon,
  Users,
  Building2,
  Award,
  FileText,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SearchFilter {
  query: string;
  entity: 'users' | 'organizations' | 'certificates' | 'courses' | 'all';
  status: string[];
  dateRange: { from: Date | null; to: Date | null };
  customFilters: Record<string, any>;
}

interface SearchResult {
  id: string;
  type: 'user' | 'organization' | 'certificate' | 'course';
  title: string;
  subtitle: string;
  status: string;
  metadata: Record<string, any>;
  relevance: number;
}

export const EnhancedSearchFilter = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<SearchFilter>({
    query: '',
    entity: 'all',
    status: [],
    dateRange: { from: null, to: null },
    customFilters: {}
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const entityOptions = [
    { value: 'all', label: 'All Entities', icon: Search },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'organizations', label: 'Organizations', icon: Building2 },
    { value: 'certificates', label: 'Certificates', icon: Award },
    { value: 'courses', label: 'Courses', icon: FileText }
  ];

  const statusOptions = {
    users: ['active', 'inactive', 'pending', 'verified'],
    organizations: ['active', 'pending', 'suspended', 'approved'],
    certificates: ['valid', 'expired', 'revoked', 'expiring'],
    courses: ['active', 'draft', 'archived']
  };

  useEffect(() => {
    if (filters.query.length > 2 || activeFilters.length > 0) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [filters, activeFilters]);

  const performSearch = async () => {
    setLoading(true);
    
    try {
      let allResults: SearchResult[] = [];

      // Search users
      if (filters.entity === 'all' || filters.entity === 'users') {
        const { data: users } = await supabase
          .from('profiles')
          .select('*')
          .ilike('first_name', `%${filters.query}%`);

        if (users) {
          const userResults: SearchResult[] = users.map(user => ({
            id: user.id,
            type: 'user',
            title: `${user.first_name} ${user.last_name}`,
            subtitle: user.organization || 'No organization',
            status: user.is_verified ? 'verified' : 'pending',
            metadata: user,
            relevance: calculateRelevance(filters.query, `${user.first_name} ${user.last_name}`)
          }));
          allResults = [...allResults, ...userResults];
        }
      }

      // Search organizations
      if (filters.entity === 'all' || filters.entity === 'organizations') {
        const { data: organizations } = await supabase
          .from('organizations')
          .select('*')
          .ilike('name', `%${filters.query}%`);

        if (organizations) {
          const orgResults: SearchResult[] = organizations.map(org => ({
            id: org.id,
            type: 'organization',
            title: org.name,
            subtitle: `${org.contact_person} - ${org.contact_email}`,
            status: org.admin_approved ? 'approved' : 'pending',
            metadata: org,
            relevance: calculateRelevance(filters.query, org.name)
          }));
          allResults = [...allResults, ...orgResults];
        }
      }

      // Search certificates
      if (filters.entity === 'all' || filters.entity === 'certificates') {
        const { data: certificates } = await supabase
          .from('certificates')
          .select('*')
          .ilike('certificate_number', `%${filters.query}%`);

        if (certificates) {
          const certResults: SearchResult[] = certificates.map(cert => ({
            id: cert.id,
            type: 'certificate',
            title: cert.certificate_number,
            subtitle: `Issued: ${format(new Date(cert.issue_date), 'MMM dd, yyyy')}`,
            status: cert.is_revoked ? 'revoked' : 'valid',
            metadata: cert,
            relevance: calculateRelevance(filters.query, cert.certificate_number)
          }));
          allResults = [...allResults, ...certResults];
        }
      }

      // Search courses
      if (filters.entity === 'all' || filters.entity === 'courses') {
        const { data: courses } = await supabase
          .from('courses')
          .select('*')
          .ilike('title', `%${filters.query}%`)
          .not('id', 'in', GHOST_COURSE_IDS_PG_LIST);

        if (courses) {
          const courseResults: SearchResult[] = courses.map(course => ({
            id: course.id,
            type: 'course',
            title: course.title,
            subtitle: course.description || 'No description',
            status: course.is_active ? 'active' : 'archived',
            metadata: course,
            relevance: calculateRelevance(filters.query, course.title)
          }));
          allResults = [...allResults, ...courseResults];
        }
      }

      // Apply status filters
      if (filters.status.length > 0) {
        allResults = allResults.filter(result => filters.status.includes(result.status));
      }

      // Apply date range filter
      if (filters.dateRange.from || filters.dateRange.to) {
        allResults = allResults.filter(result => {
          const createdAt = new Date(result.metadata.created_at);
          if (filters.dateRange.from && createdAt < filters.dateRange.from) return false;
          if (filters.dateRange.to && createdAt > filters.dateRange.to) return false;
          return true;
        });
      }

      // Sort by relevance
      allResults.sort((a, b) => b.relevance - a.relevance);

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to perform search",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateRelevance = (query: string, text: string): number => {
    if (!query || !text) return 0;
    
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();
    
    if (lowerText === lowerQuery) return 100;
    if (lowerText.startsWith(lowerQuery)) return 90;
    if (lowerText.includes(lowerQuery)) return 70;
    
    // Calculate character similarity
    const similarity = calculateSimilarity(lowerQuery, lowerText);
    return Math.floor(similarity * 100);
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    return (longer.length - editDistance(longer, shorter)) / longer.length;
  };

  const editDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const addFilter = (type: string, value: string) => {
    const filterKey = `${type}:${value}`;
    if (!activeFilters.includes(filterKey)) {
      setActiveFilters(prev => [...prev, filterKey]);
    }
  };

  const removeFilter = (filterKey: string) => {
    setActiveFilters(prev => prev.filter(f => f !== filterKey));
  };

  const clearAllFilters = () => {
    setFilters({
      query: '',
      entity: 'all',
      status: [],
      dateRange: { from: null, to: null },
      customFilters: {}
    });
    setActiveFilters([]);
  };

  const exportResults = () => {
    const csvContent = [
      ['Type', 'Title', 'Subtitle', 'Status', 'Relevance'],
      ...results.map(result => [
        result.type,
        result.title,
        result.subtitle,
        result.status,
        result.relevance.toString()
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="h-4 w-4" />;
      case 'organization': return <Building2 className="h-4 w-4" />;
      case 'certificate': return <Award className="h-4 w-4" />;
      case 'course': return <FileText className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'valid':
      case 'verified':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
      case 'expired':
      case 'revoked':
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'draft':
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Enhanced Search & Filter</h2>
        <div className="flex space-x-2">
          <Button onClick={exportResults} variant="outline" disabled={results.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          <Button onClick={clearAllFilters} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Search Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Search across all entities..."
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="w-full"
              />
            </div>
            <Select 
              value={filters.entity} 
              onValueChange={(value: any) => setFilters(prev => ({ ...prev, entity: value }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center">
                      <option.icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters */}
          <Tabs defaultValue="status" className="w-full">
            <TabsList>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="date">Date Range</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-3">
              {filters.entity !== 'all' && statusOptions[filters.entity as keyof typeof statusOptions] && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Filters</label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions[filters.entity as keyof typeof statusOptions].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={status}
                          checked={filters.status.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters(prev => ({ ...prev, status: [...prev.status, status] }));
                            } else {
                              setFilters(prev => ({ ...prev, status: prev.status.filter(s => s !== status) }));
                            }
                          }}
                        />
                        <label htmlFor={status} className="text-sm capitalize">{status}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="date" className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">From Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.from ? format(filters.dateRange.from, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.from || undefined}
                        onSelect={(date) => setFilters(prev => ({ 
                          ...prev, 
                          dateRange: { ...prev.dateRange, from: date || null }
                        }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium">To Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.to ? format(filters.dateRange.to, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.to || undefined}
                        onSelect={(date) => setFilters(prev => ({ 
                          ...prev, 
                          dateRange: { ...prev.dateRange, to: date || null }
                        }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Custom filters will be available based on the selected entity type and your organization's specific needs.
              </p>
            </TabsContent>
          </Tabs>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Active Filters</label>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map(filter => (
                  <Badge key={filter} variant="secondary" className="flex items-center">
                    {filter}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => removeFilter(filter)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Search Results ({results.length})</span>
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map(result => (
                <div key={`${result.type}-${result.id}`} className="border rounded-lg p-4 hover:bg-accent/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getEntityIcon(result.type)}
                      <div>
                        <h3 className="font-semibold">{result.title}</h3>
                        <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                      <Badge variant="outline">
                        {result.relevance}% match
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {result.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filters.query.length > 0 ? 'No results found for your search' : 'Enter a search term to begin'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};