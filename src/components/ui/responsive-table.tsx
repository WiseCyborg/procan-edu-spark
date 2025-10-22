import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from './card';
import { Table } from './table';

interface Column {
  id: string;
  header: string;
  cell: (row: any) => React.ReactNode;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  mobileCardView?: boolean;
  children?: React.ReactNode;
}

export const ResponsiveTable = ({ 
  columns, 
  data, 
  mobileCardView = true,
  children 
}: ResponsiveTableProps) => {
  const isMobile = useIsMobile();
  
  if (isMobile && mobileCardView && data.length > 0) {
    return (
      <div className="space-y-4" role="list">
        {data.map((row, idx) => (
          <Card key={row.id || idx} role="listitem">
            <CardContent className="pt-6">
              {columns.map(col => (
                <div key={col.id} className="flex justify-between py-2 border-b last:border-0">
                  <span className="font-medium text-sm">{col.header}:</span>
                  <span className="text-sm">{col.cell(row)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return <>{children}</>;
};
