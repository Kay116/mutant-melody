const CONFIG = {
  tempoMap:           { 1: 0.55, 2: 0.3, 3: 0.16 },
  defaultTempo:       0.3,
  noteDurationRatio:  0.82,  // fraction of a tempo step each note sounds for
  pianoRollHeight:    72,    // px
  rollDrawDelayMs:    40,    // wait for layout before measuring canvas width
  resizeDebounceMs:   150,
  playingClearDelayMs: 400,  // how long the "playing" highlight lingers after the last note
};
