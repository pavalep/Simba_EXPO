import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {SavedScreen} from '../components/screens/SavedScreen';

export default function SavedRoute() {
  const {tab} = useLocalSearchParams<{tab?: 'bookmarks' | 'history'}>();
  return <SavedScreen initialTab={tab === 'history' ? 'history' : 'bookmarks'} />;
}
