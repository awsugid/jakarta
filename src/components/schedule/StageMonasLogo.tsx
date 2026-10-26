import React from "react";

export function StageMonasLogo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className || ""}`}>
      {/* 1:1 Vector Extraction of Monas Hexagon Logo from Banner-Felicia.svg */}
      <svg
        viewBox="70 56 92 104"
        className="w-12 h-14 shrink-0 drop-shadow-[0_0_12px_rgba(161,102,255,0.4)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Hexagon Outline */}
        <path
          d="M115.7 58L159.261 83.1499V133.45L115.7 158.6L72.1393 133.45V83.1499L115.7 58Z"
          strokeWidth="3.36"
          stroke="#A166FF"
        />
        {/* Clouds & Accent Filigree */}
        <path
          d="M155.789 123.109C155.987 123.224 156.194 123.374 156.376 123.521C156.088 124.001 155.878 124.56 155.845 125.188C155.845 125.385 155.727 125.684 155.255 125.307C153.562 124.283 149.965 123.418 149.115 128.141C149.312 128.259 149.753 128.59 149.941 128.968L149.469 129.321C149.036 128.81 147.887 128 146.754 128.85C146.478 129.046 145.951 129.605 146.045 130.266C146.084 130.423 146.021 130.714 145.455 130.62C144.983 130.659 144.038 131.117 144.038 132.628C144.078 133.258 144.487 134.516 145.809 134.517H154.9V135.107H145.809C145.021 135.107 143.424 134.611 143.329 132.628C143.29 131.959 143.637 130.479 145.337 129.912C145.534 129.086 146.423 127.527 148.406 127.904C148.721 125.858 150.532 122.308 155.255 124.48C155.304 124.151 155.466 123.647 155.789 123.109Z"
          fill="#A166FF"
        />
        <path
          d="M84.5078 129.772C84.7605 130.244 84.8657 130.744 84.8828 131.086C85.6306 131.243 87.126 131.983 87.126 133.684C87.1257 135.384 85.7093 136.163 84.8828 136.281H77.7988V135.572H84.8828C86.2992 135.006 86.4965 134.077 86.418 133.684C86.229 132.172 85.2369 131.794 84.7646 131.794C84.2925 131.794 84.1748 131.558 84.1748 131.439C84.2051 130.954 84.1049 130.554 83.9375 130.229L84.5078 129.772Z"
          fill="#A166FF"
        />
        {/* Monas Monument Flame tip & Obelisk */}
        <path
          d="M117.59 83.0316C118.377 82.52 119.975 81.048 120.07 79.2532C120.148 77.8363 119.597 75.7111 116.055 70.6339C115.898 70.4371 115.465 70.1615 114.993 70.6338C111.096 75.593 110.905 77.8363 110.984 79.2532C111.078 81.048 112.676 82.52 113.463 83.0316"
          strokeWidth="1.26"
          stroke="#A166FF"
        />
        <path
          d="M121.484 118.103L119.123 93.4252M111.92 93.4252L109.913 89.0564V84.9238H115.462H115.58H121.13V89.0564L119.123 93.4252M119.123 93.4252H115.58H115.462H111.92M121.13 89.0564H115.58H115.462H109.913M109.559 118.103L111.92 93.4252"
          strokeWidth="1.26"
          strokeLinecap="round"
          stroke="#FFFFFF"
        />
        {/* Pedestal & Platform */}
        <path
          d="M124.557 133.804C125.029 131.245 126.682 125.444 129.516 122.705M129.516 122.705H130.579L133.294 119.398H115.701H115.347H97.7539L100.47 122.705H101.532M129.516 122.705H115.701H115.347H101.532M106.491 133.804C106.019 131.245 104.366 125.444 101.532 122.705"
          strokeWidth="1.26"
          strokeLinecap="round"
          stroke="#FFFFFF"
        />
        <path
          d="M111.744 133.568V128.402C111.744 127.828 112.558 125.532 115.116 125.303H115.929C118.487 125.532 119.301 127.828 119.301 128.402V133.568"
          strokeWidth="0.7"
          strokeLinecap="round"
          stroke="#A166FF"
        />
        {/* Star Accents */}
        <rect x="142.386" y="81.625" width="0.8" height="6.14" fill="#A166FF" />
        <rect x="145.928" y="84.2266" width="0.8" height="6.14" transform="rotate(90 145.928 84.2266)" fill="#A166FF" />
        <rect x="87.5977" y="85.6348" width="0.8" height="5.2" fill="#FFFFFF" />
        <rect x="90.6699" y="87.748" width="0.8" height="5.2" transform="rotate(90 90.6699 87.748)" fill="#FFFFFF" />
      </svg>

      {/* Typography: AWS COMMUNITY DAY 2026 JAKARTA */}
      <div className="flex flex-col text-white font-bold leading-[1.12] tracking-[0.09em] uppercase select-none">
        <span className="text-sm sm:text-base text-white/95">AWS</span>
        <span className="text-sm sm:text-base text-white/95">COMMUNITY</span>
        <span className="text-sm sm:text-base text-white/95">DAY 2026</span>
        <span className="text-xs sm:text-sm text-purple-300 font-semibold tracking-[0.14em]">JAKARTA</span>
      </div>
    </div>
  );
}
