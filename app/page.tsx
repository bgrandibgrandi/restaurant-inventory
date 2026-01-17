'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Premium Header with backdrop blur */}
      <header className="sticky top-0 z-50 border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <LogoWithText size="md" />
            <div className="flex items-center gap-3">
              <button
                onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section with Gradient Background */}
        <div className="relative overflow-hidden">
          {/* Subtle animated gradient orbs */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left: Content */}
              <div className="space-y-8">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full shadow-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">
                    Trusted by restaurants worldwide
                  </span>
                </div>

                {/* Headline */}
                <div>
                  <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                    Your inventory.
                    <br />
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Always in control.
                    </span>
                  </h1>
                  <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                    Track stock, manage costs, and reduce waste with the most intuitive inventory management platform for restaurants.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30"
                  >
                    <svg className="mr-2 w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                    <svg className="ml-2 w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>

                {/* Social Proof */}
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                        i === 1 ? 'from-blue-400 to-indigo-500' :
                        i === 2 ? 'from-indigo-400 to-purple-500' :
                        i === 3 ? 'from-purple-400 to-pink-500' :
                        'from-pink-400 to-rose-500'
                      } border-2 border-white shadow-sm`} />
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">
                      Loved by restaurants worldwide
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Premium Dashboard Preview */}
              <div className="relative">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 blur-2xl" />

                <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden">
                  {/* Dashboard Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Live Dashboard</h3>
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                        Real-time
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">€12,450</span>
                      <span className="text-sm opacity-90">current inventory</span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 p-6 bg-gradient-to-br from-gray-50/50 to-blue-50/30">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200/50">
                      <div className="text-2xl font-bold text-gray-900">156</div>
                      <div className="text-sm text-gray-600 mt-1">Items tracked</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200/50">
                      <div className="text-2xl font-bold text-green-600">+12%</div>
                      <div className="text-sm text-gray-600 mt-1">vs last month</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 rounded-xl border border-blue-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Chicken Breast</div>
                          <div className="text-xs text-gray-500">+50kg added</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-900">€225</div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50/50 to-pink-50/30 rounded-xl border border-purple-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Olive Oil</div>
                          <div className="text-xs text-gray-500">+15L added</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-900">€120</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-white/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Everything you need to manage inventory
              </h2>
              <p className="text-xl text-gray-600">
                Powerful features designed for modern restaurants
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  ),
                  title: 'Lightning fast',
                  description: 'Real-time updates across all devices. See changes instantly.',
                  color: 'from-yellow-400 to-orange-500',
                  bgColor: 'from-yellow-50 to-orange-50',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  ),
                  title: 'Secure & private',
                  description: 'Bank-level encryption. Your data is always protected.',
                  color: 'from-green-400 to-emerald-500',
                  bgColor: 'from-green-50 to-emerald-50',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  ),
                  title: 'Smart analytics',
                  description: 'Track trends, identify patterns, make better decisions.',
                  color: 'from-blue-400 to-indigo-500',
                  bgColor: 'from-blue-50 to-indigo-50',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group relative bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 hover:border-gray-300/50 hover:shadow-xl transition-all duration-300"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 shadow-lg`}>
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {feature.icon}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent)]" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to transform your inventory?
            </h2>
            <p className="text-xl text-white/90 mb-10">
              Join restaurants worldwide saving time and reducing waste.
            </p>
            <button
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="inline-flex items-center px-10 py-4 bg-white hover:bg-gray-50 text-blue-600 font-bold rounded-xl transition-all shadow-2xl hover:shadow-3xl text-lg"
            >
              Start with Google
              <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <p className="mt-6 text-white/80 text-sm">
              No credit card required • Free forever • Secure with Google
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-sm border-t border-gray-200/50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <LogoWithText size="md" />
            <p className="text-sm text-gray-600 mt-4 md:mt-0">
              © 2026 Nigiri Vibes. Built with care for restaurants.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
