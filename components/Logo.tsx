export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Modern minimalist sushi/nigiri inspired logo with blue/indigo gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="topGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>
      <rect x="20" y="45" width="60" height="25" rx="12" fill="url(#logoGradient)" />
      <ellipse cx="50" cy="35" rx="25" ry="15" fill="url(#topGradient)" />
      <circle cx="40" cy="32" r="3" fill="white" opacity="0.7" />
      <circle cx="60" cy="32" r="3" fill="white" opacity="0.7" />
    </svg>
  );
}

export function LogoWithText({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { logo: "h-6 w-6", text: "text-base", gap: "gap-1.5" },
    md: { logo: "h-8 w-8", text: "text-xl", gap: "gap-2" },
    lg: { logo: "h-12 w-12", text: "text-3xl", gap: "gap-3" },
  };

  return (
    <div className={`flex items-center ${sizes[size].gap}`}>
      <Logo className={sizes[size].logo} />
      <div className={`${sizes[size].text} font-bold`}>
        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Nigiri</span>
        <span className="text-gray-900"> Vibes</span>
      </div>
    </div>
  );
}
