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
const DEFAULT_CLASS_TYPES = ['Academic', 'Music', 'Athletic', 'Dance', 'Art', 'Club', 'Study', 'Language'];
const DEFAULT_PREFERENCES = ['Music', 'Art', 'Dance', 'Basketball', 'Chinese', 'Reading', 'Math', 'Taekwondo', 'Gymnastics', 'Leadership'];

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

function getCurrentWeekValue(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const startOfW1 = new Date(jan4);
  startOfW1.setUTCDate(jan4.getUTCDate() - dow + 1);
  const weekNum = Math.ceil((now.getTime() - startOfW1.getTime() + 1) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

function weekValueToLabel(weekValue: string): string {
  if (!weekValue) return '';
  const [yearStr, weekStr] = weekValue.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const startOfW1 = new Date(jan4);
  startOfW1.setUTCDate(jan4.getUTCDate() - dow + 1);
  const monday = new Date(startOfW1);
  monday.setUTCDate(startOfW1.getUTCDate() + (week - 1) * 7);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(monday)} – ${fmt(friday)}, ${year}`;
}

function StepCard({
  step, chip, title, description, open, onToggle, children, flush, accentBar,
}: {
  step: number; chip: string; title: string; description: string;
  open: boolean; onToggle: () => void; children: React.ReactNode; flush?: boolean; accentBar?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_24px_rgba(0,0,0,0.06)] overflow-hidden">
      {accentBar && <div className={`h-1 w-full ${accentBar}`} />}
      <button onClick={onToggle} className="w-full px-5 pt-4 pb-3.5 flex items-center justify-between hover:bg-gray-50/70 transition text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${chip}`}>{step}</span>
          <div className="min-w-0">
            <h2 className="font-semibold text-[#1d1d1f] text-sm tracking-[-0.01em] leading-snug">{title}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>
        <span className="text-gray-300 text-[10px] w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 ml-3">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className={flush ? '' : 'px-5 pb-5 pt-1 space-y-2.5'}>{children}</div>}
    </div>
  );
}

function buildMasterSchedule(students: StudentSchedule[]): Record<DayKey, Record<BlockKey, Record<string, string[]>>> {
  const result = {} as Record<DayKey, Record<BlockKey, Record<string, string[]>>>;
  for (const day of DAYS) {
    result[day] = {} as Record<BlockKey, Record<string, string[]>>;
    for (const { key } of BLOCKS) {
      result[day][key] = {};
    }
  }
  for (const student of students) {
    for (const day of DAYS) {
      for (const { key } of BLOCKS) {
        const activity = student.schedule[day]?.[key];
        if (activity) {
          if (!result[day][key][activity]) result[day][key][activity] = [];
          result[day][key][activity].push(student.name);
        }
      }
    }
  }
  return result;
}

function downloadMasterScheduleCSV(students: StudentSchedule[]) {
  const master = buildMasterSchedule(students);
  const rows: string[] = ['Day,Block,Time,Class,Students'];
  for (const day of DAYS) {
    for (const { key, time } of BLOCKS) {
      const cell = master[day]?.[key] ?? {};
      for (const [activity, names] of Object.entries(cell)) {
        rows.push(`${day},${key},${time},"${activity}","${names.join('; ')}"`);
      }
    }
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'master_schedule.csv'; a.click();
  URL.revokeObjectURL(url);
}

function ModeToggle({ mode, onChange }: { mode: 'csv' | 'manual'; onChange: (m: 'csv' | 'manual') => void }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-gray-200 text-[11px] bg-gray-100">
      {(['manual', 'csv'] as const).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-3 py-1.5 font-medium capitalize transition-all duration-200 ${mode === m ? 'bg-white text-[#1d1d1f] shadow-sm rounded-xl' : 'text-gray-400 hover:text-gray-600'}`}
        >
          {m === 'manual' ? 'Manual' : 'CSV'}
        </button>
      ))}
    </div>
  );
}

const HEADER_ALIASES: Record<string, string> = {
  // student name
  student_name: 'name', full_name: 'name', student: 'name', first_last: 'name',
  // grade
  grade_level: 'grade', yr: 'grade', year: 'grade', gradelevel: 'grade',
  // pickup_block
  pickup: 'pickup_block', pickup_time: 'pickup_block', dismissal: 'pickup_block',
  dismissal_block: 'pickup_block', latest_block: 'pickup_block', latest_pickup: 'pickup_block',
  // goals
  academic_goals: 'goals', goal: 'goals', learning_goals: 'goals',
  // preferences
  preference: 'preferences', interests: 'preferences', activities: 'preferences', activity_preferences: 'preferences',
  // class name
  class_name: 'name', activity: 'name', course: 'name', class: 'name', subject: 'name',
  // day
  weekday: 'day', week_day: 'day', day_of_week: 'day',
  // block_start
  start_block: 'block_start', start: 'block_start', time_start: 'block_start', block: 'block_start', start_time: 'block_start',
  // block_end
  end_block: 'block_end', end: 'block_end', time_end: 'block_end', end_time: 'block_end',
  // grade_min
  min_grade: 'grade_min', from_grade: 'grade_min', minimum_grade: 'grade_min',
  // grade_max
  max_grade: 'grade_max', to_grade: 'grade_max', maximum_grade: 'grade_max',
  // capacity
  max_students: 'capacity', slots: 'capacity', size: 'capacity', max_capacity: 'capacity', seats: 'capacity',
  // type
  category: 'type', activity_type: 'type', class_type: 'type', subject_type: 'type',
};

function canonicalizeHeader(h: string): string {
  const key = h.trim().toLowerCase().replace(/[\s\-]+/g, '_');
  return HEADER_ALIASES[key] ?? key;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function normalizeCSV(raw: string, requiredCols: string[]): { csv: string; missing: string[]; detected: string[] } {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 1) return { csv: raw, missing: requiredCols, detected: [] };

  const rawHeaders = splitCSVLine(lines[0]);
  const canonical = rawHeaders.map(canonicalizeHeader);
  const detected = canonical.filter(h => requiredCols.includes(h));
  const missing = requiredCols.filter(col => !canonical.includes(col));

  if (missing.length > 0) return { csv: raw, missing, detected };

  const normalized = [
    requiredCols.join(','),
    ...lines.slice(1).map(line => {
      const vals = splitCSVLine(line);
      const row: Record<string, string> = {};
      rawHeaders.forEach((h, i) => { row[canonicalizeHeader(h)] = vals[i] ?? ''; });
      return requiredCols.map(col => row[col] ?? '').join(',');
    }),
  ].join('\n');

  return { csv: normalized, missing: [], detected };
}

const STUDENT_COLS = ['name', 'grade', 'pickup_block', 'goals', 'preferences'];
const CLASS_COLS = ['name', 'day', 'block_start', 'block_end', 'grade_min', 'grade_max', 'capacity', 'type'];

export default function Home() {
  const [studentMode, setStudentMode] = useState<'csv' | 'manual'>('manual');
  const [classMode, setClassMode] = useState<'csv' | 'manual'>('manual');

  const [studentsCSV, setStudentsCSV] = useState('');
  const [classesCSV, setClassesCSV] = useState('');
  const [studentsCSVWarning, setStudentsCSVWarning] = useState<string | null>(null);
  const [classesCSVWarning, setClassesCSVWarning] = useState<string | null>(null);

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

  const [customPreferences, setCustomPreferences] = useState<string[]>([...DEFAULT_PREFERENCES]);
  const [customClassTypes, setCustomClassTypes] = useState<string[]>([...DEFAULT_CLASS_TYPES]);
  const [showCustomize, setShowCustomize] = useState(false);
  const [newPrefInput, setNewPrefInput] = useState('');
  const [newTypeInput, setNewTypeInput] = useState('');
  const [setupMessages, setSetupMessages] = useState<Message[]>([]);
  const [setupInput, setSetupInput] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSuggestions, setSetupSuggestions] = useState<{ preferences: string[]; classTypes: string[]; message: string } | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [selectedWeek, setSelectedWeek] = useState<string>(getCurrentWeekValue());

  const [showStudents, setShowStudents] = useState(true);
  const [showClasses, setShowClasses] = useState(true);
  const [showStudentSchedule, setShowStudentSchedule] = useState(true);
  const [showMasterSchedule, setShowMasterSchedule] = useState(true);
  const [showChat, setShowChat] = useState(true);

  const handleFileUpload = (
    setter: (val: string) => void,
    warnSetter: (w: string | null) => void,
    requiredCols: string[]
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result as string;
      const { csv, missing } = normalizeCSV(raw, requiredCols);
      if (missing.length > 0) {
        warnSetter(`Missing columns: ${missing.join(', ')}. Please check your CSV.`);
        setter('');
      } else {
        warnSetter(null);
        setter(csv);
      }
    };
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
        body: JSON.stringify({ studentsCSV: getStudentsData(), classesCSV: getClassesData(), messages: msgs, currentSchedule: current, weekLabel: selectedWeek ? `Week ${selectedWeek.split('-W')[1]} (${weekValueToLabel(selectedWeek)})` : undefined }),
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

  const sendSetupMessage = async () => {
    if (!setupInput.trim()) return;
    const updated: Message[] = [...setupMessages, { role: 'user' as const, content: setupInput }];
    setSetupMessages(updated);
    setSetupInput('');
    setSetupLoading(true);
    setSetupError(null);
    setSetupSuggestions(null);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setSetupError(data.error || 'Unknown error'); return; }
      setSetupMessages(prev => [...prev, { role: 'assistant' as const, content: data.message }]);
      if (data.preferences?.length > 0 || data.classTypes?.length > 0) {
        setSetupSuggestions({ preferences: data.preferences ?? [], classTypes: data.classTypes ?? [], message: data.message });
      }
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : String(err));
    } finally {
      setSetupLoading(false);
    }
  };

  const addPreference = () => {
    const v = newPrefInput.trim();
    if (!v || customPreferences.includes(v)) return;
    setCustomPreferences(p => [...p, v]);
    setNewPrefInput('');
  };

  const addClassType = () => {
    const v = newTypeInput.trim();
    if (!v || customClassTypes.includes(v)) return;
    setCustomClassTypes(t => [...t, v]);
    setNewTypeInput('');
  };

  const currentStudent = schedule?.students.find(s => s.name === selectedStudent);
  const DAY_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-rose-500'];

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#0f0c29] via-[#1a1040] to-[#0d1b4b] text-white px-8 py-4 flex items-center gap-4 shadow-2xl border-b border-white/5 backdrop-blur-xl">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red-500 via-violet-500 to-blue-500 flex items-center justify-center shadow-lg shrink-0">
          <span className="text-white text-base leading-none">✦</span>
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold tracking-[-0.02em] bg-gradient-to-r from-white via-blue-100 to-violet-300 bg-clip-text text-transparent">ClassMaker AI</h1>
          <p className="text-[10px] text-white/40 tracking-wide uppercase mt-0.5">Make your Master Schedule of classes in seconds!</p>
        </div>
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-white/30 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </header>

      {/* Hero — Every student, perfectly placed */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.03em] text-[#1d1d1f] mb-3">Every student, perfectly placed.</h2>
            <p className="text-gray-500 text-base max-w-2xl mx-auto leading-relaxed">ClassMaker AI helps afterschool programs, enrichment centers, and school coordinators build smart weekly schedules in seconds — no spreadsheets, no back-and-forth.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="rounded-2xl p-6 border-t-4 border-red-500 bg-red-50">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center mb-4"><span className="text-red-500 text-lg">⚡</span></div>
              <h3 className="text-[#1d1d1f] font-semibold text-sm mb-2 tracking-[-0.01em]">From roster to schedule in seconds</h3>
              <p className="text-gray-500 text-xs leading-relaxed">Enter your students and available classes — manually or by uploading a CSV. The AI reads each student&apos;s grade, pickup time, and activity preferences, then builds a complete weekly schedule that respects every constraint automatically.</p>
            </div>
            <div className="rounded-2xl p-6 border-t-4 border-violet-500 bg-violet-50">
              <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center mb-4"><span className="text-violet-500 text-lg">✦</span></div>
              <h3 className="text-[#1d1d1f] font-semibold text-sm mb-2 tracking-[-0.01em]">Adjust with plain English</h3>
              <p className="text-gray-500 text-xs leading-relaxed">Need to make a change? Just type it. Say &ldquo;Move Emma out of Basketball on Tuesday&rdquo; or &ldquo;Give all 3rd graders a study block on Mondays&rdquo; — the AI updates the schedule instantly, no re-entering data required.</p>
            </div>
            <div className="rounded-2xl p-6 border-t-4 border-teal-500 bg-teal-50">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 flex items-center justify-center mb-4"><span className="text-teal-500 text-lg">🗓️</span></div>
              <h3 className="text-[#1d1d1f] font-semibold text-sm mb-2 tracking-[-0.01em]">See the full picture</h3>
              <p className="text-gray-500 text-xs leading-relaxed">View each student&apos;s personal weekly schedule, then switch to the Master Schedule to see every class running across the whole week — so coordinators and principals always have the full picture.</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {['For Afterschool Programs', 'For Enrichment Centers', 'For Principals & Coordinators', 'Manual or CSV Input', 'AI-Generated & Editable'].map(tag => (
              <span key={tag} className="text-[11px] text-gray-500 border border-gray-200 px-3 py-1 rounded-full bg-gray-50">{tag}</span>
            ))}
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[#1d1d1f] tracking-[-0.01em]">Ready to begin? Start below ↓</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">

        {/* STEP 1 — AI Agent Master Schedule Preferences */}
        <StepCard
          step={1}
          chip="bg-red-500 text-white border-red-600"
          accentBar="bg-red-500"
          title="AI Agent : Master Schedule Preferences"
          description="Tell the AI Agent what you prefer in the master schedule."
          open={showCustomize}
          onToggle={() => setShowCustomize(v => !v)}
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Assistant</p>
            <p className="text-xs text-gray-500">Describe your program and the AI will suggest preferences and class types for you.</p>
            {setupMessages.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {setupMessages.map((m, i) =>
                  m.role === 'user' ? (
                    <div key={i} className="flex justify-end">
                      <div className="bg-emerald-600 text-white text-xs px-3 py-2 rounded-2xl rounded-tr-sm max-w-[85%]">{m.content}</div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 mt-0.5"><span className="text-white text-[9px]">✦</span></div>
                      <div className="bg-gray-50 border border-gray-100 text-gray-700 text-xs px-3 py-2 rounded-2xl rounded-tl-sm max-w-[85%]">{m.content}</div>
                    </div>
                  )
                )}
                {setupLoading && (
                  <div className="flex gap-2 items-center">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0"><span className="text-white text-[9px]">✦</span></div>
                    <div className="flex gap-1 px-3 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
              </div>
            )}
            {setupSuggestions && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-emerald-800">Suggested Fields Ready</p>
                {setupSuggestions.preferences.length > 0 && (
                  <div className="flex flex-wrap gap-1">{setupSuggestions.preferences.map(p => <span key={p} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{p}</span>)}</div>
                )}
                {setupSuggestions.classTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1">{setupSuggestions.classTypes.map(t => <span key={t} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{t}</span>)}</div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { if (setupSuggestions.preferences.length > 0) setCustomPreferences(setupSuggestions.preferences); if (setupSuggestions.classTypes.length > 0) setCustomClassTypes(setupSuggestions.classTypes); setSetupSuggestions(null); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 rounded-lg transition">Apply Suggestions</button>
                  <button onClick={() => setSetupSuggestions(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 transition">Dismiss</button>
                </div>
              </div>
            )}
            {setupError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">{setupError}</p>}
            <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-all ${setupLoading ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100'}`}>
              <input value={setupInput} onChange={e => setSetupInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendSetupMessage()} disabled={setupLoading} placeholder="e.g. We offer chess, robotics, ballet, and tutoring for K-8" className="flex-1 text-xs text-gray-900 placeholder:text-gray-400 bg-transparent focus:outline-none disabled:text-gray-400" />
              <button onClick={sendSetupMessage} disabled={setupLoading || !setupInput.trim()} className={`w-6 h-6 rounded-full flex items-center justify-center transition shrink-0 ${setupInput.trim() && !setupLoading ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-200 text-gray-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
              </button>
            </div>
          </div>
          <hr className="border-gray-100" />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activity Preferences</p>
            <div className="flex flex-wrap gap-1">
              {customPreferences.map(pref => (
                <span key={pref} className="flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">
                  {pref}<button onClick={() => setCustomPreferences(p => p.filter(x => x !== pref))} className="text-violet-400 hover:text-red-500 transition leading-none">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={newPrefInput} onChange={e => setNewPrefInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPreference()} placeholder="Add preference..." className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300" />
              <button onClick={addPreference} disabled={!newPrefInput.trim()} className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-2.5 py-1 rounded-lg disabled:opacity-40 transition">+</button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Class Types</p>
            <div className="flex flex-wrap gap-1">
              {customClassTypes.map(type => (
                <span key={type} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  {type}<button onClick={() => setCustomClassTypes(t => t.filter(x => x !== type))} className="text-blue-400 hover:text-red-500 transition leading-none">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={newTypeInput} onChange={e => setNewTypeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addClassType()} placeholder="Add class type..." className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <button onClick={addClassType} disabled={!newTypeInput.trim()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-2.5 py-1 rounded-lg disabled:opacity-40 transition">+</button>
            </div>
          </div>
        </StepCard>

        {/* STEP 2 — Students */}
        <StepCard
          step={2}
          chip="bg-orange-500 text-white border-orange-600"
          accentBar="bg-orange-500"
          title="Add Student Info"
          description={studentMode === 'manual' ? `${manualStudents.length} student${manualStudents.length !== 1 ? 's' : ''} added` : studentsCSV ? 'CSV loaded' : 'Add the Student Info either Manually or via CSV'}
          open={showStudents}
          onToggle={() => setShowStudents(v => !v)}
        >
          <div className="flex justify-end mb-1"><ModeToggle mode={studentMode} onChange={setStudentMode} /></div>
          {studentMode === 'csv' ? (
            <>
              <label className="flex items-center justify-center gap-2 w-full cursor-pointer bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" /><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" /></svg>
                {studentsCSV ? 'Replace Students CSV' : 'Upload Students CSV'}
                <input type="file" accept=".csv" onChange={handleFileUpload(setStudentsCSV, setStudentsCSVWarning, STUDENT_COLS)} className="sr-only" />
              </label>
              {studentsCSVWarning && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">{studentsCSVWarning}</p>}
              {studentsCSV && !studentsCSVWarning && <p className="text-xs text-emerald-600 flex items-center gap-1"><span>✓</span> File loaded successfully</p>}
              <a href="/sample_students.csv" download className="flex items-center gap-1.5 text-xs text-violet-700 hover:underline font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z"/><path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z"/></svg>
                Download sample_students.csv
              </a>
              <div className="p-2.5 bg-violet-50 rounded-lg text-xs text-gray-600 space-y-1 border border-violet-100">
                <p className="font-semibold text-gray-700">Required CSV columns:</p>
                <ul className="space-y-0.5 list-none">
                  <li><span className="font-medium text-gray-800">name</span> — Student&apos;s full name</li>
                  <li><span className="font-medium text-gray-800">grade</span> — Grade level: 1–8</li>
                  <li><span className="font-medium text-gray-800">pickup_block</span> — BLK0 (3:30), BLK1 (4:30), BLK2 (5:30), BLK3 (6:30)</li>
                  <li><span className="font-medium text-gray-800">goals</span> — Academic focus areas, e.g. reading+math</li>
                  <li><span className="font-medium text-gray-800">preferences</span> — Activity types, e.g. Academic+Music</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input value={studentForm.firstName} onChange={e => setStudentForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                <input value={studentForm.lastName} onChange={e => setStudentForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300" />
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
                    <option value="BLK0">3:30 PM</option><option value="BLK1">4:30 PM</option><option value="BLK2">5:30 PM</option><option value="BLK3">6:30 PM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Preferences</label>
                <div className="flex flex-wrap gap-1">
                  {customPreferences.map(pref => (
                    <button key={pref} onClick={() => togglePreference(pref)} className={`text-xs px-2 py-0.5 rounded-full border transition ${studentForm.preferences.includes(pref) ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-300 text-gray-600 hover:border-violet-400'}`}>{pref}</button>
                  ))}
                </div>
              </div>
              <input value={studentForm.goals} onChange={e => setStudentForm(f => ({ ...f, goals: e.target.value }))} placeholder="Academic goals (e.g. reading, math)" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300" />
              <button onClick={addStudent} disabled={!studentForm.firstName.trim() || !studentForm.lastName.trim()} className="w-full bg-violet-50 text-violet-700 border border-violet-200 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-violet-100 transition">+ Add Student</button>
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
        </StepCard>

        {/* STEP 3 — Classes */}
        <StepCard
          step={3}
          chip="bg-yellow-400 text-yellow-900 border-yellow-500"
          accentBar="bg-yellow-400"
          title="Add Class Info"
          description={classMode === 'manual' ? `${manualClasses.length} class${manualClasses.length !== 1 ? 'es' : ''} added` : classesCSV ? 'CSV loaded' : 'Add the Class Info either Manually or via CSV'}
          open={showClasses}
          onToggle={() => setShowClasses(v => !v)}
        >
          <div className="flex justify-end mb-1"><ModeToggle mode={classMode} onChange={setClassMode} /></div>
          {classMode === 'csv' ? (
            <>
              <label className="flex items-center justify-center gap-2 w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" /><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" /></svg>
                {classesCSV ? 'Replace Classes CSV' : 'Upload Classes CSV'}
                <input type="file" accept=".csv" onChange={handleFileUpload(setClassesCSV, setClassesCSVWarning, CLASS_COLS)} className="sr-only" />
              </label>
              {classesCSVWarning && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">{classesCSVWarning}</p>}
              {classesCSV && !classesCSVWarning && <p className="text-xs text-emerald-600 flex items-center gap-1"><span>✓</span> File loaded successfully</p>}
              <a href="/sample_classes.csv" download className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z"/><path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z"/></svg>
                Download sample_classes.csv
              </a>
              <div className="p-2.5 bg-blue-50 rounded-lg text-xs text-gray-600 space-y-1 border border-blue-100">
                <p className="font-semibold text-gray-700">Required CSV columns:</p>
                <ul className="space-y-0.5 list-none">
                  <li><span className="font-medium text-gray-800">name</span> — Class name</li>
                  <li><span className="font-medium text-gray-800">day</span> — Day of the week</li>
                  <li><span className="font-medium text-gray-800">block_start / block_end</span> — BLK0–BLK3</li>
                  <li><span className="font-medium text-gray-800">grade_min / grade_max</span> — 1–8</li>
                  <li><span className="font-medium text-gray-800">capacity</span> — Max students</li>
                  <li><span className="font-medium text-gray-800">type</span> — Academic, Art, Music, Athletic…</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <input value={classForm.name} onChange={e => setClassForm(f => ({ ...f, name: e.target.value }))} placeholder="Class name (e.g. Group Piano)" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
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
                    {customClassTypes.map(t => <option key={t}>{t}</option>)}
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
                  <input type="number" min={1} value={classForm.capacity} onChange={e => setClassForm(f => ({ ...f, capacity: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
              {classError && <p className="text-xs text-red-500">{classError}</p>}
              <button onClick={addClass} className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition">+ Add Class</button>
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
        </StepCard>

        {/* STEP 4 — Generate */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-green-500" />
          <div className="px-5 py-4 flex items-center gap-4">
            <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0">4</span>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-[#1d1d1f] text-sm tracking-[-0.01em]">Generate</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Generate the Master Schedule</p>
            </div>
            <button onClick={generateSchedule} disabled={!hasStudents || !hasClasses || loading}
              className="shrink-0 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all shadow-md shadow-emerald-500/20 tracking-[-0.01em] whitespace-nowrap">
              {loading && !schedule ? '✦ Generating…' : '⚡ Generate'}
            </button>
          </div>
          <div className="px-5 pb-4 flex items-center gap-3 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">Schedule week</span>
              <input
                type="week"
                value={selectedWeek}
                onChange={e => setSelectedWeek(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            {selectedWeek && (
              <span className="text-[11px] text-emerald-600 font-medium">{weekValueToLabel(selectedWeek)}</span>
            )}
          </div>
          {apiError && <div className="px-5 pb-4"><p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 break-words border border-red-100">{apiError}</p></div>}
        </div>

        {/* STEP 5 — Individual Student Schedule */}
        {schedule && (
          <StepCard
            step={5}
            chip="bg-teal-500 text-white border-teal-600"
            accentBar="bg-teal-500"
            title="Review Student's Schedule"
            description={currentStudent ? `Viewing: ${currentStudent.name} · Grade ${currentStudent.grade}` : 'Review Each Student Schedule generated by the AI Agent'}
            open={showStudentSchedule}
            onToggle={() => setShowStudentSchedule(v => !v)}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {schedule.students.map(s => (
                <button key={s.name} onClick={() => setSelectedStudent(s.name)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${selectedStudent === s.name ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md shadow-blue-500/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s.name}<span className={`ml-1.5 text-xs ${selectedStudent === s.name ? 'text-blue-200' : 'text-gray-400'}`}>Gr. {s.grade}</span>
                </button>
              ))}
            </div>
            {currentStudent && (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left pb-2 text-gray-400 font-medium text-xs w-24 pr-3">Block</th>
                      {DAYS.map((day, i) => (
                        <th key={day} className="pb-2 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-white text-[11px] font-semibold tracking-wide ${DAY_COLORS[i]}`}>{day.slice(0, 3)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {BLOCKS.map(({ key, time }, rowIdx) => (
                      <tr key={key} className={rowIdx % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'}>
                        <td className="py-3 pr-3 border-t border-gray-100 align-middle">
                          <div className="font-semibold text-gray-700 text-xs">{key}</div>
                          <div className="text-[11px] text-gray-400">{time}</div>
                        </td>
                        {DAYS.map(day => {
                          const activity = currentStudent.schedule[day]?.[key];
                          return (
                            <td key={day} className="py-3 px-1 text-center border-t border-gray-100 align-middle">
                              {activity ? <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${getActivityColor(activity)}`}>{activity}</span> : <span className="text-gray-200 text-xs">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </StepCard>
        )}

        {/* STEP 6 — Master Schedule */}
        {schedule && schedule.students.length > 0 && (() => {
          const master = buildMasterSchedule(schedule.students);
          return (
            <StepCard
              step={6}
              chip="bg-blue-500 text-white border-blue-600"
              accentBar="bg-blue-500"
              title="Review Master Schedule"
              description="Review the Master Schedule generated by the AI Agent"
              open={showMasterSchedule}
              onToggle={() => setShowMasterSchedule(v => !v)}
            >
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left pb-2 text-gray-400 font-medium text-xs w-24 pr-3">Block</th>
                      {DAYS.map((day, i) => (
                        <th key={day} className="pb-2 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-white text-[11px] font-semibold tracking-wide ${DAY_COLORS[i]}`}>{day.slice(0, 3)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {BLOCKS.map(({ key, time }, rowIdx) => (
                      <tr key={key} className={rowIdx % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'}>
                        <td className="py-3 pr-3 border-t border-gray-100 align-top">
                          <div className="font-semibold text-gray-700 text-xs">{key}</div>
                          <div className="text-[11px] text-gray-400">{time}</div>
                        </td>
                        {DAYS.map(day => {
                          const cell = master[day]?.[key] ?? {};
                          const entries = Object.entries(cell);
                          return (
                            <td key={day} className="py-3 px-1 border-t border-gray-100 align-top min-w-[100px]">
                              {entries.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                  {entries.map(([activity, studentNames]) => (
                                    <div key={activity} className={`group relative px-2.5 py-1 rounded-lg text-xs font-medium cursor-default ${getActivityColor(activity)}`}>
                                      <span>{activity}</span><span className="ml-1 opacity-50 font-normal">({studentNames.length})</span>
                                      <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-1.5 w-max max-w-[200px] bg-[#1d1d1f] text-white text-[10px] rounded-xl px-3 py-2 leading-relaxed shadow-xl">{studentNames.join(', ')}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : <span className="text-gray-200 text-xs">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </StepCard>
          );
        })()}

        {/* STEP 7 — AI Refinement Chat */}
        {schedule && (
          <StepCard
            step={7}
            chip="bg-violet-600 text-white border-violet-700"
            accentBar="bg-violet-600"
            title="AI Agent: Refine Master Schedule"
            description="After the Review, tell the AI Agent how to refine the Master Schedule."
            open={showChat}
            onToggle={() => setShowChat(v => !v)}
            flush
          >
            <div className="bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#0d1b4b] rounded-b-2xl overflow-hidden">
              <div className="px-5 py-5 space-y-4 min-h-32 max-h-72 overflow-y-auto">
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mx-auto mb-4">
                      <span className="text-white/60 text-2xl leading-none">✦</span>
                    </div>
                    <p className="text-sm text-white/60 tracking-[-0.01em]">Ask me to adjust any part of the schedule.</p>
                    <p className="text-[11px] text-white/25 mt-1.5">e.g. &quot;Move Emma out of Basketball on Tuesday&quot;</p>
                  </div>
                )}
                {messages.map((m, i) =>
                  m.role === 'user' ? (
                    <div key={i} className="flex justify-end">
                      <div className="bg-gradient-to-br from-blue-600 to-violet-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%] leading-relaxed shadow-md shadow-violet-900/30">{m.content}</div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-2.5 items-start">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-violet-500/20"><span className="text-white text-xs leading-none">✦</span></div>
                      <div className="bg-white/8 border border-white/10 text-white/85 text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed">{m.content}</div>
                    </div>
                  )
                )}
                {loading && (
                  <div className="flex gap-2.5 items-center">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20"><span className="text-white text-xs leading-none">✦</span></div>
                    <div className="flex gap-1.5 px-4 py-3 bg-white/8 rounded-2xl rounded-tl-sm border border-white/10">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
              </div>
              <div className="px-5 pb-5">
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 transition-all ${loading ? 'bg-white/5 border border-white/8' : 'bg-white/8 border border-white/15 focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/20'}`}>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask me to adjust the schedule…" disabled={loading} className="flex-1 text-sm text-white placeholder:text-white/25 bg-transparent focus:outline-none disabled:text-white/20 tracking-[-0.01em]" />
                  <button onClick={sendMessage} disabled={loading || !input.trim()} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${input.trim() && !loading ? 'bg-gradient-to-br from-violet-500 to-blue-500 hover:from-violet-400 hover:to-blue-400 text-white shadow-md shadow-violet-500/30' : 'bg-white/8 text-white/25'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </StepCard>
        )}

        {/* STEP 8 — Export CSV */}
        {schedule && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_24px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-rose-400 to-pink-500" />
            <div className="px-5 py-4 flex items-center gap-4">
              <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center text-xs font-bold shrink-0">8</span>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-[#1d1d1f] text-sm tracking-[-0.01em]">Get the Master Schedule</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Once all is refined, export the Master Schedule as a CSV file</p>
              </div>
              <button onClick={() => downloadMasterScheduleCSV(schedule.students)}
                className="shrink-0 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-rose-500/20 tracking-[-0.01em] whitespace-nowrap flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z"/><path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z"/></svg>
                Export CSV
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Origin Story */}
      <div className="bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#0d1b4b] mt-2">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="max-w-2xl">
            <span className="inline-block text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-5">Origin Story</span>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-white mb-5">
              Why ClassMaker AI?
            </h2>
            <p className="text-white/55 text-[15px] leading-[1.75] mb-8">
              I spent years as a public school and afterschool educator watching master schedules drain time that should&apos;ve gone to students. So I built the solution I always wanted. ClassMaker AI uses an AI Agent to handle the scheduling — and return that time to you.
            </p>
            <div className="flex items-center gap-3">
              <div className="w-6 h-px bg-white/20" />
              <p className="text-white/35 text-[13px] font-medium tracking-wide">Viet Nguyen, Founder of ClassMaker AI</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white border-t border-gray-100 mt-2">
        <div className="max-w-4xl mx-auto px-6 py-10 text-center">
          <h2 className="text-lg font-bold text-[#1d1d1f] mb-2 tracking-[-0.02em]">Questions or Feedback?</h2>
          <p className="text-gray-500 text-sm mb-5 max-w-lg mx-auto">We&apos;d love to hear from you — whether you&apos;re a teacher, afterschool coordinator, or principal exploring ClassMaker AI.</p>
          <a href="mailto:classmakerai@gmail.com"
            className="inline-flex items-center gap-2 bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z"/><path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z"/></svg>
            classmakerai@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}
