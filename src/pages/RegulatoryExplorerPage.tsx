import { RegulationExplorer } from '@/components/regulatory/RegulationExplorer';
import { RegulationChangeAlert } from '@/components/regulatory/RegulationChangeAlert';

const RegulatoryExplorerPage = () => {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Maryland Cannabis Regulations</h1>
        <p className="text-lg text-muted-foreground">
          Explore and stay updated on Maryland COMAR regulations
        </p>
      </div>

      <div className="mb-6">
        <RegulationChangeAlert />
      </div>

      <RegulationExplorer />
    </div>
  );
};

export default RegulatoryExplorerPage;
