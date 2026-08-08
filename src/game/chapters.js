export const CHAPTERS = [
  {
    id: 'trail-remembers', number: 1, titleKey: 'chapter1Title', subtitleKey: 'chapter1Subtitle',
    missionKey: 'chapter1Mission', conclusionKey: 'chapter1Conclusion',
    landmarksKey: 'chapter1Landmarks', endT: 0.955,
    evidence: [
      { id: 'alloy-marker', anchor: 'firstStone', previewRange: 38, range: 22, hold: 1.1,
        aheadKey: 'evidence1Ahead', nearbyKey: 'evidence1Nearby', searchKey: 'evidence1Search',
        focusKey: 'evidence1Focus', recordedKey: 'evidence1Recorded' },
      { id: 'gate-axis', anchor: 'gateAxis', previewRange: 44, range: 24, hold: 1.3,
        aheadKey: 'evidence2Ahead', nearbyKey: 'evidence2Nearby', searchKey: 'evidence2Search',
        focusKey: 'evidence2Focus', recordedKey: 'evidence2Recorded' },
      { id: 'water-gap', anchor: 'waterGap', previewRange: 38, range: 21, hold: 1.2,
        aheadKey: 'evidence3Ahead', nearbyKey: 'evidence3Nearby', searchKey: 'evidence3Search',
        focusKey: 'evidence3Focus', recordedKey: 'evidence3Recorded' },
    ],
    surveyAnchors: [0.08, 0.22, 0.34, 0.49, 0.66, 0.76, 0.84, 0.93],
  },
  {
    id: 'flooded-threshold', number: 2, titleKey: 'chapter2Title', subtitleKey: 'chapter2Subtitle',
    missionKey: 'chapter2Mission', conclusionKey: 'chapter2Conclusion',
    landmarksKey: 'chapter2Landmarks', endT: 0.955,
    evidence: [
      { id: 'drowned-datum', anchor: 'drownedDatum', previewRange: 40, range: 22, hold: 1.15,
        aheadKey: 'drownedAhead', nearbyKey: 'drownedNearby', searchKey: 'drownedSearch', focusKey: 'drownedFocus', recordedKey: 'drownedRecorded' },
      { id: 'threshold-drain', anchor: 'thresholdDrain', previewRange: 38, range: 20, hold: 1.2,
        aheadKey: 'drainAhead', nearbyKey: 'drainNearby', searchKey: 'drainSearch', focusKey: 'drainFocus', recordedKey: 'drainRecorded' },
      { id: 'reflection-notch', anchor: 'reflectionNotch', previewRange: 44, range: 24, hold: 1.35,
        aheadKey: 'reflectionAhead', nearbyKey: 'reflectionNearby', searchKey: 'reflectionSearch', focusKey: 'reflectionFocus', recordedKey: 'reflectionRecorded' },
    ],
    surveyAnchors: [0.06, 0.18, 0.31, 0.45, 0.61, 0.73, 0.84, 0.93],
  },
  {
    id: 'listening-ridge', number: 3, titleKey: 'chapter3Title', subtitleKey: 'chapter3Subtitle',
    missionKey: 'chapter3Mission', conclusionKey: 'chapter3Conclusion',
    landmarksKey: 'chapter3Landmarks', endT: 0.955,
    evidence: [
      { id: 'west-resonator', anchor: 'westResonator', previewRange: 46, range: 25, hold: 1.2,
        aheadKey: 'westAhead', nearbyKey: 'westNearby', searchKey: 'westSearch', focusKey: 'westFocus', recordedKey: 'westRecorded' },
      { id: 'east-resonator', anchor: 'eastResonator', previewRange: 46, range: 25, hold: 1.2,
        aheadKey: 'eastAhead', nearbyKey: 'eastNearby', searchKey: 'eastSearch', focusKey: 'eastFocus', recordedKey: 'eastRecorded' },
      { id: 'listening-axis', anchor: 'listeningAxis', previewRange: 42, range: 23, hold: 1.4,
        aheadKey: 'axisAhead', nearbyKey: 'axisNearby', searchKey: 'axisSearch', focusKey: 'axisFocus', recordedKey: 'axisRecorded' },
    ],
    surveyAnchors: [0.07, 0.19, 0.33, 0.47, 0.60, 0.72, 0.85, 0.94],
  },
  {
    id: 'source-engine', number: 4, titleKey: 'chapter4Title', subtitleKey: 'chapter4Subtitle',
    missionKey: 'chapter4Mission', conclusionKey: 'chapter4Conclusion',
    landmarksKey: 'chapter4Landmarks', endT: 0.955,
    evidence: [
      { id: 'intake-ring', anchor: 'intakeRing', previewRange: 48, range: 26, hold: 1.2,
        aheadKey: 'intakeAhead', nearbyKey: 'intakeNearby', searchKey: 'intakeSearch', focusKey: 'intakeFocus', recordedKey: 'intakeRecorded' },
      { id: 'balance-channel', anchor: 'balanceChannel', previewRange: 44, range: 24, hold: 1.3,
        aheadKey: 'balanceAhead', nearbyKey: 'balanceNearby', searchKey: 'balanceSearch', focusKey: 'balanceFocus', recordedKey: 'balanceRecorded' },
      { id: 'source-order', anchor: 'sourceOrder', previewRange: 42, range: 22, hold: 1.4,
        aheadKey: 'sourceAhead', nearbyKey: 'sourceNearby', searchKey: 'sourceSearch', focusKey: 'sourceFocus', recordedKey: 'sourceRecorded' },
    ],
    surveyAnchors: [0.06, 0.20, 0.35, 0.50, 0.64, 0.77, 0.87, 0.94],
  },
];

export const chapterById = (id) => CHAPTERS.find((chapter) => chapter.id === id) || CHAPTERS[0];
