import { useFocusEffect } from '@react-navigation/native';
import { RefObject, useCallback } from 'react';
import { FlatList, ScrollView } from 'react-native';

/** Reabre uma tela no início sem alterar filtros, dados ou o scroll dos modais. */
export function useResetScrollOnFocus(ref: RefObject<ScrollView | FlatList<any> | null>) {
  useFocusEffect(useCallback(() => {
    const scrollable = ref.current;
    if (!scrollable) return;
    if ('scrollToOffset' in scrollable) scrollable.scrollToOffset({ offset: 0, animated: false });
    else scrollable.scrollTo({ y: 0, animated: false });
  }, [ref]));
}
