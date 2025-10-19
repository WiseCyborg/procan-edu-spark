export const CertificateWatermark = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      <div 
        className="text-red-600/30 transform -rotate-45 text-6xl font-bold whitespace-nowrap select-none"
        style={{
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div className="text-center">
          <div>SAMPLE CERTIFICATE</div>
          <div className="text-2xl mt-2">NOT VALID FOR COMPLIANCE</div>
        </div>
      </div>
    </div>
  );
};
