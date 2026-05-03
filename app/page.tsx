'use client';

import { useState } from 'react';

type BlockKey = 'BLK0' | 'BLK1' | 'BLK2' | 'BLK3';
type DayKey = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

interface StudentSchedule {
  name: string;
  grade: number;
  schedule: Record<DayKey, Record<BlockKey, string | null>>;
}

interface ScheduleResponse {
  students: StudentSchedule[];
  message: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ManualStudent {
  firstName: string;
  lastName: string;
  grade: string;
  pickupBlock: string;
  preferences: string[];
  goals: string;
}

interface ManualClass {
  name: string;
  day: string;
  blockStart: string;
  blockEnd: string;
  gradeMin: string;
  gradeMax: string;
  capacity: string;
  type: string;
}

const BLOCKS: { key: BlockKey; time: string }[] = [
  { key: 'BLK0', time: '2:30–3:30' },
  { key: 'BLK1', time: '3:30–4:30' },
  { key: 'BLK2', time: '4:30–5:30' },
  { key: 'BLK3', time: '5:30–6:30' },
];

const BLOCK_KEYS = ['BLK0', 'BLK1', 'BLK2', 'BLK3'];
const DAYS: DayKey[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const CLASS_TYPES = ['Academic', 'Music', 'Athletic', 'Dance', 'Art', 'Club', 'Study', 'Language'];
const PREFERENCE_OPTIONS = ['Music', 'Art', 'Dance', 'Basketball', 'Chinese', 'Reading', 'Math', 'Taekwondo', 'Gymnastics', 'Leadership'];

const EMPTY_STUDENT: ManualStudent = {
  firstName: '', lastName: '', grade: '1', pickupBlock: 'BLK2', preferences: [], goals: '',
};

const EMPTY_CLASS: ManualClass = {
  name: '', day: 'Monday', blockStart: 'BLK1', blockEnd: 'BLK1',
  gradeMin: '1', gradeMax: '4', capacity: '12', type: 'Academic',
};

function validateClass(c: ManualClass): string | null {
  if (!c.name.trim()) return 'Class name is required.';
  if (BLOCK_KEYS.indexOf(c.blockEnd) < BLOCK_KEYS.indexOf(c.blockStart)) return 'End block must be the same or later than start block.';
  if (parseInt(c.gradeMax) < parseInt(c.gradeMin)) return 'Max grade must be ≥ min grade.';
  if (parseInt(c.capacity) < 1) return 'Capacity must be at least 1.';
  return null;
}

function manualStudentsToCSV(students: ManualStudent[]): string {
  const header = 'name,grade,pickup_block,goals,preferences';
  const rows = students.map(s =>
    `${s.firstName} ${s.lastName}.,${s.grade},${s.pickupBlock},${s.goals || 'homework+reading'},${s.preferences.join('+') || 'General'}`
  );
  return [header, ...rows].join('\n');
}

function manualClassesToCSV(classes: ManualClass[]): string {
  const header = 'name,day,block_start,block_end,grade_min,grade_max,capacity,type';
  const rows = classes.map(c =>
    `${c.name},${c.day},${c.blockStart},${c.blockEnd},${c.gradeMin},${c.gradeMax},${c.capacity},${c.type}`
  );
  return [header, ...rows].join('\n');
}

function getActivityColor(activity: string): string {
  const lower = activity.toLowerCase();
  if (lower.includes('homework') || lower.includes('study') || lower.includes('math') || lower.includes('penmanship') || lower.includes('sprints')) return 'bg-blue-100 text-blue-700';
  if (lower.includes('music') || lower.includes('piano') || lower.includes('violin') || lower.includes('orchestra') || lower.includes('practice')) return 'bg-purple-100 text-purple-700';
  if (lower.includes('basketball') || lower.includes('taekwondo') || lower.includes('gymnastics') || lower.includes('athletic')) return 'bg-green-100 text-green-700';
  if (lower.includes('dance') || lower.includes('art') || lower.includes('show')) return 'bg-pink-100 text-pink-700';
  if (lower.includes('club') || lower.includes('fun friday') || lower.includes('friday')) return 'bg-yellow-100 text-yellow-700';
  if (lower.includes('chinese') || lower.includes('lab') || lower.includes('language')) return 'bg-orange-100 text-orange-700';
  if (lower.includes('library') || lower.includes('reading') || lower.includes('violin')) return 'bg-teal-100 text-teal-700';
  return 'bg-gray-100 text-gray-700';
}

function blockLabel(key: string) {
  const map: Record<string, string> = { BLK0: '2:30', BLK1: '3:30', BLK2: '4:30', BLK3: '5:30' };
  return `${key} (${map[key]})`;
}

function ModeToggle({ mode, onChange }: { mode: 'csv' | 'manual'; onChange: (m: 'csv' | 'manual') => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
      {(['manual', 'csv'] as const).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-3 py-1 capitalize transition ${mode === m ? 'bg-[#0073ea] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          {m === 'manual' ? 'Manual' : 'CSV'}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [studentMode, setStudentMode] = useState<'csv' | 'manual'>('manual');
  const [classMode, setClassMode] = useState<'csv' | 'manual'>('manual');

  const [studentsCSV, setStudentsCSV] = useState('');
  const [classesCSV, setClassesCSV] = useState('');

  const [manualStudents, setManualStudents] = useState<ManualStudent[]>([]);
  const [studentForm, setStudentForm] = useState<ManualStudent>(EMPTY_STUDENT);

  const [manualClasses, setManualClasses] = useState<ManualClass[]>([]);
  const [classForm, setClassForm] = useState<ManualClass>(EMPTY_CLASS);
  const [classError, setClassError] = useState<string | null>(null);

  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleFileUpload = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsText(file);
  };

  const togglePreference = (pref: string) => {
    setStudentForm(f => ({
      ...f,
      preferences: f.preferences.includes(pref)
        ? f.preferences.filter(p => p !== pref)
        : [...f.preferences, pref],
    }));
  };

  const addStudent = () => {
    if (!studentForm.firstName.trim() || !studentForm.lastName.trim()) return;
    setManualStudents(prev => [...prev, studentForm]);
    setStudentForm(EMPTY_STUDENT);
  };

  const addClass = () => {
    const err = validateClass(classForm);
    if (err) { setClassError(err); return; }
    setClassError(null);
    setManualClasses(prev => [...prev, classForm]);
    setClassForm(EMPTY_CLASS);
  };

  const getStudentsData = () => studentMode === 'csv' ? studentsCSV : manualStudentsToCSV(manualStudents);
  const getClassesData = () => classMode === 'csv' ? classesCSV : manualClassesToCSV(manualClasses);

  const hasStudents = studentMode === 'csv' ? !!studentsCSV : manualStudents.length > 0;
  const hasClasses = classMode === 'csv' ? !!classesCSV : manualClasses.length > 0;

  const callAPI = async (msgs: Message[], current: ScheduleResponse | null) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentsCSV: getStudentsData(), classesCSV: getClassesData(), messages: msgs, currentSchedule: current }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setApiError(data.error || 'Unknown error'); return; }
      setSchedule(data);
      const updated = [...msgs, { role: 'assistant' as const, content: data.message }];
      setMessages(updated);
      if (data.students?.length > 0 && !selectedStudent) setSelectedStudent(data.students[0].name);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = () => callAPI([], null);

  const sendMessage = async () => {
    if (!input.trim() || !schedule) return;
    const updated = [...messages, { role: 'user' as const, content: input }];
    setMessages(updated);
    setInput('');
    await callAPI(updated, schedule);
  };

  const currentStudent = schedule?.students.find(s => s.name === selectedStudent);

  const DAY_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500'];

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <header className="bg-[#1f1f3d] text-white px-6 py-3 flex items-center gap-3 shadow-md">
        <span className="text-2xl">🗓️</span>
        <div className="flex-1">
          <h1 className="text-lg font-bold tracking-tight">ClassMaker.ai</h1>
          <p className="text-[#a5b4fc] text-xs">AI-powered afterschool block scheduler</p>
        </div>
        <span className="text-xs text-[#6366f1] hidden sm:block font-medium">classmaker.ai</span>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left panel — inputs */}
        <div className="space-y-4">

          {/* Students */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-l-4 border-violet-500 px-4 pt-3 pb-2 flex items-center justify-between bg-white">
              <h2 className="font-bold text-[#1f1f3d] text-sm">1. Students</h2>
              <ModeToggle mode={studentMode} onChange={setStudentMode} />
            </div>
            <div className="px-4 pb-4 pt-2 space-y-2">
              {studentMode === 'csv' ? (
                <>
                  <input type="file" accept=".csv" onChange={handleFileUpload(setStudentsCSV)} className="text-sm w-full" />
                  {studentsCSV && <p className="text-xs text-emerald-600 mt-1">✓ Loaded</p>}
                  <div className="mt-2 p-2.5 bg-violet-50 rounded-lg text-xs text-gray-600 space-y-1 border border-violet-100">
                    <p className="font-semibold text-gray-700">Required CSV columns (in order):</p>
                    <ul className="space-y-0.5 list-none">
                      <li><span className="font-medium text-gray-800">name</span> — Student&apos;s full name (e.g. Emma Smith)</li>
                      <li><span className="font-medium text-gray-800">grade</span> — Grade level: 1–8</li>
                      <li><span className="font-medium text-gray-800">pickup_block</span> — Latest block they can stay: BLK0 (3:30 PM), BLK1 (4:30 PM), BLK2 (5:30 PM), BLK3 (6:30 PM)</li>
                      <li><span className="font-medium text-gray-800">goals</span> — Academic focus areas, separated by + (e.g. reading+math)</li>
                      <li><span className="font-medium text-gray-800">preferences</span> — Activity types, separated by + (e.g. Academic+Music)</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={studentForm.firstName} onChange={e => setStudentForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name"
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    <input value={studentForm.lastName} onChange={e => setStudentForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name"
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Grade</label>
                      <select value={studentForm.grade} onChange={e => setStudentForm(f => ({ ...f, grade: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-300">
                        {[1,2,3,4,5,6,7,8].map(g => <option key={g} value={g}>Grade {g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Pickup</label>
                      <select value={studentForm.pickupBlock} onChange={e => setStudentForm(f => ({ ...f, pickupBlock: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-300">
                        <option value="BLK0">3:30 PM</option>
                        <option value="BLK1">4:30 PM</option>
                        <option value="BLK2">5:30 PM</option>
                        <option value="BLK3">6:30 PM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Preferences</label>
                    <div className="flex flex-wrap gap-1">
                      {PREFERENCE_OPTIONS.map(pref => (
                        <button key={pref} onClick={() => togglePreference(pref)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition ${studentForm.preferences.includes(pref) ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-300 text-gray-600 hover:border-violet-400'}`}>
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input value={studentForm.goals} onChange={e => setStudentForm(f => ({ ...f, goals: e.target.value }))} placeholder="Academic goals (e.g. reading, math)"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                  <button onClick={addStudent} disabled={!studentForm.firstName.trim() || !studentForm.lastName.trim()}
                    className="w-full bg-violet-50 text-violet-700 border border-violet-200 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-violet-100 transition">
                    + Add Student
                  </button>
                  {manualStudents.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {manualStudents.map((s, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-sm border border-gray-100">
                          <span className="text-gray-700">{s.firstName} {s.lastName} <span className="text-gray-400">· Gr. {s.grade}</span></span>
                          <button onClick={() => setManualStudents(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 transition text-xs ml-2">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-l-4 border-blue-500 px-4 pt-3 pb-2 flex items-center justify-between bg-white">
              <h2 className="font-bold text-[#1f1f3d] text-sm">2. Classes</h2>
              <ModeToggle mode={classMode} onChange={setClassMode} />
            </div>
            <div className="px-4 pb-4 pt-2 space-y-2">
              {classMode === 'csv' ? (
                <>
                  <input type="file" accept=".csv" onChange={handleFileUpload(setClassesCSV)} className="text-sm w-full" />
                  {classesCSV && <p className="text-xs text-emerald-600 mt-1">✓ Loaded</p>}
                  <div className="mt-2 p-2.5 bg-blue-50 rounded-lg text-xs text-gray-600 space-y-1 border border-blue-100">
                    <p className="font-semibold text-gray-700">Required CSV columns (in order):</p>
                    <ul className="space-y-0.5 list-none">
                      <li><span className="font-medium text-gray-800">name</span> — Class name (e.g. Group Piano)</li>
                      <li><span className="font-medium text-gray-800">day</span> — Day of the week (e.g. Monday)</li>
                      <li><span className="font-medium text-gray-800">block_start</span> — First time block: BLK0 (2:30), BLK1 (3:30), BLK2 (4:30), BLK3 (5:30)</li>
                      <li><span className="font-medium text-gray-800">block_end</span> — Last time block (same as block_start if single block)</li>
                      <li><span className="font-medium text-gray-800">grade_min</span> — Lowest grade allowed: 1–8</li>
                      <li><span className="font-medium text-gray-800">grade_max</span> — Highest grade allowed: 1–8</li>
                      <li><span className="font-medium text-gray-800">capacity</span> — Max number of students</li>
                      <li><span className="font-medium text-gray-800">type</span> — Activity category: Academic, Art, Music, or Athletic</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <input value={classForm.name} onChange={e => setClassForm(f => ({ ...f, name: e.target.value }))} placeholder="Class name (e.g. Group Piano)"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Day</label>
                      <select value={classForm.day} onChange={e => setClassForm(f => ({ ...f, day: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300">
                        {DAYS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Type</label>
                      <select value={classForm.type} onChange={e => setClassForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300">
                        {CLASS_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Start block</label>
                      <select value={classForm.blockStart} onChange={e => setClassForm(f => ({ ...f, blockStart: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300">
                        {BLOCK_KEYS.map(b => <option key={b} value={b}>{blockLabel(b)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">End block</label>
                      <select value={classForm.blockEnd} onChange={e => setClassForm(f => ({ ...f, blockEnd: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300">
                        {BLOCK_KEYS.map(b => <option key={b} value={b}>{blockLabel(b)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Min grade</label>
                      <select value={classForm.gradeMin} onChange={e => setClassForm(f => ({ ...f, gradeMin: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300">
                        {[1,2,3,4,5,6,7,8].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Max grade</label>
                      <select value={classForm.gradeMax} onChange={e => setClassForm(f => ({ ...f, gradeMax: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300">
                        {[1,2,3,4,5,6,7,8].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Capacity</label>
                      <input type="number" min={1} value={classForm.capacity} onChange={e => setClassForm(f => ({ ...f, capacity: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  </div>
                  {classError && <p className="text-xs text-red-500">{classError}</p>}
                  <button onClick={addClass}
                    className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition">
                    + Add Class
                  </button>
                  {manualClasses.length > 0 && (
                    <div className="space-y-1 pt-1 max-h-36 overflow-y-auto">
                      {manualClasses.map((c, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs border border-gray-100">
                          <span className="text-gray-700 truncate">{c.name} <span className="text-gray-400">· {c.day} {c.blockStart}{c.blockEnd !== c.blockStart ? `–${c.blockEnd}` : ''}</span></span>
                          <button onClick={() => setManualClasses(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 transition ml-2 shrink-0">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Generate */}
          <button onClick={generateSchedule} disabled={!hasStudents || !hasClasses || loading}
            className="w-full bg-[#0073ea] hover:bg-[#0060c0] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition shadow-sm">
            {loading && !schedule ? '⏳ Generating...' : '⚡ Generate Schedule'}
          </button>
          {apiError && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 break-words border border-red-100">{apiError}</p>}
        </div>

        {/* Right panel — schedule + chat */}
        <div className="lg:col-span-2 space-y-4">

          {/* Student selector tabs — above schedule */}
          {schedule && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Select Student</p>
              <div className="flex flex-wrap gap-2">
                {schedule.students.map(s => (
                  <button key={s.name} onClick={() => setSelectedStudent(s.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      selectedStudent === s.name
                        ? 'bg-[#0073ea] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {s.name}
                    <span className={`ml-1.5 text-xs ${selectedStudent === s.name ? 'text-blue-200' : 'text-gray-400'}`}>Gr. {s.grade}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Schedule grid */}
          {currentStudent ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="border-l-4 border-emerald-500 px-4 py-3">
                <h2 className="font-bold text-[#1f1f3d]">
                  {currentStudent.name}&apos;s Weekly Schedule
                  <span className="ml-2 text-sm font-normal text-gray-400">Grade {currentStudent.grade}</span>
                </h2>
              </div>
              <div className="overflow-x-auto px-4 pb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 text-gray-400 font-medium text-xs w-24">Block</th>
                      {DAYS.map((day, i) => (
                        <th key={day} className={`p-2 text-center text-white text-xs font-semibold ${DAY_COLORS[i]}`}>
                          {day.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {BLOCKS.map(({ key, time }, rowIdx) => (
                      <tr key={key} className={rowIdx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="p-2 border-t border-gray-100">
                          <div className="font-semibold text-gray-700 text-xs">{key}</div>
                          <div className="text-xs text-gray-400">{time}</div>
                        </td>
                        {DAYS.map(day => {
                          const activity = currentStudent.schedule[day]?.[key];
                          return (
                            <td key={day} className="p-2 text-center border-t border-gray-100">
                              {activity
                                ? <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${getActivityColor(activity)}`}>{activity}</span>
                                : <span className="text-gray-200 text-xs">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
              <p className="text-5xl mb-3">🗓️</p>
              <p className="text-sm">Add students and classes, then generate a schedule.</p>
            </div>
          )}

          {/* Chat — Perplexity/Gemini style */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                <span className="text-white text-sm leading-none">✦</span>
              </div>
              <h2 className="font-semibold text-gray-800 text-sm">AI Scheduler Assistant</h2>
            </div>

            <div className="px-5 py-4 space-y-4 min-h-32 max-h-72 overflow-y-auto">
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-xl leading-none">✦</span>
                  </div>
                  <p className="text-sm text-gray-500">Generate a schedule, then ask me to refine it.</p>
                  <p className="text-xs text-gray-400 mt-1">e.g. &quot;Move Emma out of Basketball on Tuesday&quot;</p>
                </div>
              )}
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="bg-[#0073ea] text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%] leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white text-xs leading-none">✦</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 text-gray-700 text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                )
              )}
              {loading && schedule && (
                <div className="flex gap-2.5 items-center">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs leading-none">✦</span>
                  </div>
                  <div className="flex gap-1 px-4 py-3 bg-gray-50 rounded-2xl rounded-tl-sm border border-gray-100">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 pb-4">
              <div className={`flex items-center gap-2 border rounded-2xl px-4 py-2.5 transition-all ${!schedule || loading ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300 focus-within:border-[#0073ea] focus-within:ring-2 focus-within:ring-blue-100'}`}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder={schedule ? 'Ask me to adjust the schedule...' : 'Generate a schedule first...'}
                  disabled={!schedule || loading}
                  className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 bg-transparent focus:outline-none disabled:text-gray-400"
                />
                <button onClick={sendMessage} disabled={!schedule || loading || !input.trim()}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 ${input.trim() && schedule && !loading ? 'bg-[#0073ea] hover:bg-[#0060c0] text-white' : 'bg-gray-200 text-gray-400'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
