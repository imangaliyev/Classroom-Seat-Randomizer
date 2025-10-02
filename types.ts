export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  class: string;
  studentId?: string;
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