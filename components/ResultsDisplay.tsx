import React, { useMemo } from 'react';
import { Classroom, SeatingChart, Student } from '../types';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { PrintIcon } from './icons/PrintIcon';
import { ShuffleIcon } from './icons/ShuffleIcon';

interface ResultsDisplayProps {
  seatingChart: SeatingChart;
  classrooms: Classroom[];
  handleRerandomize: (classroomId: string) => void;
  separateGenders: boolean;
}

const getGradeLevel = (className: string): string => {
  const match = className.match(/^\d+/);
  return match ? match[0] : className;
};

const StudentSlot: React.FC<{ student: Student | null }> = ({ student }) => {
    const gender = student?.gender?.toUpperCase();
    const bgColor = gender === 'M' ? 'bg-blue-50' : gender === 'F' ? 'bg-pink-50' : 'bg-white';
    
    return (
        <div className={`w-full p-1.5 rounded text-sm truncate ${bgColor}`}>
            {student ? (
                <div>
                    <p className="font-medium text-slate-800">{student.firstName} {student.lastName}</p>
                    <p className="text-xs text-slate-500">{student.class}</p>
                </div>
            ) : (
                <p className="text-slate-400 h-[34px] flex items-center">Empty</p>
            )}
        </div>
    );
};


const DeskCard: React.FC<{
    desk: SeatingChart[string][0];
    deskNumber: number;
    separateGenders: boolean;
}> = ({ desk, deskNumber, separateGenders }) => {
    const student1 = desk.students[0];
    const student2 = desk.students[1];
    
    const conflictMessages: string[] = [];
    if (student1 && student2) {
        const sameClass = student1.class === student2.class;
        const sameLastName = student1.lastName === student2.lastName;
        const sameGrade = getGradeLevel(student1.class) === getGradeLevel(student2.class);
        const mixedGender = separateGenders && student1.gender?.toUpperCase() !== student2.gender?.toUpperCase();

        if (sameClass) {
            conflictMessages.push('Same Class');
        } else if (sameGrade) { 
            conflictMessages.push('Same Grade Level');
        }
        if (mixedGender) {
            conflictMessages.push('Mixed Gender');
        }
        if (sameLastName) {
            conflictMessages.push('Same Last Name');
        }
    }

    const hasConflict = conflictMessages.length > 0;
    const conflictText = conflictMessages.join(', ');

    return (
        <div className={`p-3 rounded-lg shadow-sm ${hasConflict ? 'bg-amber-100 border border-amber-400' : 'bg-white border border-slate-200'}`}>
            <p className="font-bold text-slate-600 text-sm mb-2">Desk {deskNumber}</p>
            <div className="space-y-1">
                <div className="flex items-center">
                    <span className="w-4 text-center font-mono text-slate-500 text-xs mr-2">1</span>
                    <StudentSlot student={student1} />
                </div>
                 <div className="flex items-center">
                    <span className="w-4 text-center font-mono text-slate-500 text-xs mr-2">2</span>
                     <StudentSlot student={student2} />
                </div>
            </div>
            {hasConflict && <p className="text-xs text-amber-700 mt-2 text-center font-medium">{conflictText}</p>}
        </div>
    );
}


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ seatingChart, classrooms, handleRerandomize, separateGenders }) => {

  const conflictSummary = useMemo(() => {
    const conflicts: Record<string, { id: string; types: string[] }> = {};
    classrooms.forEach(classroom => {
        const deskConflicts = new Set<string>();
        seatingChart[classroom.id]?.forEach(desk => {
            const [student1, student2] = desk.students;
            if (student1 && student2) {
                if (student1.class === student2.class) {
                    deskConflicts.add('Same Class');
                }
                if (getGradeLevel(student1.class) === getGradeLevel(student2.class)) {
                    deskConflicts.add('Same Grade Level');
                }
                if (separateGenders && student1.gender?.toUpperCase() !== student2.gender?.toUpperCase()) {
                    deskConflicts.add('Mixed Gender');
                }
            }
        });
        if (deskConflicts.size > 0) {
            conflicts[classroom.name] = { id: classroom.id, types: Array.from(deskConflicts).sort() };
        }
    });
    return conflicts;
  }, [seatingChart, classrooms, separateGenders]);

  const handlePrintStudentList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Could not open print window. Please disable your pop-up blocker.');
      return;
    }

    const studentsByOriginalClass: Record<string, { student: Student; classroomName: string }[]> = {};

    classrooms.forEach(classroom => {
      seatingChart[classroom.id]?.forEach((desk) => {
        desk.students.forEach(student => {
          if (student) {
            if (!studentsByOriginalClass[student.class]) {
              studentsByOriginalClass[student.class] = [];
            }
            studentsByOriginalClass[student.class].push({
              student,
              classroomName: classroom.name,
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

    const originalClasses = Object.keys(studentsByOriginalClass).sort();

    originalClasses.forEach(className => {
      const studentEntries = studentsByOriginalClass[className];
      
      studentEntries.sort((a, b) => {
        if (a.student.lastName.localeCompare(b.student.lastName) !== 0) {
          return a.student.lastName.localeCompare(b.student.lastName);
        }
        return a.student.firstName.localeCompare(b.student.firstName);
      });

      content += `<div class="page">`;
      content += `<h2>Original Class: ${className}</h2>`;
      content += `<table><thead><tr><th>First Name</th><th>Last Name</th><th>Assigned Classroom</th></tr></thead><tbody>`;
      
      studentEntries.forEach(({ student, classroomName }) => {
        content += `<tr>
            <td>${student.firstName}</td>
            <td>${student.lastName}</td>
            <td>${classroomName}</td>
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
        p.supervisor { font-size: 16px; color: #555; margin-top: 5px; margin-bottom: 0; }
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
        if (classroom.supervisor2) {
            content += `<p class="supervisor">Supervisor 2: ${classroom.supervisor2}</p>`;
        }
        content += `<div class="desk-grid">`;
        
        desks.forEach((desk, index) => {
            const student1 = desk.students[0];
            const student2 = desk.students[1];

            const student1Gender = student1?.gender?.toUpperCase();
            const student1BgColor = student1Gender === 'M' ? '#eff6ff' : student1Gender === 'F' ? '#fdf2f8' : '#f9f9f9';
            
            const student2Gender = student2?.gender?.toUpperCase();
            const student2BgColor = student2Gender === 'M' ? '#eff6ff' : student2Gender === 'F' ? '#fdf2f8' : '#f9f9f9';

            content += `<div class="desk-card">
                <p class="desk-title">Desk ${index + 1}</p>
                <div class="student-slot" style="background-color: ${student1BgColor};">
                    ${student1 ? `<p class="student-name">${student1.firstName} ${student1.lastName}</p><p class="student-class">${student1.class}</p>` : `<p class="empty">Empty</p>`}
                </div>
                <div class="student-slot" style="background-color: ${student2BgColor};">
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
  
  const handlePrintSupervisorReports = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Could not open print window. Please disable your pop-up blocker.');
      return;
    }

    let content = `<html><head><title>Supervisor Reports</title>`;
    content += `<style>
        @page {
            size: A4;
            margin: 1cm;
        }
        body { 
            font-family: sans-serif;
            margin: 0;
            font-size: 9pt;
        }
        .page { 
            page-break-before: always; 
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            height: 26.7cm;
        }
        .page:first-child { 
            page-break-before: avoid; 
        }
        .page-content {
           flex-grow: 1;
        }
        h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
        h2 { font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 0; }
        h3 { font-size: 14px; margin-bottom: 5px; margin-top: 15px; }
        ul { margin: 0; padding-left: 20px;}
        p.supervisor { font-size: 12px; color: #555; margin-top: 5px; margin-bottom: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 3px; text-align: left; vertical-align: middle; }
        th { background-color: #f2f2f2; text-align: left; }
        .grade-summary { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; }
        .grade-summary h4 { margin: 0 0 5px 0; font-size: 11px; }
        .grade-summary ul { list-style-position: inside; padding-left: 0; margin: 0; }
        .footer {
            margin-top: auto;
            border-top: 1px solid #000;
            padding-top: 10px;
            display: flex;
            justify-content: space-around;
            text-align: center;
            font-size: 10px;
        }
        .footer p { margin: 0; }
        .summary-container {
            column-count: 2;
            column-gap: 40px;
            margin-top: 20px;
        }
        .summary-classroom {
            break-inside: avoid-column;
            padding-bottom: 15px;
        }
        .summary-classroom h3 {
            margin-top: 0;
        }
    </style></head><body>`;

    // --- Start: Calculate Summaries ---
    type GradeSummary = { total: number; languages: Record<string, number> };
    type ClassroomSummary = Record<string, GradeSummary>;

    const allSummaries: Record<string, ClassroomSummary> = {};
    classrooms.forEach(classroom => {
        const desks = seatingChart[classroom.id];
        if (!desks) return;
        const classroomSummary: ClassroomSummary = {};
        desks.forEach(desk => {
            desk.students.forEach(student => {
                if (student) {
                    const grade = getGradeLevel(student.class);
                    const lang = (student.language || 'N/A').toUpperCase();
                    
                    if (!classroomSummary[grade]) {
                        classroomSummary[grade] = { total: 0, languages: {} };
                    }
                    classroomSummary[grade].total += 1;
                    classroomSummary[grade].languages[lang] = (classroomSummary[grade].languages[lang] || 0) + 1;
                }
            });
        });
        allSummaries[classroom.id] = classroomSummary;
    });
    // --- End: Calculate Summaries ---

    content += `<h1>Supervisor Reports</h1>`;
    
    // --- Start: Add Summary Page ---
    content += `<div class="page"><div class="page-content"><h2>Overall Grade Distribution Summary</h2>`;
    content += `<div class="summary-container">`;
    classrooms.forEach(classroom => {
        if (!seatingChart[classroom.id]) return;
        
        let supervisorText = '';
        if (classroom.supervisor && classroom.supervisor2) {
            supervisorText = ` (${classroom.supervisor}, ${classroom.supervisor2})`;
        } else if (classroom.supervisor) {
            supervisorText = ` (${classroom.supervisor})`;
        } else if (classroom.supervisor2) {
             supervisorText = ` (${classroom.supervisor2})`;
        }
        
        content += `<div class="summary-classroom">`;
        content += `<h3>Classroom: ${classroom.name}${supervisorText}</h3>`;
        const summary = allSummaries[classroom.id];
        if (summary && Object.keys(summary).length > 0) {
            content += '<ul>';
            Object.keys(summary).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).forEach(grade => {
                const gradeData = summary[grade];
                const languageParts = Object.keys(gradeData.languages).sort().map(lang => 
                    `${gradeData.languages[lang]} ${lang}`
                ).join(', ');
                content += `<li>Grade ${grade}: ${gradeData.total} students (${languageParts})</li>`;
            });
            content += '</ul>';
        } else {
            content += '<p>No students assigned.</p>';
        }
        content += '</div>'; // summary-classroom
    });
    content += '</div>'; // summary-container
    content += `</div></div>`;
    // --- End: Add Summary Page ---


    classrooms.forEach(classroom => {
        const desks = seatingChart[classroom.id];
        if (!desks) return;
        
        const studentsInClassroom: Student[] = [];
        desks.forEach(desk => {
            if (desk.students[0]) studentsInClassroom.push(desk.students[0]);
            if (desk.students[1]) studentsInClassroom.push(desk.students[1]);
        });

        // Sort students
        studentsInClassroom.sort((a, b) => {
            if (a.lastName.localeCompare(b.lastName) !== 0) {
              return a.lastName.localeCompare(b.lastName);
            }
            return a.firstName.localeCompare(b.firstName);
        });

        content += `<div class="page">`;
        content += `<div class="page-content">`
        content += `<h2>Classroom: ${classroom.name}</h2>`;
        if (classroom.supervisor) {
          content += `<p class="supervisor">Supervisor: ${classroom.supervisor}</p>`;
        }
        if (classroom.supervisor2) {
            content += `<p class="supervisor">Supervisor 2: ${classroom.supervisor2}</p>`;
        }
        
        content += `<table><thead><tr>
            <th style="width: 4%;">#</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th style="width: 10%;">Class</th>
            <th style="width: 10%;">Language</th>
            <th style="width: 15%;">School ID</th>
            <th style="width: 15%;">Student ID</th>
            <th style="width: 20%;">Signature</th>
            </tr></thead><tbody>`;
        
        studentsInClassroom.forEach((student, index) => {
            content += `<tr>
                <td>${index + 1}</td>
                <td>${student.firstName}</td>
                <td>${student.lastName}</td>
                <td>${student.class}</td>
                <td>${student.language || ''}</td>
                <td>${student.schoolId || ''}</td>
                <td>${student.studentId || ''}</td>
                <td></td>
            </tr>`;
        });
        
        content += `</tbody></table>`;
        
        const classroomSummary = allSummaries[classroom.id];
        if (classroomSummary && Object.keys(classroomSummary).length > 0) {
            content += `<div class="grade-summary"><h4>Grade Summary:</h4><ul>`;
            Object.keys(classroomSummary).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).forEach(grade => {
                const gradeData = classroomSummary[grade];
                const languageParts = Object.keys(gradeData.languages).sort().map(lang => 
                    `${gradeData.languages[lang]} ${lang}`
                ).join(', ');
                content += `<li>Grade ${grade}: ${gradeData.total} students (${languageParts})</li>`;
            });
            content += `</ul></div>`;
        }
        
        content += `</div>`; 

        content += `<div class="footer">
            <div>
                <p style="margin-bottom: 15px;">Supervisor Signature: _________________________</p>
                <p>(${classroom.supervisor || 'N/A'})</p>
            </div>
            ${classroom.supervisor2 ? `
            <div>
                <p style="margin-bottom: 15px;">Supervisor Signature: _________________________</p>
                <p>(${classroom.supervisor2})</p>
            </div>
            ` : ''}
        </div>`;

        content += `</div>`;
    });

    content += `</body></html>`;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const hasConflicts = Object.keys(conflictSummary).length > 0;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <div className="flex flex-wrap justify-between items-center border-b pb-3 mb-4 gap-2">
        <h2 className="text-2xl font-semibold text-slate-800">Seating Arrangement</h2>
        <div className="flex flex-wrap gap-2">
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
            <button
              onClick={handlePrintSupervisorReports}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 transition-colors text-sm"
              aria-label="Export supervisor reports"
            >
              <PrintIcon />
              Supervisor Reports
            </button>
        </div>
      </div>

      {hasConflicts && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg my-6">
          <h3 className="font-bold text-amber-800">Conflict Summary</h3>
          <p className="text-sm text-amber-700 mt-1">
            The following classrooms have seating conflicts. Click a classroom to re-randomize it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {/* FIX: Explicitly type conflictInfo to resolve properties on 'unknown' type. */}
            {Object.entries(conflictSummary).map(([classroomName, conflictInfo]) => {
              const info = conflictInfo as { id: string; types: string[] };
              return (
                <button
                  key={info.id}
                  onClick={() => handleRerandomize(info.id)}
                  className="px-3 py-1 bg-amber-200 text-amber-900 font-semibold rounded-full hover:bg-amber-300 transition-colors text-sm"
                >
                  {classroomName}: <span className="font-normal">{info.types.join(', ')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-8 mt-6">
        {classrooms.map(classroom => {
            const desks = seatingChart[classroom.id];
            if (!desks) return null;
            const studentCount = desks.reduce((acc, desk) => acc + desk.students.filter(s => s).length, 0);

            return (
                <div key={classroom.id} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex flex-wrap gap-2 justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-indigo-700">{classroom.name}</h3>
                            {classroom.supervisor && <p className="text-sm text-slate-500 mt-1">Supervisor: {classroom.supervisor}</p>}
                            {classroom.supervisor2 && <p className="text-sm text-slate-500">Supervisor 2: {classroom.supervisor2}</p>}
                        </div>
                        <div className='flex items-center gap-4'>
                             <button
                                onClick={() => handleRerandomize(classroom.id)}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 transition-colors text-sm"
                                aria-label={`Re-randomize classroom ${classroom.name}`}
                            >
                                <ShuffleIcon />
                                Re-randomize
                            </button>
                            <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1 rounded-full mt-1">
                                <UserGroupIcon />
                                <span className="font-medium">{studentCount} Students</span>
                            </div>
                        </div>

                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {desks.map((desk, index) => (
                           <DeskCard
                             key={desk.id}
                             desk={desk}
                             deskNumber={index + 1}
                             separateGenders={separateGenders}
                           />
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