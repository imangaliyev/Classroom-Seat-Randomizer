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

        const placeStudents = (studentQueue: Student[]) => {
          
          for (let deskIndex = 0; deskIndex < maxDesks; deskIndex++) {
              if (studentQueue.length === 0) break;
              const shuffledClassrooms = [...classrooms].sort(() => Math.random() - 0.5);
      
              for (const classroom of shuffledClassrooms) {
                  if (studentQueue.length === 0) break;
                  const desk = newSeatingChart[classroom.id]?.[deskIndex];
                  if (!desk || (desk.students[0] && desk.students[1])) continue;
                  
                  const prevDesk = newSeatingChart[classroom.id]?.[deskIndex - 1];
                  const prevDeskGrades = new Set<string>();
                  if (prevDesk) {
                      prevDesk.students.forEach(s => { if (s) prevDeskGrades.add(getGradeLevel(s.class)); });
                  }

                  const MIN_ACCEPTABLE_SCORE = 8; // Score must at least indicate different grades

                  // Calculate the total number of empty slots remaining across all classrooms
                  const getAvailableSlots = () => {
                      let slots = 0;
                      Object.values(newSeatingChart).forEach(desks => {
                          desks.forEach(d => {
                              if (!d.students[0]) slots++;
                              if (!d.students[1]) slots++;
                          });
                      });
                      return slots;
                  };

                  // Handle filling a completely empty desk
                  if (!desk.students[0] && !desk.students[1]) {
                      if (studentQueue.length < 2) {
                          if (studentQueue.length === 1) desk.students[0] = studentQueue.shift()!;
                          continue;
                      }

                      let bestPair = { student1Index: -1, student2Index: -1, score: -1 };

                      for (let i = 0; i < studentQueue.length; i++) {
                          for (let j = i + 1; j < studentQueue.length; j++) {
                              const s1 = studentQueue[i];
                              const s2 = studentQueue[j];
                              let currentScore = 0;
                              const s1Grade = getGradeLevel(s1.class);
                              const s2Grade = getGradeLevel(s2.class);

                              if (s1Grade !== s2Grade) currentScore += 8;
                              if (s1.class !== s2.class) currentScore += 4;
                              if (!prevDeskGrades.has(s1Grade)) currentScore += 2;
                              if (!prevDeskGrades.has(s2Grade)) currentScore += 2;
                              if (s1.lastName !== s2.lastName) currentScore += 1;

                              if (currentScore > bestPair.score) {
                                  bestPair = { student1Index: i, student2Index: j, score: currentScore };
                              }
                          }
                      }
                      
                      const availableSlots = getAvailableSlots();

                      if (bestPair.student1Index !== -1 && (bestPair.score >= MIN_ACCEPTABLE_SCORE || studentQueue.length > availableSlots)) {
                          // Form a pair if the score is good OR if we're running out of slots
                          const student2 = studentQueue.splice(bestPair.student2Index, 1)[0];
                          const student1 = studentQueue.splice(bestPair.student1Index, 1)[0];
                          desk.students[0] = student1;
                          desk.students[1] = student2;
                      } else if (studentQueue.length > 0) {
                          // Seat student alone because best pair is a conflict AND we have spare slots.
                          // Place the first student from the highest-scoring (but still rejected) pair.
                          if (bestPair.student1Index !== -1) {
                              const studentToPlace = studentQueue.splice(bestPair.student1Index, 1)[0];
                              desk.students[0] = studentToPlace;
                          } else {
                              // Fallback for when there's only one student left in the queue.
                              desk.students[0] = studentQueue.shift()!;
                          }
                      }
                  } 
                  // Handle filling a half-empty desk
                  else if (desk.students[0] && !desk.students[1]) {
                      if (separateGenders && studentQueue.length > 0 && desk.students[0].gender?.toUpperCase() !== studentQueue[0].gender?.toUpperCase()) {
                          continue;
                      }

                      const student1 = desk.students[0];
                      let bestPartner = { index: -1, score: -1 };
                      
                      for (let i = 0; i < studentQueue.length; i++) {
                          const s2 = studentQueue[i];
                          let currentScore = 0;
                          const s1Grade = getGradeLevel(student1.class);
                          const s2Grade = getGradeLevel(s2.class);

                          if (s1Grade !== s2Grade) currentScore += 8;
                          if (student1.class !== s2.class) currentScore += 4;
                          if (!prevDeskGrades.has(s2Grade)) currentScore += 2;
                          if (student1.lastName !== s2.lastName) currentScore += 1;

                          if (currentScore > bestPartner.score) {
                              bestPartner = { index: i, score: currentScore };
                          }
                      }
                      
                      if (bestPartner.index !== -1) {
                        const availableSlots = getAvailableSlots();
                        // Forced to pair if remaining students are more than available slots.
                        // We use >= because if queue=1 and slots=1, we must fill this slot.
                        if (bestPartner.score >= MIN_ACCEPTABLE_SCORE || studentQueue.length >= availableSlots) {
                           desk.students[1] = studentQueue.splice(bestPartner.index, 1)[0];
                        }
                        // else, do nothing. Leave the desk half empty and let the student be placed in a better (empty) desk later.
                      }
                  }
              }
              if (studentQueue.length === 0) break;
          }
        };

        if (!separateGenders) {
            const studentQueue = [...shuffledStudents];
            placeStudents(studentQueue);
        } else {
            const maleQueue = shuffledStudents.filter(s => s.gender?.toUpperCase() === 'M');
            const femaleQueue = shuffledStudents.filter(s => s.gender?.toUpperCase() === 'F');
            
            // Process the larger group first to give them more initial placement options
            if (maleQueue.length >= femaleQueue.length) {
                placeStudents(maleQueue);
                placeStudents(femaleQueue);
            } else {
                placeStudents(femaleQueue);
                placeStudents(maleQueue);
            }
        }

        setSeatingChart(newSeatingChart);
        setIsLoading(false);
    }, 50);
  }, []);

  return { seatingChart, setSeatingChart, error, isLoading, generateSeatingChart };
};