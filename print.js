/* Legal landscape, three-panel bulletin, based on the ward's November 1 reference. */
window.makePdf = async function () {
  const {PDFDocument, StandardFonts}=PDFLib;
  const letter=data.paperSize==='letter',monochrome=data.printColor==='bw';
  const rgb=(r,g,b)=>{if(monochrome){const v=.2126*r+.7152*g+.0722*b;return PDFLib.rgb(v,v,v)}return PDFLib.rgb(r,g,b)};
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
  const images={};async function img(name){if(!images[name]){const r=await fetch(name);if(!r.ok)throw Error('Could not load bulletin artwork.');const b=await r.arrayBuffer();if(monochrome){const bitmap=await createImageBitmap(new Blob([b])),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();const pixels=context.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4){const v=Math.round(.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2]);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;}context.putImageData(pixels,0,0);images[name]=await doc.embedPng(canvas.toDataURL('image/png'));}else images[name]=new Uint8Array(b)[0]===137?await doc.embedPng(b):await doc.embedJpg(b)}return images[name]}
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
  const top=345,bottom=586,total=items.reduce((sum,item)=>sum+item.height,0);
  if(total>bottom-top)throw Error('Too many program items to fit clearly. Shorten notes or hide an item before downloading.');
  const gap=(bottom-top-total)/(items.length+1);
  let programY=top+gap;
  for(const item of items){
    if(item.kind==='entry')entry(p,item.label,item.value,programY);
    else if(item.kind==='hymn')hymn(p,item.label,item.value,programY);
    else if(item.kind==='center'){
      const title=item.value,size=11.5,width=font.widthOfTextAtSize(clean(title),size),dotWidth=font.widthOfTextAtSize('.',size);
      const dots='.'.repeat(Math.max(0,Math.floor((274-width-16)/(2*dotWidth))));
      centered(p,dots+'  '+title+'  '+dots,19,programY,274,size);
    }else lines(item.value,11.5,270).forEach((line,index)=>centered(p,line,19,programY+index*13.8,274,11.5));
    programY+=item.height+gap;
  }
  // Information panel. Pipe-separated rows make the three columns editable.
  rect(p,347,17,298,164,null,black,1.8);centered(p,'Ward Leadership',353,20,286,12,bold);
  const wardData=typeof readWard==='function'?readWard():null;const leadership=wardData?wardData.leadership.filter(row=>row.calling||row.name||row.phone):data.leadership.split('\n').filter(Boolean);const rowSize=Math.min(8.1,135/(leadership.length*1.18));if(rowSize<7)throw Error('Ward leadership has too many rows.');leadership.forEach((line,i)=>{const cols=typeof line==='object'?[line.calling,line.name,line.phone]:line.includes('|')?line.split('|'):line.split(/\s+[—–]\s+/);const y=40+i*rowSize*1.18;paragraph(p,cols[0].trim(),355,y,108,rowSize*1.3,rowSize,font,rowSize);if(cols[1])paragraph(p,cols[1].trim(),466,y,103,rowSize*1.3,rowSize,font,rowSize);if(cols[2])text(p,cols[2].trim(),576,y,rowSize)});
  rule(p,360,186,274,black,1.8);paragraph(p,data.interviews||'',371,189,259,22,9,font,8);rule(p,360,213,274,black,1);
  rounded(p,346,218,302,150);centered(p,'MISSIONARIES FROM THE '+data.ward.toUpperCase(),351,219,292,10,bold);
  const missionaries=wardData?wardData.missionaries.map(row=>[row.name,row.mission,row.address1,row.address2,row.address3,row.email].filter(Boolean).join('\n')).filter(Boolean):data.missionaries.split(/\n\s*\n/).filter(Boolean);
  if(missionaries.length>4)throw Error('The missionary panel fits up to four full contact entries. Remove an entry or shorten the information before exporting.');
  if(missionaries.length===1)paragraph(p,missionaries[0],362,239,270,115,9,font,8);
  else if(missionaries.length===2){for(let i=0;i<2;i++)paragraph(p,missionaries[i],357+i*145,239,137,115,9,font,8);}
  else if(missionaries.length===3){
    for(let i=0;i<2;i++)paragraph(p,missionaries[i],357+i*145,232,137,64,9,font,7.5);
    rule(p,355,300,280,black,1.2);const rows=lines(missionaries[2],9,280);if(rows.length>6)throw Error('Shorten the third missionary entry so it fits clearly.');rows.forEach((line,i)=>centered(p,line,355,303+i*10.5,280,9));
  }else if(missionaries.length===4){
    rule(p,355,300,280,black,1.2);
    for(let i=0;i<4;i++)paragraph(p,missionaries[i],357+(i%2)*145,i<2?232:304,137,i<2?64:59,8.5,font,7.5);
  }
  rect(p,346,374,302,105);centered(p,'Las Vegas Nevada Temple',353,378,288,12,bold);paragraph(p,data.temple||'',360,400,275,72,10.5);
  rect(p,347,492,300,106);centered(p,meetingDate().getFullYear()+' Meeting Schedule',351,497,202,10,bold);
  const parts=data.information.split(/\n\s*\n/),schedule=wardData?wardData.schedule.filter(row=>row.className||row.time):parts[0].split('\n').map(line=>{const values=line.split(/[·|]/);return {className:values[0].trim(),time:(values[1]||'').trim()}}),notes=wardData?wardData.notes||'':(parts[1]||'').replace(/^Primary classes\n?/i,'');
  if(schedule.length>6)throw Error('Keep the meeting schedule to six rows so it fits clearly.');
  const noteWidth=notes.trim()?86:0,scheduleWidth=noteWidth?199:286,classWidth=noteWidth?104:138,timeWidth=scheduleWidth-classWidth-5;
  schedule.forEach((row,i)=>{const top=514+i*10.5;paragraph(p,row.className,351,top,classWidth,11,9,font,8);paragraph(p,row.time,351+classWidth+5,top,timeWidth,11,9,font,8);});
  if(noteWidth){rect(p,556,502,86,73);centered(p,'NOTES',558,504,82,9);paragraph(p,notes,560,519,78,53,8.5,font,7);}
  paragraph(p,data.fifthSunday||'',351,586,290,11,8.5,font,8);
  // Fixed Church masthead with optional quote and QR image.
  const quote=String(data.coverQuote||'').trim(),showQr=data.coverShowQr==='yes'&&/^data:image\/(png|jpeg);base64,/.test(data.coverQr||'');
  await picture(p,'assets/masthead.png',721,29,255,80);
  await picture(p,data.cover,722,113,252,quote?282:336);
  if(quote){let size=12,quoteLines=lines(quote,size,274);while(quoteLines.length*size*1.2>45&&size>9){size-=.25;quoteLines=lines(quote,size,274);}if(quoteLines.length*size*1.2>45)throw Error('Shorten the cover quote so it fits clearly below the image.');quoteLines.forEach((line,i)=>centered(p,line,705,403+i*size*1.2,283,size,italic));}
  centered(p,data.ward.toUpperCase(),685,quote?455:450,315,21);centered(p,data.stake.toUpperCase(),685,quote?485:478,315,16);
  if(showQr){await picture(p,data.coverQr,823,528,55,55);centered(p,'Scan for more',794,587,113,9,italic);}
  // Announcements keep their own column and the calendar occupies two panels.
  const a=pages[0];rounded(a,10,33,323,559,18);centered(a,'ANNOUNCEMENTS',17,37,309,22,bold);
  const notices=typeof readNews==='function'?readNews().filter(n=>n.show!==false&&(n.title.trim()||n.body.trim())):data.announcements.split(/\n\s*\n/).filter(Boolean).map(text=>{const [title,...body]=text.split('\n');return {title,body:body.join('\n'),icon:'auto'}});if(letter){const first=meetingDate();first.setDate(1);first.setDate(first.getDate()-first.getDay());first.setDate(first.getDate()+41);const future=events().filter(e=>e.date>dateKey(first));if(future.length)notices.push({title:'Future events',body:future.map(futureEventText).join(' / '),icon:''});}let y=69;
  const artwork=[[/choir/i,'choir'],[/ym\s*\/\s*yw|youth/i,2],[/primary activ/i,'primary-activities'],[/tithing/i,19],[/lunch/i,'lunch'],[/primary program/i,8],[/relief society/i,20],[/christmas/i,0]];
  const generalIcons={'choir':'music','2':'youth','primary-activities':'children','19':'giving','lunch':'meal','8':'program','20':'community','0':'holiday'};
  function noticePlan(n,size){const content=[n.title,n.body].join('\n'),art=n.icon==='upload'?(n.image||null): (n.icon==='auto'?artwork.find(([re])=>re.test(content))?.[1]:n.icon||null),x=art!=null?61:18,w=art!=null?263:304;const parts=content.split('\n'),title=parts.shift(),body=parts.join(' '),tokens=[...clean(title).split(' ').map(t=>({t,f:bold})),...clean(body).split(' ').map(t=>({t,f:font}))];let yy=0,xx=0,runs=[];for(const {t,f} of tokens){const tw=f.widthOfTextAtSize(t+' ',size);if(xx+tw>w&&xx>0){yy+=size*1.16;xx=0}runs.push({t,f,xx,yy});xx+=tw}return {art,x,runs,height:Math.max(art!=null?33:0,yy+size*1.16)+9}}
  let size=10.3;while(size>7.8&&notices.reduce((v,n)=>v+noticePlan(n,size).height,0)>485)size-=.1;
  if(notices.reduce((v,n)=>v+noticePlan(n,size).height,0)>485)throw Error('Too many announcements. Shorten them before downloading.');
  const extraGap=Math.max(0,(485-notices.reduce((v,n)=>v+noticePlan(n,size).height,0))/Math.max(1,notices.length));
  for(const n of notices){const plan=noticePlan(n,size);if(plan.art!=null)await picture(a,(String(plan.art).startsWith('data:image/')?plan.art:generalIcons[String(plan.art)]?`assets/icons/${generalIcons[String(plan.art)]}.png`:/^\d+$/.test(String(plan.art))?`assets/art-${plan.art}.png`:`assets/${plan.art}.png`),16,y+2,38,33);for(const r of plan.runs)text(a,r.t,plan.x+r.xx,y+r.yy,size,r.f);y+=plan.height+extraGap;}
  if(y>558)throw Error('Announcements extend into the submission footer. Shorten them.');rule(a,10,562,323,rgb(.32,.2,.5));paragraph(a,data.submission,35,566,286,22,8,italic,7.5);
  if(!letter){
  const d=meetingDate(),year=d.getFullYear(),month=d.getMonth(),first=new Date(year,month,1),start=first.getDay(),days=new Date(year,month+1,0).getDate(),rows=6,x0=366,calW=622,cw=calW/7,gridTop=129,ch=436/rows;
  rect(a,364,56,626,35,gray,gray);centered(a,d.toLocaleDateString('en-US',{month:'long'})+'/'+new Date(year,month+1,1).toLocaleDateString('en-US',{month:'long'}),366,57,622,25,bold);
  ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'].forEach((day,i)=>{rect(a,x0+i*cw,106,cw,23);centered(a,day,x0+i*cw+2,109,cw-4,12)});
  const allEvents=events();for(let i=0;i<rows*7;i++){const date=new Date(year,month,i-start+1),key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,x=x0+i%7*cw,top=gridTop+Math.floor(i/7)*ch;rect(a,x,top,cw,ch);text(a,String(date.getDate()),x+5,top+1,12);if(date.getDate()===1)text(a,date.toLocaleDateString('en-US',{month:'long'}).toUpperCase(),x+15,top+4,8,bold);const ee=allEvents.filter(e=>e.date===key);let ey=top+17;for(const e of ee){const art=e.art;
 const hasArt=art!=null,eventLines=hasArt?[]:lines(e.text,7.5,cw-9);
 const imageHeight=Math.min(28,(ch-20)/Math.max(1,ee.length)-2),height=hasArt?imageHeight:eventLines.length*8;
 if(ey+height>top+ch-2)throw Error('Too many events in calendar day '+key+'. Shorten event names or hide an item.');
 if(hasArt){const path=String(art).startsWith('data:image/')?art:generalIcons[String(art)]?`assets/icons/${generalIcons[String(art)]}.png`:/^\d+$/.test(String(art))?`assets/art-${art}.png`:`assets/${art}.png`;await picture(a,path,x+5,ey,cw-10,imageHeight);const time=calendarTime(e.time);if(time)text(a,time,x+cw-30,ey+height-7,6);}
 else eventLines.forEach((line,index)=>text(a,line,x+5,ey+index*8,7.5));ey+=height+2;
 }}

  const nextIndex=start+days;
  if(data.monthBorderMode!=='off'&&nextIndex<rows*7){
    const hex=/^#[0-9a-f]{6}$/i.test(data.monthBorderColor||'')?data.monthBorderColor:'#b85432';
    const border=data.monthBorderMode==='color'?rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255):black;
    const edge=(x1,t1,x2,t2)=>a.drawLine({start:{x:x1,y:612-t1},end:{x:x2,y:612-t2},color:border,thickness:2.5});
    const row=Math.floor(nextIndex/7),col=nextIndex%7,left=x0+col*cw,top=gridTop+row*ch,right=x0+calW,bottom=gridTop+rows*ch,step=top+ch;
    edge(left,top,right,top);edge(right,top,right,bottom);edge(right,bottom,row===rows-1?left:x0,bottom);
    if(row===rows-1)edge(left,bottom,left,top);
    else if(col===0)edge(x0,bottom,x0,top);
    else{edge(x0,bottom,x0,step);edge(x0,step,left,step);edge(left,step,left,top);}
  }
  const endDate=new Date(year,month,rows*7-start),after=allEvents.filter(e=>e.date>endDate.toISOString().slice(0,10));if(after.length)paragraph(a,'Future events: '+after.sort((a,b)=>a.date.localeCompare(b.date)).map(futureEventText).join(' / '),367,574,619,23,8.5,font,8);
  }
  if(letter){
    await doc.flush();
    const booklet=await PDFDocument.create();
    const box=(left,right)=>({left,right,bottom:0,top:612});
    const [announcements,cover,program,ward]=await booklet.embedPages([pages[0],pages[1],pages[1],pages[1]],[box(0,336),box(672,1008),box(0,336),box(336,672)]);
    const outside=booklet.addPage([792,612]),inside=booklet.addPage([792,612]);
    outside.drawPage(ward,{x:30,y:0,width:336,height:612});outside.drawPage(cover,{x:426,y:0,width:336,height:612});
    inside.drawPage(announcements,{x:30,y:0,width:336,height:612});inside.drawPage(program,{x:426,y:0,width:336,height:612});
    return {bytes:await booklet.save(),warnings:[...new Set(warnings)]};
  }
  return {bytes:await doc.save(),warnings:[...new Set(warnings)]};
};
