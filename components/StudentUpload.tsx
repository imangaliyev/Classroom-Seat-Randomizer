
import React, { useState, useRef } from 'react';
import { Student } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';

declare const Papa: any;

interface StudentUploadProps {
  onStudentsUpload: (students: Student[], error: string | null) => void;
  studentCount: number;
  totalCapacity: number;
}

// A helper to normalize object keys to lowercase and trimmed strings
const normalizeKeys = (obj: any): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key.toLowerCase().trim()] = obj[key];
    }
  }
  return newObj;
};

const StudentUpload: React.FC<StudentUploadProps> = ({ onStudentsUpload, studentCount, totalCapacity }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [classSummary, setClassSummary] = useState<Record<string, number> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          if (results.errors.length > 0) {
            onStudentsUpload([], 'Error parsing CSV file. Please check the format.');
            setClassSummary(null);
            return;
          }

          const normalizedData = results.data.map(normalizeKeys);

          const firstRow = normalizedData[0];
          if (!firstRow) {
              onStudentsUpload([], 'CSV file is empty or has no data rows.');
              setClassSummary(null);
              return;
          }

          const headers = Object.keys(firstRow);
          const requiredHeaders = ['first name', 'last name', 'class'];

          if (!requiredHeaders.every(h => headers.includes(h))) {
            onStudentsUpload([], 'CSV must contain "first name", "last name", and "class" columns.');
            setClassSummary(null);
            return;
          }

          const students: Student[] = normalizedData.map((row: any, index: number) => ({
            id: `student-${Date.now()}-${index}`,
            firstName: row['first name'] || '',
            lastName: row['last name'] || '',
            class: row['class'] || '',
          })).filter(s => s.firstName.trim() !== '' && s.lastName.trim() !== '' && s.class.trim() !== '');

          const summary: Record<string, number> = {};
          students.forEach(student => {
            summary[student.class] = (summary[student.class] || 0) + 1;
          });

          setClassSummary(summary);
          onStudentsUpload(students, null);
        },
        error: () => {
          onStudentsUpload([], 'Failed to read the file.');
          setClassSummary(null);
        }
      });
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4 border border-slate-200 rounded-lg h-full flex flex-col justify-between">
      <div>
        <h3 className="text-xl font-semibold text-slate-700 mb-3">2. Upload Student List</h3>
        <p className="text-sm text-slate-500 mb-4">Upload a .csv file with columns: "first name", "last name", and "class".</p>
        
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
        />
        <button
          onClick={handleButtonClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 transition-colors"
        >
          <UploadIcon />
          {fileName ? 'Upload a Different File' : 'Choose CSV File'}
        </button>

        {classSummary && (
          <div className="mt-4">
            <h4 className="font-semibold text-slate-600">Upload Summary:</h4>
            <p className="text-sm text-slate-500 mb-2">
              Found {Object.keys(classSummary).length} classes.
            </p>
            <div className="max-h-24 overflow-y-auto space-y-1 pr-2 border bg-slate-50 p-2 rounded-md">
              {Object.entries(classSummary).map(([className, count]) => (
                <div key={className} className="flex justify-between items-center text-sm p-1 rounded">
                  <span className="font-medium text-slate-700">{className}</span>
                  <span className="text-slate-500">{count} students</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-lg font-medium">
          <UserGroupIcon />
          <span className={studentCount > totalCapacity ? 'text-red-500' : 'text-slate-600'}>
            {studentCount} Students / {totalCapacity} Seats
          </span>
        </div>
        {studentCount > totalCapacity && (
            <p className="text-sm text-red-500 mt-1 font-semibold">Warning: More students than available seats.</p>
        )}
      </div>
    </div>
  );
};

export default StudentUpload;