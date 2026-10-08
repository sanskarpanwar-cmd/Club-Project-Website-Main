import { useEffect, useMemo, useState, createContext, useContext, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Activity, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, Clock3, Flame, LayoutDashboard, LogOut, Menu, Plus, RotateCcw, Settings, Sparkles, Target, TrendingUp, UserRound, X } from 'lucide-react';
import { signInWithGoogle, signOutUser, loadPlannerFromCloud, savePlannerToCloud, watchAuth } from '@/lib/cloud';
import { empty, createPlan, createRecoveryPlan, createWeekPlan, todayKey, uid, type PlannerData, type StudySession, type Subject } from '@/lib/study-data';

const queryClient = new QueryClient();
function latestReflection(data: PlannerData) { return [...data.reflections].sort((a, b) => b.week.localeCompare(a.week))[0]; }
function missedSubjectIds(data: PlannerData, today = todayKey()) { return data.sessions.filter(s => !s.completed && s.scheduledDate < today).map(s => s.subjectId); }
const DataContext = createContext<{ data: PlannerData; setData: Dispatch<SetStateAction<PlannerData>> } | null>(null);
function usePlanner() { const value = useContext(DataContext); if (!value) throw new Error('Planner context missing'); return value; }
function BrandMark({className}:{className:string}) { return <img src={`${import.meta.env.BASE_URL}study-smarter-mark.jpg`} alt="" aria-hidden="true" className={className}/>; }

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/plan', label: 'Plan', icon: CalendarDays },
  { href: '/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/stats', label: 'Stats', icon: Activity },
  { href: '/profile', label: 'Profile', icon: UserRound },
];
function AppRouter() {
  const { data } = usePlanner();
  const [path] = useLocation();
  if (!data.user && path !== '/welcome' && path !== '/builder') return <Welcome/>;
  return <div className="min-h-[100dvh]">{data.user && <AppShell/>}<Switch>
    <Route path="/welcome" component={Welcome}/>
    <Route path="/builder" component={Builder}/>
    <Route path="/" component={data.user ? Home : Welcome}/>
    <Route path="/plan" component={PlanPage}/>
    <Route path="/subjects" component={SubjectsPage}/>
    <Route path="/stats" component={StatsPage}/>
    <Route path="/profile" component={ProfilePage}/>
    <Route component={NotFound}/>
  </Switch></div>;
}
function AppShell() {
  const [location] = useLocation();
  const { data } = usePlanner();
  const [menuOpen, setMenuOpen] = useState(false);
  return <><aside className="hidden lg:flex fixed inset-y-0 left-0 w-[232px] border-r border-border bg-white/80 px-5 py-7 flex-col z-20">
    <Link href="/" className="flex items-center gap-3 px-2 mb-10"><BrandMark className="w-10 h-10 rounded-xl object-cover"/><span className="font-display font-extrabold text-[16px] tracking-tight">study smarter</span></Link>
    <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Your workspace</p>
    <nav className="space-y-1">{navItems.map(({href,label,icon:Icon}) => <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${location===href?'bg-blue-50 text-primary':'text-slate-600 hover:bg-slate-50'}`}><Icon size={18}/>{label}</Link>)}</nav>
    <div className="mt-auto rounded-2xl bg-[#f1f6fb] p-4"><div className="w-9 h-9 rounded-xl bg-white grid place-items-center text-primary mb-3"><Target size={18}/></div><p className="font-display font-bold text-sm">Small steps count.</p><p className="text-xs leading-relaxed text-muted-foreground mt-1">Your plan can change with you. No catch-up marathon needed.</p></div>
    <div className="mt-5 px-2 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-blue-100 text-primary grid place-items-center font-bold text-sm">{data.user?.name.slice(0,1).toUpperCase()}</div><div className="min-w-0"><p className="text-sm font-semibold truncate">{data.user?.name}</p><p className="text-xs text-muted-foreground">Local planner</p></div></div>
  </aside>
  <header className="lg:hidden h-[62px] flex items-center justify-between px-4 border-b border-border bg-white/90 sticky top-0 z-20"><Link href="/" className="flex items-center gap-2.5"><BrandMark className="w-9 h-9 rounded-xl object-cover"/><span className="font-display font-extrabold tracking-tight">study smarter</span></Link><button onClick={()=>setMenuOpen(!menuOpen)} aria-label="Open navigation" className="w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100"><Menu size={20}/></button></header>
  {menuOpen && <div className="lg:hidden fixed inset-0 z-30 bg-slate-900/20" onClick={()=>setMenuOpen(false)}><nav onClick={e=>e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-[min(82vw,320px)] bg-white p-5 pt-16 shadow-xl">{navItems.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={()=>setMenuOpen(false)} className="flex items-center gap-3 px-3 py-4 rounded-xl font-semibold text-slate-700"><Icon size={19}/>{label}</Link>)}</nav><button onClick={()=>setMenuOpen(false)} className="absolute right-[min(82vw,320px)] top-3 p-3"><X/></button></div>}
  <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 border-t border-border bg-white/95 backdrop-blur px-1 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] flex justify-around">{navItems.map(({href,label,icon:Icon})=><Link key={href} href={href} className={`flex flex-col items-center justify-center gap-1 w-[19%] min-h-[52px] text-[10px] font-semibold ${location===href?'text-primary':'text-slate-500'}`}><Icon size={19}/>{label}</Link>)}</nav>
  </>;
}
function Page({children,wide=false}:{children:ReactNode;wide?:boolean}) { return <main className={`page-enter min-h-[calc(100dvh-62px)] lg:min-h-screen lg:ml-[232px] px-4 sm:px-7 lg:px-10 pt-7 pb-28 lg:py-10 mx-auto ${wide?'max-w-[1120px]':'max-w-[920px]'}`}>{children}</main>; }
function Eyebrow({children}:{children:ReactNode}) { return <p className="text-[11px] uppercase tracking-[.16em] font-bold text-primary mb-2">{children}</p>; }
function Title({title,subtitle}:{title:string;subtitle?:string}) { return <div className="mb-7"><h1 className="font-display text-[27px] sm:text-[32px] leading-tight font-extrabold tracking-[-.04em]">{title}</h1>{subtitle&&<p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">{subtitle}</p>}</div>; }
function Card({children,className=''}:{children:ReactNode;className?:string}) { return <section className={`rounded-2xl border border-border bg-white shadow-[0_5px_18px_rgba(34,66,105,.035)] ${className}`}>{children}</section>; }
function Button({children,onClick,variant='primary',type='button',disabled=false,className='',...props}:{children:ReactNode;onClick?:()=>void;variant?:'primary'|'soft'|'outline'|'ghost';type?:'button'|'submit';disabled?:boolean;className?:string;[key:string]:any}) {
  const variants={primary:'bg-primary text-white hover:bg-[#245ca9] shadow-sm',soft:'bg-blue-50 text-primary hover:bg-blue-100',outline:'border border-border bg-white text-slate-700 hover:bg-slate-50',ghost:'text-slate-600 hover:bg-slate-100'};
  return <button type={type} onClick={onClick} disabled={disabled} className={`min-h-11 rounded-xl px-4 inline-flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`} {...props}>{children}</button>;
}
function Notice({children,tone='blue'}:{children:ReactNode;tone?:'blue'|'green'|'orange'}) { const cls={blue:'bg-blue-50 text-blue-900 border-blue-100',green:'bg-emerald-50 text-emerald-900 border-emerald-100',orange:'bg-orange-50 text-orange-950 border-orange-100'}; return <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${cls[tone]}`}>{children}</div>; }
function Welcome() {
  const {data,setData}=usePlanner(); const [,go]=useLocation(); const [name,setName]=useState(data.user?.name??'Student'); const [email,setEmail]=useState(data.user?.email??''); const [showLogin,setShowLogin]=useState(false); const [message,setMessage]=useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const startDemo=()=>{const displayName=name.trim()||'Student';setData(p=>({...p,user:{id:uid(),name:displayName,email:email.trim()||`${displayName.toLowerCase().replace(/\s+/g,'.')}@local.demo`,createdAt:new Date().toISOString()}}));go('/builder');};

  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setMessage('');
      const user = await signInWithGoogle();
      if (user) {
        go('/');
      }
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      setMessage(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  return <div className="min-h-[100dvh] bg-[#f5f8fc] flex items-center justify-center px-4 py-8">
    <div className="w-full max-w-[1040px] grid lg:grid-cols-[1.05fr_.95fr] bg-white rounded-[30px] border border-slate-200/80 shadow-[0_24px_80px_rgba(30,65,105,.10)] overflow-hidden">
      <section className="px-6 sm:px-12 py-10 sm:py-14 lg:py-16 flex flex-col justify-center">
        <Link href="/welcome" className="flex items-center gap-3 mb-10"><BrandMark className="w-11 h-11 rounded-2xl object-cover"/><span className="font-display text-lg font-extrabold tracking-tight">study smarter</span></Link>
        <Eyebrow>A calmer way to prepare</Eyebrow><h1 className="font-display text-[38px] sm:text-[50px] leading-[1.04] font-extrabold tracking-[-.055em] max-w-lg">Study Smarter,<br/><span className="text-primary">Not Harder.</span></h1>
        <p className="mt-4 text-[16px] text-slate-600 max-w-md leading-relaxed">Personalized study plans, built for your goals.</p>
        <Button onClick={startDemo} className="lg:hidden mt-6 w-full sm:w-auto min-h-12">Get Started <ArrowRight size={17}/></Button>
        <div className="mt-8 space-y-4">
          {[['01','A plan that fits','Built around your real subjects, exams and available time.'],['02','Methods that work','Active recall, practice testing and spaced review.'],['03','Progress without pressure','Pick up where you are. Small, steady sessions count.']].map(([n,t,d])=><div key={n} className="flex gap-4 items-start"><span className="mt-0.5 text-[11px] font-bold text-primary bg-blue-50 rounded-lg px-2 py-1">{n}</span><div><p className="font-bold text-sm">{t}</p><p className="text-sm text-muted-foreground mt-0.5">{d}</p></div></div>)}
        </div>
      </section>
      <section className="bg-[#f6f9fc] px-6 sm:px-10 py-9 lg:py-12 border-t lg:border-t-0 lg:border-l border-slate-200/70 flex flex-col justify-center">
        <div className="max-w-sm mx-auto w-full">
          <h2 className="font-display font-extrabold text-xl tracking-tight">Welcome to Study Smarter</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">Sign in with Google to sync your study plans in real-time with Firebase cloud storage.</p>
          
          <Button onClick={handleGoogleSignIn} disabled={authLoading} className="w-full min-h-12 bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span className="font-semibold">{authLoading ? 'Signing in...' : 'Continue with Google'}</span>
          </Button>

          <div className="relative my-6 text-center text-[11px] text-slate-400">
            <span className="bg-[#f6f9fc] px-3 relative z-10">OR QUICK PREVIEW</span>
            <span className="absolute inset-x-0 top-1/2 border-t border-slate-200"/>
          </div>

          <label className="text-xs font-bold text-slate-600">Your name</label>
          <input data-testid="input-name" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sam" className="mt-1.5 mb-4 w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-primary outline-none"/>
          
          <Button onClick={startDemo} variant="outline" className="w-full min-h-11">
            Try Demo Mode <ArrowRight size={15}/>
          </Button>

          {message && <p role="status" className="mt-4 text-xs text-center text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{message}</p>}
        </div>
      </section>
    </div>
  </div>;
}
const SUBJECTS=['Mathematics','Physics','Chemistry','Biology','English','Computer Science'];
function Builder() {
 const {data,setData}=usePlanner();const [,go]=useLocation(); const [step,setStep]=useState(0);
 const [subjects,setSubjects]=useState<Subject[]>(data.subjects.length?data.subjects:[]);
 const [newName,setNewName]=useState('');const [weekday,setWeekday]=useState(data.weekdayMinutes);const [weekend,setWeekend]=useState(data.weekendMinutes);const [today,setToday]=useState(data.todayMinutes);const [unavailable,setUnavailable]=useState(data.unavailableDays);const [modes,setModes]=useState(data.preferredModes.length?data.preferredModes:['Solving questions']);
 const [exams,setExams]=useState(data.exams);const [examSubject,setExamSubject]=useState('');const [examTitle,setExamTitle]=useState('');const [examDate,setExamDate]=useState('');const [error,setError]=useState('');
 const toggleSubject=(name:string)=>{ const found=subjects.find(s=>s.name===name); setSubjects(found?subjects.filter(s=>s.id!==found.id):[...subjects,{id:uid(),name,confidence:5}]); };
 const addCustom=()=>{if(newName.trim()&&!subjects.some(s=>s.name.toLowerCase()===newName.trim().toLowerCase()))setSubjects([...subjects,{id:uid(),name:newName.trim(),confidence:5}]);setNewName('')};
 const addExam=()=>{if(!examSubject||!examTitle.trim()||!examDate){setError('Choose a subject, title and exam date.');return;}setExams([...exams,{id:uid(),subjectId:examSubject,title:examTitle.trim(),date:examDate}]);setExamTitle('');setExamDate('');setError('')};
 const finish=()=>{if(!subjects.length){setError('Choose at least one subject first.');setStep(0);return;} const startDay=todayKey();setData(p=>({...p,subjects,exams,weekdayMinutes:weekday,weekendMinutes:weekend,todayMinutes:today,unavailableDays:unavailable,preferredModes:modes,sessions:[...p.sessions.filter(s=>s.completed||s.scheduledDate<startDay),...createWeekPlan(subjects,exams,{todayMinutes:today,weekdayMinutes:weekday,weekendMinutes:weekend,unavailableDays:unavailable,preferredModes:modes,reflections:p.reflections,previousSessions:p.sessions,startDay})]}));go('/');};
 const steps=['Subjects','Schedule','Preferences','Your plan'];
 return <Page><Link href={data.user?'/':'/welcome'} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary mb-5"><ArrowLeft size={16}/> {data.user?'Back to home':'Welcome'}</Link><Eyebrow>Build a plan that fits</Eyebrow><Title title="Create your study plan" subtitle="Tell us a bit about your studies. You can update every detail whenever life changes."/>
   <div className="flex items-center max-w-xl mb-7">{steps.map((s,i)=><div key={s} className="flex items-center flex-1 last:flex-none"><button onClick={()=>i<=step&&setStep(i)} className="flex items-center gap-2" aria-label={`Step ${i+1}: ${s}`}><span className={`w-8 h-8 grid place-items-center rounded-full text-xs font-bold ${i===step?'bg-primary text-white':i<step?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-500'}`}>{i<step?<Check size={15}/>:i+1}</span><span className={`hidden sm:block text-xs font-semibold ${i===step?'text-slate-900':'text-slate-400'}`}>{s}</span></button>{i<3&&<span className="h-px bg-slate-200 mx-2 sm:mx-4 flex-1"/>}</div>)}</div>
   {step===0&&<Card className="p-5 sm:p-7"><h2 className="font-display font-bold text-lg">Which subjects are on your plate?</h2><p className="text-sm text-muted-foreground mt-1 mb-5">Choose yours, then set confidence from 1 (needs work) to 10 (feels solid).</p><div className="grid sm:grid-cols-2 gap-3">{SUBJECTS.map(n=>{const s=subjects.find(x=>x.name===n);return <div key={n} className={`rounded-xl border p-3.5 ${s?'border-blue-200 bg-blue-50/50':'border-slate-200'}`}><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!s} onChange={()=>toggleSubject(n)} className="accent-blue-600 w-4 h-4"/><span className="font-semibold text-sm flex-1">{n}</span>{s&&<span className="text-xs text-muted-foreground">{s.confidence}/10</span>}</label>{s&&<div className="flex items-center gap-3 mt-3"><span className="text-[11px] text-slate-500">Confidence</span><input aria-label={`${n} confidence`} type="range" min="1" max="10" value={s.confidence} onChange={e=>setSubjects(subjects.map(v=>v.id===s.id?{...v,confidence:Number(e.target.value)}:v))} className="flex-1 accent-blue-600"/><span className="text-xs font-bold text-primary w-5">{s.confidence}</span></div>}</div>})}</div><div className="flex gap-2 mt-4"><input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCustom()} placeholder="Add another subject" className="flex-1 h-11 px-3 rounded-xl border border-slate-200 text-sm"/><Button variant="outline" onClick={addCustom}><Plus size={16}/> Add</Button></div></Card>}
   {step===1&&<div className="space-y-4"><Card className="p-5 sm:p-7"><h2 className="font-display font-bold text-lg mb-4">Make time for what matters</h2><div className="grid sm:grid-cols-3 gap-3">{[['Today',today,setToday],['Weekdays',weekday,setWeekday],['Weekends',weekend,setWeekend]].map(([label,val,setter]:any)=><label key={label} className="block text-sm font-semibold">{label}<div className="mt-2 flex items-center border border-slate-200 rounded-xl px-3"><input type="number" min="0" max="360" value={val} onChange={e=>setter(Number(e.target.value))} className="h-12 w-full outline-none"/><span className="text-xs text-slate-400">min</span></div></label>)}</div><p className="text-xs text-muted-foreground mt-3">A smaller plan you can repeat is better than a perfect plan you can't keep.</p></Card><Card className="p-5 sm:p-7"><h2 className="font-display font-bold text-lg mb-4">Upcoming exams</h2><div className="grid sm:grid-cols-3 gap-3">{<select value={examSubject} onChange={e=>setExamSubject(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="">Select subject</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}<input value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="e.g. Unit test" className="h-11 rounded-xl border border-slate-200 px-3 text-sm"/><div className="flex gap-2"><input value={examDate} onChange={e=>setExamDate(e.target.value)} type="date" className="h-11 w-full min-w-0 rounded-xl border border-slate-200 px-2 text-sm"/><Button onClick={addExam} variant="soft" aria-label="Add exam"><Plus/></Button></div></div>{exams.length>0&&<div className="mt-4 divide-y divide-slate-100">{exams.map(e=><div key={e.id} className="flex items-center py-2.5 text-sm"><span className="font-semibold flex-1">{subjects.find(s=>s.id===e.subjectId)?.name} · {e.title}</span><span className="text-muted-foreground mr-3">{e.date}</span><button aria-label="Remove exam" onClick={()=>setExams(exams.filter(x=>x.id!==e.id))} className="text-slate-400 hover:text-red-600"><X size={16}/></button></div>)}</div>}</Card><Card className="p-5 sm:p-7"><h2 className="font-display font-bold text-lg">Days you usually need off</h2><p className="text-sm text-muted-foreground my-1 mb-4">We'll keep these clear. Change them anytime.</p><div className="flex flex-wrap gap-2">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=><button key={d} onClick={()=>setUnavailable(unavailable.includes(String(i))?unavailable.filter(x=>x!==String(i)):[...unavailable,String(i)])} className={`min-w-12 h-10 rounded-xl border text-sm font-semibold ${unavailable.includes(String(i))?'bg-blue-50 border-blue-200 text-primary':'border-slate-200 text-slate-500'}`}>{d}</button>)}</div></Card></div>}
   {step===2&&<Card className="p-5 sm:p-7"><h2 className="font-display font-bold text-lg">How would you like activities presented?</h2><p className="text-sm text-muted-foreground mt-1 mb-5 max-w-xl">These are presentation preferences only. Every plan still uses effective practice: recall, practice testing, spaced review and correcting mistakes.</p><div className="grid sm:grid-cols-2 gap-3">{['Solving questions','Reviewing notes','Flashcards','Watching explanations','Mixture'].map((m,i)=><button key={m} onClick={()=>setModes(modes.includes(m)?modes.filter(x=>x!==m):[...modes,m])} className={`min-h-14 border rounded-xl px-4 flex items-center gap-3 text-left ${modes.includes(m)?'border-blue-200 bg-blue-50 text-primary':'border-slate-200'}`}><span className={`w-5 h-5 rounded-md border grid place-items-center ${modes.includes(m)?'bg-primary border-primary text-white':'border-slate-300'}`}>{modes.includes(m)&&<Check size={13}/>}</span><span className="text-sm font-semibold">{m}</span></button>)}</div></Card>}
   {step===3&&<div className="space-y-4"><Notice tone="green"><span className="font-bold">Ready when you are.</span> We’ll give more near-term attention to exams and subjects where confidence is lower, while keeping review spaced across your subjects.</Notice><Card className="p-5 sm:p-7"><Eyebrow>Your first study block</Eyebrow><h2 className="font-display font-extrabold text-2xl">{today} minutes, made practical</h2><div className="mt-5 space-y-3">{createPlan(subjects,exams,today,modes).map((s,i)=><TaskPreview key={s.id} session={s} subject={subjects.find(x=>x.id===s.subjectId)} index={i}/>)}</div></Card></div>}
   {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
   <div className="sticky bottom-16 lg:static bg-[#f6f9fc]/95 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-0 -mx-4 px-4 py-3 mt-5 flex justify-between gap-3"><Button variant="outline" onClick={()=>step?setStep(step-1):go('/welcome')} disabled={step===0&&!!data.user}><ArrowLeft size={16}/> Back</Button>{step<3?<Button onClick={()=>{if(step===0&&!subjects.length){setError('Choose at least one subject to continue.');return;}setError('');setStep(step+1)}}>Continue <ArrowRight size={16}/></Button>:<Button onClick={finish}><Sparkles size={16}/> Generate my plan</Button>}</div>
 </Page>;
}
function TaskPreview({session,subject,index}:{session:StudySession;subject?:Subject;index:number}){return <div className="flex gap-3 p-3 rounded-xl bg-[#f8fafc]"><span className="w-8 h-8 rounded-lg bg-blue-50 text-primary grid place-items-center text-xs font-bold">{String(index+1).padStart(2,'0')}</span><div className="flex-1"><div className="flex justify-between gap-3"><p className="font-bold text-sm">{subject?.name??'Study block'}</p><span className="text-xs text-muted-foreground whitespace-nowrap">{session.duration} min</span></div><p className="text-sm text-slate-700 mt-1">{session.activity}</p></div></div>}

function Home(){
 const {data,setData}=usePlanner(); const [,go]=useLocation(); const today=todayKey();
 const todays=data.sessions.filter(s=>s.scheduledDate===today); const completed=todays.filter(s=>s.completed).length; const next=useMemo(()=>data.exams.filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0],[data.exams,today]);
 const daysTo=next?Math.ceil((new Date(`${next.date}T12:00:00`).getTime()-new Date(`${today}T12:00:00`).getTime())/86400000):null;
 const streak=deriveStreak(data.sessions); const [active,setActive]=useState<StudySession|null>(null);
 const isRecovery=data.recoveryMode || (!!data.sessions.some(s=>s.scheduledDate<today&&!s.completed)&&completed===0);
 const recover=()=>setData(p=>({...p,recoveryMode:true,sessions:[...p.sessions.filter(s=>s.scheduledDate!==today||s.completed),...createRecoveryPlan(p.subjects,p.exams,p.preferredModes,today,{focusSubjectId:latestReflection(p)?.focus,missedSubjectIds:missedSubjectIds(p,today)})]}));
 const mark=(s:StudySession)=>{setData(p=>({...p,sessions:p.sessions.map(x=>x.id===s.id?{...x,completed:true,completedAt:new Date().toISOString()}:x),recoveryMode:false}));setActive(null)};
 return <Page wide><div className="flex items-start justify-between gap-4 mb-7"><div><Eyebrow>{new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</Eyebrow><h1 className="font-display text-[27px] sm:text-[32px] font-extrabold tracking-[-.04em]">Hi {data.user?.name.split(' ')[0]}.</h1><p className="mt-1 text-sm text-muted-foreground">Let's make today manageable.</p></div><Link href="/profile" aria-label="Profile and settings" className="w-11 h-11 rounded-xl border border-border bg-white grid place-items-center text-slate-600"><Settings size={19}/></Link></div>
 {isRecovery&&<Notice tone="orange"><div className="flex flex-col sm:flex-row gap-3 sm:items-center"><div className="flex-1"><b>Yesterday didn't go to plan. That's okay.</b><br/>No progress is lost. Start with a lighter 30-minute reset today.</div><Button onClick={recover} variant="outline" className="border-orange-200 bg-white shrink-0"><RotateCcw size={15}/> Make a recovery plan</Button></div></Notice>}
 <div className="grid sm:grid-cols-[1.3fr_.7fr] gap-4 mt-5">
  <Card className="p-5 sm:p-6 bg-[#eaf3ff] border-[#d8e8fa]"><div className="flex items-start justify-between"><div><Eyebrow>Today, at your pace</Eyebrow><h2 className="font-display text-xl font-extrabold tracking-tight">A good next step.</h2></div><div className="w-10 h-10 rounded-xl bg-white/80 grid place-items-center text-primary"><Target size={19}/></div></div>
   {todays.length?<div className="mt-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><p className="text-sm text-slate-700">{completed===todays.length?'You finished today’s plan. Take a breath.':`${todays.filter(s=>!s.completed).length} small task${todays.filter(s=>!s.completed).length===1?'':'s'} ready when you are.`}</p><div className="mt-3 w-full sm:w-64 h-2 rounded-full bg-white overflow-hidden"><span className="block h-full bg-emerald-500 rounded-full transition-all" style={{width:`${todays.length?completed/todays.length*100:0}%`}}/></div><p className="text-xs text-slate-500 mt-1.5">{completed} of {todays.length} completed</p></div><Button onClick={()=>go('/plan')} variant="outline">Open today’s plan <ArrowRight size={15}/></Button></div>:<div className="mt-4"><p className="text-sm text-slate-700 max-w-sm">Your first plan will turn your subjects and schedule into a clear next action.</p><Button onClick={()=>go(data.subjects.length?'/builder':'/builder')} className="mt-4">{data.sessions.length?'Refresh plan':'Build my plan'} <ArrowRight size={15}/></Button></div>}
  </Card>
  <Card className="p-5 sm:p-6 flex flex-col justify-between"><div className="flex items-center gap-2 text-orange-700"><Flame size={18}/><span className="text-sm font-bold">Your rhythm</span></div><p className="font-display text-3xl font-extrabold mt-3">{streak} <span className="text-base font-semibold text-slate-500">day{streak===1?'':'s'}</span></p><p className="text-xs text-muted-foreground mt-1">A study day is any day you complete a session. Your past progress stays yours.</p></Card>
 </div>
 <div className="grid lg:grid-cols-[1.25fr_.75fr] gap-5 mt-6">
  <section><div className="flex items-end justify-between mb-3"><div><Eyebrow>One thing at a time</Eyebrow><h2 className="font-display text-xl font-extrabold tracking-tight">Today's plan</h2></div><Link href="/plan" className="text-sm font-bold text-primary">Full plan <ArrowRight size={14} className="inline"/></Link></div>
    <Card className="divide-y divide-slate-100">{todays.length?todays.map((s,i)=><TaskRow key={s.id} session={s} subject={data.subjects.find(x=>x.id===s.subjectId)} index={i} onStart={()=>setActive(s)} onComplete={()=>mark(s)}/>):<div className="p-8 text-center"><div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-primary grid place-items-center"><CalendarDays/></div><p className="font-bold mt-3">Nothing scheduled for today yet</p><p className="text-sm text-muted-foreground mt-1">Make a plan that fits the time you have.</p><Button onClick={()=>go('/builder')} variant="soft" className="mt-4">Create today's plan</Button></div>}</Card>
  </section>
  <section><div className="mb-3"><Eyebrow>On the horizon</Eyebrow><h2 className="font-display text-xl font-extrabold tracking-tight">Upcoming exams</h2></div><Card className="p-2">{data.exams.filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4).map(e=>{const s=data.subjects.find(x=>x.id===e.subjectId);const days=Math.ceil((new Date(`${e.date}T12:00:00`).getTime()-new Date(`${today}T12:00:00`).getTime())/86400000);return <div key={e.id} className="flex gap-3 items-center p-3"><div className={`w-9 h-9 rounded-xl grid place-items-center ${days<=3?'bg-orange-50 text-orange-700':'bg-blue-50 text-primary'}`}><CalendarDays size={17}/></div><div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{s?.name??'Subject'} · {e.title}</p><p className="text-xs text-muted-foreground">{new Date(`${e.date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</p></div><span className={`text-xs font-bold whitespace-nowrap ${days<=3?'text-orange-700':'text-slate-500'}`}>{days===0?'Today':`${days}d left`}</span></div>})}{!data.exams.some(e=>e.date>=today)&&<div className="p-5 text-center"><p className="text-sm font-semibold">No upcoming exams added</p><p className="text-xs text-muted-foreground mt-1">Add one so your plan can prioritize it.</p><Button variant="soft" onClick={()=>go('/builder')} className="mt-3 min-h-9 text-xs">Add an exam</Button></div>}</Card>
    <div className="mt-4 rounded-2xl p-4 bg-[#eef6f1] border border-[#dcece2]"><p className="text-sm font-bold text-emerald-900">Steady beats perfect.</p><p className="text-xs text-emerald-900/70 mt-1 leading-relaxed">Missed a day? Keep your progress and choose a smaller next step.</p></div>
  </section>
 </div>
 {active&&<SessionDialog session={active} subject={data.subjects.find(s=>s.id===active.subjectId)} onClose={()=>setActive(null)} onComplete={()=>mark(active)}/>}
 </Page>;
}
function TaskRow({session,subject,index,onStart,onComplete}:{session:StudySession;subject?:Subject;index:number;onStart:()=>void;onComplete:()=>void}){return <div className="p-4 sm:px-5 flex gap-3 items-start"><span className={`w-8 h-8 shrink-0 rounded-full grid place-items-center text-xs font-bold mt-0.5 ${session.completed?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-500'}`}>{session.completed?<Check size={15}/>:String(index+1).padStart(2,'0')}</span><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-bold">{subject?.name??'Study session'}</p><span className="text-xs text-muted-foreground">{session.duration} min</span>{session.completed&&<span className="text-[10px] uppercase tracking-wide font-bold text-emerald-700">Done</span>}</div><p className="text-sm text-slate-600 leading-relaxed mt-1">{session.activity}</p></div>{!session.completed&&<Button variant={index===0?'primary':'outline'} onClick={onStart} className="min-h-10 px-3 shrink-0">{index===0?'Start':'Begin'}</Button>}</div>}
function SessionDialog({session,subject,onClose,onComplete}:{session:StudySession;subject?:Subject;onClose:()=>void;onComplete:()=>void}){const [elapsed,setElapsed]=useState(0);useEffect(()=>{const id=window.setInterval(()=>setElapsed(v=>v+1),1000);return()=>window.clearInterval(id)},[]);return <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true"><div className="bg-white rounded-t-[26px] sm:rounded-[26px] w-full max-w-md p-6 sm:p-8 shadow-xl"><div className="flex justify-between items-center"><Eyebrow>Study session</Eyebrow><button onClick={onClose} aria-label="Close session" className="w-9 h-9 rounded-xl hover:bg-slate-100 grid place-items-center"><X size={18}/></button></div><h2 className="font-display font-extrabold text-2xl tracking-tight mt-1">{subject?.name??'Your next task'}</h2><p className="text-sm text-slate-600 leading-relaxed mt-3">{session.activity}</p><div className="mt-6 rounded-2xl bg-blue-50 p-5 text-center"><p className="text-xs font-bold uppercase tracking-wider text-primary">Time in this session</p><p className="font-display text-4xl font-extrabold text-slate-800 mt-1 tabular-nums">{String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}</p><p className="text-xs text-slate-500 mt-2">Suggested time: {session.duration} minutes. You can finish whenever you're ready.</p></div><div className="flex gap-3 mt-5"><Button variant="outline" onClick={onClose} className="flex-1">Pause for now</Button><Button onClick={onComplete} className="flex-1"><CheckCircle2 size={17}/> Mark complete</Button></div></div></div>}
function PlanPage(){const {data,setData}=usePlanner();const [,go]=useLocation();const today=todayKey();const [active,setActive]=useState<StudySession|null>(null);const todays=data.sessions.filter(s=>s.scheduledDate===today);const future=data.sessions.filter(s=>s.scheduledDate>today);const regenerate=()=>setData(p=>({...p,sessions:[...p.sessions.filter(s=>s.scheduledDate!==today||s.completed),...createPlan(p.subjects,p.exams,p.todayMinutes,p.preferredModes,today,{focusSubjectId:latestReflection(p)?.focus,missedSubjectIds:missedSubjectIds(p,today)})]}));const recover=()=>setData(p=>({...p,recoveryMode:true,sessions:[...p.sessions.filter(s=>s.scheduledDate!==today||s.completed),...createRecoveryPlan(p.subjects,p.exams,p.preferredModes,today,{focusSubjectId:latestReflection(p)?.focus,missedSubjectIds:missedSubjectIds(p,today)})]}));const complete=(s:StudySession)=>{setData(p=>({...p,sessions:p.sessions.map(x=>x.id===s.id?{...x,completed:true,completedAt:new Date().toISOString()}:x),recoveryMode:false}));setActive(null)};
 return <Page><Eyebrow>Your next actions</Eyebrow><Title title="Study plan" subtitle="Concrete sessions, planned around your time. Change the plan whenever you need to."/><div className="flex flex-wrap gap-2 mb-5"><Button onClick={regenerate} variant="outline"><RotateCcw size={15}/> Refresh today's plan</Button><Button onClick={recover} variant="soft">30-minute reset</Button></div>
 {!data.subjects.length?<EmptyState icon={<BookOpen/>} title="Start with your subjects" text="Add subjects, confidence and exam dates to make your plan truly yours." action="Set up my plan" onClick={()=>go('/builder')}/>:<><div className="flex items-center justify-between mb-3"><h2 className="font-display font-extrabold text-lg">Today · {todays.reduce((a,s)=>a+s.duration,0)} minutes</h2><span className="text-xs text-muted-foreground">{todays.filter(s=>s.completed).length}/{todays.length} complete</span></div><Card className="divide-y divide-slate-100">{todays.length?todays.map((s,i)=><TaskRow key={s.id} session={s} subject={data.subjects.find(x=>x.id===s.subjectId)} index={i} onStart={()=>setActive(s)} onComplete={()=>complete(s)}/>):<div className="p-7 text-center"><p className="font-semibold">No sessions planned for today.</p><Button onClick={regenerate} className="mt-3">Generate today's plan</Button></div>}</Card>
 <h2 className="font-display font-extrabold text-lg mt-7 mb-3">Coming up</h2>{future.length?<div className="space-y-3">{future.map(s=><Card key={s.id} className="p-4 flex gap-3"><CalendarDays className="text-primary mt-1" size={18}/><div><p className="font-bold text-sm">{data.subjects.find(x=>x.id===s.subjectId)?.name} <span className="font-normal text-muted-foreground">· {s.duration} min</span></p><p className="text-xs text-muted-foreground mt-1">{new Date(`${s.scheduledDate}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</p><p className="text-sm text-slate-600 mt-2">{s.activity}</p></div></Card>)}</div>:<Notice>Future sessions will appear here as your plan continues. Keep it manageable—there's no need to schedule every hour.</Notice>}</>}
 {active&&<SessionDialog session={active} subject={data.subjects.find(s=>s.id===active.subjectId)} onClose={()=>setActive(null)} onComplete={()=>complete(active)}/>}
 </Page>}
function EmptyState({icon,title,text,action,onClick}:{icon:ReactNode;title:string;text:string;action:string;onClick:()=>void}){return <Card className="p-8 sm:p-12 text-center"><div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 text-primary grid place-items-center">{icon}</div><h3 className="font-display font-extrabold text-lg mt-4">{title}</h3><p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">{text}</p><Button onClick={onClick} className="mt-5">{action} <ArrowRight size={15}/></Button></Card>}
function SubjectsPage(){const {data,setData}=usePlanner();const [,go]=useLocation();const [name,setName]=useState('');const [examSub,setExamSub]=useState('');const [examTitle,setExamTitle]=useState('');const [examDate,setExamDate]=useState('');const [message,setMessage]=useState('');
 const add=()=>{if(!name.trim()){setMessage('Enter a subject name first.');return;}if(data.subjects.some(s=>s.name.toLowerCase()===name.trim().toLowerCase())){setMessage('That subject is already on your list.');return;}setData(p=>({...p,subjects:[...p.subjects,{id:uid(),name:name.trim(),confidence:5}]}));setName('');setMessage('Subject added.');};
 const remove=(id:string)=>{setData(p=>({...p,subjects:p.subjects.filter(s=>s.id!==id),exams:p.exams.filter(e=>e.subjectId!==id),sessions:p.sessions.filter(s=>s.subjectId!==id)}));};
 const addExam=()=>{if(!examSub||!examTitle.trim()||!examDate){setMessage('Add a subject, exam name and date.');return;}setData(p=>({...p,exams:[...p.exams,{id:uid(),subjectId:examSub,title:examTitle.trim(),date:examDate}]}));setExamTitle('');setExamDate('');setMessage('Exam saved. Your plan can now prioritize it.');};
 return <Page><Eyebrow>Your real school week</Eyebrow><Title title="Subjects & exams" subtitle="Confidence helps decide where to start. It isn't a grade—update it when your understanding changes."/><Card className="divide-y divide-slate-100">{data.subjects.map(s=><div key={s.id} className="p-4 flex gap-3 items-center"><div className="w-10 h-10 rounded-xl bg-blue-50 text-primary grid place-items-center"><BookOpen size={18}/></div><div className="flex-1"><div className="flex justify-between gap-3"><p className="font-bold text-sm">{s.name}</p><span className="text-xs font-semibold text-slate-500">{s.confidence}/10</span></div><input aria-label={`${s.name} confidence`} type="range" min="1" max="10" value={s.confidence} onChange={e=>setData(p=>({...p,subjects:p.subjects.map(x=>x.id===s.id?{...x,confidence:Number(e.target.value)}:x)}))} className="w-full mt-2 accent-blue-600"/></div><button aria-label={`Remove ${s.name}`} onClick={()=>remove(s.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><X size={17}/></button></div>)}{!data.subjects.length&&<p className="p-6 text-center text-sm text-muted-foreground">No subjects yet. Add the subjects you're studying right now.</p>}<div className="p-4 flex gap-2"><input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Add a subject" className="min-w-0 flex-1 h-11 rounded-xl border border-slate-200 px-3 text-sm"/><Button onClick={add}><Plus size={16}/> Add</Button></div></Card>
 <div className="mt-6"><Eyebrow>Plan around the date</Eyebrow><h2 className="font-display text-xl font-extrabold mb-3">Upcoming exams</h2><Card className="p-5"><div className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">{<select value={examSub} onChange={e=>setExamSub(e.target.value)} className="h-11 border border-slate-200 rounded-xl px-3 text-sm"><option value="">Subject</option>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}<input value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="Exam or topic" className="h-11 min-w-0 border border-slate-200 rounded-xl px-3 text-sm"/><input type="date" value={examDate} onChange={e=>setExamDate(e.target.value)} className="h-11 min-w-0 border border-slate-200 rounded-xl px-3 text-sm"/><Button onClick={addExam}><Plus size={16}/> Add</Button></div>
 {data.exams.length>0&&<div className="mt-4 divide-y divide-slate-100">{data.exams.sort((a,b)=>a.date.localeCompare(b.date)).map(e=><div key={e.id} className="py-3 flex items-center gap-3"><CalendarDays size={17} className="text-primary"/><p className="flex-1 text-sm font-semibold">{data.subjects.find(s=>s.id===e.subjectId)?.name} · {e.title}</p><span className="text-xs text-muted-foreground">{new Date(`${e.date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</span><button aria-label="Delete exam" onClick={()=>setData(p=>({...p,exams:p.exams.filter(x=>x.id!==e.id)}))} className="p-2 text-slate-400 hover:text-red-600"><X size={16}/></button></div>)}</div>}{message&&<p role="status" className="text-xs text-emerald-700 mt-3">{message}</p>}</Card></div>
 <div className="mt-5"><Button variant="soft" onClick={()=>go('/builder')}>Update schedule & preferences <ArrowRight size={15}/></Button></div>
 </Page>}
function deriveStreak(sessions:StudySession[]){const days=new Set(sessions.filter(s=>s.completed&&s.completedAt).map(s=>todayKey(new Date(s.completedAt!))));let cursor=new Date();let key=todayKey(cursor);if(!days.has(key)){cursor.setDate(cursor.getDate()-1);key=todayKey(cursor);}let streak=0;while(days.has(key)){streak++;cursor.setDate(cursor.getDate()-1);key=todayKey(cursor);if(streak>365)break;}return streak;}
function StatsPage(){const {data}=usePlanner();const [range,setRange]=useState(7);const today=todayKey();const since=new Date();since.setDate(since.getDate()-range+1);since.setHours(0,0,0,0);const through=new Date();through.setHours(23,59,59,999);const completed=data.sessions.filter(s=>s.completed&&s.completedAt&&new Date(s.completedAt)>=since&&new Date(s.completedAt)<=through);const planned=data.sessions.filter(s=>s.scheduledDate>=todayKey(since)&&s.scheduledDate<=today);const days=new Set(completed.map(s=>todayKey(new Date(s.completedAt!)))).size;const minutes=completed.reduce((a,s)=>a+s.duration,0);const streak=deriveStreak(data.sessions);const studyPercent=Math.round(days/range*100);const tasksPercent=planned.length?Math.round(completed.length/planned.length*100):0;const bars=useMemo(()=>{const count=range===7?7:range===28?4:12;return Array.from({length:count},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(count-1-i)*(range===7?1:range===28?7:30));const key=range===7?todayKey(d):`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;const minutes=completed.filter(s=>range===7?todayKey(new Date(s.completedAt!))===key:new Date(s.completedAt!).getFullYear()===d.getFullYear()&&new Date(s.completedAt!).getMonth()===d.getMonth()).reduce((a,s)=>a+s.duration,0);return {label:range===7?d.toLocaleDateString(undefined,{weekday:'short'}):range===28?`W${i+1}`:d.toLocaleDateString(undefined,{month:'short'}),minutes};});},[range,completed]);const max=Math.max(30,...bars.map(b=>b.minutes));const subjectTotals=data.subjects.map(s=>({...s,minutes:completed.filter(x=>x.subjectId===s.id).reduce((a,x)=>a+x.duration,0)})).sort((a,b)=>b.minutes-a.minutes);
 return <Page wide><Eyebrow>Progress, not pressure</Eyebrow><Title title="Your progress" subtitle="A look at the study habits you're building. These numbers come from the sessions you complete."/><div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-5">{[{n:7,l:'7 days'},{n:28,l:'4 weeks'},{n:90,l:'3 months'}].map(x=><button key={x.n} onClick={()=>setRange(x.n)} className={`px-4 min-h-9 rounded-lg text-xs font-bold ${range===x.n?'bg-white text-primary shadow-sm':'text-slate-500'}`}>Last {x.l}</button>)}</div>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><StatTile icon={<CalendarDays/>} label="Study days" value={`${days} / ${range}`} detail={`${studyPercent}% of days`} tone="blue"/><StatTile icon={<Clock3/>} label="Study time" value={minutes>=60?`${(minutes/60).toFixed(1)}h`:`${minutes}m`} detail="completed sessions" tone="green"/><StatTile icon={<CheckCircle2/>} label="Tasks completed" value={`${completed.length} / ${planned.length}`} detail={planned.length?`${tasksPercent}% of planned sessions`:'No sessions planned in this period'} tone="blue"/><StatTile icon={<Flame/>} label="Current streak" value={`${streak}`} detail={streak===1?'day':'days'} tone="orange"/></div>
 <div className="grid lg:grid-cols-[1.4fr_.8fr] gap-5 mt-5"><Card className="p-5 sm:p-6"><div className="flex justify-between items-start"><div><h2 className="font-display font-extrabold text-lg">Study time trend</h2><p className="text-xs text-muted-foreground mt-1">Minutes from completed sessions</p></div><TrendingUp size={19} className="text-primary"/></div>{completed.length?<div className="mt-6 h-48 flex items-end gap-2 sm:gap-3 border-b border-slate-200 pb-2">{bars.map((b,i)=><div key={b.label+i} className="flex-1 h-full flex flex-col justify-end items-center gap-2"><div title={`${b.minutes} minutes`} className="w-full max-w-10 rounded-t-md bg-[#76a8e6] hover:bg-primary transition-colors min-h-[3px]" style={{height:`${b.minutes?Math.max(4,b.minutes/max*100):2}%`}}/><span className="text-[10px] text-muted-foreground">{b.label}</span></div>)}</div>:<div className="mt-6 h-48 rounded-xl bg-[#f6f9fc] grid place-items-center text-center px-5"><div><div className="mx-auto w-10 h-10 rounded-xl bg-white grid place-items-center text-primary"><Activity size={19}/></div><p className="font-semibold text-sm mt-2">Your trend starts with your first session</p><p className="text-xs text-muted-foreground mt-1">Complete a study block to see it here.</p></div></div>}</Card>
 <Card className="p-5 sm:p-6"><h2 className="font-display font-extrabold text-lg">By subject</h2><p className="text-xs text-muted-foreground mt-1">Time spent in this period</p>{subjectTotals.length?subjectTotals.map((s,i)=><div key={s.id} className="mt-4"><div className="flex justify-between text-xs font-semibold"><span>{s.name}</span><span className="text-muted-foreground">{s.minutes} min</span></div><div className="h-2 mt-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${minutes?Math.max(s.minutes?5:0,s.minutes/minutes*100):0}%`,background:['#4b87cf','#63a88c','#e4a85e','#9c8cc5','#67aeb8'][i%5]}}/></div></div>):<p className="text-sm text-muted-foreground mt-6">Your subject breakdown will show after a completed study session.</p>}</Card></div>
 <div className="mt-5"><Eyebrow>Keep the important dates in view</Eyebrow><h2 className="font-display font-extrabold text-lg mb-3">Upcoming exams</h2><Card className="divide-y divide-slate-100">{data.exams.filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).map(e=>{const left=Math.ceil((new Date(`${e.date}T12:00:00`).getTime()-new Date(`${today}T12:00:00`).getTime())/86400000);return <div key={e.id} className="p-4 flex items-center gap-3"><CalendarDays size={18} className={left<4?'text-orange-600':'text-primary'}/><div className="flex-1"><p className="text-sm font-bold">{data.subjects.find(s=>s.id===e.subjectId)?.name} · {e.title}</p><p className="text-xs text-muted-foreground mt-1">{new Date(`${e.date}T12:00:00`).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})}</p></div><span className={`text-xs font-bold ${left<4?'text-orange-700':'text-slate-500'}`}>{left===0?'Today':`${left} days`}</span></div>})}{!data.exams.some(e=>e.date>=today)&&<p className="p-5 text-sm text-muted-foreground">No upcoming exams. Add a date when you have one.</p>}</Card></div>
 </Page>}
function StatTile({icon,label,value,detail,tone}:{icon:ReactNode;label:string;value:string;detail:string;tone:string}){const color=tone==='green'?'bg-emerald-50 text-emerald-700':tone==='orange'?'bg-orange-50 text-orange-700':'bg-blue-50 text-primary';return <Card className="p-4 sm:p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">{label}</span><span className={`w-8 h-8 rounded-lg grid place-items-center ${color}`}>{icon}</span></div><p className="font-display text-2xl font-extrabold mt-3">{value}</p><p className="text-[11px] text-muted-foreground mt-1">{detail}</p></Card>}
function ProfilePage(){const {data,setData}=usePlanner();const [,go]=useLocation();const [name,setName]=useState(data.user?.name??'');const [email,setEmail]=useState(data.user?.email??'');const [saved,setSaved]=useState(false);const [well,setWell]=useState('');const [hard,setHard]=useState('');const [focus,setFocus]=useState('');const [realism,setRealism]=useState('about-right');const [msg,setMsg]=useState('');const thisWeek=todayKey();const existing=data.reflections.find(r=>r.week===thisWeek);
 useEffect(()=>{if(existing){setWell(existing.wentWell);setHard(existing.difficult);setFocus(existing.focus);setRealism(existing.realism)}},[existing?.id]);
 const saveProfile=()=>{if(!name.trim()){setSaved(false);return;}setData(p=>({...p,user:p.user?{...p.user,name:name.trim(),email:email.trim()}:null}));setSaved(true);setTimeout(()=>setSaved(false),2200)};
 const saveReflection=()=>{if(!well.trim()&&!hard.trim()&&!focus){setMsg('Add one reflection before saving.');return;}const reflection={id:existing?.id??uid(),week:thisWeek,wentWell:well,difficult:hard,focus,realism};setData(p=>({...p,reflections:[...p.reflections.filter(x=>x.week!==thisWeek),reflection]}));setMsg('Reflection saved. Your notes will guide future plan adjustments.');};
 const logout = async () => {
   try {
     await signOutUser();
   } catch (e) {
     console.error("Sign out error", e);
   }
   setData(empty);
   go('/welcome');
 };
  return <Page><Eyebrow>Your settings & check-in</Eyebrow><Title title="Profile" subtitle="Keep your details current and make space to notice what is working."/><Card className="p-5 sm:p-7"><h2 className="font-display font-extrabold text-lg">Your details</h2><p className="text-xs text-muted-foreground mt-1 mb-4">Update the name and email shown in your planner.</p><div className="grid sm:grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-600">Name<input value={name} onChange={e=>setName(e.target.value)} className="mt-1.5 block w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-normal"/></label><label className="text-xs font-bold text-slate-600">Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" className="mt-1.5 block w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-normal"/></label></div><div className="flex items-center gap-3 mt-4"><Button onClick={saveProfile}>Save details</Button>{saved&&<span role="status" className="text-xs text-emerald-700">Saved.</span>}</div></Card>
 <Card className="p-5 sm:p-7 mt-5"><div className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center"><Sparkles size={18}/></span><div><Eyebrow>Weekly reflection</Eyebrow><h2 className="font-display font-extrabold text-lg">How did this week feel?</h2></div></div><p className="text-sm text-muted-foreground mt-3 mb-5">No grades, no judgement. Your reflection helps make next week more realistic.</p><div className="space-y-4"><label className="block text-sm font-semibold">What went well?<textarea value={well} onChange={e=>setWell(e.target.value)} rows={2} placeholder="Even one small thing counts..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal"/></label><label className="block text-sm font-semibold">What felt difficult?<textarea value={hard} onChange={e=>setHard(e.target.value)} rows={2} placeholder="What got in the way?" className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal"/></label><label className="block text-sm font-semibold">Which subject could use more attention?<select value={focus} onChange={e=>setFocus(e.target.value)} className="mt-2 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-normal"><option value="">Choose if useful</option>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><fieldset><legend className="text-sm font-semibold mb-2">How realistic was your schedule?</legend><div className="flex flex-wrap gap-2">{[['too-much','Too much'],['about-right','About right'],['room-for-more','Had room for more']].map(([v,l])=><button key={v} onClick={()=>setRealism(v)} className={`px-3 py-2 rounded-xl border text-xs font-semibold ${realism===v?'bg-blue-50 border-blue-200 text-primary':'border-slate-200 text-slate-600'}`}>{l}</button>)}</div></fieldset><div className="flex items-center gap-3"><Button onClick={saveReflection}>Save reflection</Button>{msg&&<span role="status" className="text-xs text-emerald-700">{msg}</span>}</div></div></Card>
  <Card className="mt-5 p-5 flex items-center justify-between gap-4"><div><h3 className="font-bold text-sm">Account</h3><p className="text-xs text-muted-foreground mt-1">Google accounts sync planner data to Firestore. Demo data is not synced and is cleared when you sign out.</p></div><Button variant="outline" onClick={logout}><LogOut size={15}/> Sign out</Button></Card>
 </Page>}
function MainApp(){
  const [data,setData]=useState<PlannerData>(empty);
  const [loading,setLoading]=useState(true);
  const [userId,setUserId]=useState<string|null>(null);

  useEffect(()=>{
    const unsub = watchAuth(async (user)=>{
      console.log("Auth state changed:", user ? user.uid : "null");
      if (user) {
        setUserId(user.uid);
        try {
          const cloudData = await loadPlannerFromCloud(user.uid);
          console.log("Cloud data loaded:", !!cloudData);
          if (cloudData) {
            setData(cloudData);
          } else {
            setData({
              ...empty,
              user: {
                id: user.uid,
                name: user.displayName || 'Student',
                email: user.email || '',
                createdAt: new Date().toISOString()
              }
            });
          }
        } catch (e) {
          console.error("Failed to load user planner data", e);
          setData({
            ...empty,
            user: {
              id: user.uid,
              name: user.displayName || 'Student',
              email: user.email || '',
              createdAt: new Date().toISOString()
            }
          });
        }
      } else {
        console.log("User logged out");
        setUserId(null);
        setData(empty);
      }
      setLoading(false);
    });
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    if (!loading && userId && data.user) {
      const timer = setTimeout(()=>{
        savePlannerToCloud(userId, data).catch(err => console.error("Auto-sync error", err));
      }, 700);
      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [data, userId, loading]);

  if (loading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-[#f5f8fc]"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"/></div>;
  }

  return <DataContext.Provider value={{data,setData}}><AppRouter/></DataContext.Provider>;
}
function App(){return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><ErrorBoundary><MainApp/></ErrorBoundary></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>}
export default App;