export interface Student {
  id: string;
  studentName: string;
  class: string;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number; // Number of seats
  supervisor?: string;
}

export interface Desk {
  id: string;
  students: [Student | null, Student | null];
}

export interface SeatingChart {
  [classroomId: string]: Desk[];
}