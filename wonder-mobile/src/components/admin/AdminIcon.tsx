import { MaterialIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

import { theme } from '../../styles/theme';

export type AdminIconName = ComponentProps<typeof MaterialIcons>['name'];

type AdminIconProps = {
  name: AdminIconName;
  color?: string;
  size?: number;
};

export function AdminIcon({ name, color = theme.colors.primary, size = 24 }: AdminIconProps) {
  return <MaterialIcons name={name} color={color} size={size} />;
}
