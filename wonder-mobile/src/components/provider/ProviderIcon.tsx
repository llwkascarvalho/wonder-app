import { MaterialIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

import { theme } from '../../styles/theme';

export type ProviderIconName = ComponentProps<typeof MaterialIcons>['name'];

type ProviderIconProps = {
  name: ProviderIconName;
  color?: string;
  size?: number;
};

export function ProviderIcon({ name, color = theme.colors.primary, size = 22 }: ProviderIconProps) {
  return <MaterialIcons name={name} color={color} size={size} />;
}
