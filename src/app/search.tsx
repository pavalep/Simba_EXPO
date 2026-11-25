import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {SearchScreen} from '../components/screens/SearchScreen';

export default function SearchRoute() {
  const {q} = useLocalSearchParams<{q?: string}>();
  return <SearchScreen initialQuery={q ?? ''} />;
}
