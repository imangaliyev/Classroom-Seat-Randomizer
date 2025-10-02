import React from 'react';
import { Classroom, SeatingChart, Student } from '../types';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { PrintIcon } from './icons/PrintIcon';

interface ResultsDisplayProps {
  seatingChart: SeatingChart;
  classrooms: Classroom[];
}

const getGradeLevel = (className: string): string => {
  const match = className.match(/^\d+/);
  return match ? match[0] : className;
};

const DeskCard: React.FC<{ student1: Student | null; student2: Student | null; deskNumber: number }> = ({ student1, student2, deskNumber }) => {
    const conflictMessages: string[] = [];
    if (student1 && student2) {
        const sameClass = student1.class === student2.class;
        const sameLastName = student1.lastName === student2.lastName;
        const sameGrade = getGradeLevel(student1.class) === getGradeLevel(student2.class);

        if (sameClass) {
            conflictMessages.push('Same Class');
        } else if (sameGrade) { // Only show same grade if not same class (less redundant)
            conflictMessages.push('Same Grade Level');
        }
        if (sameLastName) {
            conflictMessages.push('Same Last Name');
        }
    }

    const hasConflict = conflictMessages.length > 0;
    const conflictText = conflictMessages.join(', ');

    return (
        <div className={`p-3 rounded-lg shadow-sm ${hasConflict ? 'bg-amber-100 border border-amber-400' : 'bg-slate-100'}`}>
            <p className="font-bold text-slate-600 text-sm mb-2">Desk {deskNumber}</p>
            <div className="space-y-1">
                <div className="flex items-center">
                    <span className="w-4 text-center font-mono text-slate-500 text-xs mr-2">1</span>
                    <div className="w-full bg-white p-1.5 rounded text-sm truncate">
                        <p className="font-medium text-slate-800">{student1 ? `${student1.firstName} ${student1.lastName}` : <span className="text-slate-400">Empty</span>}</p>
                        {student1 && <p className="text-xs text-slate-500">{student1.class}</p>}
                    </div>
                </div>
                 <div className="flex items-center">
                    <span className="w-4 text-center font-mono text-slate-500 text-xs mr-2">2</span>
                    <div className="w-full bg-white p-1.5 rounded text-sm truncate">
                        <p className="font-medium text-slate-800">{student2 ? `${student2.firstName} ${student2.lastName}` : <span className="text-slate-400">Empty</span>}</p>
                        {student2 && <p className="text-xs text-slate-500">{student2.class}</p>}
                    </div>
                </div>
            </div>
            {hasConflict && <p className="text-xs text-amber-700 mt-2 text-center font-medium">{conflictText}</p>}
        </div>
    );
}


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ seatingChart, classrooms }) => {
  const handlePrintStudentList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Could not open print window. Please disable your pop-up blocker.');
      return;
    }

    // 1. Group students by their original class
    const studentsByOriginalClass: Record<string, { student: Student; classroomName: string; desk: string }[]> = {};

    classrooms.forEach(classroom => {
      seatingChart[classroom.id]?.forEach((desk, deskIndex) => {
        desk.students.forEach(student => {
          if (student) {
            if (!studentsByOriginalClass[student.class]) {
              studentsByOriginalClass[student.class] = [];
            }
            studentsByOriginalClass[student.class].push({
              student,
              classroomName: classroom.name,
              desk: `Desk ${deskIndex + 1}`,
            });
          }
        });
      });
    });

    let content = `<html><head><title>Student List by Original Class</title>`;
    content += `<style>
        body { font-family: sans-serif; margin: 20px; }
        .page { page-break-inside: avoid; }
        h1 { font-size: 24px; text-align: center; margin-bottom: 20px; }
        h2 { font-size: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style></head><body>`;
    content += `<h1>Student Placement List by Original Class</h1>`;

    // 2. Create a sorted list of tables, one for each original class
    const originalClasses = Object.keys(studentsByOriginalClass).sort();

    originalClasses.forEach(className => {
      const studentEntries = studentsByOriginalClass[className];
      
      // Sort students within the group alphabetically
      studentEntries.sort((a, b) => {
        if (a.student.lastName.localeCompare(b.student.lastName) !== 0) {
          return a.student.lastName.localeCompare(b.student.lastName);
        }
        return a.student.firstName.localeCompare(b.student.firstName);
      });

      content += `<div class="page">`;
      content += `<h2>Original Class: ${className}</h2>`;
      content += `<table><thead><tr><th>First Name</th><th>Last Name</th><th>Assigned Classroom</th><th>Assigned Desk</th></tr></thead><tbody>`;
      
      studentEntries.forEach(({ student, classroomName, desk }) => {
        content += `<tr>
            <td>${student.firstName}</td>
            <td>${student.lastName}</td>
            <td>${classroomName}</td>
            <td>${desk}</td>
        </tr>`;
      });
      
      content += `</tbody></table></div>`;
    });

    content += `</body></html>`;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handlePrintSeatingChart = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Could not open print window. Please disable your pop-up blocker.');
      return;
    }

    let content = `<html><head><title>Seating Charts</title>`;
    content += `<style>
        body { font-family: sans-serif; margin: 20px; }
        .page { page-break-before: always; padding-top: 20px; }
        .page:first-child { page-break-before: avoid; padding-top: 0; }
        h1 { text-align: center; }
        h2 { font-size: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 0; }
        p.supervisor { font-size: 16px; color: #555; margin-top: 5px; }
        .desk-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 20px; }
        .desk-card { border: 1px solid #ccc; border-radius: 8px; padding: 10px; break-inside: avoid; }
        .desk-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; }
        .student-slot { background-color: #f9f9f9; border-radius: 4px; padding: 5px; margin-bottom: 5px; font-size: 12px; }
        .student-name { font-weight: 500; }
        .student-class { color: #555; font-size: 10px; }
        .empty { color: #999; }
        @media print {
            .desk-grid { grid-template-columns: repeat(4, 1fr); }
        }
    </style></head><body>`;
    content += `<h1>Classroom Seating Charts</h1>`;

    classrooms.forEach(classroom => {
        const desks = seatingChart[classroom.id];
        if (!desks) return;
        
        content += `<div class="page">`;
        content += `<h2>${classroom.name}</h2>`;
        if (classroom.supervisor) {
          content += `<p class="supervisor">Supervisor: ${classroom.supervisor}</p>`;
        }
        content += `<div class="desk-grid">`;
        
        desks.forEach((desk, index) => {
            const student1 = desk.students[0];
            const student2 = desk.students[1];
            content += `<div class="desk-card">
                <p class="desk-title">Desk ${index + 1}</p>
                <div class="student-slot">
                    ${student1 ? `<p class="student-name">${student1.firstName} ${student1.lastName}</p><p class="student-class">${student1.class}</p>` : `<p class="empty">Empty</p>`}
                </div>
                <div class="student-slot">
                    ${student2 ? `<p class="student-name">${student2.firstName} ${student2.lastName}</p><p class="student-class">${student2.class}</p>` : `<p class="empty">Empty</p>`}
                </div>
            </div>`;
        });
        
        content += `</div></div>`;
    });

    content += `</body></html>`;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <div className="flex flex-wrap justify-between items-center border-b pb-3 mb-4 gap-2">
        <h2 className="text-2xl font-semibold text-slate-800">Seating Arrangement</h2>
        <div className="flex gap-2">
            <button
              onClick={handlePrintStudentList}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 transition-colors text-sm"
              aria-label="Export student list"
            >
              <PrintIcon />
              Export List
            </button>
            <button
              onClick={handlePrintSeatingChart}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 transition-colors text-sm"
              aria-label="Export seating chart"
            >
              <PrintIcon />
              Export Chart
            </button>
        </div>
      </div>
      <div className="space-y-8 mt-6">
        {classrooms.map(classroom => {
            const desks = seatingChart[classroom.id];
            if (!desks) return null;
            const studentCount = desks.reduce((acc, desk) => acc + desk.students.filter(s => s).length, 0);

            return (
                <div key={classroom.id} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-indigo-700">{classroom.name}</h3>
                            {classroom.supervisor && <p className="text-sm text-slate-500 mt-1">Supervisor: {classroom.supervisor}</p>}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1 rounded-full mt-1">
                            <UserGroupIcon />
                            <span className="font-medium">{studentCount} Students</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {desks.map((desk, index) => (
                           <DeskCard key={desk.id} deskNumber={index + 1} student1={desk.students[0]} student2={desk.students[1]} />
                        ))}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default ResultsDisplay;