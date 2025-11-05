import { useState, useEffect } from 'react';

interface ABTestVariant<T> {
  id: string;
  value: T;
  weight?: number;
}

interface ABTestConfig<T> {
  testName: string;
  variants: ABTestVariant<T>[];
  storageKey?: string;
}

export const useABTest = <T,>({ testName, variants, storageKey }: ABTestConfig<T>) => {
  const key = storageKey || `ab_test_${testName}`;
  
  const [variant, setVariant] = useState<ABTestVariant<T>>(() => {
    // Check if user already has a variant assigned
    const stored = localStorage.getItem(key);
    if (stored) {
      const storedData = JSON.parse(stored);
      const foundVariant = variants.find(v => v.id === storedData.variantId);
      if (foundVariant) return foundVariant;
    }

    // Assign new variant based on weights
    const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const v of variants) {
      random -= (v.weight || 1);
      if (random <= 0) {
        return v;
      }
    }
    
    return variants[0];
  });

  useEffect(() => {
    // Store the assigned variant
    const data = {
      variantId: variant.id,
      testName,
      assignedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  }, [variant, key, testName]);

  const trackConversion = (conversionName: string) => {
    const conversionsKey = `${key}_conversions`;
    const conversions = JSON.parse(localStorage.getItem(conversionsKey) || '[]');
    conversions.push({
      conversionName,
      variantId: variant.id,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(conversionsKey, JSON.stringify(conversions));
  };

  return {
    variant: variant.value,
    variantId: variant.id,
    trackConversion,
  };
};
