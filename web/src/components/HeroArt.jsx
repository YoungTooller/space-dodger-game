export default function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg viewBox="0 0 320 380" className="hero-svg">
        <polygon className="rock rock-a" points="40,60 58,48 76,58 80,80 62,96 42,86 34,70" />
        <polygon className="rock rock-b" points="230,40 260,32 284,52 278,80 250,90 226,68" />
        <polygon className="rock rock-c" points="248,200 268,192 282,208 276,228 256,232 244,216" />
        <g className="drone" transform="translate(60,220)">
          <polygon points="14,8 0,0 0,16" />
          <polygon points="72,8 86,0 86,16" />
          <rect x="14" y="0" width="58" height="16" rx="5" />
          <circle cx="43" cy="8" r="4" className="drone-eye" />
        </g>
        <g className="ship" transform="translate(150,150)">
          <polygon className="ship-nose" points="14,0 0,20 28,20" />
          <rect className="ship-body" x="0" y="14" width="28" height="32" rx="6" />
          <rect className="ship-flame" x="3" y="42" width="6" height="10" />
          <rect className="ship-flame" x="19" y="42" width="6" height="10" />
        </g>
        <circle className="shield-ring" cx="230" cy="290" r="16" />
      </svg>
    </div>
  );
}
