'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import {
  LayoutDashboard,
  Users,
  QrCode,
  Award,
  Image as ImageIcon,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  ClipboardCheck,
  LogOut,
  Menu,
  X,
  Activity,
  Coins,
  Calendar,
  Camera,
  RotateCcw
} from 'lucide-react';

interface UserSession {
  userId: number;
  name: string;
  username: string;
  role: string;
  className?: string | null;
  appTitle?: string | null;
}

interface DashboardLayoutProps {
  user: UserSession;
  children: React.ReactNode;
  childName?: string;
}

export default function DashboardLayout({ user, children, childName }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Setup themes based on roles
  const isAdmin = user.role === 'admin';
  const isTeacher = user.role === 'teacher';
  const isParent = user.role === 'parent';

  let roleLabel = 'Orang Tua';
  let themeBg = 'bg-emerald-600 shadow-emerald-100';
  let textColor = 'text-emerald-600';
  let activeBtnClass = 'bg-emerald-600 text-white shadow-md shadow-emerald-100';
  let hoverBtnClass = 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50';

  if (isAdmin) {
    roleLabel = 'Super Admin';
    themeBg = 'bg-slate-800 shadow-slate-200';
    textColor = 'text-slate-800';
    activeBtnClass = 'bg-slate-800 text-white shadow-md shadow-slate-200';
    hoverBtnClass = 'text-slate-500 hover:text-slate-800 hover:bg-slate-50';
  } else if (isTeacher) {
    roleLabel = 'Portal Guru';
    themeBg = 'bg-indigo-600 shadow-indigo-100';
    textColor = 'text-indigo-600';
    activeBtnClass = 'bg-indigo-600 text-white shadow-md shadow-indigo-100';
    hoverBtnClass = 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50';
  }

  // Get navigation links based on role
  const getNavLinks = () => {
    if (isAdmin) {
      return [
        {
          name: 'Dashboard Admin',
          href: '/admin/dashboard',
          icon: LayoutDashboard,
        },
        {
          name: 'Manajemen Guru',
          href: '/admin/teachers',
          icon: Users,
        },
        {
          name: 'Reset Data',
          href: '/admin/reset',
          icon: RotateCcw,
        },
      ];
    }

    if (isTeacher) {
      return [
        {
          name: 'Dashboard',
          href: '/teacher/dashboard',
          icon: LayoutDashboard,
        },
        {
          name: 'Tambah & Data Murid',
          href: '/teacher/students',
          icon: Users,
        },
        {
          name: 'Scan Absensi',
          href: '/teacher/scan',
          icon: Camera,
        },
        {
          name: 'Keaktifan (Hafalan, dll)',
          href: '/teacher/activity',
          icon: Award,
        },
        {
          name: 'Kreativitas Murid',
          href: '/teacher/creativity',
          icon: ImageIcon,
        },
        {
          name: 'Punishment',
          href: '/teacher/punishment',
          icon: AlertTriangle,
        },
        {
          name: 'Laporan & Poin',
          href: '/teacher/reports',
          icon: BarChart3,
          matchPrefix: '/teacher/reports',
        },
        {
          name: 'Keuangan Kelas',
          href: '/teacher/cash',
          icon: Coins,
        },
        {
          name: 'Forum Diskusi',
          href: '/discussions',
          icon: MessageSquare,
        },
      ];
    }

    // Parent
    return [
      {
        name: 'Dashboard Orang Tua',
        href: '/parent/dashboard',
        icon: LayoutDashboard,
      },
      {
        name: 'Absensi',
        href: '/parent/attendance',
        icon: Calendar,
      },
      {
        name: 'Monitoring Shalat',
        href: '/parent/prayer',
        icon: ClipboardCheck,
      },
      {
        name: 'Keuangan Kelas',
        href: '/parent/cash',
        icon: Coins,
      },
      {
        name: 'Rekap Laporan Anak',
        href: '/parent/reports',
        icon: BarChart3,
      },
      {
        name: 'Forum Diskusi',
        href: '/discussions',
        icon: MessageSquare,
      },
    ];
  };

  const navLinks = getNavLinks();

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    await logoutAction();
  };

  const renderNavLinks = () => {
    return navLinks.map((link) => {
      const isActive = link.matchPrefix
        ? pathname.startsWith(link.matchPrefix)
        : pathname === link.href;

      return (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => setMobileSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-250 cursor-pointer ${
            isActive ? activeBtnClass : hoverBtnClass
          }`}
        >
          <link.icon className="w-5 h-5" />
          <span>{link.name}</span>
        </Link>
      );
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden text-slate-800">
      {/* Top Header */}
      <header className="flex-none bg-white border-b border-slate-100 h-16 flex items-center justify-between px-6 z-20 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Toggle */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src="/logo-myclass.png"
              alt="MyClass Logo"
              className="w-9 h-9 object-contain rounded-lg"
            />
            <div>
              <h1 className={`text-lg font-bold tracking-tight ${textColor}`}>
                MyClass
              </h1>
              {user.role === 'teacher' && user.appTitle ? (
                <p className="text-[10px] text-slate-400 font-bold -mt-1 lowercase tracking-wider">
                  by {user.appTitle}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 font-bold -mt-1 uppercase tracking-wider">
                  {roleLabel}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* User Quick Info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-700 leading-tight">{user.name}</p>
              <p className="text-xs text-slate-400 font-semibold capitalize">
                {user.role === 'admin'
                  ? 'Super Admin'
                  : user.role === 'teacher'
                  ? `Guru ${user.className || 'Kelas'}`
                  : childName
                  ? `Wali dari ${childName}`
                  : 'Orang Tua'}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              isAdmin ? 'bg-slate-100 text-slate-800' : isTeacher ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {user.name.substring(0, 2).toUpperCase()}
            </div>
          </div>

          {/* Logout Form Button */}
          <form onSubmit={handleLogout} className="inline">
            <button
              type="submit"
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </header>

      {/* App Shell Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Desktop) */}
        <aside className="w-64 bg-white border-r border-slate-100 flex-none hidden md:flex flex-col justify-between p-4 overflow-y-auto print:hidden">
          <nav className="space-y-1">{renderNavLinks()}</nav>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <p className="text-[11px] text-slate-400 font-bold tracking-wide uppercase">Sistem Berjalan Aktif</p>
          </div>
        </aside>

        {/* Sidebar Drawer (Mobile) */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden print:hidden">
            {/* Backdrop */}
            <div
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 w-64 bg-white flex flex-col justify-between p-4 shadow-2xl z-50 animate-slide-in">
              <div>
                <div className="flex items-center justify-between pb-6 mb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-800">Menu Navigasi</span>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <nav className="space-y-1">{renderNavLinks()}</nav>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">MyClass App v2.0</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 print:p-0 print:bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
