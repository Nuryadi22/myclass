import React from 'react';
import { prisma } from '@/lib/db';
import CreativityForm from '@/components/CreativityForm';
import DeleteCreativityButton from '@/components/DeleteCreativityButton';

export const dynamic = 'force-dynamic';

export default async function TeacherCreativityPage() {
  // Fetch students for checkboxes
  const students = await prisma.student.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  // Fetch all creativities
  const creativities = await prisma.creativity.findMany({
    include: {
      student: { select: { name: true } },
      teacher: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Portofolio & Kreativitas Murid</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Unggah portofolio karya seni, kerajinan tangan, atau kreativitas anak kelas binaan Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Uploaded Portfolios Gallery */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
          <div>
            <h4 className="font-extrabold text-slate-855 text-base">Portofolio Karya Seni Murid</h4>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Galeri dokumentasi fisik karya kreativitas murid kelas binaan Anda.
            </p>
          </div>

          {creativities.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">Belum ada karya kreativitas diunggah.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {creativities.map((cr) => {
                const dateStr = new Date(cr.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                return (
                  <div
                    key={cr.id}
                    className="bg-slate-50/50 rounded-2xl border border-slate-100/50 overflow-hidden flex flex-col justify-between hover:shadow-sm transition-shadow group animate-slide-in"
                  >
                    {/* Image Box */}
                    <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                      <DeleteCreativityButton id={cr.id} />
                      <img
                        src={`/${cr.imagePath}`}
                        alt={cr.title}
                        className="object-cover w-full h-full group-hover:scale-103 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 bg-slate-900/80 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-xs select-none">
                        ⭐ +{cr.pointsAwarded} Poin
                      </div>
                    </div>

                    {/* Details Box */}
                    <div className="p-4 space-y-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">
                          Murid: {cr.student.name}
                        </span>
                        <h5 className="font-extrabold text-slate-850 text-sm">{cr.title}</h5>
                      </div>
                      {cr.description && (
                        <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-2">
                          {cr.description}
                        </p>
                      )}
                      <div className="border-t border-slate-100/80 pt-2 flex items-center justify-between text-[9px] text-slate-400 font-bold">
                        <span>Oleh: {cr.teacher?.name || 'Guru'}</span>
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload Form */}
        <div>
          <CreativityForm students={students} />
        </div>
      </div>
    </div>
  );
}
