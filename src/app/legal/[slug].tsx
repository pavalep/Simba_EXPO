import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {LegalScreen} from '../../components/screens/LegalScreen';

export default function LegalRoute() {
  const {slug} = useLocalSearchParams<{slug?: string}>();
  return <LegalScreen slug={slug ?? 'about'} />;
}
