import React from 'react';
import { prisma } from '@/lib/db';
import StudentForm from '@/components/StudentForm';
import { QrCode, User } from 'lucide-react';
import { getRegisteredFacesAction } from '@/app/actions/teacher';
import BiometricEnrollButton from '@/components/BiometricEnrollButton';
import DeleteStudentButton from '@/components/DeleteStudentButton';
import EditStudentButton from '@/components/EditStudentButton';

export const dynamic = 'force-dynamic';

export default async function TeacherStudentsPage() {
  // Fetch students with parent info
  const students = await prisma.student.findMany({
    include: {
      parent: {
        select: { name: true, username: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const facesRes = await getRegisteredFacesAction();
  const registeredIds = facesRes.success ? facesRes.studentIds || [] : [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Manajemen & Data Murid</h2>
        <p className="text-slate-500 text-sm font-semibold">
          Daftarkan murid baru dan unduh/cetak kartu absensi QR Code murid.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Students List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-xs">
          <div>
            <h4 className="font-extrabold text-slate-855 text-slate-850 text-base">Daftar Murid Kelas Binaan</h4>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              List data murid aktif berserta informasi akun wali murid.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">No</th>
                  <th className="py-3 px-3">Nama Murid</th>
                  <th className="py-3 px-3">NISN (Username)</th>
                  <th className="py-3 px-3">Nama Orang Tua</th>
                  <th className="py-3 px-3 text-center">Biometrik Wajah</th>
                  <th className="py-3 px-3 text-center">QR Code</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-755">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                      Belum ada data murid terdaftar.
                    </td>
                  </tr>
                ) : (
                  students.map((student, idx) => {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${student.qrCodeToken}`;
                    return (
                      <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/20 transition-colors">
                        <td className="py-3.5 px-3 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="py-3.5 px-3">
                          <span className="text-slate-900 font-bold block leading-tight">{student.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{student.className}</span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs text-slate-500">{student.studentId}</td>
                        <td className="py-3.5 px-3">
                          <span className="text-slate-700 block leading-tight">{student.parent?.name || '-'}</span>
                          <span className="text-[9px] text-slate-400 font-bold">Username: {student.parent?.username || '-'}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <BiometricEnrollButton
                            studentId={student.studentId}
                            studentName={student.name}
                            isRegistered={registeredIds.includes(student.studentId)}
                          />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {/* Interactive/printable QR Card wrapper */}
                          <div className="flex flex-col items-center justify-center gap-1 group/qr">
                            <a
                              href={qrUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-10 h-10 border border-slate-100 rounded-lg overflow-hidden block shadow-2xs hover:scale-105 transition-transform bg-white"
                              title="Lihat QR Code Penuh"
                            >
                              <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                            </a>
                            <span className="text-[9px] text-slate-400 font-mono font-bold leading-none select-all">
                              {student.qrCodeToken}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <EditStudentButton student={student} />
                            <DeleteStudentButton studentId={student.id} studentName={student.name} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Student Form */}
        <div>
          <StudentForm />
        </div>
      </div>
    </div>
  );
}
