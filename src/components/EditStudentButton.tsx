'use client';

import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';
import EditStudentModal from './EditStudentModal';

interface StudentType {
  id: number;
  name: string;
  studentId: string;
  parent?: {
    name: string;
    username: string;
  } | null;
}

interface EditStudentButtonProps {
  student: StudentType;
}

export default function EditStudentButton({ student }: EditStudentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
        title={`Edit data ${student.name}`}
      >
        <Edit2 className="w-4 h-4 text-indigo-500 hover:scale-105 transition-transform" />
      </button>

      <EditStudentModal
        student={student}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
