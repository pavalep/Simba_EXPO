// ─── Infrastructure API Barrel ──────────────────────────────────────────────
// All 10 isolated public media & metadata adapters (ADAPTER_RULE compliant).

export * from './apiClient';
export * from './adapterErrors';
export * as audiusApi from './audius/adapter';
export * as internetArchiveApi from './internetArchive/adapter';
export * as iptvApi from './iptv/adapter';
export * as jamendoApi from './jamendo/adapter';
export * as librivoxApi from './librivox/adapter';
export * as musicbrainzApi from './musicbrainz/adapter';
export * as podcastIndexApi from './podcastIndex/adapter';
export * as radioBrowserApi from './radioBrowser/adapter';
export * as tvmazeApi from './tvmaze/adapter';
export * as weatherApi from './weather/adapter';
