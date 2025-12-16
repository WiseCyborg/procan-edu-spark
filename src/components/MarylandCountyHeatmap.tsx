import { Card, CardContent } from '@/components/ui/card';
import { MapPin, CheckCircle } from 'lucide-react';

// All 24 Maryland counties
const marylandCounties = [
  'Allegany', 'Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert',
  'Caroline', 'Carroll', 'Cecil', 'Charles', 'Dorchester',
  'Frederick', 'Garrett', 'Harford', 'Howard', 'Kent',
  'Montgomery', 'Prince George\'s', 'Queen Anne\'s', 'Somerset', 'St. Mary\'s',
  'Talbot', 'Washington', 'Wicomico', 'Worcester'
];

export const MarylandCountyHeatmap = () => {
  return (
    <section className="py-16 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">
            Available Throughout Maryland
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            ProCann Edu training is available to cannabis professionals in all 24 Maryland counties
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Visual Map Representation */}
          <Card className="bg-gradient-to-br from-primary/5 to-accent/10">
            <CardContent className="p-8">
              <div className="relative">
                <div className="aspect-square max-w-md mx-auto bg-card rounded-lg shadow-inner p-8 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-24 w-24 text-primary mx-auto mb-4" />
                    <h4 className="text-2xl font-bold mb-2">24 / 24 Counties</h4>
                    <p className="text-muted-foreground">
                      Complete statewide coverage
                    </p>
                    <p className="text-sm text-muted-foreground mt-4">
                      Training available wherever you are in Maryland
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* County List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            <p className="text-sm text-muted-foreground mb-4">
              Our COMAR-aligned training program is available to dispensary employees throughout the state:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {marylandCounties.map((county) => (
                <Card key={county} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-medium">{county}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              County-level training statistics will be displayed as our community grows.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
