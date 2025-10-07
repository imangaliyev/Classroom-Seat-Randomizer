
import React, { useState, useMemo } from 'react';
import { Classroom, SeatingChart, Student } from './types';
import ClassroomSetup from './components/ClassroomSetup';
import StudentUpload from './components/StudentUpload';
import ResultsDisplay from './components/ResultsDisplay';
import { useSeatingArrangement } from './hooks/useSeatingArrangement';
import { ShuffleIcon } from './components/icons/ShuffleIcon';
import { BuildingIcon } from './components/icons/BuildingIcon';
import { DEMO_STUDENTS_CSV, DEMO_CLASSROOMS_CSV } from './demoData';

declare const Papa: any;

const App: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([
    { id: `classroom-${Date.now()}`, name: 'Room 101', capacity: 20, supervisor: '' },
  ]);
  const [students, setStudents] = useState<Student[]>([]);
  const { seatingChart, setSeatingChart, error, setError, isLoading, progress, generateSeatingChart, rerandomizeClassroom } = useSeatingArrangement();

  const [showGenderOption, setShowGenderOption] = useState(false);
  const [separateGenders, setSeparateGenders] = useState(false);
  
  const [fileName, setFileName] = useState<string | null>(null);
  const [classSummary, setClassSummary] = useState<Record<string, number> | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);


  const handleStudentsUpload = (uploadedStudents: Student[], uploadError: string | null, hasMixedGenders: boolean) => {
    if (uploadError) {
      alert(uploadError);
      setStudents([]);
      setShowGenderOption(false);
    } else {
      setStudents(uploadedStudents);
      setShowGenderOption(hasMixedGenders);
    }
    if (!hasMixedGenders) {
        setSeparateGenders(false);
    }
  };

  const handleRandomize = () => {
    setDuplicateWarning(null);
    generateSeatingChart(students, classrooms, separateGenders);
  };
  
  const handleRerandomizeClassroom = (classroomId: string) => {
    rerandomizeClassroom(classroomId, classrooms, separateGenders);
  };

  const handleLoadDemoData = () => {
    // Parse classrooms
    Papa.parse(DEMO_CLASSROOMS_CSV, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        if (results.data) {
          const newClassrooms: Classroom[] = results.data.map((row: any, index: number) => ({
            id: `classroom-demo-${Date.now()}-${index}`,
            name: (row['classroom name'] || '').trim(),
            capacity: parseInt(row['seat capacity'], 10) || 0,
            supervisor: (row['supervisor'] || '').trim(),
            supervisor2: (row['supervisor 2'] || '').trim(),
          })).filter((c: Classroom) => c.name.trim() !== '' && c.capacity > 0);
          setClassrooms(newClassrooms);
        }
      }
    });

    // Parse students
    Papa.parse(DEMO_STUDENTS_CSV, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const normalizeKeys = (obj: any): any => {
          const newObj: any = {};
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              newObj[key.toLowerCase().trim()] = obj[key];
            }
          }
          return newObj;
        };

        const normalizedData = results.data.map(normalizeKeys);

        const uniqueStudentsMap = new Map<string, Student>();
        normalizedData.forEach((row: any, index: number) => {
            const studentId = row['student id'] || '';
            const firstName = row['first name'] || '';
            const lastName = row['last name'] || '';
            const studentClass = row['class'] || '';

            if (firstName.trim() === '' || lastName.trim() === '' || studentClass.trim() === '') {
                return; 
            }

            const key = studentId ? studentId : `${firstName}-${lastName}-${studentClass}`.toLowerCase();

            if (!uniqueStudentsMap.has(key)) {
                uniqueStudentsMap.set(key, {
                    id: `student-demo-${Date.now()}-${index}`,
                    firstName,
                    lastName,
                    class: studentClass,
                    studentId,
                    schoolId: row['school id'] || '',
                    gender: row['gender'] || '',
                    language: row['language'] || '',
                    variant: row['variant'] || '',
                });
            }
        });

        const duplicateCount = normalizedData.length - uniqueStudentsMap.size;
        if (duplicateCount > 0) {
          setDuplicateWarning(`Found and ignored ${duplicateCount} duplicate student entries in demo data.`);
        } else {
          setDuplicateWarning(null);
        }

        const students: Student[] = Array.from(uniqueStudentsMap.values());
        
        const genders = new Set(students.map(s => s.gender?.toUpperCase()).filter(Boolean));
        const hasMixedGenders = genders.has('M') && genders.has('F');

        handleStudentsUpload(students, null, hasMixedGenders);

        const summary: Record<string, number> = {};
        students.forEach(student => {
            summary[student.class] = (summary[student.class] || 0) + 1;
        });
        setClassSummary(summary);
        setFileName('Demo School Data');
        setSeatingChart(null);
        setError(null);
      }
    });
  };

  const totalCapacity = useMemo(() => {
    return classrooms.reduce((acc, c) => acc + c.capacity, 0);
  }, [classrooms]);

  const canRandomize = students.length > 0 && classrooms.length > 0 && classrooms.every(c => c.capacity > 0 && c.name.trim() !== '');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Classroom Randomizer</h1>
          <p className="mt-2 text-lg text-slate-600">Fairly assign students to desks and classrooms.</p>
        </header>

        <main>
          <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
            <div className="flex flex-wrap justify-between items-center border-b pb-3 mb-4 gap-2">
              <h2 className="text-2xl font-semibold text-slate-800">Setup</h2>
               <button 
                  onClick={handleLoadDemoData}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 transition-colors text-sm"
              >
                  <BuildingIcon />
                  Use Demo School
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
              <ClassroomSetup classrooms={classrooms} setClassrooms={setClassrooms} />
              <StudentUpload 
                onStudentsUpload={handleStudentsUpload} 
                studentCount={students.length} 
                totalCapacity={totalCapacity}
                fileName={fileName}
                setFileName={setFileName}
                classSummary={classSummary}
                setClassSummary={setClassSummary}
                duplicateWarning={duplicateWarning}
                setDuplicateWarning={setDuplicateWarning}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={handleRandomize}
              disabled={!canRandomize || isLoading}
              className={`inline-flex items-center justify-center gap-2 px-8 font-semibold rounded-lg shadow-md transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isLoading ? 'py-2 bg-indigo-600 text-white w-64' : 'py-3 bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105'} disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center w-full text-sm">
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{progress?.message || '⏳ Assigning...'}</span>
                  </div>
                  {progress && (
                    <div className="w-full bg-slate-200/50 rounded-full h-1.5 mt-2">
                      <div className="bg-white h-1.5 rounded-full" style={{ width: `${progress.percentage}%`, transition: 'width 0.3s ease-in-out' }}></div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <ShuffleIcon />
                  Randomize Seating
                </>
              )}
            </button>
             {showGenderOption && (
                <div className="flex items-center bg-white p-3 rounded-lg shadow-md border border-slate-200">
                    <input
                        type="checkbox"
                        id="separate-genders"
                        checked={separateGenders}
                        onChange={(e) => setSeparateGenders(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="separate-genders" className="ml-2 block text-sm font-medium text-slate-700">
                        Separate genders
                    </label>
                </div>
            )}
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-8" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {seatingChart && <ResultsDisplay seatingChart={seatingChart} classrooms={classrooms} handleRerandomize={handleRerandomizeClassroom} separateGenders={separateGenders} />}
        </main>
        
        <footer className="text-center mt-12 mb-4">
            <p className="text-slate-500 text-sm">
                Made by <a href="mailto:imangaliyev@gmail.com" className="text-indigo-600 hover:underline font-medium">Nurlan Imangaliyev</a>
            </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
