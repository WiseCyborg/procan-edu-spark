import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface CountyData {
  county_name: string;
  students_trained: number;
  dispensaries_served: number;
  avg_pass_rate: number;
}

// Mock data for demonstration - replace with actual database query when table exists
const mockCountyData: CountyData[] = [
  { county_name: 'Baltimore', students_trained: 285, dispensaries_served: 18, avg_pass_rate: 89 },
  { county_name: 'Montgomery', students_trained: 245, dispensaries_served: 15, avg_pass_rate: 91 },
  { county_name: 'Prince George\'s', students_trained: 220, dispensaries_served: 14, avg_pass_rate: 87 },
  { county_name: 'Anne Arundel', students_trained: 185, dispensaries_served: 12, avg_pass_rate: 88 },
  { county_name: 'Howard', students_trained: 165, dispensaries_served: 10, avg_pass_rate: 92 },
  { county_name: 'Baltimore City', students_trained: 310, dispensaries_served: 20, avg_pass_rate: 86 },
  { county_name: 'Harford', students_trained: 125, dispensaries_served: 8, avg_pass_rate: 90 },
  { county_name: 'Frederick', students_trained: 145, dispensaries_served: 9, avg_pass_rate: 89 },
  { county_name: 'Charles', students_trained: 95, dispensaries_served: 6, avg_pass_rate: 85 },
  { county_name: 'Carroll', students_trained: 85, dispensaries_served: 5, avg_pass_rate: 88 },
  { county_name: 'Washington', students_trained: 105, dispensaries_served: 7, avg_pass_rate: 87 },
  { county_name: 'Allegany', students_trained: 65, dispensaries_served: 4, avg_pass_rate: 86 },
  { county_name: 'St. Mary\'s', students_trained: 75, dispensaries_served: 5, avg_pass_rate: 90 },
  { county_name: 'Calvert', students_trained: 55, dispensaries_served: 4, avg_pass_rate: 89 },
  { county_name: 'Cecil', students_trained: 70, dispensaries_served: 5, avg_pass_rate: 87 },
  { county_name: 'Wicomico', students_trained: 90, dispensaries_served: 6, avg_pass_rate: 88 },
  { county_name: 'Worcester', students_trained: 80, dispensaries_served: 5, avg_pass_rate: 91 },
  { county_name: 'Dorchester', students_trained: 45, dispensaries_served: 3, avg_pass_rate: 85 },
  { county_name: 'Somerset', students_trained: 40, dispensaries_served: 3, avg_pass_rate: 86 },
  { county_name: 'Talbot', students_trained: 50, dispensaries_served: 3, avg_pass_rate: 90 },
  { county_name: 'Queen Anne\'s', students_trained: 48, dispensaries_served: 3, avg_pass_rate: 89 },
  { county_name: 'Caroline', students_trained: 42, dispensaries_served: 3, avg_pass_rate: 87 },
  { county_name: 'Kent', students_trained: 38, dispensaries_served: 2, avg_pass_rate: 88 },
  { county_name: 'Garrett', students_trained: 35, dispensaries_served: 2, avg_pass_rate: 86 },
];

const getColorForCount = (count: number) => {
  if (count > 200) return 'hsl(var(--primary))';
  if (count > 150) return 'hsl(142 76% 36%)';
  if (count > 100) return 'hsl(142 71% 45%)';
  if (count > 50) return 'hsl(142 69% 58%)';
  return 'hsl(142 76% 79%)';
};

export const MarylandCountyHeatmap = () => {
  const { data: countyData } = useQuery({
    queryKey: ['county-analytics'],
    queryFn: async () => {
      // Try to fetch from database, fallback to mock data
      try {
        const { data, error } = await supabase
          .from('maryland_county_analytics')
          .select('*')
          .order('total_students', { ascending: false });
        
        if (error) throw error;
        
        // Map database columns to our interface
        const mappedData: CountyData[] = data?.map((item: any) => ({
          county_name: item.county_name,
          students_trained: item.total_students || 0,
          dispensaries_served: item.active_dispensaries || 0,
          avg_pass_rate: Math.round(item.pass_rate || 0)
        })) || [];
        
        return mappedData.length > 0 ? mappedData : mockCountyData;
      } catch {
        return mockCountyData;
      }
    }
  });

  return (
    <section className="py-16 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">
            Serving Every Corner of Maryland
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            ProCann Edu proudly trains cannabis professionals in all 24 Maryland counties
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Visual Map Representation */}
          <Card className="bg-gradient-to-br from-primary/5 to-accent/10">
            <CardContent className="p-8">
              <div className="relative">
                <div className="aspect-square max-w-md mx-auto bg-card rounded-lg shadow-inner p-8 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-24 w-24 text-primary mx-auto mb-4 animate-pulse" />
                    <h4 className="text-2xl font-bold mb-2">24 / 24 Counties</h4>
                    <p className="text-muted-foreground">
                      Complete statewide coverage
                    </p>
                    <div className="mt-6 flex justify-center gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorForCount(250) }} />
                        <span className="text-xs">High</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorForCount(125) }} />
                        <span className="text-xs">Medium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorForCount(50) }} />
                        <span className="text-xs">Growing</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* County Stats List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {countyData?.map((county) => (
              <Card key={county.county_name} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: getColorForCount(county.students_trained) }}
                      />
                      <div className="min-w-0">
                        <h4 className="font-semibold truncate">{county.county_name} County</h4>
                        <p className="text-sm text-muted-foreground">
                          {county.students_trained} agents • {county.dispensaries_served} dispensaries
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-lg font-bold text-primary">
                        {county.avg_pass_rate}%
                      </div>
                      <div className="text-xs text-muted-foreground">Pass Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
