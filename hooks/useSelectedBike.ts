import { createContext, useContext, useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface BikeContextValue {
  bikes: any[];
  selectedBikeIndex: number;
  setSelectedBikeIndex: (index: number) => void;
  selectedBike: any | null;
  selectedBikeId: Id<'bikes'> | null;
  highlightTaskId: string | null;
  setHighlightTaskId: (id: string | null) => void;
}

const BikeContext = createContext<BikeContextValue | null>(null);

export const BikeProvider = BikeContext.Provider;

export function useBikeContext(): BikeContextValue {
  const ctx = useContext(BikeContext);
  if (!ctx) throw new Error('useBikeContext must be used within BikeProvider');
  return ctx;
}

/** Hook to create the bike context value — call once in _layout or root */
export function useSelectedBikeState() {
  const rawBikes = useQuery(api.bikes.list) ?? [];
  // Reverse so first-added bike appears first (API returns desc)
  const bikes = useMemo(() => [...rawBikes].reverse(), [rawBikes]);

  const [selectedBikeIndex, setSelectedBikeIndex] = useState(0);
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);

  const selectedBike = bikes[selectedBikeIndex] ?? bikes[0] ?? null;
  const selectedBikeId = selectedBike?._id ?? null;

  return useMemo(() => ({
    bikes,
    selectedBikeIndex,
    setSelectedBikeIndex,
    selectedBike,
    selectedBikeId,
    highlightTaskId,
    setHighlightTaskId,
  }), [bikes, selectedBikeIndex, selectedBike, selectedBikeId, highlightTaskId]);
}
