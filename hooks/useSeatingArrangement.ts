import { useState, useCallback } from 'react';
import { Student, Classroom, SeatingChart } from '../types';

export const useSeatingArrangement = () => {
  const [seatingChart, setSeatingChart] = useState<SeatingChart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateSeatingChart = useCallback((students: Student[], classrooms: Classroom[]) => {
    setIsLoading(true);
    setError(null);
    setSeatingChart(null);
    
    // Using a timeout to ensure UI updates before blocking the main thread
    setTimeout(() => {
        // 1. Validation
        if (students.length === 0 || classrooms.length === 0) {
            setError("Please upload students and define classrooms before randomizing.");
            setIsLoading(false);
            return;
        }

        const totalCapacity = classrooms.reduce((acc, c) => acc + (c.capacity || 0), 0);
        if (students.length > totalCapacity) {
          setError(`Not enough seats! You have ${students.length} students but only ${totalCapacity} seats available.`);
          setIsLoading(false);
          return;
        }

        // 2. Shuffle students
        const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
        const studentQueue = [...shuffledStudents];

        // 3. Create empty seating chart structure
        const newSeatingChart: SeatingChart = {};
        classrooms.forEach(c => {
          const numDesks = Math.ceil((c.capacity || 0) / 2);
          newSeatingChart[c.id] = Array.from({ length: numDesks }, (_, i) => ({
            id: `${c.id}-desk-${i}`,
            students: [null, null],
          }));
        });

        // 4. Assignment Logic
        for (const classroom of classrooms) {
          for (const desk of newSeatingChart[classroom.id]) {
            if (studentQueue.length === 0) break;

            // Assign first student
            const student1 = studentQueue.shift()!;
            desk.students[0] = student1;

            if (studentQueue.length === 0) break;

            // Find a suitable partner for the second seat
            let partnerIndex = studentQueue.findIndex(s => s.class !== student1.class);

            if (partnerIndex !== -1) {
              const student2 = studentQueue.splice(partnerIndex, 1)[0];
              desk.students[1] = student2;
            } else {
              // No suitable partner found, means all remaining students are from the same class.
              // We must pair them, but this will be flagged in the UI.
              if (studentQueue.length > 0) {
                  const student2 = studentQueue.shift()!;
                  desk.students[1] = student2;
              }
            }
          }
          if (studentQueue.length === 0) break;
        }

        setSeatingChart(newSeatingChart);
        setIsLoading(false);
    }, 50); // Small delay for UX
  }, []);

  return { seatingChart, error, isLoading, generateSeatingChart };
};