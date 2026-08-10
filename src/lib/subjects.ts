// Daftar mata pelajaran yang tersedia di MyClass
// File ini BUKAN server-only, sehingga bisa diimport oleh client component maupun server action

export const SUBJECTS = [
  "Al-Qur'an",
  'Akidah Akhlak',
  'Fikih',
  'Sejarah Kebudayaan Islam',
  'Bahasa Arab',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam dan Sosial',
  'Seni Budaya dan Prakarya',
  'Bahasa Inggris',
] as const;

export type Subject = (typeof SUBJECTS)[number];
