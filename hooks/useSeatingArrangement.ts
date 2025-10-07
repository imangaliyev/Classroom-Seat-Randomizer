import { useState, useCallback } from 'react';
import { Student, Classroom, SeatingChart, Desk } from '../types';

const getGradeLevel = (className: string): string => {
  const match = className.match(/^\d+/);
  return match ? match[0] : className; // Fallback to full class name if no number prefix
};

const checkForConflicts = (chart: SeatingChart, classrooms: Classroom[], separateGenders: boolean): string[] => {
    const conflictingClassroomIds = new Set<string>();
    classrooms.forEach(classroom => {
        chart[classroom.id]?.forEach(desk => {
            const [student1, student2] = desk.students;
            if (student1 && student2) {
                let hasConflict = false;
                // Stricter check: conflict if same class OR same grade level
                if (student1.class === student2.class || getGradeLevel(student1.class) === getGradeLevel(student2.class)) {
                    hasConflict = true;
                }
                if (separateGenders && student1.gender?.toUpperCase() !== student2.gender?.toUpperCase()) {
                    hasConflict = true;
                }
                if (hasConflict) {
                    conflictingClassroomIds.add(classroom.id);
                }
            }
        });
    });
    return Array.from(conflictingClassroomIds);
};

const _rerandomizeSingleClassroom = (
    currentChart: SeatingChart,
    classroomId: string,
    classrooms: Classroom[],
    separateGenders: boolean
): SeatingChart => {
    const newChart = JSON.parse(JSON.stringify(currentChart));
    const classroomToUpdate = classrooms.find(c => c.id === classroomId);
    if (!classroomToUpdate) {
        return newChart;
    }

    const studentsToRerandomize: Student[] = [];
    newChart[classroomId]?.forEach((desk: Desk) => {
        desk.students.forEach(student => {
            if (student) studentsToRerandomize.push(student);
        });
    });

    if (studentsToRerandomize.length === 0) {
        return newChart;
    }

    const numDesks = Math.ceil((classroomToUpdate.capacity || 0) / 2);
    const newDesksForClassroom: Desk[] = Array.from({ length: numDesks }, (_, i) => ({
        id: `${classroomId}-desk-rerandomize-${Date.now()}-${i}`,
        students: [null, null],
    }));
    newChart[classroomId] = newDesksForClassroom;

    const studentQueue = [...studentsToRerandomize].sort(() => Math.random() - 0.5);

    for (let deskIndex = 0; deskIndex < newDesksForClassroom.length; deskIndex++) {
        if (studentQueue.length === 0) break;
        const desk = newDesksForClassroom[deskIndex];

        const prevDesk = newDesksForClassroom[deskIndex - 1];
        const prevDeskGrades = new Set<string>();
        if (prevDesk) {
            prevDesk.students.forEach(s => { if (s) prevDeskGrades.add(getGradeLevel(s.class)); });
        }

        const MIN_ACCEPTABLE_SCORE = 8;

        const availableSlotsInClassroom = () => {
            let slots = 0;
            newDesksForClassroom.forEach(d => {
                if (!d.students[0]) slots++;
                if (!d.students[1]) slots++;
            });
            return slots;
        };

        if (studentQueue.length === 1) {
            desk.students[0] = studentQueue.shift()!;
            continue;
        }
        if (studentQueue.length > 1) {
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
                    if (separateGenders && s1.gender?.toUpperCase() !== s2.gender?.toUpperCase()) currentScore = -1;

                    if (currentScore > bestPair.score) {
                        bestPair = { student1Index: i, student2Index: j, score: currentScore };
                    }
                }
            }

            const availableSlots = availableSlotsInClassroom();
            if (bestPair.student1Index !== -1 && (bestPair.score >= MIN_ACCEPTABLE_SCORE || studentQueue.length > availableSlots)) {
                const student2 = studentQueue.splice(bestPair.student2Index, 1)[0];
                const student1 = studentQueue.splice(bestPair.student1Index, 1)[0];
                desk.students[0] = student1;
                desk.students[1] = student2;
            } else if (studentQueue.length > 0) {
                 desk.students[0] = studentQueue.shift()!;
            }
        }
    }

    if (studentQueue.length > 0) {
        for (const desk of newDesksForClassroom) {
            if (studentQueue.length === 0) break;
            if (!desk.students[0]) {
                desk.students[0] = studentQueue.shift()!;
            }
            if (studentQueue.length === 0) break;
            if (!desk.students[1]) {
                const s1 = desk.students[0];
                const s2 = studentQueue[0];
                if (s1 && (!separateGenders || (separateGenders && s1.gender?.toUpperCase() === s2.gender?.toUpperCase()))) {
                    desk.students[1] = studentQueue.shift()!;
                }
            }
        }
    }

    return newChart;
};


export const useSeatingArrangement = () => {
  const [seatingChart, setSeatingChart] = useState<SeatingChart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{ message: string; percentage: number } | null>(null);

  const generateSeatingChart = useCallback(async (students: Student[], classrooms: Classroom[], separateGenders: boolean) => {
    setIsLoading(true);
    setError(null);
    setSeatingChart(null);
    setProgress({ message: 'Starting process...', percentage: 0 });
    
    await new Promise(resolve => setTimeout(resolve, 300));

    if (students.length === 0 || classrooms.length === 0) {
        setError("Please upload students and define classrooms before randomizing.");
        setIsLoading(false);
        setProgress(null);
        return;
    }

    const totalCapacity = classrooms.reduce((acc, c) => acc + (c.capacity || 0), 0);
    if (students.length > totalCapacity) {
      setError(`Not enough seats! You have ${students.length} students but only ${totalCapacity} seats available.`);
      setIsLoading(false);
      setProgress(null);
      return;
    }

    let finalChart: SeatingChart | null = null;
    const MAX_FULL_ATTEMPTS = 3;
    const MAX_RESOLUTION_ATTEMPTS = 10;

    for (let fullAttempt = 1; fullAttempt <= MAX_FULL_ATTEMPTS; fullAttempt++) {
        const basePercentage = 5 + (90 / MAX_FULL_ATTEMPTS) * (fullAttempt - 1);
        
        setProgress({ 
            message: `Creating arrangement... (Attempt ${fullAttempt}/${MAX_FULL_ATTEMPTS})`, 
            percentage: basePercentage 
        });
        await new Promise(resolve => setTimeout(resolve, 400));

        const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
        let chart: SeatingChart = {};
        classrooms.forEach(c => {
          const numDesks = Math.ceil((c.capacity || 0) / 2);
          chart[c.id] = Array.from({ length: numDesks }, (_, i) => ({
            id: `${c.id}-desk-${i}`,
            students: [null, null],
          }));
        });
        
        const placeStudents = (studentQueue: Student[]) => {
          const maxDesks = Math.max(0, ...classrooms.map(c => chart[c.id]?.length || 0));
          for (let deskIndex = 0; deskIndex < maxDesks; deskIndex++) {
              if (studentQueue.length === 0) break;
              const shuffledClassrooms = [...classrooms].sort(() => Math.random() - 0.5);
      
              for (const classroom of shuffledClassrooms) {
                  if (studentQueue.length === 0) break;
                  const desk = chart[classroom.id]?.[deskIndex];
                  if (!desk || (desk.students[0] && desk.students[1])) continue;
                  
                  const prevDesk = chart[classroom.id]?.[deskIndex - 1];
                  const prevDeskGrades = new Set<string>();
                  if (prevDesk) {
                      prevDesk.students.forEach(s => { if (s) prevDeskGrades.add(getGradeLevel(s.class)); });
                  }
    
                  const MIN_ACCEPTABLE_SCORE = 8;
    
                  const getAvailableSlots = () => {
                      let slots = 0;
                      Object.values(chart).forEach(desks => {
                          desks.forEach(d => {
                              if (!d.students[0]) slots++;
                              if (!d.students[1]) slots++;
                          });
                      });
                      return slots;
                  };
    
                  if (!desk.students[0] && !desk.students[1]) {
                      if (studentQueue.length === 1) {
                          desk.students[0] = studentQueue.shift()!;
                          continue;
                      }
                      if (studentQueue.length > 1) {
                        let bestPair = { student1Index: -1, student2Index: -1, score: -1 };
                        const searchLength = Math.min(studentQueue.length, 30);
                        for (let i = 0; i < searchLength; i++) {
                            for (let j = i + 1; j < searchLength; j++) {
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
    
                        if (bestPair.student1Index !== -1 && (bestPair.score >= MIN_ACCEPTABLE_SCORE || studentQueue.length <= availableSlots)) {
                            const student2 = studentQueue.splice(bestPair.student2Index, 1)[0];
                            const student1 = studentQueue.splice(bestPair.student1Index, 1)[0];
                            desk.students[0] = student1;
                            desk.students[1] = student2;
                        } else if (studentQueue.length > 0) {
                            desk.students[0] = studentQueue.shift()!;
                        }
                      }
                  } 
                  else if (desk.students[0] && !desk.students[1]) {
                      const student1 = desk.students[0];
                      let bestPartner = { index: -1, score: -1 };
                      const searchLength = Math.min(studentQueue.length, 30);
                      for (let i = 0; i < searchLength; i++) {
                          const s2 = studentQueue[i];
                          if (separateGenders && student1.gender?.toUpperCase() !== s2.gender?.toUpperCase()) continue;
                          
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
                        if (bestPartner.score >= MIN_ACCEPTABLE_SCORE || studentQueue.length <= availableSlots) {
                           desk.students[1] = studentQueue.splice(bestPartner.index, 1)[0];
                        }
                      }
                  }
              }
              if (studentQueue.length === 0) break;
          }
        };

        const studentQueue = [...shuffledStudents];
        if (separateGenders) {
            const maleQueue = studentQueue.filter(s => s.gender?.toUpperCase() === 'M');
            const femaleQueue = studentQueue.filter(s => s.gender?.toUpperCase() === 'F');
            placeStudents(maleQueue);
            placeStudents(femaleQueue);
        } else {
            placeStudents(studentQueue);
        }

        if (studentQueue.length > 0) {
            for (const classroom of classrooms) {
                for (const desk of chart[classroom.id]) {
                    if (studentQueue.length === 0) break;
                    if (!desk.students[0]) desk.students[0] = studentQueue.shift()!;
                    if (studentQueue.length === 0) break;
                    if (!desk.students[1]) desk.students[1] = studentQueue.shift()!;
                }
                 if (studentQueue.length === 0) break;
            }
        }
        
        // Start conflict resolution loop
        for (let resolutionAttempt = 1; resolutionAttempt <= MAX_RESOLUTION_ATTEMPTS; resolutionAttempt++) {
            const attemptPercentage = basePercentage + ((90 / MAX_FULL_ATTEMPTS) / MAX_RESOLUTION_ATTEMPTS) * resolutionAttempt;
            
            setProgress({ 
                message: `Checking for conflicts...`, 
                percentage: Math.min(99, attemptPercentage - 2)
            });
            await new Promise(resolve => setTimeout(resolve, 400));

            const conflictingClassrooms = checkForConflicts(chart, classrooms, separateGenders);

            if (conflictingClassrooms.length === 0) {
                setProgress({ message: 'Arrangement successful!', percentage: 100 });
                await new Promise(resolve => setTimeout(resolve, 1000));
                finalChart = chart;
                break; // Exit resolution loop
            }

            setProgress({ 
                message: `Resolving conflicts... (${resolutionAttempt}/${MAX_RESOLUTION_ATTEMPTS})`,
                percentage: Math.min(99, attemptPercentage)
            });
            await new Promise(resolve => setTimeout(resolve, 400));

            for (const classroomId of conflictingClassrooms) {
                chart = _rerandomizeSingleClassroom(chart, classroomId, classrooms, separateGenders);
            }
            
            if (resolutionAttempt === MAX_RESOLUTION_ATTEMPTS) {
                // After last attempt, store the result
                finalChart = chart;
            }
        }

        if (finalChart && checkForConflicts(finalChart, classrooms, separateGenders).length === 0) {
            break; // Exit full attempt loop if a solution was found
        } else if (fullAttempt < MAX_FULL_ATTEMPTS) {
            finalChart = chart; // Store the current best, and try again
        }
    }

    setSeatingChart(finalChart);

    if (finalChart) {
        const finalConflicts = checkForConflicts(finalChart, classrooms, separateGenders);
        if (finalConflicts.length > 0) {
             setError(`Could not resolve all conflicts after ${MAX_FULL_ATTEMPTS} full arrangement attempts. Please review the remaining issues.`);
        }
    }
    
    setIsLoading(false);
    setProgress(null);
  }, []);

  const rerandomizeClassroom = useCallback((classroomId: string, classrooms: Classroom[], separateGenders: boolean) => {
    setIsLoading(true);
    setError(null);
  
    setTimeout(() => {
      setSeatingChart(currentChart => {
        if (!currentChart) {
          setIsLoading(false);
          return null;
        }
        let newChart = _rerandomizeSingleClassroom(currentChart, classroomId, classrooms, separateGenders);
        
        // Try to resolve conflicts in just this classroom a few times
        for (let i = 0; i < 5; i++) {
             const conflicts = checkForConflicts(newChart, classrooms.filter(c => c.id === classroomId), separateGenders);
             if (conflicts.length === 0) break;
             newChart = _rerandomizeSingleClassroom(newChart, classroomId, classrooms, separateGenders);
        }

        return newChart;
      });
      setIsLoading(false);
    }, 50);
  }, []);
  

  return { seatingChart, setSeatingChart, error, isLoading, progress, generateSeatingChart, rerandomizeClassroom };
};
