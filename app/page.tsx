import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Premium Header with backdrop blur */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <LogoWithText size="sm" />
            <div className="flex items-center gap-3">
              <Link
                href="/onboarding"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/onboarding"
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section with Gradient Background */}
        <div className="relative overflow-hidden bg-gradient-to-b from-red-50/30 via-white to-white">
          {/* Subtle animated gradient orbs */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-200/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-orange-200/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left: Content */}
              <div className="space-y-6">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-gray-700">
                    Trusted by 500+ restaurants
                  </span>
                </div>

                {/* Headline */}
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
                    Your inventory.
                    <br />
                    <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                      Always in control.
                    </span>
                  </h1>
                  <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
                    Track stock, manage costs, and reduce waste with the most intuitive inventory management platform for restaurants.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/onboarding"
                    className="group inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30"
                  >
                    Start free trial
                    <svg className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    href="/onboarding"
                    className="inline-flex items-center justify-center px-6 py-3 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-all hover:bg-gray-50"
                  >
                    Watch demo
                  </Link>
                </div>

                {/* Social Proof */}
                <div className="flex items-center gap-6 pt-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-orange-400 border-2 border-white" />
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5 mb-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">
                      Loved by 500+ restaurants
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Premium Dashboard Preview */}
              <div className="relative">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 blur-2xl" />

                <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                  {/* Dashboard Header */}
                  <div className="bg-gradient-to-r from-red-600 to-red-500 px-5 py-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold">Live Dashboard</h3>
                      <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                        Real-time
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold">€12,450</span>
                      <span className="text-xs opacity-90">current inventory</span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 p-5 bg-gray-50">
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                      <div className="text-xl font-bold text-gray-900">156</div>
                      <div className="text-xs text-gray-600 mt-0.5">Items tracked</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                      <div className="text-xl font-bold text-green-600">+12%</div>
                      <div className="text-xs text-gray-600 mt-0.5">vs last month</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Chicken Breast</div>
                          <div className="text-xs text-gray-500">+50kg added</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">€225</div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Olive Oil</div>
                          <div className="text-xs text-gray-500">+15L added</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">€120</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Everything you need to manage inventory
              </h2>
              <p className="text-lg text-gray-600">
                Powerful features designed for modern restaurants
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  ),
                  title: 'Lightning fast',
                  description: 'Real-time updates across all devices. See changes instantly.',
                  color: 'from-yellow-500 to-orange-500',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  ),
                  title: 'Secure & private',
                  description: 'Bank-level encryption. Your data is always protected.',
                  color: 'from-green-500 to-emerald-500',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  ),
                  title: 'Smart analytics',
                  description: 'Track trends, identify patterns, make better decisions.',
                  color: 'from-blue-500 to-indigo-500',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group relative bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {feature.icon}
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-500 py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to transform your inventory?
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Join hundreds of restaurants saving time and reducing waste.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center px-8 py-3.5 bg-white hover:bg-gray-50 text-red-600 font-semibold rounded-lg transition-all shadow-xl hover:shadow-2xl"
            >
              Start your free trial
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="mt-5 text-white/80 text-sm">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <LogoWithText size="sm" />
            <p className="text-sm text-gray-600 mt-3 md:mt-0">
              © 2026 Nigiri Vibes. Built with care for restaurants.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
