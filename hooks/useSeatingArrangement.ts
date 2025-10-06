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

  const generateSeatingChart = useCallback((students: Student[], classrooms: Classroom[], separateGenders: boolean) => {
    setIsLoading(true);
    setError(null);
    setSeatingChart(null);
    
    setTimeout(() => {
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

        const shuffledStudents = [...students].sort(() => Math.random() - 0.5);

        const newSeatingChart: SeatingChart = {};
        classrooms.forEach(c => {
          const numDesks = Math.ceil((c.capacity || 0) / 2);
          newSeatingChart[c.id] = Array.from({ length: numDesks }, (_, i) => ({
            id: `${c.id}-desk-${i}`,
            students: [null, null],
          }));
        });

        const maxDesks = Math.max(0, ...classrooms.map(c => newSeatingChart[c.id]?.length || 0));

        if (!separateGenders) {
            // Original logic
            const studentQueue = [...shuffledStudents];
            for (let deskIndex = 0; deskIndex < maxDesks; deskIndex++) {
                if (studentQueue.length === 0) break;
                const shuffledClassrooms = [...classrooms].sort(() => Math.random() - 0.5);
        
                for (const classroom of shuffledClassrooms) {
                    if (studentQueue.length === 0) break;
                    const desk = newSeatingChart[classroom.id]?.[deskIndex];
                    if (!desk) continue;
                    
                    const student1 = studentQueue.shift()!;
                    desk.students[0] = student1;
            
                    if (studentQueue.length === 0) break;
            
                    const student1Grade = getGradeLevel(student1.class);
                    let partnerIndex = -1;
            
                    partnerIndex = studentQueue.findIndex(s => s.class !== student1.class && s.lastName !== student1.lastName && getGradeLevel(s.class) !== student1Grade);
                    if (partnerIndex === -1) partnerIndex = studentQueue.findIndex(s => s.class !== student1.class && s.lastName !== student1.lastName);
                    if (partnerIndex === -1) partnerIndex = studentQueue.findIndex(s => s.class !== student1.class && getGradeLevel(s.class) !== student1Grade);
                    if (partnerIndex === -1) partnerIndex = studentQueue.findIndex(s => s.class !== student1.class);
            
                    if (partnerIndex !== -1) {
                        desk.students[1] = studentQueue.splice(partnerIndex, 1)[0];
                    } else if (studentQueue.length > 0) {
                        desk.students[1] = studentQueue.shift()!;
                    }
                }
                if (studentQueue.length === 0) break;
            }
        } else {
            // Gender-separated logic
            const maleQueue = shuffledStudents.filter(s => s.gender?.toUpperCase() === 'M');
            const femaleQueue = shuffledStudents.filter(s => s.gender?.toUpperCase() === 'F');
            
            for (let deskIndex = 0; deskIndex < maxDesks; deskIndex++) {
                if (maleQueue.length === 0 && femaleQueue.length === 0) break;
                const shuffledClassrooms = [...classrooms].sort(() => Math.random() - 0.5);

                for (const classroom of shuffledClassrooms) {
                    if (maleQueue.length === 0 && femaleQueue.length === 0) break;

                    const desk = newSeatingChart[classroom.id]?.[deskIndex];
                    if (!desk || desk.students[0]) continue; // Skip if desk doesn't exist or is already partially filled in a previous classroom iteration

                    // Prioritize the longer queue to ensure even distribution of groups
                    const queueToUse = maleQueue.length >= femaleQueue.length ? maleQueue : femaleQueue;
                    if (queueToUse.length === 0) { // If longer queue is empty, try the other
                        const otherQueue = queueToUse === maleQueue ? femaleQueue : maleQueue;
                        if (otherQueue.length === 0) continue; // Both are empty
                         const student1 = otherQueue.shift()!;
                         desk.students[0] = student1;
                         // No need to look for partner, as the queue was empty or had 1
                         continue;
                    }

                    const student1 = queueToUse.shift()!;
                    desk.students[0] = student1;

                    if (queueToUse.length > 0) {
                        const student1Grade = getGradeLevel(student1.class);
                        let partnerIndex = -1;
                        
                        // Find a partner from the SAME gender queue
                        partnerIndex = queueToUse.findIndex(s => s.class !== student1.class && s.lastName !== student1.lastName && getGradeLevel(s.class) !== student1Grade);
                        if (partnerIndex === -1) partnerIndex = queueToUse.findIndex(s => s.class !== student1.class && s.lastName !== student1.lastName);
                        if (partnerIndex === -1) partnerIndex = queueToUse.findIndex(s => s.class !== student1.class && getGradeLevel(s.class) !== student1Grade);
                        if (partnerIndex === -1) partnerIndex = queueToUse.findIndex(s => s.class !== student1.class);
                
                        if (partnerIndex !== -1) {
                            desk.students[1] = queueToUse.splice(partnerIndex, 1)[0];
                        }
                    }
                }
            }
        }

        setSeatingChart(newSeatingChart);
        setIsLoading(false);
    }, 50);
  }, []);

  return { seatingChart, error, isLoading, generateSeatingChart };
};