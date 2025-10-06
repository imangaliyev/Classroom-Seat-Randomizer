import React, { useRef } from 'react';
import { Classroom } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { DuplicateIcon } from './icons/DuplicateIcon';
import { UploadIcon } from './icons/UploadIcon';

declare const Papa: any;

interface ClassroomSetupProps {
  classrooms: Classroom[];
  setClassrooms: React.Dispatch<React.SetStateAction<Classroom[]>>;
}

const ClassroomSetup: React.FC<ClassroomSetupProps> = ({ classrooms, setClassrooms }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddClassroom = () => {
    setClassrooms(prev => [
      ...prev,
      { id: `classroom-${Date.now()}`, name: '', capacity: 30, supervisor: '', supervisor2: '' },
    ]);
  };

  const handleRemoveClassroom = (id: string) => {
    setClassrooms(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateClassroom = (id: string, field: 'name' | 'capacity' | 'supervisor' | 'supervisor2', value: string | number) => {
    setClassrooms(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleDuplicateClassroom = (id: string) => {
    setClassrooms(prev => {
      const classroomToDuplicate = prev.find(c => c.id === id);
      if (!classroomToDuplicate) {
        return prev;
      }
      const newClassroom: Classroom = {
        ...classroomToDuplicate,
        id: `classroom-${Date.now()}`,
      };
      const index = prev.findIndex(c => c.id === id);
      const newClassrooms = [...prev];
      newClassrooms.splice(index + 1, 0, newClassroom);
      return newClassrooms;
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          if (results.errors.length > 0) {
            alert('Error parsing CSV file. Please check the format.');
            return;
          }

          const firstRow = results.data[0];
          if (!firstRow) {
            alert('CSV file is empty or has no data rows.');
            return;
          }

          const headers = Object.keys(firstRow).map(h => h.toLowerCase().trim());
          const requiredHeaders = ['classroom name', 'seat capacity'];

          if (!requiredHeaders.every(h => headers.includes(h))) {
            alert('CSV must contain "classroom name" and "seat capacity" columns.');
            return;
          }

          const newClassrooms: Classroom[] = results.data.map((row: any, index: number) => ({
            id: `classroom-${Date.now()}-${index}`,
            name: row['classroom name'] || row['Classroom Name'] || '',
            capacity: parseInt(row['seat capacity'] || row['Seat Capacity'], 10) || 0,
            supervisor: row['supervisor'] || row['Supervisor'] || '',
            supervisor2: row['supervisor 2'] || row['Supervisor 2'] || '',
          })).filter(c => c.name.trim() !== '' && c.capacity > 0);

          if (newClassrooms.length > 0) {
            setClassrooms(newClassrooms);
          } else {
            alert('No valid classroom data found in the file. Ensure names are not empty and capacities are greater than 0.');
          }
        },
        error: () => {
          alert('Failed to read the file.');
        }
      });
      event.target.value = ''; // Reset file input to allow re-uploading the same file
    }
  };

  return (
    <div className="p-4 border border-slate-200 rounded-lg h-full">
      <h3 className="text-xl font-semibold text-slate-700 mb-3">1. Define Classrooms</h3>
      <p className="text-sm text-slate-500 mb-4">
        Add classrooms manually, or upload a .csv file to replace the list. <br/>
        Required columns: "classroom name", "seat capacity". Optional: "supervisor", "supervisor 2".
      </p>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {classrooms.map((classroom, index) => (
          <div key={classroom.id} className="grid grid-cols-[auto,1fr,1fr,1fr,auto,auto,auto] items-center gap-2 p-2 bg-slate-50 rounded-md">
            <span className="font-medium text-slate-500">{index + 1}.</span>
            <input
              type="text"
              placeholder="Classroom Name"
              value={classroom.name}
              onChange={e => handleUpdateClassroom(classroom.id, 'name', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
             <input
              type="text"
              placeholder="Supervisor"
              value={classroom.supervisor}
              onChange={e => handleUpdateClassroom(classroom.id, 'supervisor', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Supervisor 2"
              value={classroom.supervisor2}
              onChange={e => handleUpdateClassroom(classroom.id, 'supervisor2', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
              type="number"
              min="1"
              placeholder="Seats"
              value={classroom.capacity}
              onChange={e => handleUpdateClassroom(classroom.id, 'capacity', parseInt(e.target.value, 10) || 0)}
              className="w-24 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={() => handleDuplicateClassroom(classroom.id)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors"
              aria-label="Duplicate classroom"
            >
              <DuplicateIcon />
            </button>
            <button
              onClick={() => handleRemoveClassroom(classroom.id)}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
              aria-label="Remove classroom"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={handleAddClassroom}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 transition-colors"
        >
          <PlusIcon />
          Add Classroom
        </button>
        <button
          onClick={handleUploadClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 transition-colors"
        >
          <UploadIcon />
          Upload Classroom List
        </button>
      </div>
    </div>
  );
};

export default ClassroomSetup;