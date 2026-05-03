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
          className={`px-3 py-1 capitalize transition ${mode === m ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <span className="text-2xl">🗓️</span>
        <div>
          <h1 className="text-xl font-bold">ClassMaker.ai</h1>
          <p className="text-indigo-200 text-sm">AI-powered afterschool block scheduler — classmaker.ai</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="space-y-4">

          {/* Students */}
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">1. Students</h2>
              <ModeToggle mode={studentMode} onChange={setStudentMode} />
            </div>

            {studentMode === 'csv' ? (
              <div>
                <input type="file" accept=".csv" onChange={handleFileUpload(setStudentsCSV)} className="text-sm w-full" />
                {studentsCSV && <p className="text-xs text-green-600 mt-1">✓ Loaded</p>}
                <div className="mt-2 p-2.5 bg-indigo-50 rounded-lg text-xs text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-700">Required CSV columns (in order):</p>
                  <ul className="space-y-0.5 list-none">
                    <li><span className="font-medium text-gray-800">name</span> — Student's full name (e.g. Emma Smith)</li>
                    <li><span className="font-medium text-gray-800">grade</span> — Grade level: 1–8</li>
                    <li><span className="font-medium text-gray-800">pickup_block</span> — Latest block they can stay: BLK0 (3:30 PM), BLK1 (4:30 PM), BLK2 (5:30 PM), BLK3 (6:30 PM)</li>
                    <li><span className="font-medium text-gray-800">goals</span> — Academic focus areas, separated by + (e.g. reading+math)</li>
                    <li><span className="font-medium text-gray-800">preferences</span> — Activity types, separated by + (e.g. Academic+Music)</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={studentForm.firstName}
                    onChange={e => setStudentForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name"
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <input
                    value={studentForm.lastName}
                    onChange={e => setStudentForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Grade</label>
                    <select value={studentForm.grade} onChange={e => setStudentForm(f => ({ ...f, grade: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                      {[1,2,3,4,5,6,7,8].map(g => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Pickup</label>
                    <select value={studentForm.pickupBlock} onChange={e => setStudentForm(f => ({ ...f, pickupBlock: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300">
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
                        className={`text-xs px-2 py-0.5 rounded-full border transition ${studentForm.preferences.includes(pref) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'}`}>
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  value={studentForm.goals}
                  onChange={e => setStudentForm(f => ({ ...f, goals: e.target.value }))}
                  placeholder="Academic goals (e.g. reading, math)"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button onClick={addStudent} disabled={!studentForm.firstName.trim() || !studentForm.lastName.trim()}
                  className="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-indigo-100 transition">
                  + Add Student
                </button>
                {manualStudents.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {manualStudents.map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-sm">
                        <span className="text-gray-700">{s.firstName} {s.lastName} <span className="text-gray-400">· Gr. {s.grade}</span></span>
                        <button onClick={() => setManualStudents(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 transition text-xs ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Classes */}
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">2. Classes</h2>
              <ModeToggle mode={classMode} onChange={setClassMode} />
            </div>

            {classMode === 'csv' ? (
              <div>
                <input type="file" accept=".csv" onChange={handleFileUpload(setClassesCSV)} className="text-sm w-full" />
                {classesCSV && <p className="text-xs text-green-600 mt-1">✓ Loaded</p>}
                <div className="mt-2 p-2.5 bg-indigo-50 rounded-lg text-xs text-gray-600 space-y-1">
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
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={classForm.name}
                  onChange={e => setClassForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Class name (e.g. Group Piano)"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Day</label>
                    <select value={classForm.day} onChange={e => setClassForm(f => ({ ...f, day: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                      {DAYS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Type</label>
                    <select value={classForm.type} onChange={e => setClassForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                      {CLASS_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Start block</label>
                    <select value={classForm.blockStart} onChange={e => setClassForm(f => ({ ...f, blockStart: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                      {BLOCK_KEYS.map(b => <option key={b} value={b}>{blockLabel(b)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">End block</label>
                    <select value={classForm.blockEnd} onChange={e => setClassForm(f => ({ ...f, blockEnd: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                      {BLOCK_KEYS.map(b => <option key={b} value={b}>{blockLabel(b)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Min grade</label>
                    <select value={classForm.gradeMin} onChange={e => setClassForm(f => ({ ...f, gradeMin: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                      {[1,2,3,4,5,6,7,8].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Max grade</label>
                    <select value={classForm.gradeMax} onChange={e => setClassForm(f => ({ ...f, gradeMax: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                      {[1,2,3,4,5,6,7,8].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Capacity</label>
                    <input type="number" min={1} value={classForm.capacity} onChange={e => setClassForm(f => ({ ...f, capacity: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                </div>
                {classError && <p className="text-xs text-red-500">{classError}</p>}
                <button onClick={addClass}
                  className="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-100 transition">
                  + Add Class
                </button>
                {manualClasses.length > 0 && (
                  <div className="space-y-1 pt-1 max-h-36 overflow-y-auto">
                    {manualClasses.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-gray-700 truncate">{c.name} <span className="text-gray-400">· {c.day} {c.blockStart}{c.blockEnd !== c.blockStart ? `–${c.blockEnd}` : ''}</span></span>
                        <button onClick={() => setManualClasses(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 transition ml-2 shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generate */}
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <button
              onClick={generateSchedule}
              disabled={!hasStudents || !hasClasses || loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition"
            >
              {loading && !schedule ? 'Generating...' : '3. Generate Schedule'}
            </button>
            {apiError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 break-words">{apiError}</p>}
          </div>

          {/* Student selector */}
          {schedule && (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold text-gray-800 mb-2">View Schedule</h2>
              <div className="space-y-1">
                {schedule.students.map(s => (
                  <button key={s.name} onClick={() => setSelectedStudent(s.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedStudent === s.name ? 'bg-indigo-100 text-indigo-700 font-medium' : 'hover:bg-gray-100 text-gray-700'}`}>
                    {s.name} <span className="text-gray-400 ml-1">· Gr. {s.grade}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {currentStudent ? (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold text-gray-800 mb-3">
                {currentStudent.name}&apos;s Weekly Schedule
                <span className="ml-2 text-sm font-normal text-gray-500">Grade {currentStudent.grade}</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 bg-gray-100 rounded-tl-lg w-28 text-gray-600">Block</th>
                      {DAYS.map(day => <th key={day} className="p-2 bg-gray-100 text-center text-gray-600 font-medium">{day}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {BLOCKS.map(({ key, time }) => (
                      <tr key={key} className="border-t border-gray-100">
                        <td className="p-2">
                          <div className="font-medium text-gray-700 text-xs">{key}</div>
                          <div className="text-xs text-gray-400">{time}</div>
                        </td>
                        {DAYS.map(day => {
                          const activity = currentStudent.schedule[day]?.[key];
                          return (
                            <td key={day} className="p-2 text-center">
                              {activity
                                ? <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${getActivityColor(activity)}`}>{activity}</span>
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
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
              <p className="text-5xl mb-3">🗓️</p>
              <p className="text-sm">Add students and classes, then generate a schedule.</p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-gray-800 mb-3">Refine with Chat</h2>
            <div className="space-y-2 max-h-52 overflow-y-auto mb-3 pr-1">
              {messages.map((m, i) => (
                <div key={i} className={`text-sm px-3 py-2 rounded-lg ${m.role === 'user' ? 'bg-indigo-50 text-indigo-800 ml-10' : 'bg-gray-50 text-gray-700 mr-10'}`}>
                  {m.content}
                </div>
              ))}
              {loading && schedule && <div className="text-sm text-gray-400 italic px-3">Thinking...</div>}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={schedule ? 'e.g. "Move Emma out of Basketball on Tuesday"' : 'Generate a schedule first...'}
                disabled={!schedule || loading}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button onClick={sendMessage} disabled={!schedule || loading || !input.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
