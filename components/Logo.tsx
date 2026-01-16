export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Modern minimalist sushi/nigiri inspired logo */}
      <rect x="20" y="45" width="60" height="25" rx="12" fill="#DC2626" />
      <ellipse cx="50" cy="35" rx="25" ry="15" fill="#EF4444" />
      <circle cx="40" cy="32" r="3" fill="white" opacity="0.6" />
      <circle cx="60" cy="32" r="3" fill="white" opacity="0.6" />
    </svg>
  );
}

export function LogoWithText({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { logo: "h-6 w-6", text: "text-base" },
    md: { logo: "h-8 w-8", text: "text-xl" },
    lg: { logo: "h-12 w-12", text: "text-3xl" },
  };

  return (
    <div className="flex items-center gap-2">
      <Logo className={sizes[size].logo} />
      <div className={`${sizes[size].text} font-bold`}>
        <span className="text-red-600">Nigiri</span>
        <span className="text-gray-900"> Vibes</span>
      </div>
    </div>
  );
}
