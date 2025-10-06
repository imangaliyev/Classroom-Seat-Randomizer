import React, { useState, useMemo } from 'react';
import { Classroom, SeatingChart, Student } from './types';
import ClassroomSetup from './components/ClassroomSetup';
import StudentUpload from './components/StudentUpload';
import ResultsDisplay from './components/ResultsDisplay';
import { useSeatingArrangement } from './hooks/useSeatingArrangement';
import { ShuffleIcon } from './components/icons/ShuffleIcon';

const App: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([
    { id: `classroom-${Date.now()}`, name: 'Room 101', capacity: 20, supervisor: '' },
  ]);
  const [students, setStudents] = useState<Student[]>([]);
  const { seatingChart, setSeatingChart, error, isLoading, generateSeatingChart, rerandomizeClassroom } = useSeatingArrangement();

  const [showGenderOption, setShowGenderOption] = useState(false);
  const [separateGenders, setSeparateGenders] = useState(false);


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
    generateSeatingChart(students, classrooms, separateGenders);
  };
  
  const handleRerandomizeClassroom = (classroomId: string) => {
    rerandomizeClassroom(classroomId, classrooms, separateGenders);
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
            <h2 className="text-2xl font-semibold mb-4 text-slate-800 border-b pb-3">Setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
              <ClassroomSetup classrooms={classrooms} setClassrooms={setClassrooms} />
              <StudentUpload onStudentsUpload={handleStudentsUpload} studentCount={students.length} totalCapacity={totalCapacity} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={handleRandomize}
              disabled={!canRandomize || isLoading}
              className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Assigning...
                </>
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

          {seatingChart && <ResultsDisplay seatingChart={seatingChart} classrooms={classrooms} handleRerandomize={handleRerandomizeClassroom} />}
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