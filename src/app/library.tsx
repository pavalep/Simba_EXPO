import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {
  LibraryScreen,
  type LibraryTab,
} from '../components/screens/LibraryScreen';

export default function LibraryRoute() {
  const {tab} = useLocalSearchParams<{tab?: LibraryTab}>();
  return <LibraryScreen initialTab={tab ?? 'podcasts'} />;
}
