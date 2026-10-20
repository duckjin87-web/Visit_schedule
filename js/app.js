/* ===== 기본 유틸 ===== */
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function dim(v){return '<span class="dim">'+esc(v||"—")+'</span>'}
function toast(m){const t=document.getElementById("toast");t.innerHTML=m;t.classList.add("on");
  clearTimeout(toast._t); toast._t=setTimeout(function(){t.classList.remove("on")},2600);}
function closeSheet(){document.getElementById("scrim").classList.remove("on")}
function openSheet(html){document.getElementById("sheet").innerHTML=html; document.getElementById("scrim").classList.add("on");}
function iso(d){return d.toISOString().slice(0,10)}
function wireRowSelect(container,rowSel){
  if(!container||container._rsWired)return; container._rsWired=true;
  container.addEventListener("click",function(e){
    if(e.target.closest("input,select,button,a,label,textarea,.rz"))return;
    const row=e.target.closest(rowSel); if(!row||!container.contains(row))return;
    const on=row.classList.contains("rowsel");
    container.querySelectorAll(".rowsel").forEach(function(r){r.classList.remove("rowsel")});
    if(!on)row.classList.add("rowsel");
  });
}
document.getElementById("scrim").addEventListener("click",function(e){if(e.target===this)closeSheet()});

/* ===== 공통: 재렌더 · 확인모달 · 실행취소(undo) ===== */
function redraw(){drawT3();drawC3();drawMini3();saveVisits();
  const sp=document.getElementById("stat3"); if(sp&&!sp.hidden)drawStats();}
function confirmDialog(opts){
  openSheet(
    "<div class='sh-h'><div class='k'>"+esc(opts.kicker||"확인")+"</div><h3>"+esc(opts.title||"")+"</h3></div>"+
    "<div class='sh-b'>"+(opts.body||"")+"</div>"+
    "<div class='sh-f'><button class='btn' id='cfCancel'>"+esc(opts.cancel||"취소")+"</button>"+
    "<button class='btn pri' id='cfOk'"+(opts.danger?" style='background:#D64B3F;border-color:transparent'":"")+">"+esc(opts.ok||"확인")+"</button></div>");
  document.getElementById("cfCancel").onclick=closeSheet;
  document.getElementById("cfOk").onclick=function(){closeSheet(); if(opts.onOk)opts.onOk();};
}
let _undoSnap=null, _undoTimer=0;
function snapshotVisits(){return JSON.parse(JSON.stringify(VISITS));}
function pushUndo(msg,snap){
  _undoSnap=snap;
  const bar=document.getElementById("undobar"), m=document.getElementById("undomsg");
  if(!bar)return; m.textContent=msg; bar.classList.add("on");
  clearTimeout(_undoTimer); _undoTimer=setTimeout(function(){bar.classList.remove("on");_undoSnap=null;},7000);
}
(function initUndo(){
  const btn=document.getElementById("undoBtn"); if(!btn)return;
  btn.onclick=function(){
    if(!_undoSnap)return;
    VISITS=_undoSnap; _undoSnap=null;
    document.getElementById("undobar").classList.remove("on");
    redraw(); toast("실행취소됨");
  };
})();

/* ===== 오늘 날짜 (기기 시간 기준) ===== */
const TODAY = new Date(); TODAY.setHours(0,0,0,0);
const YR = TODAY.getFullYear();


/* ===== 상태 정의 ===== */
const VST={
 nego:{label:"일정협의중",bar:"#5A7BC4",bg:"rgba(90,123,196,.16)",fg:"#31509B",tint:"rgba(90,123,196,.10)"},
 plan:{label:"방문예정",bar:"#E8A33D",bg:"rgba(232,163,61,.18)",fg:"#8A5300",tint:"rgba(232,163,61,.13)"},
 done:{label:"방문완료",bar:"#2FA86A",bg:"rgba(47,168,106,.16)",fg:"#1C7A4D",tint:"rgba(47,168,106,.10)"},
 wait:{label:"Capa회신대기중",bar:"#EE6A33",bg:"rgba(238,106,51,.16)",fg:"#B23A0F",tint:"rgba(238,106,51,.12)"},
 reg:{label:"등록완료",bar:"#8B93A6",bg:"rgba(139,147,166,.18)",fg:"#59617A",tint:"rgba(139,147,166,.14)"},
 cxl:{label:"방문취소",bar:"#C3C8D4",bg:"rgba(195,200,212,.34)",fg:"#59617A",tint:"rgba(139,147,166,.14)"},
 ng:{label:"등록불가",bar:"#D64B3F",bg:"rgba(214,75,63,.14)",fg:"#B03428",tint:"rgba(214,75,63,.10)"},
 etc:{label:"기타",bar:"#9B62CF",bg:"rgba(155,98,207,.15)",fg:"#6E2FA0",tint:"rgba(155,98,207,.10)"}
};

/* ===== 날짜 텍스트 파싱 (예: "7/23~24", "9월12일", "9.12", "2026-09-12", "8/25 이후") ===== */
function tk(m,d){return m*100+d}
function fmtk(k){return Math.floor(k/100)+"/"+(k%100)}
function nextk(k){const d=new Date(YR,Math.floor(k/100)-1,k%100);d.setDate(d.getDate()+1);return tk(d.getMonth()+1,d.getDate())}
function rangeKeys(m1,d1,m2,d2){
  const out=[];let c=new Date(YR,m1-1,d1),e=new Date(YR,m2-1,d2);
  let guard=0; while(c<=e&&guard++<120){out.push(tk(c.getMonth()+1,c.getDate()));c.setDate(c.getDate()+1)}
  return out;
}
function normDates(txt){
  let s=String(txt||"").replace(/\s/g,"");
  s=s.replace(/(\d{4})[-.](\d{1,2})[-.](\d{1,2})/g,"$1/$2/$3");
  s=s.replace(/년/g,"/").replace(/월/g,"/").replace(/일/g,"");
  s=s.replace(/\./g,"/");
  s=s.replace(/(\d{1,2})-(\d{1,2})/g,"$1/$2");
  s=s.replace(/\b\d{4}\//g,"").replace(/\/{2,}/g,"/");
  return s;
}
function parseDates(txt){
  if(!txt)return [];
  const s=normDates(txt);
  const out=new Set();
  let m;
  const reRange=/(\d{1,2})\/(\d{1,2})~(?:(\d{1,2})\/)?(\d{1,2})/g;
  while((m=reRange.exec(s))){
    const m1=+m[1],d1=+m[2],m2=m[3]?+m[3]:+m[1],d2=+m[4];
    rangeKeys(m1,d1,m2,d2).forEach(function(k){out.add(k)});
  }
  const reOne=/(\d{1,2})\/(\d{1,2})/g;
  while((m=reOne.exec(s))){ out.add(tk(+m[1],+m[2])); }
  if(/이후/.test(s)&&out.size){
    const arr=Array.from(out).sort(function(a,b){return a-b});
    let k=arr[arr.length-1];
    for(let i=0;i<10;i++){k=nextk(k);out.add(k)}
  }
  return Array.from(out).sort(function(a,b){return a-b});
}
function daysPreview(txt){
  if(!String(txt||"").trim())return "";
  const ks=parseDates(txt);
  if(!ks.length)return "<span class='dp-bad'>날짜 인식 안 됨 · 예: 9/12, 9/12~14</span>";
  return "<span class='dp-ok'>✓ "+compressK(ks)+(/이후/.test(txt)?" 이후":"")+"</span>";
}
function interK(a,b){const s=new Set(b);return a.filter(function(x){return s.has(x)})}
function compressK(keys){
  if(!keys.length)return "";
  const p=[];let st=keys[0],pv=keys[0];
  for(let i=1;i<=keys.length;i++){const k=keys[i];
    if(k!==undefined&&k===nextk(pv)){pv=k;continue}
    p.push(st===pv?fmtk(st):fmtk(st)+"~"+fmtk(pv));st=k;pv=k}
  return p.join(", ");
}
function keyToIso(k){return TODAY.getFullYear()+"-"+String(Math.floor(k/100)).padStart(2,"0")+"-"+String(k%100).padStart(2,"0");}
function finalDates(v){
  const cp=parseDates(v.coop),qq=parseDates(v.qa),vd=parseDates(v.vend);
  const b=interK(cp,qq); return vd.length?interK(b,vd):b;
}

/* ===== 이동시간 추정 (세종 전의면 기준 · 참고 추정치) ===== */
const CITY=[["안산",145,105],["부천",130,100],["수원",105,80],["화성",110,85],["평택",75,62],["남원",190,135],
 ["김포",165,120],["인천",150,110],["청주",30,32],["음성",55,48],["천안",30,32],["아산",35,35],["대전",45,40],
 ["구미",145,112],["김해",260,185],["파주",180,135],["시흥",140,103],["군포",125,93],["용인",100,78],
 ["성남",115,88],["오산",85,68],["안성",60,52],["이천",110,85],["진천",45,40],["증평",45,42],["제천",110,90],
 ["원주",130,100],["대구",180,135],["부산",280,195],["양산",265,188],["전주",110,85],["익산",95,78],
 ["논산",45,42],["공주",25,28],["세종",12,18],["당진",70,60],["홍성",70,62],["예산",55,50],["서산",85,70],
 ["보령",90,75],["광주",180,135],["서울",130,100],["고양",165,120],["의정부",165,122],["춘천",160,120]];
const PROV=[["경기",120,90],["인천",150,110],["서울",130,100],["충북",50,45],["충남",45,42],["대전",45,40],
 ["세종",12,18],["경북",160,120],["경남",250,180],["부산",280,195],["대구",180,135],["전북",110,85],
 ["전남",200,150],["광주",180,135],["강원",150,115],["울산",270,190],["제주",0,0]];
function tripOf(addr){
  const a=String(addr||"");
  for(const c of CITY) if(a.indexOf(c[0])>=0) return {km:c[1],min:c[2]};
  for(const p of PROV) if(a.indexOf(p[0])>=0) return {km:p[1],min:p[2]};
  return null;
}
const BUF=20;
function calcTrip(addr,hhmm){
  const t=tripOf(addr); if(!t||!hhmm||!t.min)return null;
  const p=hhmm.split(":"); let mm=(+p[0])*60+(+p[1])-t.min-BUF,day="";
  if(mm<0){mm+=1440;day="전일 "}
  const dur=(t.min>=60?Math.floor(t.min/60)+"시간 "+(t.min%60?(t.min%60)+"분":""):t.min+"분").trim();
  return {out:day+String(Math.floor(mm/60)).padStart(2,"0")+":"+String(mm%60).padStart(2,"0"),km:t.km,dur:dur};
}

/* ===== 열 정의 ===== */
const VCOLS=[
 {g:"fix",k:"no",t:"No",w:40,a:"ctr"},
 {g:"fix",k:"co",t:"업체명",w:180},
 {g:"fix",k:"st",t:"진행 상태",w:134,a:"ctr"},
 {g:"fix",k:"fix",t:"확정 방문일",w:100,a:"ctr"},
 {g:"fix",k:"trip",t:"방문 예정시간 · 이동",w:184},
 {g:"fix",k:"dd",t:"D-day",w:62,a:"ctr"},
 {g:"fix",k:"memo",t:"최근 비고",w:230,a:"wide"},
 {g:"co",k:"kind",t:"구분",w:96,a:"ctr"},
 {g:"co",k:"addr",t:"주소지",w:250,a:"wide"},
 {g:"co",k:"mgr",t:"담당자",w:96},
 {g:"co",k:"pos",t:"직위",w:94},
 {g:"co",k:"tel",t:"연락처",w:124},
 {g:"co",k:"mail",t:"메일",w:208},
 {g:"ct",k:"link",t:"소개자료",w:150},
 {g:"sch",k:"vend",t:"업체 방문가능일",w:158},
 {g:"sch",k:"coop",t:"협생 가능일",w:170},
 {g:"sch",k:"qa",t:"품보 가능일",w:170},
 {g:"sch",k:"both",t:"부서 공통",w:122},
 {g:"sch",k:"final",t:"최종 공통 가능일",w:168},
 {g:"sel",k:"picker",t:"선정주체",w:118},
 {g:"sel",k:"reason",t:"선정 사유",w:280,a:"wide"},
 {g:"vis",k:"vdone",t:"방문완료일",w:100,a:"ctr"},
 {g:"vis",k:"att",t:"참석자",w:160},
 {g:"vis",k:"res",t:"방문 결과",w:310,a:"wide"},
 {g:"vis",k:"cq",t:"Capa 요청일",w:132,a:"ctr"},
 {g:"vis",k:"elapsed",t:"경과일",w:120,a:"ctr"},
 {g:"log",k:"ch",t:"상태 변경일",w:100,a:"ctr"},
 {g:"log",k:"by",t:"최종 수정자",w:106},
 {g:"log",k:"note",t:"변경 메모",w:230,a:"wide"}
];
const VGROUPS=[{k:"fix",t:"고정",lock:true},{k:"co",t:"① 업체정보"},{k:"ct",t:"② 기타자료",off:true},
 {k:"sch",t:"③ 일정협의"},{k:"sel",t:"④ 선정"},{k:"vis",t:"⑤ 방문 결과"},{k:"log",t:"⑥ 이력"}];
const VHIDE={}; VGROUPS.forEach(function(g){if(g.off)VHIDE[g.k]=true});
const VGTINT={
 co:{g:"rgba(58,91,220,.14)",c:"rgba(58,91,220,.07)"}, ct:{g:"rgba(58,91,220,.10)",c:"rgba(58,91,220,.05)"},
 sch:{g:"rgba(58,150,170,.14)",c:"rgba(58,150,170,.07)"}, sel:{g:"rgba(140,90,200,.14)",c:"rgba(140,90,200,.07)"},
 vis:{g:"rgba(47,168,106,.14)",c:"rgba(47,168,106,.07)"}, log:{g:"rgba(150,150,150,.14)",c:"rgba(150,150,150,.07)"}
};
let vf="all";
let T3COLS=[];

/* ===== 데이터: localStorage에 저장되어 새로고침해도 유지됩니다 ===== */
let VISITS=[];
function loadVisits(){
  try{
    const raw=localStorage.getItem("cosmedb_visits_v1");
    if(raw){VISITS=JSON.parse(raw); return;}
  }catch(e){}
  seedVisits();
}
function saveVisits(){
  try{localStorage.setItem("cosmedb_visits_v1",JSON.stringify(VISITS));}catch(e){}
}
function seedVisits(){
  const map={"방문완료":"done","재방문예정":"plan","확정":"plan","일정협의":"nego","보류":"etc","요청접수":"nego",
    "Capa회신대기중":"wait","등록완료":"reg","등록불가":"ng","방문취소":"cxl","기타":"etc"};
  const visited={done:1,reg:1,ng:1,wait:1};  // 방문을 이미 한 상태 → 방문완료일 기록
  VISITS=RAWVISIT.map(function(r){
    const tm=String(r["시간(출발포함)"]||"").match(/(\d{1,2})시(반)?/);
    const time=tm?String(tm[1]).padStart(2,"0")+":"+(tm[2]?"30":"00"):"";
    const who=String(r["업체 담당자"]||"").trim().split(/\s+/);
    const st=map[r["상태"]]||"nego";
    return {mid:r["업체ID"],co:r["상호명"],st:st,
      kind:r["구분"]||"OEM/ODM",
      addr:r["소재지"]||"",site:"",link:r["소개자료 링크"],
      mgr:who[0]||"",pos:who.slice(1).join(" "),tel:r["연락처"],mail:r["E-MAIL"],
      vend:r["업체 요청일"],coop:r["협/생팀 가능일"],qa:r["품질보증팀 가능일"],
      fix:(r["확정 방문일"]||"").slice(0,10),time:time,
      picker:r["수배주체"]?r["수배주체"]+"팀":"",reason:r["수배사유"],
      vdone:visited[st]?(r["확정 방문일"]||"").slice(0,10):"",
      att:r["방문자"],res:r["방문결과/후속조치"],cq:(r["Capa요청일"]||"").slice(0,10),
      memo:(r["의뢰예상제품"]||"")+(r["방문결과/후속조치"]?" · "+String(r["방문결과/후속조치"]).slice(0,26):""),
      ch:"",by:"협/생팀",note:"기존 방문일정관리 이관"};
  });
}
function ddayOf(v){
  if(!v.fix)return {t:"—",c:""};
  const d=new Date(v.fix+"T00:00:00"), diff=Math.round((d-TODAY)/86400000);
  if(diff<-30)return {t:"지난 방문",c:""};
  if(diff<0)return {t:"+"+(-diff),c:""};
  if(diff===0)return {t:"오늘",c:"over"};
  return {t:"D-"+diff,c:diff<=3?"need":""};
}
function vin(v,i,k,ph){return "<input class='vkin' data-vf='"+k+"' data-i='"+i+"' value=\""+esc(v[k]||"")+"\" placeholder='"+esc(ph||"")+"' autocomplete='off'>";}
function vcell(v,c,i){
  switch(c.k){
    case "no":return i+1;
    case "co":return "<div class='co'><span class='bar' style='background:"+VST[v.st].bar+"'></span><span class='cnm'>"+esc(v.co)+"</span></div>";
    case "st":{let o="";Object.keys(VST).forEach(function(k){o+="<option value='"+k+"'"+(k===v.st?" selected":"")+">"+VST[k].label+"</option>"});
      return "<span class='sel'><select data-vs='"+i+"' style='background:"+VST[v.st].bg+";color:"+VST[v.st].fg+"'>"+o+"</select></span>";}
    case "dd":{const d=ddayOf(v);return d.t==="—"?dim("—"):"<span class='"+d.c+"'>"+d.t+"</span>";}
    case "trip":return !v.fix?"<div class='trip'><span class='none'>방문일 확정 후</span></div>"
      :"<div class='trip'><input type='time' value='"+(v.time||"")+"' data-vt='"+i+"'><span class='calc'></span></div>";
    case "vend":return "<div class='days'><input class='dayin' data-vf='vend' data-i='"+i+"' value=\""+esc(v.vend)+"\" placeholder='미접수 · 예: 8/25 이후'><div class='dprev'>"+daysPreview(v.vend)+"</div></div>";
    case "coop":return "<div class='days'><input class='dayin' data-vf='coop' data-i='"+i+"' value=\""+esc(v.coop)+"\" placeholder='이름·날짜 예: 김지훈 7/23~24'><div class='dprev'>"+daysPreview(v.coop)+"</div></div>";
    case "qa":return "<div class='days'><input class='dayin' data-vf='qa' data-i='"+i+"' value=\""+esc(v.qa)+"\" placeholder='이름·날짜 예: 정하늘 7/23~24'><div class='dprev'>"+daysPreview(v.qa)+"</div></div>";
    case "both":{const b=interK(parseDates(v.coop),parseDates(v.qa));
      if(!v.coop&&!v.qa)return dim("—");
      return b.length?"<span class='res'>"+compressK(b)+"</span>":"<span class='res bad'>없음</span>";}
    case "final":{
      const cp=parseDates(v.coop),qq=parseDates(v.qa),vd=parseDates(v.vend);
      if(!cp.length&&!qq.length)return dim("—");
      const b=interK(cp,qq);
      if(!b.length)return "<span class='res bad'>부서 일정 불일치<small>협생·품보 재조정</small></span>";
      const f=vd.length?interK(b,vd):b;
      if(!f.length)return "<span class='res warn'>업체 일정 불일치<small>업체에 재요청</small></span>";
      const settled=["done","reg","ng","cxl","wait"].indexOf(v.st)>=0;
      return "<span class='res"+(settled?"":" hit")+"'>"+compressK(f)+"<small>"+(settled?"":f.length+"일 가능")+"</small></span>";}
    case "mail":return vin(v,i,"mail","메일");
    case "link":{const isUrl=/^https?:\/\//i.test(String(v.link||"").trim());
      return "<div class='lk'><input class='vkin' data-vf='link' data-i='"+i+"' value=\""+esc(v.link||"")+"\" placeholder='링크·파일명'>"+
        (isUrl?"<a class='lkopen' href='"+esc(v.link)+"' target='_blank' rel='noopener' title='새 탭에서 열기'>↗</a>":"")+"</div>";}
    case "fix":{
      const fs=finalDates(v), opts=[""].concat(fs.map(keyToIso));
      if(v.fix&&opts.indexOf(v.fix)<0)opts.splice(1,0,v.fix);
      if(opts.length<=1)return "<span class='none' style='font-size:11px;color:var(--ink-3)'>공통일 확정 후</span>";
      let o=""; opts.forEach(function(x){o+="<option value='"+x+"'"+(x===(v.fix||"")?" selected":"")+">"+(x?x.slice(5):"— 선택")+"</option>"});
      return "<span class='sel'><select class='vksel' data-vf='fix' data-i='"+i+"'>"+o+"</select></span>";}
    case "memo":return vin(v,i,"memo","비고 입력");
    case "kind":return vin(v,i,"kind","OEM/ODM");
    case "mgr":return vin(v,i,"mgr","담당자");
    case "pos":return vin(v,i,"pos","직위");
    case "tel":return vin(v,i,"tel","연락처");
    case "addr":return vin(v,i,"addr","주소지");
    case "att":return vin(v,i,"att","참석자");
    case "res":return vin(v,i,"res","방문 결과 입력");
    case "reason":return vin(v,i,"reason","선정 사유 입력");
    case "picker":{const base=["협력생산팀","품질보증팀","내부","외부"], cur=v.picker||"";
      const opts=[""].concat(cur&&base.indexOf(cur)<0?[cur]:[]).concat(base);
      let o=""; opts.forEach(function(x){o+="<option value='"+x+"'"+(x===cur?" selected":"")+">"+(x||"—")+"</option>"});
      return "<span class='sel'><select class='vksel' data-vf='picker' data-i='"+i+"'>"+o+"</select></span>";}
    case "cq":return "<input type='date' class='dtin' data-vf='cq' data-i='"+i+"' value=\""+esc(v.cq)+"\">";
    case "elapsed":{
      if(!v.cq)return dim("—");
      const d0=new Date(v.cq+"T00:00:00"); if(isNaN(d0))return dim("—");
      const days=Math.floor((TODAY-d0)/86400000);
      if(days<0)return "<span class='elap'>예정</span>";
      const late=days>=7;
      return "<span class='elap"+(late?" late":"")+"'>"+days+"일 경과"+(late?"<b class='bell' title='"+esc(v.mgr||"방문담당자")+" 알림'>🔔</b>":"")+"</span>";}
    case "ch":return v.ch?esc(v.ch):dim();
    default:{const x=v[c.k];return (x===undefined||x===null||x==="")?dim():esc(x);}
  }
}
function paintTrips(){
  document.querySelectorAll("#t3 .trip input").forEach(function(inp){
    const v=VISITS[+inp.dataset.vt], o=inp.parentNode.querySelector(".calc");
    const t=calcTrip(v.addr,inp.value);
    o.innerHTML=t?(t.km+"km · "+t.dur+" → <b>"+t.out+" 출발</b>"):"<span class='dim'>이동 정보 없음</span>";
  });
}
function drawT3(){
  const cols=VCOLS.filter(function(c){return !VHIDE[c.g]});
  const rows=VISITS.map(function(v,idx){return {v:v,idx:idx};}).filter(function(x){return vf==="all"||x.v.st===vf});
  const gstart=cols.map(function(c,i){return i>0&&c.g!==cols[i-1].g;});
  let h="<thead><tr class='g'>";
  VGROUPS.forEach(function(g){if(VHIDE[g.k])return;
    const n=cols.filter(function(c){return c.g===g.k}).length; if(!n)return;
    const t=VGTINT[g.k];
    h+="<th colspan='"+n+"'"+(g.k!=="fix"?" class='gsep'":"")+(t?" style='background:"+t.g+"'":"")+">"+(g.k==="fix"?"":g.t)+"</th>";});
  h+="</tr><tr class='c'>";
  let l=0;
  cols.forEach(function(c,i){const sk=(c.g==="fix"&&i<2);const t=VGTINT[c.g];
    const cls=[(sk?"sk":""),(sk&&i===1?"edge":""),(gstart[i]?"gsep":"")].filter(Boolean).join(" ");
    h+="<th"+(cls?" class='"+cls+"'":"")+" style='"+(t?"background:"+t.c+";":"")+"width:"+c.w+"px;min-width:"+c.w+"px"+(sk?";left:"+l+"px":"")+"'>"+esc(c.t)+"<span class='rz' data-ci='"+i+"'></span></th>";
    if(sk)l+=c.w;});
  h+="</tr></thead><tbody>";
  if(!rows.length)h+="<tr><td colspan='"+cols.length+"'><div class='empty-s'>해당 상태의 방문 건이 없습니다.</div></td></tr>";
  rows.forEach(function(row){
    const v=row.v, i=row.idx;
    const muted=["reg","cxl","ng"].indexOf(v.st)>=0;
    h+="<tr class='s-"+v.st+(muted?" muted":"")+"'>";
    let x=0;
    cols.forEach(function(c,ci){const sk=(c.g==="fix"&&ci<2);
      const cls=[(c.a||""),(sk?"sk":""),(sk&&ci===1?"edge":""),(gstart[ci]?"gsep":"")].filter(Boolean).join(" ");
      h+="<td"+(cls?" class='"+cls+"'":"")+" data-r='"+i+"' data-k='"+c.k+"'"+
        (sk?" style='left:"+x+"px;background:linear-gradient("+VST[v.st].tint+","+VST[v.st].tint+"),var(--surface)'":"")+">"+vcell(v,c,i)+"</td>";
      if(sk)x+=c.w;});
    h+="</tr>";
  });
  h+="</tbody>";
  T3COLS=cols;
  document.getElementById("t3").innerHTML=h;
  document.getElementById("cnt3").textContent=VISITS.length+"건";
  document.querySelectorAll("[data-vt]").forEach(function(e){e.addEventListener("input",function(){
    VISITS[+e.dataset.vt].time=e.value; paintTrips(); saveVisits();})});
  document.querySelectorAll("#t3 [data-vf]").forEach(function(el){
    el.addEventListener("input",function(){
      const i=+el.dataset.i, f=el.dataset.vf; VISITS[i][f]=el.value;
      if(f==="coop"||f==="qa"||f==="vend"){
        const cell=el.closest("td"), pv=cell&&cell.querySelector(".dprev");
        if(pv)pv.innerHTML=daysPreview(el.value);
        ["both","final"].forEach(function(k){
          const td=document.querySelector("#t3 td[data-r='"+i+"'][data-k='"+k+"']");
          if(td){const col=VCOLS.filter(function(c){return c.k===k})[0]; td.innerHTML=vcell(VISITS[i],col,i);}
        });
      }else if(f==="cq"){
        const td=document.querySelector("#t3 td[data-r='"+i+"'][data-k='elapsed']");
        if(td){const col=VCOLS.filter(function(c){return c.k==="elapsed"})[0]; td.innerHTML=vcell(VISITS[i],col,i);}
        const v=VISITS[i];
        if(v.cq){const d0=new Date(v.cq+"T00:00:00"); const days=Math.floor((TODAY-d0)/86400000);
          if(days>=7)toast("🔔 "+esc(v.mgr||"방문담당자")+" — "+esc(v.co)+" Capa 회신 "+days+"일 경과 알림");}
      }else if(f==="fix"){
        if(VISITS[i].st==="done"&&VISITS[i].fix)VISITS[i].vdone=VISITS[i].fix;
        drawT3(); drawMini3();
      }
      saveVisits();
    });
  });
  document.querySelectorAll("#t3 thead tr.c .rz").forEach(function(hd){
    hd.addEventListener("mousedown",function(e){
      e.preventDefault();
      const ci=+hd.dataset.ci, col=T3COLS[ci], sx=e.clientX, sw=col.w; let raf=0;
      hd.classList.add("on"); document.body.style.userSelect="none";
      function mv(ev){col.w=Math.max(48,sw+(ev.clientX-sx));
        if(!raf)raf=requestAnimationFrame(function(){raf=0;drawT3();});}
      function up(){document.removeEventListener("mousemove",mv);document.removeEventListener("mouseup",up);
        document.body.style.userSelect="";drawT3();}
      document.addEventListener("mousemove",mv); document.addEventListener("mouseup",up);
    });
  });
  document.querySelectorAll("[data-vs]").forEach(function(e){e.onchange=function(){
    const v=VISITS[+e.dataset.vs], was=v.st; v.st=e.value;
    v.ch=iso(TODAY); v.note=VST[was].label+" → "+VST[v.st].label;
    if(e.value==="done"&&v.fix){ v.vdone=v.fix; toast(esc(v.co)+" · 방문완료 · 방문완료일 "+v.fix+" 등록"); }
    else if(e.value==="plan"&&!v.fix){ v.fix=iso(TODAY); toast(esc(v.co)+" · 방문예정으로 변경 (방문일 임시 지정, 직접 수정하세요)"); }
    else toast(esc(v.co)+" · "+VST[v.st].label+"으로 변경");
    drawT3(); drawC3(); drawMini3(); saveVisits();
  };});
  paintTrips();
  drawMini3();
  const sp=document.getElementById("stat3"); if(sp&&!sp.hidden)drawStats();
}
function drawC3(){
  const c=document.getElementById("c3"); c.innerHTML="";
  const cnt={}; VISITS.forEach(function(v){cnt[v.st]=(cnt[v.st]||0)+1});
  [["all","전체",VISITS.length,null]].concat(Object.keys(VST).map(function(k){
    return [k,VST[k].label,cnt[k]||0,VST[k].bar]})).forEach(function(d){
    const b=document.createElement("button");
    b.className="chip"; b.setAttribute("aria-pressed",d[0]===vf?"true":"false");
    b.innerHTML=(d[3]?"<i style='background:"+d[3]+"'></i>":"")+d[1]+"<span class='n'>"+d[2]+"</span>";
    b.onclick=function(){vf=d[0];drawC3();drawT3()};
    c.appendChild(b);
  });
}
function autoFitT3(){
  const tbl=document.getElementById("t3"); if(!tbl||!T3COLS.length)return;
  const prev=tbl.style.tableLayout; tbl.style.tableLayout="auto";
  const heads=tbl.querySelectorAll("thead tr.c th");
  const rows=tbl.querySelectorAll("tbody tr");
  heads.forEach(function(th){th.style.width="auto";th.style.minWidth="0";});
  rows.forEach(function(tr){Array.prototype.forEach.call(tr.children,function(td){td.style.width="auto";td.style.minWidth="0";});});
  T3COLS.forEach(function(c,i){
    let w=heads[i]?heads[i].getBoundingClientRect().width:c.w;
    rows.forEach(function(tr){const td=tr.children[i]; if(td)w=Math.max(w,td.getBoundingClientRect().width);});
    c.w=Math.min(300,Math.max(44,Math.ceil(w)+6));
  });
  tbl.style.tableLayout=prev; drawT3();
}
(function initG3(){
  const g=document.getElementById("g3");
  VGROUPS.filter(function(x){return !x.lock}).forEach(function(x){
    const b=document.createElement("button");
    b.className="gt"; b.setAttribute("aria-pressed",VHIDE[x.k]?"false":"true");
    b.innerHTML="<s></s>"+x.t;
    b.onclick=function(){VHIDE[x.k]=!VHIDE[x.k];
      b.setAttribute("aria-pressed",VHIDE[x.k]?"false":"true"); drawT3();};
    g.appendChild(b);
  });
  const af=document.createElement("button");
  af.className="gt"; af.style.marginLeft="6px"; af.innerHTML="↔ 열너비 자동맞춤";
  af.onclick=function(){autoFitT3()};
  g.appendChild(af);
  const lg=document.getElementById("lg3");
  Object.keys(VST).forEach(function(k){
    const s=document.createElement("span");
    s.innerHTML="<i style='background:"+VST[k].tint+"'></i>"+VST[k].label; lg.appendChild(s);});
})();

/* ===== 2주 미니 달력 ===== */
function isoLocal(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function weekMonday(d){const x=new Date(d);x.setHours(0,0,0,0);const off=(x.getDay()+6)%7;x.setDate(x.getDate()-off);return x;}
function visitDates(){return VISITS.filter(function(v){return v.fix&&/^\d{4}-\d{2}-\d{2}$/.test(v.fix)&&v.st!=="cxl";});}
let mcalBase=null;
function drawMini3(){
  const c=document.getElementById("mcal3"); if(!c)return;
  if(!mcalBase){ const vs=visitDates(); let base=weekMonday(TODAY);
    if(vs.length){let best=null,bd=Infinity;vs.forEach(function(v){const d=new Date(v.fix+"T00:00:00"),df=Math.abs(d-TODAY);if(df<bd){bd=df;best=d;}});base=weekMonday(best);}
    mcalBase=base; }
  const wd=["월","화","수","목","금","토","일"];
  const days=[]; for(let i=0;i<14;i++){const d=new Date(mcalBase);d.setDate(d.getDate()+i);days.push(d);}
  const byDay={}; visitDates().forEach(function(v){(byDay[v.fix]=byDay[v.fix]||[]).push(v);});
  const end=days[13];
  let h="<div class='mc-h'><b>방문 확정 일정</b><span class='mc-range'>"+
    (mcalBase.getMonth()+1)+"/"+mcalBase.getDate()+" – "+(end.getMonth()+1)+"/"+end.getDate()+" · 2주</span>"+
    "<span class='spacer'></span><button class='btn sm' data-mc='-1'>◀</button>"+
    "<button class='btn sm' data-mc='0'>이번주</button><button class='btn sm' data-mc='1'>▶</button></div><div class='mc-grid'>";
  days.forEach(function(d){
    const isoD=isoLocal(d), list=byDay[isoD]||[], wk=(d.getDay()+6)%7, today=isoD===isoLocal(TODAY);
    let names="";
    if(list.length){
      const show=list.slice(0,2).map(function(v){
        return "<span class='mc-nm' style='border-color:"+VST[v.st].bar+"' title='"+esc((v.time?v.time+" ":"")+v.co)+"'>"+
          (v.time?"<b>"+esc(v.time.slice(0,5))+"</b> ":"")+esc(v.co)+"</span>";}).join("");
      names="<div class='mc-names'>"+show+(list.length>2?"<span class='mc-more'>+"+(list.length-2)+"</span>":"")+"</div>";
    }
    h+="<div class='mc-d"+(wk>=5?" we":"")+(list.length?" has":"")+(today?" td":"")+"' title='"+
      (list.length?esc(list.map(function(v){return (v.time?v.time+" ":"")+v.co}).join(" · ")):"")+"'>"+
      "<div class='mc-top'><span class='mc-wd'>"+wd[wk]+"</span><span class='mc-n'>"+d.getDate()+"</span></div>"+
      names+"</div>";
  });
  h+="</div>";
  c.innerHTML=h;
  c.querySelectorAll("[data-mc]").forEach(function(b){b.onclick=function(){const v=+b.dataset.mc;
    if(v===0)mcalBase=weekMonday(TODAY); else{mcalBase=new Date(mcalBase);mcalBase.setDate(mcalBase.getDate()+v*14);} drawMini3();}});
}

/* ===== 방문통계 ===== */
function drawStats(){
  const c=document.getElementById("stat3"); if(!c)return;
  const vs=VISITS, confirmed=vs.filter(function(v){return v.fix});
  const cnt={}; Object.keys(VST).forEach(function(k){cnt[k]=0}); vs.forEach(function(v){cnt[v.st]=(cnt[v.st]||0)+1});
  const done=confirmed.length, reg=(cnt.reg||0)+(cnt.done||0), drop=(cnt.ng||0)+(cnt.cxl||0);
  const regRate=done?Math.round(reg/done*100):0, dropRate=done?Math.round(drop/done*100):0;
  const thisMo=isoLocal(TODAY).slice(0,7);
  const moCnt=confirmed.filter(function(v){return v.fix.slice(0,7)===thisMo}).length;
  const byMonth={}; confirmed.forEach(function(v){const mo=v.fix.slice(0,7); byMonth[mo]=(byMonth[mo]||0)+1;});
  const months=Object.keys(byMonth).sort(); const moMax=Math.max.apply(null,months.map(function(m){return byMonth[m]}).concat([1]));
  const byType={}; vs.forEach(function(v){const t=v.kind||"기타"; byType[t]=(byType[t]||0)+1;});
  const byPick={}; vs.forEach(function(v){const k=v.picker||"미지정"; byPick[k]=(byPick[k]||0)+1;});
  function bars(obj,color){const keys=Object.keys(obj).sort(function(a,b){return obj[b]-obj[a]}); const mx=Math.max.apply(null,keys.map(function(k){return obj[k]}).concat([1]));
    return keys.map(function(k){return "<div class='st-br'><span class='st-bl'>"+esc(k)+"</span><span class='st-bt'><i style='width:"+Math.round(obj[k]/mx*100)+"%;background:"+color+"'></i></span><b>"+obj[k]+"</b></div>";}).join("");}
  let h="<div class='st-hd'><b>방문통계</b><span class='dim'>확정 방문 "+done+"건 기준</span></div>";
  h+="<div class='st-kpi'>"+
    "<div class='sc'><b>"+done+"</b><i>확정 방문</i></div>"+
    "<div class='sc ok'><b>"+regRate+"%</b><i>등록율 ("+reg+")</i></div>"+
    "<div class='sc wr'><b>"+dropRate+"%</b><i>드롭율 ("+drop+")</i></div>"+
    "<div class='sc nw'><b>"+moCnt+"</b><i>이번달 방문</i></div></div>";
  h+="<div class='st-cols'>";
  h+="<div class='st-box'><div class='st-t'>월별 방문</div>"+(months.length?"<div class='st-mo'>"+
    months.map(function(m){return "<div class='st-mc'><span class='st-mb' style='height:"+Math.round(byMonth[m]/moMax*46+6)+"px'></span><span class='st-ml'>"+m.slice(5)+"</span><b>"+byMonth[m]+"</b></div>";}).join("")+"</div>":"<div class='dim' style='font-size:11px'>데이터 없음</div>")+"</div>";
  h+="<div class='st-box'><div class='st-t'>업체 유형</div>"+bars(byType,"var(--navy)")+"</div>";
  h+="<div class='st-box'><div class='st-t'>선정주체</div>"+bars(byPick,"#5E8A62")+"</div>";
  h+="</div>";
  c.innerHTML=h;
}

/* ===== 상태 변경 · 삭제 공통 헬퍼 ===== */
function setStatus(i,val){
  const v=VISITS[i], was=v.st; v.st=val;
  v.ch=iso(TODAY); v.note=VST[was].label+" → "+VST[v.st].label;
  if(val==="done"&&v.fix){ v.vdone=v.fix; toast(esc(v.co)+" · 방문완료 · 방문완료일 "+v.fix+" 등록"); }
  else if(val==="plan"&&!v.fix){ v.fix=iso(TODAY); toast(esc(v.co)+" · 방문예정으로 변경 (방문일 임시 지정, 직접 수정하세요)"); }
  else toast(esc(v.co)+" · "+VST[v.st].label+"으로 변경");
  redraw();
}
function deleteAt(i){
  const v=VISITS[i]; if(!v){toast("선택한 행을 찾지 못했습니다");return;}
  confirmDialog({kicker:"업체 삭제",title:v.co||"(무명)",danger:true,ok:"삭제",
    body:"<p style='font-size:13px;color:var(--ink-2);padding:8px 0 4px'>이 업체를 목록에서 삭제합니다.<br>삭제 후 하단 <b>실행취소</b>로 되돌릴 수 있습니다.</p>",
    onOk:function(){
      const snap=snapshotVisits();
      VISITS.splice(i,1); redraw();
      pushUndo(esc(v.co||"업체")+" 삭제됨", snap); toast(esc(v.co||"업체")+" 삭제됨");
    }});
}

/* ===== 신규 등록 ===== */
document.getElementById("addBtn").onclick=function(){
  openSheet(
    "<div class='sh-h'><div class='k'>방문예정처</div><h3>신규 등록</h3></div>"+
    "<div class='sh-b'>"+
    "<label>업체명 *</label><input type='text' id='nvCo' placeholder='예: 누리랩'>"+
    "<label>구분</label><input type='text' id='nvKind' placeholder='예: OEM/ODM'>"+
    "<label>소재지</label><input type='text' id='nvAddr' placeholder='예: 충북 음성군 대소면 삼호로 77'>"+
    "<label>담당자</label><input type='text' id='nvMgr' placeholder='담당자명'>"+
    "<label>연락처</label><input type='text' id='nvTel' placeholder='010-0000-0000'>"+
    "<label>메일</label><input type='text' id='nvMail' placeholder='sales@example.co.kr'>"+
    "<label>소개자료 링크</label><input type='text' id='nvLink' placeholder='https://... 또는 파일명'>"+
    "<label>선정 사유</label><input type='text' id='nvReason' placeholder='예: 2차 벤더 확보'>"+
    "</div>"+
    "<div class='sh-f'><button class='btn' id='nvCancel'>취소</button><button class='btn pri' id='nvGo'>등록</button></div>"
  );
  document.getElementById("nvCancel").onclick=closeSheet;
  function doAdd(f){
    const snap=snapshotVisits();
    const nv=blankVisit(f.co);
    nv.kind=f.kind||"OEM/ODM"; nv.addr=f.addr; nv.link=f.link; nv.mgr=f.mgr;
    nv.tel=f.tel; nv.mail=f.mail; nv.reason=f.reason;
    nv.memo="신규 등록"; nv.by="도토리"; nv.note="신규 등록";
    VISITS.unshift(nv); closeSheet(); redraw();
    pushUndo(esc(f.co)+" 등록됨", snap); toast(esc(f.co)+" 등록 완료");
  }
  document.getElementById("nvGo").onclick=function(){
    const g=function(id){return document.getElementById(id).value.trim();};
    const f={co:g("nvCo"),kind:g("nvKind"),addr:g("nvAddr"),link:g("nvLink"),
      mgr:g("nvMgr"),tel:g("nvTel"),mail:g("nvMail"),reason:g("nvReason")};
    if(!f.co){toast("업체명을 입력하세요");return;}
    const dup=VISITS.filter(function(v){return v.co&&v.co.trim()===f.co;}).length;
    if(dup){
      confirmDialog({kicker:"중복 확인",title:"이미 같은 업체명이 있습니다",
        body:"<p style='font-size:13px;color:var(--ink-2);padding:8px 0 4px'>'"+esc(f.co)+"' 업체가 이미 "+dup+"건 등록되어 있습니다. 그래도 새로 등록할까요?</p>",
        ok:"그래도 등록",onOk:function(){doAdd(f);}});
      return;
    }
    doAdd(f);
  };
};

/* ===== 방문통계 토글 ===== */
document.getElementById("statBtn").onclick=function(){
  const sp=document.getElementById("stat3"), on=sp.hidden;
  sp.hidden=!on; this.setAttribute("aria-pressed",on?"true":"false");
  if(on)drawStats();
};

/* ===== 다크 / 라이트 테마 전환 ===== */
(function initTheme(){
  const KEY="cosmedb_theme", btn=document.getElementById("themeBtn"); if(!btn)return;
  const modes=[["auto","🌓","시스템"],["light","☀️","라이트"],["dark","🌙","다크"]];
  let cur=0; try{const s=localStorage.getItem(KEY), idx=modes.map(function(m){return m[0]}).indexOf(s); if(idx>=0)cur=idx;}catch(e){}
  function apply(){
    const m=modes[cur];
    if(m[0]==="auto")document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme",m[0]);
    btn.textContent=m[1]; btn.title="테마: "+m[2]+" (클릭 시 전환)";
    try{localStorage.setItem(KEY,m[0]);}catch(e){}
  }
  btn.onclick=function(){cur=(cur+1)%modes.length; apply(); toast("테마: "+modes[cur][2]);};
  apply();
})();

/* ===== 업체 삭제 (행 선택 후) ===== */
document.getElementById("delBtn").onclick=function(){
  const tr=document.querySelector("#t3 tbody tr.rowsel");
  if(!tr){toast("삭제할 행을 먼저 클릭해 선택하세요");return;}
  const td=tr.querySelector("td[data-r]"), i=td?+td.dataset.r:-1;
  if(i<0||!VISITS[i]){toast("선택한 행을 찾지 못했습니다");return;}
  deleteAt(i);
};

/* ===== Excel 불러오기 (수동 양식 → 카테고리 자동 매칭) ===== */
/* 헤더명(열)을 내부 필드로 매칭하는 동의어 사전 — 실제 양식의 컬럼명 변형을 최대한 흡수 */
const IMPORT_MAP=[
 [["업체id","거래처id","코드"],"mid"],
 [["업체명","상호명","상호","회사명","거래처명","업체/거래처"],"co"],
 [["진행상태","상태","단계","진행"],"st"],
 [["구분","유형","분류","업체유형","제조유형"],"kind"],
 [["소재지","주소지","주소","위치","소재"],"addr"],
 [["업체담당자","담당자","담당","성명","이름","연락담당"],"mgr"],
 [["직위","직책","포지션"],"pos"],
 [["연락처","전화번호","전화","휴대폰","핸드폰","mobile","tel","hp"],"tel"],
 [["이메일","메일","email","e-mail"],"mail"],
 [["소개자료","회사소개서","소개자료링크","자료링크"],"link"],
 [["업체방문가능일","업체요청일","업체가능일","요청일","희망일","방문요청일"],"vend"],
 [["협생가능일","협생팀가능일","협력생산가능일","협생","협력생산팀가능일"],"coop"],
 [["품보가능일","품질보증팀가능일","품질보증가능일","품보"],"qa"],
 [["확정방문일","방문확정일","확정일","방문일"],"fix"],
 [["방문예정시간","방문시간","예정시간","시간출발포함","시간"],"time"],
 [["선정주체","수배주체","주관팀","주관"],"picker"],
 [["선정사유","수배사유","사유","선정근거"],"reason"],
 [["방문완료일"],"vdone"],
 [["참석자","방문자","동행자"],"att"],
 [["방문결과","방문결과후속조치","결과","후속조치","방문결과/후속조치"],"res"],
 [["capa요청일","캐파요청일","capa"],"cq"],
 [["의뢰예상제품","예상제품","품목","아이템"],"memo"],
 [["최근비고","비고","메모","특이사항","note"],"memo"]
];
function normHdr(s){return String(s==null?"":s).replace(/[\s_\-.\/()·:]/g,"").toLowerCase();}
function fieldFor(hdr){
  const h=normHdr(hdr); if(!h)return null;
  for(let pass=0;pass<2;pass++){
    for(let a=0;a<IMPORT_MAP.length;a++){
      const syns=IMPORT_MAP[a][0], key=IMPORT_MAP[a][1];
      for(let b=0;b<syns.length;b++){
        const ns=normHdr(syns[b]);
        if(pass===0){ if(h===ns)return key; }
        else{ if(h.indexOf(ns)>=0||(ns.length>=3&&ns.indexOf(h)>=0))return key; }
      }
    }
  }
  return null;
}
const ST_ALIAS={"방문완료":"done","확정":"plan","방문예정":"plan","재방문예정":"plan","일정협의":"nego","일정협의중":"nego",
 "요청접수":"nego","접수":"nego","보류":"etc","기타":"etc","capa회신대기중":"wait","capa대기":"wait","회신대기":"wait",
 "등록완료":"reg","등록":"reg","등록불가":"ng","불가":"ng","방문취소":"cxl","취소":"cxl"};
function toStKey(val){
  if(VST[val])return val;
  const s=normHdr(val); if(!s)return "nego";
  for(const k in ST_ALIAS){if(normHdr(k)===s)return ST_ALIAS[k];}
  for(const k in VST){if(normHdr(VST[k].label)===s)return k;}
  for(const k in ST_ALIAS){if(s.indexOf(normHdr(k))>=0)return ST_ALIAS[k];}
  return "nego";
}
function toIsoDate(s){const m=String(s==null?"":s).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m?m[1]+"-"+String(m[2]).padStart(2,"0")+"-"+String(m[3]).padStart(2,"0"):"";}
function toTimeStr(s){s=String(s==null?"":s).trim();
  let m=s.match(/(\d{1,2}):(\d{2})/); if(m)return String(+m[1]).padStart(2,"0")+":"+m[2];
  m=s.match(/(\d{1,2})시(\s*30|반)?/); if(m)return String(+m[1]).padStart(2,"0")+":"+(m[2]?"30":"00");
  return "";}
function blankVisit(co){return {mid:"",co:co||"",st:"nego",kind:"OEM/ODM",addr:"",site:"",link:"",
  mgr:"",pos:"",tel:"",mail:"",vend:"",coop:"",qa:"",fix:"",time:"",picker:"",reason:"",
  vdone:"",att:"",res:"",cq:"",memo:"",ch:iso(TODAY),by:"엑셀 업로드",note:"엑셀 업로드"};}
function applyImportRow(target,rowObj){
  Object.keys(rowObj).forEach(function(f){
    let val=rowObj[f]; if(val==null)return; val=String(val).trim(); if(!val)return;
    if(f==="st")val=toStKey(val);
    else if(f==="fix"||f==="vdone"||f==="cq"){val=toIsoDate(val)||("cq"===f?"":"");if(!val)return;}
    else if(f==="time")val=toTimeStr(val);
    else if(f==="picker"&&["협력생산","품질보증"].indexOf(val)>=0)val=val+"팀";
    // 병합: 기존 값이 있으면 덮어쓰지 않음(빈 칸만 채움)
    if(f==="st"){ if(!target._stSet){target.st=val;target._stSet=true;} return; }
    if(target[f]===undefined||target[f]===null||target[f]===""){target[f]=val;}
  });
}
const FIELD_LABEL={mid:"업체ID",co:"업체명",st:"상태",kind:"구분",addr:"소재지",mgr:"담당자",pos:"직위",
 tel:"연락처",mail:"메일",link:"소개자료",vend:"업체 가능일",coop:"협생 가능일",qa:"품보 가능일",
 fix:"확정 방문일",time:"방문시간",picker:"선정주체",reason:"선정사유",vdone:"방문완료일",att:"참석자",
 res:"방문결과",cq:"Capa요청일",memo:"비고/제품"};
function analyzeImport(aoa){
  // 헤더 행 탐지: 인식 가능한 필드가 가장 많은 행(최소 2개)
  let hi=-1, best=-1, colMap=null;
  const scan=Math.min(aoa.length,12);
  for(let r=0;r<scan;r++){
    const row=aoa[r]||[]; const map={}; let n=0;
    row.forEach(function(cell,ci){const f=fieldFor(cell); if(f){map[ci]=f;n++;}});
    if(n>best){best=n;hi=r;colMap=map;}
  }
  if(hi<0||best<2)return {ok:false};
  const headRow=aoa[hi]||[];
  const mapping=Object.keys(colMap).map(function(ci){return {src:String(headRow[ci]||"").trim()||("열"+(+ci+1)),field:colMap[ci],label:FIELD_LABEL[colMap[ci]]||colMap[ci]};});
  const coCol=Object.keys(colMap).filter(function(ci){return colMap[ci]==="co";})[0];
  let added=0, merged=0, skipped=0; const plan=[];
  for(let r=hi+1;r<aoa.length;r++){
    const row=aoa[r]||[]; if(!row.length)continue;
    const rowObj={};
    Object.keys(colMap).forEach(function(ci){rowObj[colMap[ci]]=row[ci];});
    const coName=coCol!=null?String(row[coCol]==null?"":row[coCol]).trim():"";
    const midVal=rowObj.mid?String(rowObj.mid).trim():"";
    if(!coName&&!midVal){skipped++;continue;}
    let ex=null;
    if(midVal)ex=VISITS.filter(function(v){return v.mid&&v.mid===midVal;})[0];
    if(!ex&&coName)ex=VISITS.filter(function(v){return v.co&&v.co.trim()===coName;})[0];
    plan.push({rowObj:rowObj,coName:coName,mergeTo:ex||null});
    if(ex)merged++; else added++;
  }
  return {ok:true,mapping:mapping,plan:plan,added:added,merged:merged,skipped:skipped};
}
function commitImport(an){
  const snap=snapshotVisits();
  an.plan.forEach(function(p){
    if(p.mergeTo){applyImportRow(p.mergeTo,p.rowObj);delete p.mergeTo._stSet;}
    else{const nv=blankVisit(p.coName);applyImportRow(nv,p.rowObj);delete nv._stSet;VISITS.unshift(nv);}
  });
  redraw(); pushUndo("엑셀 반영됨(신규 "+an.added+"·갱신 "+an.merged+")", snap);
  toast("엑셀 반영 완료 · 신규 "+an.added+"건, 갱신 "+an.merged+"건"+(an.skipped?", 건너뜀 "+an.skipped:""));
}
function previewImport(an){
  const chips=an.mapping.map(function(m){return "<span class='mp'><b>"+esc(m.src)+"</b> → "+esc(m.label)+"</span>";}).join("");
  const body=
    "<p style='font-size:12.5px;color:var(--ink-2);margin-bottom:8px'>아래 <b>열 매핑</b>과 <b>반영 건수</b>를 확인 후 적용하세요.</p>"+
    "<div class='mp-wrap'>"+chips+"</div>"+
    "<div class='mp-sum'><span class='mp-a'>신규 "+an.added+"</span><span class='mp-m'>갱신 "+an.merged+"</span>"+
    (an.skipped?"<span class='mp-s'>건너뜀 "+an.skipped+"</span>":"")+"</div>"+
    "<p style='font-size:11px;color:var(--ink-3);margin-top:8px'>· 기존 업체(업체ID·업체명 일치)는 <b>빈 칸만</b> 채우고 기존 값은 보존합니다.<br>· 적용 후 하단 <b>실행취소</b>로 되돌릴 수 있습니다.</p>";
  confirmDialog({kicker:"Excel 불러오기 미리보기",title:"매핑 확인",ok:"적용",
    body:body,onOk:function(){commitImport(an);}});
}
document.getElementById("impBtn").onclick=function(){
  if(typeof XLSX==="undefined"){toast("엑셀 모듈을 불러오지 못했습니다. 네트워크 연결을 확인하세요.");return;}
  document.getElementById("impFile").click();
};
document.getElementById("impFile").onchange=function(e){
  const file=e.target.files&&e.target.files[0]; if(!file)return;
  const rd=new FileReader();
  rd.onload=function(ev){
    try{
      const wb=XLSX.read(ev.target.result,{type:"array"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      if(!ws){toast("시트를 찾지 못했습니다.");return;}
      const aoa=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:""});
      const an=analyzeImport(aoa);
      if(!an.ok){toast("열 제목을 인식하지 못했습니다. 업체명·상태 등 헤더 행을 확인하세요.");return;}
      if(!an.plan.length){toast("반영할 데이터 행이 없습니다.");return;}
      previewImport(an);
    }catch(err){toast("엑셀 파일을 읽지 못했습니다.");}
    e.target.value="";
  };
  rd.readAsArrayBuffer(file);
};

/* ===== 데이터 관리 (JSON 백업·복원·초기화) ===== */
document.getElementById("dataBtn").onclick=function(){
  openSheet(
    "<div class='sh-h'><div class='k'>데이터 관리</div><h3>백업 · 복원 · 초기화</h3></div>"+
    "<div class='sh-b'>"+
    "<p style='font-size:12px;color:var(--ink-3);margin-bottom:4px'>이 앱은 브라우저(localStorage)에만 저장되어 <b>팀원과 자동 공유되지 않습니다</b>. 아래 <b>JSON 백업</b> 파일로 백업·이관·공유하세요.</p>"+
    "<div class='dm-grid'>"+
    "<button class='btn' id='dmBackup'>⬇ JSON 백업 저장</button>"+
    "<button class='btn' id='dmRestore'>⬆ JSON 복원(불러오기)</button>"+
    "<button class='btn' id='dmSeed'>↺ 데모 다시 불러오기</button>"+
    "<button class='btn' id='dmClear' style='color:#C0392B;border-color:#E3B4AE'>🗑 전체 비우기</button>"+
    "</div></div>"+
    "<div class='sh-f'><button class='btn' id='dmClose'>닫기</button></div>");
  document.getElementById("dmClose").onclick=closeSheet;
  document.getElementById("dmBackup").onclick=function(){
    try{
      const blob=new Blob([JSON.stringify(VISITS,null,2)],{type:"application/json"});
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
      a.download="방문예정처_백업_"+isoLocal(TODAY)+".json"; a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
      toast("JSON 백업 저장됨 ("+VISITS.length+"건)");
    }catch(e){toast("백업 저장 중 문제가 발생했습니다.");}
  };
  document.getElementById("dmRestore").onclick=function(){document.getElementById("jsonFile").click();};
  document.getElementById("dmSeed").onclick=function(){
    confirmDialog({kicker:"데모 불러오기",title:"데모 데이터로 되돌리기",
      body:"<p style='font-size:13px;color:var(--ink-2);padding:8px 0 4px'>현재 데이터를 데모 데이터로 교체합니다. 하단 <b>실행취소</b>로 되돌릴 수 있습니다.</p>",
      ok:"불러오기",onOk:function(){const snap=snapshotVisits();seedVisits();redraw();pushUndo("데모 데이터 불러옴",snap);toast("데모 데이터를 불러왔습니다");}});
  };
  document.getElementById("dmClear").onclick=function(){
    confirmDialog({kicker:"전체 비우기",title:"모든 데이터 삭제",danger:true,ok:"전체 삭제",
      body:"<p style='font-size:13px;color:var(--ink-2);padding:8px 0 4px'>모든 업체를 삭제하고 빈 목록으로 시작합니다.<br>하단 <b>실행취소</b>로 되돌릴 수 있습니다.</p>",
      onOk:function(){const snap=snapshotVisits();VISITS=[];redraw();pushUndo("전체 비움("+snap.length+"건)",snap);toast("전체 데이터를 비웠습니다");}});
  };
};
document.getElementById("jsonFile").onchange=function(e){
  const file=e.target.files&&e.target.files[0]; if(!file)return;
  const rd=new FileReader();
  rd.onload=function(ev){
    try{
      const data=JSON.parse(ev.target.result);
      if(!Array.isArray(data)){toast("올바른 백업(JSON 배열) 파일이 아닙니다.");return;}
      confirmDialog({kicker:"JSON 복원",title:"데이터 교체",danger:true,ok:"복원",
        body:"<p style='font-size:13px;color:var(--ink-2);padding:8px 0 4px'>현재 목록을 백업 파일의 <b>"+data.length+"건</b>으로 교체합니다.<br>하단 <b>실행취소</b>로 되돌릴 수 있습니다.</p>",
        onOk:function(){const snap=snapshotVisits();VISITS=data;redraw();pushUndo("JSON 복원됨("+data.length+"건)",snap);toast("복원 완료 · "+data.length+"건");}});
    }catch(err){toast("JSON 파일을 읽지 못했습니다.");}
    e.target.value="";
  };
  rd.readAsText(file);
};

/* ===== Excel 저장 ===== */
document.getElementById("xlsBtn").onclick=function(){
  if(typeof XLSX==="undefined"){toast("엑셀 모듈을 불러오지 못했습니다. 네트워크 연결을 확인하세요.");return;}
  const cols=VCOLS;
  const header=cols.map(function(c){return c.t;});
  const rows=VISITS.map(function(v,i){
    return cols.map(function(c){
      switch(c.k){
        case "no":return i+1;
        case "st":return VST[v.st]?VST[v.st].label:v.st;
        case "dd":{const d=ddayOf(v);return d.t;}
        case "trip":return v.time||"";
        case "both":{const b=interK(parseDates(v.coop),parseDates(v.qa));return b.length?compressK(b):"";}
        case "final":{const f=finalDates(v);return f.length?compressK(f):"";}
        default:return v[c.k]||"";
      }
    });
  });
  const ws=XLSX.utils.aoa_to_sheet([header].concat(rows));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"방문예정처");
  const fname="방문예정처_"+isoLocal(TODAY)+".xlsx";
  try{
    XLSX.writeFile(wb,fname);
    toast("엑셀로 저장했습니다: "+fname);
  }catch(e){
    toast("엑셀 저장 중 문제가 발생했습니다.");
  }
};

/* ===== 초기화 ===== */
loadVisits();
drawC3(); drawT3();
wireRowSelect(document.getElementById("t3"),"tbody tr");
requestAnimationFrame(autoFitT3);
