import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-slate-50">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-md p-8 border border-slate-200 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 mb-2">
          PROJEXA
        </h1>
        <p className="text-sm font-medium text-indigo-600 mb-4">
          Academic Project Management Platform
        </p>
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          Welcome to PROJEXA. The frontend architecture is initialized and ready for Member 1 (Auth, Student Dashboard) and Member 2 (Guide &amp; Admin Dashboards).
        </p>
        <div className="grid grid-cols-3 gap-3 text-xs text-slate-500 font-medium">
          <div className="p-3 bg-slate-100 rounded-lg">Student Portal</div>
          <div className="p-3 bg-slate-100 rounded-lg">Guide Portal</div>
          <div className="p-3 bg-slate-100 rounded-lg">Admin Portal</div>
        </div>
      </div>
    </div>
  );
}
