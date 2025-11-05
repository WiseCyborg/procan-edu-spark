import { useState, useEffect } from 'react';
import { Search, User, Building2, Award, FileText, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuickSearch, QuickSearchResult } from '@/hooks/useQuickSearch';
import { cn } from '@/lib/utils';

interface QuickLookupPanelProps {
  onSelectResult?: (result: QuickSearchResult) => void;
}

export const QuickLookupPanel = ({ onSelectResult }: QuickLookupPanelProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { results, loading, search, clearResults } = useQuickSearch();

  useEffect(() => {
    const timer = setTimeout(() => {
      search(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="h-4 w-4" />;
      case 'organization': return <Building2 className="h-4 w-4" />;
      case 'certificate': return <Award className="h-4 w-4" />;
      case 'application': return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'valid': case 'active': case 'approved': return 'bg-success/10 text-success';
      case 'expiring': case 'pending': return 'bg-warning/10 text-warning';
      case 'expired': case 'rejected': return 'bg-destructive/10 text-destructive';
      case 'revoked': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Search className="h-4 w-4" />
          Quick Lookup
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Search users, organizations, certificates
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Type name, email, cert #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => onSelectResult?.(result)}
              className={cn(
                "w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors",
                "flex items-start gap-3 group"
              )}
            >
              <div className="mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors">
                {getIcon(result.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{result.primary_text}</p>
                  {result.status && (
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(result.status))}>
                      {result.status}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{result.secondary_text}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{result.type}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {searchTerm.length > 0 && !loading && results.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No results found for "{searchTerm}"
        </div>
      )}

      <div className="text-xs text-muted-foreground pt-2 border-t">
        <p>💡 Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-muted">Ctrl+K</kbd> to focus search</p>
      </div>
    </div>
  );
};
