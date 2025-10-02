// Fix: Replaced the content of this file, which was a requirements.txt for a Python project,
// with a functional React root component for the application. This component orchestrates the UI,
// manages state, and integrates the provided hooks and components to create a working application.
import React, { useState } from 'react';
import { Student, Classroom } from './types';
import ClassroomSetup from './components/ClassroomSetup';
import StudentUpload from './components/StudentUpload';
import ResultsDisplay from './components/ResultsDisplay';
import { useSeatingArrangement } from './hooks/useSeatingArrangement';
import { ShuffleIcon } from './components/icons/ShuffleIcon';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([
    { id: `classroom-${Date.now()}`, name: 'Room 101', capacity: 20, supervisor: '' }
  ]);
  const [studentUploadError, setStudentUploadError] = useState<string | null>(null);

  const { seatingChart, error: arrangementError, isLoading, generateSeatingChart } = useSeatingArrangement();

  const handleStudentsUpload = (uploadedStudents: Student[], error: string | null) => {
    setStudents(uploadedStudents);
    setStudentUploadError(error);
  };
  
  const totalCapacity = classrooms.reduce((acc, c) => acc + (c.capacity || 0), 0);
  const studentCount = students.length;
  const isRandomizeDisabled = studentCount === 0 || classrooms.length === 0 || studentCount > totalCapacity;

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8 font-sans">
      <main className="max-w-7xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-slate-800">Classroom Randomizer</h1>
          <p className="text-lg text-slate-600 mt-2">Fairly assign students to desks and classrooms.</p>
        </header>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold text-slate-800 border-b pb-3 mb-4">Setup</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ClassroomSetup classrooms={classrooms} setClassrooms={setClassrooms} />
            <StudentUpload 
              onStudentsUpload={handleStudentsUpload} 
              studentCount={studentCount} 
              totalCapacity={totalCapacity} 
            />
          </div>
        </div>
        
        <div className="flex justify-center my-6">
            <button
                onClick={() => generateSeatingChart(students, classrooms)}
                disabled={isRandomizeDisabled || isLoading}
                className="w-full max-w-md inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Randomizing...</span>
                    </>
                ) : (
                    <>
                        <ShuffleIcon />
                        <span>Randomize Seating</span>
                    </>
                )}
            </button>
        </div>

        {(arrangementError || studentUploadError) && (
          <div className="max-w-7xl mx-auto p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center shadow-sm">
            <p className="font-bold">An error occurred:</p>
            <p>{arrangementError || studentUploadError}</p>
          </div>
        )}

        {seatingChart && (
            <ResultsDisplay seatingChart={seatingChart} classrooms={classrooms} />
        )}

      </main>
    </div>
  );
};

export default App;
