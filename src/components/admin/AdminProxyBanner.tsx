import { useAdminProxy } from '@/contexts/AdminProxyContext';
import { Button } from '@/components/ui/button';
import { UserX, Eye, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const AdminProxyBanner = () => {
  const { isProxyMode, proxySession, endProxySession, isLoading } = useAdminProxy();

  if (!isProxyMode || !proxySession) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5" />
          <span className="font-semibold">Admin Proxy Mode</span>
          <span className="text-amber-800">|</span>
          <span>
            Viewing as <strong>{proxySession.targetUserName}</strong>{' '}
            <span className="text-amber-800">({proxySession.targetUserEmail})</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm text-amber-800">
            <Clock className="h-4 w-4" />
            <span>Started {formatDistanceToNow(proxySession.startedAt, { addSuffix: true })}</span>
          </div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={endProxySession}
            disabled={isLoading}
            className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
          >
            <UserX className="h-4 w-4 mr-1" />
            {isLoading ? 'Ending...' : 'Exit Proxy Mode'}
          </Button>
        </div>
      </div>
    </div>
  );
};
