import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {CatalogueBrowseScreen} from '../../components/screens/CatalogueBrowseScreen';

export default function CatalogueLaneRoute() {
  const {lane} = useLocalSearchParams<{lane?: string}>();
  return <CatalogueBrowseScreen laneId={lane ?? 'movies'} />;
}
