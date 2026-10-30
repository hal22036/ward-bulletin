/* Legal landscape, three-panel bulletin, based on the ward's November 1 reference. */
window.makePdf = async function () {
  const {PDFDocument, StandardFonts, rgb}=PDFLib;
  const doc=await PDFDocument.create();
  const font=await doc.embedFont(StandardFonts.Helvetica), bold=await doc.embedFont(StandardFonts.HelveticaBold), italic=await doc.embedFont(StandardFonts.HelveticaOblique);
  const pages=[doc.addPage([1008,612]),doc.addPage([1008,612])], warnings=[];
  const black=rgb(.08,.08,.08), gold=rgb(.8,.58,.22), gray=rgb(.8,.83,.82);
  const clean=s=>String(s||'').replace(/[–—]/g,'-').replace(/·/g,' / ').replace(/[“”]/g,'"').replace(/[’]/g,"'").replace(/[^\x20-\x7e\n\r\u00a0-\u00ff]/g,'?');
  function lines(text,size,width,f=font){const result=[];for(const para of clean(text).split('\n')){let line='';for(const word of para.split(' ')){if(f.widthOfTextAtSize(line+(line?' ':'')+word,size)>width&&line){result.push(line);line=''}for(const ch of word){if(f.widthOfTextAtSize(line+ch,size)>width){result.push(line);line=''}line+=ch}line+=' '}result.push(line.trimEnd())}return result}
  function text(p,s,x,top,size=11,f=font){p.drawText(clean(s),{x,y:612-top-size,font:f,size,color:black})}
  function centered(p,s,x,top,w,size=12,f=font){let n=size;while(f.widthOfTextAtSize(clean(s),n)>w&&n>8)n-=.25;text(p,s,x+(w-f.widthOfTextAtSize(clean(s),n))/2,top,n,f)}
  function rule(p,x,top,w,color=black,thickness=.7){p.drawLine({start:{x,y:612-top},end:{x:x+w,y:612-top},color,thickness})}
  function rounded(p,x,top,w,h,r=15,fill){const d=`M ${r} 0 H ${w-r} Q ${w} 0 ${w} ${r} V ${h-r} Q ${w} ${h} ${w-r} ${h} H ${r} Q 0 ${h} 0 ${h-r} V ${r} Q 0 0 ${r} 0 Z`;p.drawSvgPath(d,{x,y:612-top,borderColor:black,borderWidth:1,...(fill?{color:fill}:{})})}
  function rect(p,x,top,w,h,fill,border=black,bw=.7){p.drawRectangle({x,y:612-top-h,width:w,height:h,...(fill?{color:fill}:{}),borderColor:border,borderWidth:bw})}
  function paragraph(p,s,x,top,w,h,size=10,f=font,min=8){const originalSize=size;let a=lines(s,size,w,f);while(a.length*size*1.2>h&&size>min){size-=.25;a=lines(s,size,w,f)}if(a.length*size*1.2>h)throw Error('Too much text in a bulletin section. Shorten it before downloading.');if(size<originalSize&&size<9)warnings.push('small text');a.forEach((l,i)=>text(p,l,x,top+i*size*1.2,size,f));return a.length*size*1.2}
  const images={};async function img(name){if(!images[name]){const r=await fetch(name);if(!r.ok)throw Error('Could not load bulletin artwork.');const b=await r.arrayBuffer();images[name]=new Uint8Array(b)[0]===137?await doc.embedPng(b):await doc.embedJpg(b)}return images[name]}
  async function picture(p,name,x,top,w,h){const im=await img(name),s=Math.min(w/im.width,h/im.height);p.drawImage(im,{x:x+(w-im.width*s)/2,y:612-top-h+(h-im.height*s)/2,width:im.width*s,height:im.height*s})}
  function entry(p,label,value,top){let size=12;const w=274,x=19;while(font.widthOfTextAtSize(clean(label+' '+value),size)>w&&size>8)size-=.25;const lw=font.widthOfTextAtSize(clean(label),size),vw=font.widthOfTextAtSize(clean(value),size);text(p,label,x,top,size);text(p,value,x+w-vw,top,size);const a=x+lw+7,b=x+w-vw-7;if(b>a){const count=Math.floor((b-a)/font.widthOfTextAtSize('.',size));text(p,'.'.repeat(count),a,top,size)}}
  function hymn(p,label,value,top){const m=value.match(/^(Hymn\s*\S+)\s*[·|/]\s*(.*)$/i);entry(p,label,m?m[1]:value,top);if(m)centered(p,'“'+m[2]+'”',19,top+14,274,11.5)}
  // Program panel: same positions and visual hierarchy as the reference.
  const p=pages[1];centered(p,data.ward,16,25,290,23);centered(p,'Sacrament Meeting',16,54,290,22);centered(p,dateText(),16,80,290,18);
  entry(p,'Presiding',data.presiding,108);entry(p,'Conducting',data.conducting,139);paragraph(p,data.welcomeNotes??'Welcome and Announcements',19,161,274,22,12);
  if(typeof hymnIsVisible!=='function'||hymnIsVisible('opening'))hymn(p,'Opening Hymn',data.opening,185);entry(p,'Invocation',data.invocation,220);paragraph(p,data.wardStakeNotes??'Ward/Stake Items',19,244,274,27,12);
  rule(p,20,274,272,gold,3);if(typeof hymnIsVisible!=='function'||hymnIsVisible('sacrament'))hymn(p,'Sacrament Hymn',data.sacrament,279);text(p,'Administration of the Sacrament',19,314,11.5);rule(p,20,333,272,gold,3);
  // Share the available space between visible program items and closing items.
  const items=[];
  let options=null;try{options=JSON.parse(data.programOptions)}catch{}
  if(options&&Array.isArray(options.speakers)){
    if(options.fast)items.push({kind:'center',value:'Fast and Testimony Meeting'});
    const speakers=options.showSpeakers?options.speakers.filter(speaker=>speaker.show!==false&&String(speaker.name||'').trim()):[];
    const hymns=typeof readExtraHymns==='function'?readExtraHymns().filter(h=>h.show&&(h.number.trim()||h.name.trim())):[];
    for(let position=0;position<=speakers.length;position++){
      if(position>0){const speaker=speakers[position-1];items.push({kind:'entry',label:speaker.type||'Speaker',value:speaker.name});}
      for(const hymn of hymns.filter(h=>Math.min(h.after,speakers.length)===position))items.push({kind:'hymn',label:hymn.label||'Hymn',value:hymn.number?'Hymn '+hymn.number+(hymn.name?' · '+hymn.name:''):hymn.name});
    }
    if(options.showNotes!==false&&options.notes?.trim())items.push({kind:'notes',value:options.notes});
  }else if(data.program?.trim())items.push({kind:'notes',value:data.program});
  if(typeof hymnIsVisible!=='function'||hymnIsVisible('closing'))items.push({kind:'hymn',label:'Closing Hymn',value:data.closing});
  items.push({kind:'entry',label:'Benediction',value:data.benediction});
  for(const item of items){
    item.height=item.kind==='notes'?lines(item.value,11.5,270).length*13.8:item.kind==='hymn'&&/^(Hymn\s*\S+)\s*[·|/]\s*(.*)$/i.test(item.value)?30:15;
  }
  const top=345,bottom=551,total=items.reduce((sum,item)=>sum+item.height,0);
  if(total>bottom-top)throw Error('Too many program items to fit clearly. Shorten notes or hide an item before downloading.');
  const gap=items.length>1?(bottom-top-total)/(items.length-1):0;
  let programY=top;
  for(const item of items){
    if(item.kind==='entry')entry(p,item.label,item.value,programY);
    else if(item.kind==='hymn')hymn(p,item.label,item.value,programY);
    else if(item.kind==='center')centered(p,item.value,19,programY,274,11.5);
    else paragraph(p,item.value,21,programY,270,item.height+1,11.5,font,11.5);
    programY+=item.height+gap;
  }
  // Information panel. Pipe-separated rows make the three columns editable.
  rect(p,347,17,298,164,null,black,1.8);centered(p,'Ward Leadership',353,20,286,12,bold);
  const leadership=data.leadership.split('\n').filter(Boolean);const rowSize=Math.min(8.1,135/(leadership.length*1.18));if(rowSize<7)throw Error('Ward leadership has too many rows.');leadership.forEach((line,i)=>{const cols=line.includes('|')?line.split('|'):line.split(/\s+[—–]\s+/);const y=40+i*rowSize*1.18;paragraph(p,cols[0].trim(),355,y,108,rowSize*1.3,rowSize,font,rowSize);if(cols[1])paragraph(p,cols[1].trim(),466,y,103,rowSize*1.3,rowSize,font,rowSize);if(cols[2])text(p,cols[2].trim(),576,y,rowSize)});
  rule(p,360,186,274,black,1.8);paragraph(p,data.interviews||'',371,189,259,22,9,font,8);rule(p,360,213,274,black,1);
  rounded(p,346,218,302,150);centered(p,'MISSIONARIES FROM THE '+data.ward.toUpperCase(),351,219,292,10,bold);
  const missionaries=data.missionaries.split(/\n\s*\n/).filter(Boolean);if(missionaries.length<=3){for(let i=0;i<Math.min(2,missionaries.length);i++)paragraph(p,missionaries[i],370+i*116,232,i===0?113:146,63,9,font,8);if(missionaries[2]){rule(p,355,300,280,black,1.7);const rows=lines(missionaries[2],9,280);if(rows.length>6)throw Error('Shorten the third missionary entry.');rows.forEach((l,i)=>centered(p,l,355,303+i*10.5,280,9))}}else paragraph(p,data.missionaries,355,234,284,127,9);
  rect(p,346,374,302,105);centered(p,'Las Vegas Nevada Temple',353,378,288,12,bold);paragraph(p,data.temple||'',360,400,275,72,10.5);
  rect(p,347,492,300,106);centered(p,meetingDate().getFullYear()+' Meeting Schedule',351,497,202,10,bold);
  const parts=data.information.split(/\n\s*\n/),schedule=parts[0].split('\n');schedule.forEach((l,i)=>{const a=l.split(/[·|]/);text(p,a[0].trim(),351,514+i*10.5,9.5);if(a[1])text(p,a[1].trim(),463,514+i*10.5,9.5)});if(schedule.length>6)throw Error('Keep the meeting schedule to six lines.');rect(p,556,502,86,73);centered(p,'PRIMARY',558,504,82,9);const classes=(parts[1]||'').replace(/^Primary classes\n?/i,'').split('\n');classes.forEach((l,i)=>text(p,l.replace(/\s*[·|]\s*/,'    '),558,519+i*10.5,8.5));paragraph(p,data.fifthSunday||'',351,586,290,11,8.5,font,8);
  // Cover: preserve the original masthead, art and QR code.
  await picture(p,'assets/masthead.png',721,29,255,80);await picture(p,data.cover,722,113,252,336);centered(p,data.ward.toUpperCase(),685,450,315,21);centered(p,data.stake.toUpperCase(),685,478,315,16);await picture(p,'assets/ward-qr.png',824,520,51,51);await picture(p,'assets/scan-caption.png',807,574,89,27);
  // Announcements keep their own column and the calendar occupies two panels.
  const a=pages[0];rounded(a,10,33,323,559,18);centered(a,'ANNOUNCEMENTS',17,37,309,22,bold);
  const notices=typeof readNews==='function'?readNews().filter(n=>n.show!==false&&(n.title.trim()||n.body.trim())).sort((a,b)=>Number(b.recurring)-Number(a.recurring)):data.announcements.split(/\n\s*\n/).filter(Boolean).map(text=>{const [title,...body]=text.split('\n');return {title,body:body.join('\n'),icon:'auto'}});let y=69;
  const artwork=[[/choir/i,'choir'],[/ym\s*\/\s*yw|youth/i,2],[/primary activ/i,'primary-activities'],[/tithing/i,19],[/lunch/i,'lunch'],[/primary program/i,8],[/relief society/i,20],[/christmas/i,0]];
  function noticePlan(n,size){const content=[n.title,n.body].join('\n'),art=n.icon==='upload'?(n.image||null): (n.icon==='auto'?artwork.find(([re])=>re.test(content))?.[1]:n.icon||null),x=art!=null?61:18,w=art!=null?263:304;const parts=content.split('\n'),title=parts.shift(),body=parts.join(' '),tokens=[...clean(title).split(' ').map(t=>({t,f:bold})),...clean(body).split(' ').map(t=>({t,f:font}))];let yy=0,xx=0,runs=[];for(const {t,f} of tokens){const tw=f.widthOfTextAtSize(t+' ',size);if(xx+tw>w&&xx>0){yy+=size*1.16;xx=0}runs.push({t,f,xx,yy});xx+=tw}return {art,x,runs,height:Math.max(art!=null?33:0,yy+size*1.16)+9}}
  let size=10.3;while(size>7.8&&notices.reduce((v,n)=>v+noticePlan(n,size).height,0)>485)size-=.1;
  if(notices.reduce((v,n)=>v+noticePlan(n,size).height,0)>485)throw Error('Too many announcements. Shorten them before downloading.');
  const extraGap=Math.max(0,(485-notices.reduce((v,n)=>v+noticePlan(n,size).height,0))/Math.max(1,notices.length));
  for(const n of notices){const plan=noticePlan(n,size);if(plan.art!=null)await picture(a,(String(plan.art).startsWith('data:image/')?plan.art:/^\d+$/.test(String(plan.art))?`assets/art-${plan.art}.png`:`assets/${plan.art}.png`),16,y+2,38,33);for(const r of plan.runs)text(a,r.t,plan.x+r.xx,y+r.yy,size,r.f);y+=plan.height+extraGap;}
  if(y>558)throw Error('Announcements extend into the submission footer. Shorten them.');rule(a,10,562,323,rgb(.32,.2,.5));paragraph(a,data.submission,35,566,286,22,8,italic,7.5);
  const d=meetingDate(),year=d.getFullYear(),month=d.getMonth(),first=new Date(year,month,1),start=first.getDay(),days=new Date(year,month+1,0).getDate(),rows=Math.ceil((start+days)/7),x0=366,calW=622,cw=calW/7,gridTop=129,ch=436/rows;
  rect(a,364,56,626,35,gray,gray);centered(a,d.toLocaleDateString('en-US',{month:'long'})+'/'+new Date(year,month+1,1).toLocaleDateString('en-US',{month:'long'}),366,57,622,25,bold);
  ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'].forEach((day,i)=>{rect(a,x0+i*cw,106,cw,23);centered(a,day,x0+i*cw+2,109,cw-4,12)});
  const allEvents=events();for(let i=0;i<rows*7;i++){const date=new Date(year,month,i-start+1),key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,x=x0+i%7*cw,top=gridTop+Math.floor(i/7)*ch;rect(a,x,top,cw,ch);text(a,String(date.getDate()),x+5,top+1,12);if(date.getDate()===1&&date.getMonth()!==month)text(a,date.toLocaleDateString('en-US',{month:'long'}).toUpperCase(),x+15,top+4,8,bold);const ee=allEvents.filter(e=>e.date===key);let ey=top+17;for(const e of ee){const m=e.text.match(/sacrament|youth|primary program|christmas|thanksgiving|veterans|election|choir|family home evening|primary activities|relief society|lunch/i);const art=m?({sacrament:1,youth:2,'primary program':8,christmas:0,thanksgiving:10,veterans:11,election:13,choir:'choir','family home evening':'family-evening','primary activities':'primary-activities','relief society':20,lunch:'lunch'}[m[0].toLowerCase()]):null;if(art!=null){const ih=art===1||art===2||typeof art==='string'&&art!=='lunch'?16:28;if(ey+ih>top+ch-3)throw Error('Too many events in calendar day '+key);await picture(a,(typeof art==='number'?`assets/art-${art}.png`:`assets/${art}.png`),x+10,ey,cw-13,ih);ey+=ih+2;const time=e.text.match(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i);if(time&&art!=='primary-activities'){text(a,time[0],x+cw-30,ey-10,6);}}else{const ls=lines(e.text,8,cw-9);if(ey+ls.length*9>top+ch-3)throw Error('Too many events in calendar day '+key);ls.forEach(l=>{text(a,l,x+5,ey,8);ey+=9});ey+=2}}}
  const nextIndex=start+days;if(nextIndex<rows*7){const nx=x0+(nextIndex%7)*cw,nt=gridTop+Math.floor(nextIndex/7)*ch;rect(a,nx,nt,(7-nextIndex%7)*cw,ch,null,rgb(.85,.15,.08),2.5);}
  const endDate=new Date(year,month,rows*7-start),after=allEvents.filter(e=>e.date>endDate.toISOString().slice(0,10));if(after.length)paragraph(a,'Upcoming: '+after.map(e=>e.date+' - '+e.text).join(' / '),367,574,619,23,8.5,font,8);
  return {bytes:await doc.save(),warnings:[...new Set(warnings)]};
};
