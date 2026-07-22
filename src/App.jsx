import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { chapters, flashcards, leaderboard, lessons, questions, tutorKnowledge } from "./data";

const AppContext = createContext(null);
const initialState = {
  name: "Bạn",
  xp: 0,
  streak: 0,
  completed: [],
  mastered: [],
  difficult: [],
  favorites: [],
  quizzes: [],
  exams: [],
  notes: [],
  dark: false,
  dailyGoal: 20,
  minutes: 0
};

function usePersistentState() {
  const [state, setState] = useState(() => {
    try {
      return { ...initialState, ...JSON.parse(localStorage.getItem("mln131-state")) };
    } catch {
      return initialState;
    }
  });
  useEffect(() => {
    localStorage.setItem("mln131-state", JSON.stringify(state));
    document.documentElement.dataset.theme = state.dark ? "dark" : "light";
  }, [state]);
  return [state, setState];
}

function AppProvider({ children }) {
  const [state, setState] = usePersistentState();
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2300);
    return () => clearTimeout(id);
  }, [toast]);
  const notify = text => setToast(text);
  const completeLesson = id => {
    setState(prev => prev.completed.includes(id) ? prev : {
      ...prev,
      completed: [...prev.completed, id],
      xp: prev.xp + 50,
      minutes: prev.minutes + 10
    });
    if (!state.completed.includes(id)) notify("Hoàn thành bài học · +50 XP");
  };
  const rateCard = (id, type) => {
    setState(prev => {
      const mastered = new Set(prev.mastered);
      const difficult = new Set(prev.difficult);
      if (type === "mastered") { mastered.add(id); difficult.delete(id); }
      if (type === "difficult") { difficult.add(id); mastered.delete(id); }
      if (type === "again") { mastered.delete(id); difficult.delete(id); }
      return {
        ...prev,
        mastered: [...mastered],
        difficult: [...difficult],
        xp: type === "mastered" && !prev.mastered.includes(id) ? prev.xp + 5 : prev.xp
      };
    });
  };
  const saveResult = (kind, result) => {
    const bonus = Math.max(5, Math.round(result.score / (kind === "exams" ? 3 : 5)));
    setState(prev => ({
      ...prev,
      xp: prev.xp + bonus,
      [kind]: [{ ...result, date: new Date().toISOString() }, ...prev[kind]]
    }));
    notify(`Đã lưu kết quả · +${bonus} XP`);
  };
  const value = {
    state, setState, toast, notify, completeLesson, rateCard, saveResult,
    level: Math.floor(state.xp / 500) + 1,
    levelProgress: state.xp % 500,
    courseProgress: Math.round(state.completed.length / lessons.length * 100)
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
const useApp = () => useContext(AppContext);

const nav = [
  ["/","🏠","Tổng quan"],["/learn","📚","Khóa học"],["/flashcards","🧠","Flashcard"],
  ["/quiz","🎯","Luyện quiz"],["/exam","⏱️","Thi thử"],["/games","🎮","Mini game"],
  ["/tutor","✨","MLN Tutor"],["/notes","📝","Ghi chú"],["/achievements","🏆","Thành tích"],
  ["/leaderboard","🥇","Xếp hạng"]
];

function Layout({ children }) {
  const { state, setState, level, levelProgress, toast } = useApp();
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <Link className="brand" to="/" onClick={()=>setOpen(false)}>
        <b>M</b><div><strong>MLN131 Quest</strong><small>Học CNXHKH thật cuốn</small></div>
      </Link>
      <nav>{nav.map(([to,icon,label])=><NavLink key={to} to={to} end={to==="/"} onClick={()=>setOpen(false)}>
        <span>{icon}</span>{label}
      </NavLink>)}</nav>
      <div className="level-box">
        <div><span>Level {level}</span><b>{state.xp} XP</b></div>
        <Progress value={levelProgress/5}/><small>{500-levelProgress} XP để lên cấp</small>
      </div>
    </aside>
    {open && <button className="overlay" onClick={()=>setOpen(false)}/>}
    <section className="main">
      <header className="topbar">
        <button className="icon mobile" onClick={()=>setOpen(!open)}>☰</button>
        <Link className="search" to="/learn"><span>⌕</span> Tìm bài học, khái niệm...</Link>
        <div className="top-actions"><span className="streak">🔥 {state.streak}</span>
          <button className="icon" onClick={()=>setState(p=>({...p,dark:!p.dark}))}>{state.dark?"☀️":"🌙"}</button>
          <Link className="avatar" to="/profile">{initials(state.name)}</Link>
        </div>
      </header>
      <main className="container">{children}</main>
    </section>
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

const initials = name => name.split(" ").slice(-2).map(x=>x[0]).join("").toUpperCase();
const shuffle = list => [...list].sort(()=>Math.random()-.5);
function Progress({ value, color }) { return <div className="progress"><i style={{width:`${Math.min(100,Math.max(0,value))}%`,background:color}}/></div>; }
function PageHeader({ eyebrow, title, text, icon }) { return <section className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div><div className="header-icon">{icon}</div></section>; }
function Stat({icon,label,value,hint,color}) { return <article className="stat"><span style={{background:`${color}18`,color}}>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{hint}</em></div></article>; }

function Dashboard() {
  const { state, level, courseProgress } = useApp();
  const next = lessons.find(x=>!state.completed.includes(x.id)) || lessons[0];
  const avg = state.quizzes.length ? Math.round(state.quizzes.reduce((s,x)=>s+x.score,0)/state.quizzes.length) : 0;
  return <div className="stack">
    <section className="hero"><div><span>🔥 Chuỗi học {state.streak} ngày</span><h1>Chào bạn, <b>{state.name.split(" ").at(-1)}</b>!</h1>
      <p>Tiếp tục chinh phục môn Chủ nghĩa xã hội khoa học. Bạn còn {Math.max(0,state.dailyGoal-state.minutes)} phút để hoàn thành mục tiêu hôm nay.</p>
      <div className="actions"><Link className="btn white" to={`/lesson/${next.id}`}>▶ Tiếp tục học</Link><Link className="btn glass" to="/quiz">Luyện nhanh</Link></div>
    </div><div className="hero-art"><div>🧠</div><span>+XP</span><span>Level {level}</span></div></section>
    <section className="stats">
      <Stat icon="⚡" label="Tổng XP" value={state.xp} hint={`Level ${level}`} color="#6c5ce7"/>
      <Stat icon="📖" label="Bài đã học" value={`${state.completed.length}/${lessons.length}`} hint={`${courseProgress}% khóa học`} color="#0984e3"/>
      <Stat icon="🎯" label="Điểm quiz TB" value={`${avg}%`} hint={`${state.quizzes.length} lượt luyện`} color="#00b894"/>
      <Stat icon="🏆" label="Flashcard đã nhớ" value={state.mastered.length} hint={`${flashcards.length} thẻ`} color="#e17055"/>
    </section>
    <section className="two-col">
      <article className="card"><Title eyebrow="Lộ trình" title="Tiến độ theo chương" link="/learn"/>
        <div className="chapter-progress">{chapters.map(ch=>{const done=ch.lessons.filter(x=>state.completed.includes(x.id)).length; return <div key={ch.id}><span>{ch.icon}</span><div><b>{ch.title}</b><small>{done}/{ch.lessons.length} bài</small><Progress value={done/ch.lessons.length*100} color={ch.color}/></div></div>})}</div>
      </article>
      <article className="card"><Title eyebrow="Mục tiêu hôm nay" title={`${state.minutes}/${state.dailyGoal} phút`}/><Progress value={state.minutes/state.dailyGoal*100}/>
        <div className="tasks"><p className={state.minutes>=10?"done":""}>✓ Học ít nhất 10 phút</p><p className={state.mastered.length>=5?"done":""}>✓ Ghi nhớ 5 flashcard</p><p className={state.quizzes.length?"done":""}>✓ Hoàn thành một quiz</p></div>
        <Link className="recommend" to="/quiz?chapter=2"><span>⚙️</span><div><b>Nên ôn: Sứ mệnh giai cấp công nhân</b><small>Làm quiz theo chương để củng cố.</small></div>→</Link>
      </article>
    </section>
  </div>;
}
function Title({eyebrow,title,link}) { return <div className="title"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{link&&<Link to={link}>Xem tất cả →</Link>}</div>; }

function Learn() {
  const {state}=useApp();
  const [params,setParams]=useSearchParams();
  const keyword=(params.get("q")||"").toLowerCase();
  const [search,setSearch]=useState(params.get("q")||"");
  const filtered=chapters.map(ch=>({...ch,lessons:ch.lessons.filter(x=>`${x.title} ${x.summary} ${x.points.join(" ")}`.toLowerCase().includes(keyword))})).filter(ch=>ch.lessons.length);
  return <div className="stack"><PageHeader eyebrow="Hành trình tri thức" title="Khóa học MLN131" text="Học từng chương, xem ví dụ thực tế và đánh dấu hoàn thành để nhận XP." icon="📚"/>
    <form className="learn-search" onSubmit={e=>{e.preventDefault();setParams(search?{q:search}:{})}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm: giai cấp công nhân, dân chủ, dân tộc, gia đình..."/><button className="btn primary">Tìm kiếm</button></form>
    {filtered.map(ch=>{const done=ch.lessons.filter(x=>state.completed.includes(x.id)).length; return <article className="chapter" key={ch.id}>
      <header style={{"--color":ch.color}}><span>Chương {ch.id}</span><div className="chapter-icon">{ch.icon}</div><div><h2>{ch.title}</h2><p>{ch.description}</p><small>📖 {ch.lessons.length} bài · ✓ {done} hoàn thành</small></div><b>{Math.round(done/ch.lessons.length*100)}%</b></header>
      <div>{ch.lessons.map((x,i)=><Link className="lesson-row" key={x.id} to={`/lesson/${x.id}`}><span className={state.completed.includes(x.id)?"done":""}>{state.completed.includes(x.id)?"✓":i+1}</span><div><b>{x.title}</b><small>{x.summary}</small></div><em>⏱ {x.minutes} phút</em><strong>→</strong></Link>)}</div>
    </article>})}
    {!filtered.length&&<Empty icon="🔎" title="Không tìm thấy" text="Thử từ khóa ngắn hơn nhé."/>}
  </div>;
}

function Lesson() {
  const {id}=useParams(); const {state,setState,completeLesson}=useApp();
  const lesson=lessons.find(x=>x.id===id); if(!lesson) return <Navigate to="/learn"/>;
  const index=lessons.findIndex(x=>x.id===id), prev=lessons[index-1], next=lessons[index+1];
  const done=state.completed.includes(id), favorite=state.favorites.includes(id);
  return <div className="lesson-page"><div className="crumb"><Link to="/learn">Khóa học</Link> › {lesson.chapterTitle} › {lesson.title}</div>
    <article className="lesson-card"><header><div><span className="tag" style={{color:lesson.chapterColor,background:`${lesson.chapterColor}18`}}>{lesson.chapterIcon} {lesson.chapterTitle}</span><h1>{lesson.title}</h1><small>⏱ {lesson.minutes} phút · ⚡ 50 XP · {done?"✅ Đã hoàn thành":"○ Chưa hoàn thành"}</small></div><button className={`star ${favorite?"on":""}`} onClick={()=>setState(p=>({...p,favorites:p.favorites.includes(id)?p.favorites.filter(x=>x!==id):[...p.favorites,id]}))}>{favorite?"★":"☆"}</button></header>
      <section className="summary"><span>💡</span><div><b>Tóm tắt nhanh</b><p>{lesson.summary}</p></div></section>
      <section><h2>Kiến thức trọng tâm</h2><div className="points">{lesson.points.map((x,i)=><div key={x}><span>{i+1}</span><p>{x}</p></div>)}</div></section>
      <section><h2>Ví dụ dễ hiểu</h2><div className="example">🌍 <p>{lesson.example}</p></div></section>
      <section><h2>Mẹo làm bài</h2><div className="tip">🎯 <p>{lesson.tip}</p></div></section>
      <footer><div><b>{done?"Bạn đã hoàn thành bài này!":"Đã hiểu nội dung?"}</b><small>{done?"Có thể đọc lại bất cứ lúc nào.":"Đánh dấu hoàn thành để nhận XP."}</small></div><button disabled={done} className={`btn ${done?"success":"primary"}`} onClick={()=>completeLesson(id)}>{done?"✓ Đã hoàn thành":"Hoàn thành bài học"}</button></footer>
    </article>
    <div className="lesson-nav">{prev?<Link to={`/lesson/${prev.id}`}>←<small>Bài trước</small><b>{prev.title}</b></Link>:<span/>}{next?<Link className="right" to={`/lesson/${next.id}`}><small>Bài tiếp</small><b>{next.title}</b>→</Link>:<Link className="right" to="/quiz"><small>Hoàn tất</small><b>Luyện quiz</b>→</Link>}</div>
  </div>;
}

function Flashcards() {
  const {state,rateCard}=useApp();
  const [onlyHard,setOnlyHard]=useState(false),[index,setIndex]=useState(0),[flip,setFlip]=useState(false);
  const cards=onlyHard?flashcards.filter(x=>state.difficult.includes(x.id)):flashcards;
  const card=cards.length?cards[index%cards.length]:null;
  const move=d=>{if(!cards.length)return;setIndex(i=>(i+d+cards.length)%cards.length);setFlip(false)};
  const rate=type=>{rateCard(card.id,type);move(1)};
  return <div className="stack"><PageHeader eyebrow="Ôn tập thông minh" title="Flashcard MLN131" text="Lật thẻ, tự đánh giá và tập trung vào những khái niệm khó." icon="🧠"/>
    <div className="flash-tools"><label><input type="checkbox" checked={onlyHard} onChange={e=>{setOnlyHard(e.target.checked);setIndex(0)}}/> Chỉ thẻ khó</label><span>{state.mastered.length}/{flashcards.length} đã nhớ</span><button className="btn ghost small" onClick={()=>{setIndex(Math.floor(Math.random()*Math.max(1,cards.length)));setFlip(false)}}>⇄ Trộn thẻ</button></div>
    {card?<article className="flash-area"><div className="flash-status"><span>Thẻ {index%cards.length+1}/{cards.length}</span><Progress value={(index%cards.length+1)/cards.length*100}/><span>{state.difficult.length} thẻ khó</span></div>
      <button className={`flashcard ${flip?"flipped":""}`} onClick={()=>setFlip(!flip)}><div className="flash-inner"><section><small>KHÁI NIỆM</small><h2>{card.term}</h2><p>Nhấn để xem định nghĩa</p><b>↻</b></section><section><small>GIẢI THÍCH</small><p>{card.definition}</p><b>↻</b></section></div></button>
      <div className="flash-actions"><button className="icon" onClick={()=>move(-1)}>←</button><button onClick={()=>rate("again")}>↻<small>Chưa nhớ</small></button><button onClick={()=>rate("difficult")}>😵<small>Khó</small></button><button onClick={()=>rate("mastered")}>✓<small>Đã nhớ</small></button><button className="icon" onClick={()=>move(1)}>→</button></div>
    </article>:<Empty icon="🎉" title="Không còn thẻ khó" text="Tắt bộ lọc để tiếp tục học."/>}
  </div>;
}

function Quiz() {
  const {saveResult}=useApp(); const [params]=useSearchParams();
  const [chapter,setChapter]=useState(Number(params.get("chapter")||0)),[count,setCount]=useState(10),[quiz,setQuiz]=useState([]),[index,setIndex]=useState(0),[answers,setAnswers]=useState({}),[finished,setFinished]=useState(false);
  const start=()=>{const pool=chapter?questions.filter(x=>x.chapter===chapter):questions;setQuiz(shuffle(pool).slice(0,Math.min(count,pool.length)));setIndex(0);setAnswers({});setFinished(false)};
  const submit=()=>{const correct=quiz.filter(x=>answers[x.id]===x.answer).length;const score=Math.round(correct/quiz.length*100);saveResult("quizzes",{chapter:chapter||null,total:quiz.length,correct,score});setFinished(true)};
  if(!quiz.length) return <div className="stack"><PageHeader eyebrow="Luyện theo cách của bạn" title="Quiz MLN131" text="Chọn chương, số câu và nhận giải thích ngay sau khi trả lời." icon="🎯"/><article className="setup"><div>🧩</div><h2>Tạo bài luyện tập</h2><label>Phạm vi<select value={chapter} onChange={e=>setChapter(Number(e.target.value))}><option value="0">Tất cả chương</option>{chapters.map(x=><option key={x.id} value={x.id}>Chương {x.id}: {x.title}</option>)}</select></label><label>Số câu<select value={count} onChange={e=>setCount(Number(e.target.value))}>{[5,10,15,20].map(x=><option key={x} value={x}>{x} câu</option>)}</select></label><button className="btn primary wide" onClick={start}>Bắt đầu luyện tập</button></article></div>;
  if(finished){const correct=quiz.filter(x=>answers[x.id]===x.answer).length,score=Math.round(correct/quiz.length*100);return <div className="stack"><Result score={score} correct={correct} total={quiz.length} onAgain={start} onBack={()=>setQuiz([])}/><Review list={quiz} answers={answers}/></div>}
  const current=quiz[index],selected=answers[current.id],last=index===quiz.length-1;
  return <div className="quiz-player"><div className="quiz-head"><span>Câu {index+1}/{quiz.length}</span><Progress value={(index+1)/quiz.length*100}/><span>{Object.keys(answers).length} đã trả lời</span></div><article className="question"><span>Chương {current.chapter}</span><h1>{current.text}</h1><div className="options">{current.options.map((x,i)=>{let cls="";if(selected!==undefined){if(i===current.answer)cls="correct";else if(i===selected)cls="wrong"}return <button key={x} className={cls} disabled={selected!==undefined} onClick={()=>setAnswers(p=>({...p,[current.id]:i}))}><b>{String.fromCharCode(65+i)}</b>{x}</button>})}</div>{selected!==undefined&&<div className={`feedback ${selected===current.answer?"ok":"bad"}`}><b>{selected===current.answer?"✓ Chính xác!":"✕ Chưa đúng"}</b><p>{current.explanation}</p></div>}</article><div className="quiz-nav"><button className="btn ghost" disabled={!index} onClick={()=>setIndex(index-1)}>← Câu trước</button><div>{quiz.map((x,i)=><button key={x.id} className={`${i===index?"active":""} ${answers[x.id]!==undefined?"answered":""}`} onClick={()=>setIndex(i)}>{i+1}</button>)}</div>{last?<button className="btn primary" disabled={Object.keys(answers).length<quiz.length} onClick={submit}>Nộp bài</button>:<button className="btn primary" disabled={selected===undefined} onClick={()=>setIndex(index+1)}>Câu tiếp →</button>}</div></div>;
}

function Result({score,correct,total,onAgain,onBack}) { return <article className="result"><div>{score>=90?"🏆":score>=70?"🎉":"💪"}</div><span className="eyebrow">Kết quả</span><h1>{score}%</h1><p>Đúng <b>{correct}/{total}</b> câu. {score>=80?"Kiến thức rất tốt!":"Hãy xem lại phần giải thích bên dưới."}</p><div><button className="btn primary" onClick={onAgain}>Làm đề mới</button><button className="btn ghost" onClick={onBack}>Quay lại</button></div></article>; }
function Review({list,answers}) { return <section className="review"><h2>Xem lại đáp án</h2>{list.map((x,i)=>{const ok=answers[x.id]===x.answer;return <article key={x.id} className={ok?"ok":"bad"}><span>{i+1}</span><div><b>{x.text}</b><p>Bạn chọn: <strong>{x.options[answers[x.id]]||"Chưa trả lời"}</strong></p>{!ok&&<p>Đáp án đúng: <strong>{x.options[x.answer]}</strong></p>}<small>💡 {x.explanation}</small></div></article>})}</section>; }

function Exam() {
  const {saveResult}=useApp(); const [status,setStatus]=useState("setup"),[exam,setExam]=useState([]),[answers,setAnswers]=useState({}),[index,setIndex]=useState(0),[time,setTime]=useState(900);
  const start=()=>{setExam(shuffle(questions).slice(0,20));setAnswers({});setIndex(0);setTime(900);setStatus("running")};
  const submit=()=>{if(status!=="running")return;const correct=exam.filter(x=>answers[x.id]===x.answer).length,score=Math.round(correct/exam.length*100);saveResult("exams",{total:exam.length,correct,score,duration:900-time});setStatus("result")};
  useEffect(()=>{if(status!=="running")return;if(time<=0){submit();return}const id=setTimeout(()=>setTime(t=>t-1),1000);return()=>clearTimeout(id)},[status,time]);
  if(status==="setup")return <div className="stack"><PageHeader eyebrow="Mô phỏng kiểm tra" title="Thi thử MLN131" text="20 câu ngẫu nhiên, 15 phút và không hiện đáp án khi đang làm." icon="⏱️"/><article className="exam-intro"><div>📝</div><h2>Sẵn sàng thử sức?</h2><section><p><b>20</b><small>Câu hỏi</small></p><p><b>15</b><small>Phút</small></p><p><b>70%</b><small>Mục tiêu</small></p></section><ul><li>Có thể chuyển qua lại giữa các câu.</li><li>Bài tự nộp khi hết giờ.</li><li>Đáp án hiện sau khi nộp.</li></ul><button className="btn primary wide" onClick={start}>Bắt đầu thi thử</button></article></div>;
  if(status==="result"){const correct=exam.filter(x=>answers[x.id]===x.answer).length,score=Math.round(correct/exam.length*100);return <div className="stack"><Result score={score} correct={correct} total={exam.length} onAgain={start} onBack={()=>setStatus("setup")}/><Review list={exam} answers={answers}/></div>}
  const current=exam[index]; return <div className="exam-player"><header><div><b>Thi thử MLN131</b><small>{Object.keys(answers).length}/{exam.length} đã trả lời</small></div><strong className={time<120?"danger":""}>⏱ {String(Math.floor(time/60)).padStart(2,"0")}:{String(time%60).padStart(2,"0")}</strong><button className="btn red small" onClick={submit}>Nộp bài</button></header><div className="exam-grid"><aside><b>Danh sách câu</b><div>{exam.map((x,i)=><button key={x.id} className={`${i===index?"active":""} ${answers[x.id]!==undefined?"answered":""}`} onClick={()=>setIndex(i)}>{i+1}</button>)}</div></aside><article className="question"><span>Câu {index+1} · Chương {current.chapter}</span><h1>{current.text}</h1><div className="options">{current.options.map((x,i)=><button key={x} className={answers[current.id]===i?"selected":""} onClick={()=>setAnswers(p=>({...p,[current.id]:i}))}><b>{String.fromCharCode(65+i)}</b>{x}</button>)}</div><div className="exam-nav"><button className="btn ghost" disabled={!index} onClick={()=>setIndex(index-1)}>← Câu trước</button><button className="btn primary" disabled={index===exam.length-1} onClick={()=>setIndex(index+1)}>Câu tiếp →</button></div></article></div></div>;
}

function Games() {
  const {state,setState,notify}=useApp();
  const [mode,setMode]=useState("menu");
  if(mode==="menu")return <div className="stack"><PageHeader eyebrow="Học mà chơi" title="Mini game triết học" text="Đổi không khí với các thử thách ngắn, vui và vẫn ghi nhớ kiến thức." icon="🎮"/><section className="games"><button onClick={()=>setMode("match")}><span>Rèn trí nhớ</span><b>🧩</b><h2>Ghép khái niệm</h2><p>Ghép đúng thuật ngữ với định nghĩa tương ứng.</p><strong>Chơi ngay →</strong></button><button onClick={()=>setMode("speed")}><span>Phản xạ nhanh</span><b>⚡</b><h2>Đúng nhanh sống lâu</h2><p>Mỗi câu chỉ có 8 giây và bạn có 3 mạng.</p><strong>Chơi ngay →</strong></button><article><span>Sắp ra mắt</span><b>🗺️</b><h2>Phiêu lưu biện chứng</h2><p>Vượt các màn theo bản đồ kiến thức.</p><strong>🔒 Đang phát triển</strong></article></section></div>;
  return mode==="match"?<MatchGame back={()=>setMode("menu")} reward={()=>{setState(p=>({...p,xp:p.xp+60}));notify("Hoàn thành game · +60 XP")}}/>:<SpeedGame back={()=>setMode("menu")} state={state}/>;
}
function makeRound(){const pick=shuffle(flashcards).slice(0,6);return {terms:pick,defs:shuffle(pick)}}
function MatchGame({back,reward}) {
  const [round,setRound]=useState(makeRound),[term,setTerm]=useState(null),[matched,setMatched]=useState([]),[message,setMessage]=useState("");
  const choose=id=>{if(!term)return;if(term===id){const next=[...matched,id];setMatched(next);setTerm(null);setMessage("Chính xác! +10 điểm");if(next.length===round.terms.length)reward()}else setMessage("Chưa đúng, thử lại nhé!")};
  const reset=()=>{setRound(makeRound());setTerm(null);setMatched([]);setMessage("")};
  if(matched.length===6)return <div className="stack"><GameHead title="Ghép khái niệm" back={back}/><article className="result"><div>🎊</div><h1>60 điểm</h1><p>Bạn đã ghép chính xác toàn bộ khái niệm.</p><button className="btn primary" onClick={reset}>Vòng mới</button></article></div>;
  return <div className="stack"><GameHead title="Ghép khái niệm" back={back} action={<button className="btn ghost small" onClick={reset}>↻ Chơi lại</button>}/><div className="match-score"><span>Đã ghép {matched.length}/6</span><Progress value={matched.length/6*100}/><b>{matched.length*10} điểm</b></div><section className="match-board"><div><h3>1. Chọn khái niệm</h3>{round.terms.filter(x=>!matched.includes(x.id)).map(x=><button key={x.id} className={term===x.id?"selected":""} onClick={()=>setTerm(x.id)}>{x.term}</button>)}</div><aside>⇄<small>{message||"Chọn một mục ở mỗi bên"}</small></aside><div><h3>2. Chọn định nghĩa</h3>{round.defs.filter(x=>!matched.includes(x.id)).map(x=><button key={x.id} onClick={()=>choose(x.id)}>{x.definition}</button>)}</div></section></div>;
}
function GameHead({title,back,action}){return <header className="game-head"><button className="btn ghost small" onClick={back}>← Chọn game</button><div><span className="eyebrow">Mini game</span><h1>{title}</h1></div>{action||<span/>}</header>}
function SpeedGame({back}) {
  const [current,setCurrent]=useState(()=>questions[Math.floor(Math.random()*questions.length)]),[lives,setLives]=useState(3),[score,setScore]=useState(0),[time,setTime]=useState(8),[message,setMessage]=useState("");
  const next=()=>{setCurrent(questions[Math.floor(Math.random()*questions.length)]);setTime(8);setMessage("")};
  useEffect(()=>{if(lives<=0)return;if(time<=0){setLives(x=>x-1);setMessage("Hết giờ!");next();return}const id=setTimeout(()=>setTime(x=>x-1),1000);return()=>clearTimeout(id)},[time,lives,current.id]);
  const answer=i=>{if(i===current.answer){setScore(x=>x+1);setMessage("Chính xác!");next()}else{setLives(x=>x-1);setMessage("Sai rồi!");next()}};
  if(lives<=0)return <div className="stack"><GameHead title="Đúng nhanh sống lâu" back={back}/><article className="result"><div>⚔️</div><h1>{score} câu</h1><p>Bạn đã hết 3 mạng. Thử phá kỷ lục nhé!</p><button className="btn primary" onClick={()=>{setLives(3);setScore(0);next()}}>Chơi lại</button></article></div>;
  return <div className="stack"><GameHead title="Đúng nhanh sống lâu" back={back} action={<b>{"❤️".repeat(lives)}{"🖤".repeat(3-lives)}</b>}/><article className="speed"><div><span>Điểm: <b>{score}</b></span><Progress value={time/8*100}/><b>{time}s</b></div><span>Chương {current.chapter}</span><h2>{current.text}</h2><section className="options">{current.options.map((x,i)=><button key={x} onClick={()=>answer(i)}><b>{String.fromCharCode(65+i)}</b>{x}</button>)}</section><strong>{message}</strong></article></div>;
}

function Tutor() {
  const [messages,setMessages]=useState([{role:"bot",text:"Chào bạn! Mình là MLN Tutor chạy bằng dữ liệu viết cứng. Hãy hỏi về giai cấp công nhân, thời kỳ quá độ, dân chủ, dân tộc, tôn giáo hoặc gia đình..."}]),[input,setInput]=useState("");
  const send=text=>{const value=(text??input).trim();if(!value)return;const lower=value.toLowerCase();const found=tutorKnowledge.find(x=>x.keys.some(k=>lower.includes(k)));setMessages(p=>[...p,{role:"user",text:value},{role:"bot",text:found?.answer||"Mình chưa có câu trả lời cố định cho chủ đề này. Hãy thử hỏi: Chủ nghĩa xã hội khoa học, giai cấp công nhân, thời kỳ quá độ, dân chủ, liên minh giai cấp, dân tộc, tôn giáo hoặc gia đình."}]);setInput("")};
  const suggestions=["Ba phát kiến vĩ đại là gì?","Sứ mệnh lịch sử của giai cấp công nhân","Bỏ qua chế độ tư bản chủ nghĩa là gì?","Cương lĩnh dân tộc gồm gì?"];
  return <div className="stack"><section className="tutor-head"><div>✨</div><section><span className="eyebrow">Gia sư offline</span><h1>MLN131 Tutor</h1><p>Không gọi API, không cần internet. Câu trả lời được ánh xạ từ bộ kiến thức trong source code.</p></section></section><div className="tutor-grid"><aside><h3>Gợi ý câu hỏi</h3>{suggestions.map(x=><button key={x} onClick={()=>send(x)}>{x}</button>)}<p>🛡️ <b>100% local</b><small>Không gửi dữ liệu ra ngoài.</small></p></aside><section className="chat"><div>{messages.map((m,i)=><article key={i} className={m.role}><span>{m.role==="bot"?"M":"B"}</span><p><b>{m.role==="bot"?"MLN Tutor":"Bạn"}</b>{m.text}</p></article>)}</div><form onSubmit={e=>{e.preventDefault();send()}}><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Ví dụ: Giải thích sứ mệnh lịch sử của giai cấp công nhân..."/><button className="btn primary">Gửi ➤</button></form></section></div></div>;
}

function Notes() {
  const {state,setState,notify}=useApp(); const [query,setQuery]=useState(""),[edit,setEdit]=useState(null),[form,setForm]=useState({title:"",content:"",lessonId:""});
  const save=e=>{e.preventDefault();if(!form.title.trim()||!form.content.trim())return;setState(p=>({...p,notes:edit?p.notes.map(n=>n.id===edit?{...n,...form,updated:new Date().toISOString()}:n):[{id:crypto.randomUUID(),...form,updated:new Date().toISOString()},...p.notes]}));setForm({title:"",content:"",lessonId:""});setEdit(null);notify("Đã lưu ghi chú")};
  const remove=id=>{setState(p=>({...p,notes:p.notes.filter(n=>n.id!==id)}));notify("Đã xóa ghi chú")};
  const filtered=state.notes.filter(n=>`${n.title} ${n.content}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="stack"><PageHeader eyebrow="Không để kiến thức trôi qua" title="Ghi chú cá nhân" text="Viết theo cách hiểu của bạn và tìm lại nhanh khi ôn thi." icon="📝"/><div className="notes-grid"><form className="card note-form" onSubmit={save}><Title eyebrow={edit?"Đang chỉnh sửa":"Ghi chú mới"} title={edit?"Cập nhật ghi chú":"Viết điều cần nhớ"}/><label>Tiêu đề<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Phân biệt lượng và chất"/></label><label>Liên kết bài học<select value={form.lessonId} onChange={e=>setForm({...form,lessonId:e.target.value})}><option value="">Không liên kết</option>{lessons.map(x=><option key={x.id} value={x.id}>{x.chapterTitle} · {x.title}</option>)}</select></label><label>Nội dung<textarea rows="8" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Viết nội dung..."/></label><button className="btn primary wide">{edit?"Lưu thay đổi":"Lưu ghi chú"}</button></form><section><div className="notes-tools"><div><span className="eyebrow">Thư viện cá nhân</span><h2>{state.notes.length} ghi chú</h2></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm ghi chú..."/></div><div className="note-list">{filtered.map(n=>{const lesson=lessons.find(x=>x.id===n.lessonId);return <article key={n.id}><header><span>{lesson?.chapterIcon||"💡"}</span><div><button onClick={()=>{setEdit(n.id);setForm({title:n.title,content:n.content,lessonId:n.lessonId||""})}}>✎</button><button onClick={()=>remove(n.id)}>🗑</button></div></header><h3>{n.title}</h3><p>{n.content}</p>{lesson&&<small>{lesson.chapterTitle} · {lesson.title}</small>}<time>{new Date(n.updated).toLocaleDateString("vi-VN")}</time></article>})}</div>{!filtered.length&&<Empty icon="✍️" title={query?"Không tìm thấy":"Chưa có ghi chú"} text="Tạo ghi chú đầu tiên để nhớ kiến thức lâu hơn."/>}</section></div></div>;
}

const badgeList=[
  ["🌱","Khởi đầu lý luận","Hoàn thành bài học đầu tiên",s=>s.completed.length>=1],
  ["📚","Người học chăm chỉ","Hoàn thành 5 bài học",s=>s.completed.length>=5],
  ["🎓","Nhà tư duy","Hoàn thành 10 bài học",s=>s.completed.length>=10],
  ["🎯","Bắn trúng trọng tâm","Đạt ít nhất 80% một quiz",s=>s.quizzes.some(q=>q.score>=80)],
  ["💯","Không một sai sót","Đạt 100% một quiz",s=>s.quizzes.some(q=>q.score===100)],
  ["🧠","Bộ nhớ siêu tốc","Ghi nhớ 15 flashcard",s=>s.mastered.length>=15],
  ["⚡","Năng lượng 1000","Tích lũy 1000 XP",s=>s.xp>=1000],
  ["✍️","Người ghi chép","Tạo 5 ghi chú",s=>s.notes.length>=5]
];
function Achievements(){const {state,level,levelProgress}=useApp();const count=badgeList.filter(x=>x[3](state)).length;return <div className="stack"><section className="achievement-head"><div><span className="eyebrow">Bộ sưu tập của bạn</span><h1>Thành tích & Cấp độ</h1><p>Mỗi lần học là một bước tiến. Tiếp tục mở khóa huy hiệu.</p></div><div><small>LEVEL</small><b>{level}</b><span>{state.xp} XP</span></div></section><article className="card level-progress"><div><b>Tiến độ lên Level {level+1}</b><span>{levelProgress}/500 XP</span></div><Progress value={levelProgress/5}/></article><Title eyebrow="Huy hiệu" title={`${count}/${badgeList.length} đã mở khóa`}/><section className="badges">{badgeList.map(([icon,title,text,test])=>{const unlocked=test(state);return <article key={title} className={unlocked?"":"locked"}><b>{icon}</b><span>{unlocked?"ĐÃ MỞ KHÓA":"CHƯA ĐẠT"}</span><h3>{title}</h3><p>{text}</p><i>{unlocked?"✓":"🔒"}</i></article>})}</section></div>}

function Leaderboard(){const {state}=useApp();const board=leaderboard.map(x=>x.name==="Nguyễn Toàn"?{...x,xp:state.xp,streak:state.streak}:x).sort((a,b)=>b.xp-a.xp).map((x,i)=>({...x,rank:i+1}));return <div className="stack"><PageHeader eyebrow="Thi đua tích cực" title="Bảng xếp hạng tuần" text="Đối thủ là dữ liệu mẫu; XP của bạn cập nhật theo tiến độ thật." icon="🥇"/><section className="podium">{[board[1],board[0],board[2]].map((x,i)=>{const place=[2,1,3][i];return <article className={`p${place}`} key={x.name}><div>{x.avatar}</div><span>{place===1?"👑":`#${place}`}</span><b>{x.name}</b><small>{x.xp} XP</small><strong>{place}</strong></article>})}</section><article className="board"><header><span>Hạng</span><span>Người học</span><span>Chuỗi ngày</span><span>XP</span></header>{board.map(x=><section key={x.name} className={x.name==="Nguyễn Toàn"?"me":""}><b>{x.rank<=3?["🥇","🥈","🥉"][x.rank-1]:`#${x.rank}`}</b><div><span>{x.avatar}</span><p><b>{x.name}</b>{x.name==="Nguyễn Toàn"&&<small>Bạn</small>}</p></div><span>🔥 {x.streak} ngày</span><strong>{x.xp}</strong></section>)}</article></div>}

function Profile(){const {state,setState,level,courseProgress,notify}=useApp();const [name,setName]=useState(state.name),[goal,setGoal]=useState(state.dailyGoal);const save=e=>{e.preventDefault();setState(p=>({...p,name:name.trim()||"Người học",dailyGoal:Number(goal)}));notify("Đã cập nhật hồ sơ")};return <div className="stack"><section className="profile-head"><div>{initials(state.name)}</div><section><span className="eyebrow">Hồ sơ người học</span><h1>{state.name}</h1><p>Level {level} · {state.xp} XP · Hoàn thành {courseProgress}% khóa học</p></section></section><div className="profile-grid"><form className="card" onSubmit={save}><Title eyebrow="Cài đặt" title="Thông tin cá nhân"/><label>Tên hiển thị<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Mục tiêu học mỗi ngày<select value={goal} onChange={e=>setGoal(e.target.value)}>{[10,20,30,45,60].map(x=><option key={x} value={x}>{x} phút</option>)}</select></label><button className="btn primary">Lưu cài đặt</button></form><article className="card"><Title eyebrow="Dữ liệu localStorage" title="Quản lý tiến độ"/><p>Toàn bộ dữ liệu được lưu trong trình duyệt hiện tại, không có máy chủ.</p><section className="data-stats"><div><b>{state.completed.length}</b><span>Bài học</span></div><div><b>{state.quizzes.length}</b><span>Bài quiz</span></div><div><b>{state.notes.length}</b><span>Ghi chú</span></div></section><button className="btn red" onClick={()=>{if(confirm("Xóa toàn bộ tiến độ?")){localStorage.removeItem("mln131-state");setState(initialState);notify("Đã đặt lại tiến độ")}}}>Xóa toàn bộ tiến độ</button></article></div></div>}
function Empty({icon,title,text}){return <article className="empty"><div>{icon}</div><h3>{title}</h3><p>{text}</p></article>}
function NotFound(){return <Empty icon="🧭" title="404 - Trang không tồn tại" text="Có vẻ bạn đã đi lạc khỏi bản đồ Chủ nghĩa xã hội khoa học."/>}

export default function App(){return <AppProvider><Layout><Routes><Route path="/" element={<Dashboard/>}/><Route path="/learn" element={<Learn/>}/><Route path="/lesson/:id" element={<Lesson/>}/><Route path="/flashcards" element={<Flashcards/>}/><Route path="/quiz" element={<Quiz/>}/><Route path="/exam" element={<Exam/>}/><Route path="/games" element={<Games/>}/><Route path="/tutor" element={<Tutor/>}/><Route path="/notes" element={<Notes/>}/><Route path="/achievements" element={<Achievements/>}/><Route path="/leaderboard" element={<Leaderboard/>}/><Route path="/profile" element={<Profile/>}/><Route path="*" element={<NotFound/>}/></Routes></Layout></AppProvider>}
