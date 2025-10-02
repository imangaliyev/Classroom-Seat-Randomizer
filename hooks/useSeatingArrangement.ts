import { useState, useCallback } from 'react';
import { Student, Classroom, SeatingChart } from '../types';

const getGradeLevel = (className: string): string => {
  const match = className.match(/^\d+/);
  return match ? match[0] : className; // Fallback to full class name if no number prefix
};

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

            // Find a suitable partner for the second seat with prioritized constraints
            const student1Grade = getGradeLevel(student1.class);
            let partnerIndex = -1;

            // P1: Different class, last name, and grade
            partnerIndex = studentQueue.findIndex(s => s.class !== student1.class && s.lastName !== student1.lastName && getGradeLevel(s.class) !== student1Grade);
            
            // P2: Different class and last name (relax grade)
            if (partnerIndex === -1) {
                partnerIndex = studentQueue.findIndex(s => s.class !== student1.class && s.lastName !== student1.lastName);
            }

            // P3: Different class and grade (relax last name)
            if (partnerIndex === -1) {
                partnerIndex = studentQueue.findIndex(s => s.class !== student1.class && getGradeLevel(s.class) !== student1Grade);
            }
            
            // P4: Just different class
            if (partnerIndex === -1) {
              partnerIndex = studentQueue.findIndex(s => s.class !== student1.class);
            }

            if (partnerIndex !== -1) {
              const student2 = studentQueue.splice(partnerIndex, 1)[0];
              desk.students[1] = student2;
            } else {
              // No suitable partner from a different class found.
              // Take the next student in the queue, which may result in a conflict.
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