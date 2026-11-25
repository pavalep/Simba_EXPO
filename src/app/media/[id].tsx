import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {MediaDetailScreen} from '../../components/screens/MediaDetailScreen';

export default function MediaDetailRoute() {
  const {id} = useLocalSearchParams<{id: string}>();
  return <MediaDetailScreen id={id} />;
}
