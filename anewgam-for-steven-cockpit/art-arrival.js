/* Public preview projection; original and provider link must not be conflated. */
(function (root) {
  const record = {
    id: 'art-sha256-236a027aba3c842f9a82fbd8021f1e320e297852a7361e06a128b40077a4477a',
    title: 'Art Airport · The memory wall', date: '2026-09-17',
    caption: 'A picture of pictures, lanternlight, and two companions. Uploaded-image preview; the co-submitted Grok link is not byte-verified.',
    alt: 'Two seated companions face a wall covered in small art plates and connecting threads; a lantern and soft toys sit nearby.',
    tags: ['art-plane', 'art-airport', 'art-tele', 'memory-wall', 'lantern', 'night', 'worlds'],
    provenance: 'User-provided PNG → separately hashed 160px WebP thumbnail. Descriptive title and thematic associations are assistant interpretations.',
    status: 'uploaded-image preview · provider identity unresolved',
    thumbnail: 'art-arrival-preview.webp', image: 'art-arrival-preview.webp',
    art: {
      originalSha256: '236a027aba3c842f9a82fbd8021f1e320e297852a7361e06a128b40077a4477a',
      originalBytes: 4158321, mime: 'image/png', originalDimensions: [1568,1264],
      originalPublished: false, authorityEffect: 'none',
      previewSha256: 'cbea3178697e54e5616950a20b8aac014c7465b25235a2e65883b2482e232779',
      previewDimensions: [160,129], previewTransform: 'RGB; fit 160x160; WebP quality 52, method 6',
      sourceLinks: [{url: 'https://assets.grok.com/users/d04206d6-ae5b-4e6e-8788-54c1ae6a26c1/generated/5667a2b5-7cff-49bd-8abf-0aae862df1e5/image.jpg',
        relation: 'co-submitted; byte equivalence unverified', observedStatus: 403, observedAt: '2026-09-17T21:10:42.469849+00:00'}],
      relations: [
        {targetId: 'orig-crossing', type: 'proposed-theme', basis: 'Lanternlight connects the mood, not asset identity or shared origin.'},
        {targetId: 'pf-06', type: 'proposed-story', basis: 'Two companion figures suggest a story link; this is not a character-identity claim.'}
      ]
    }
  };
  if (typeof module === 'object' && module.exports) module.exports = record;
  else { const items = root.__libraryItems || (root.__libraryItems = []); if (!items.some(x => x.id === record.id)) items.push(record); }
})(typeof window === 'object' ? window : globalThis);
