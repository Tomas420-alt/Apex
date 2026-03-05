import React from 'react';
import { Text } from 'react-native';
import {
  DollarSign,
  Euro,
  PoundSterling,
  IndianRupee,
  JapaneseYen,
} from 'lucide-react-native';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  DollarSign,
  Euro,
  PoundSterling,
  IndianRupee,
  JapaneseYen,
};

interface CurrencyIconProps {
  iconName: string | null;
  fallbackSymbol: string;
  size: number;
  color: string;
  strokeWidth?: number;
}

export function CurrencyIcon({ iconName, fallbackSymbol, size, color, strokeWidth = 2 }: CurrencyIconProps) {
  if (iconName && ICON_MAP[iconName]) {
    const Icon = ICON_MAP[iconName];
    return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
  }

  return (
    <Text style={{ fontSize: size, fontWeight: '700', color }}>
      {fallbackSymbol}
    </Text>
  );
}
