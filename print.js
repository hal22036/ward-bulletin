/* Legal landscape, three-panel bulletin, based on the ward's November 1 reference. */
window.makePdf = async function (settings={}) {
  const {PDFDocument, StandardFonts}=PDFLib;
  const letter=(settings.paperSize||data.paperSize)==='letter',monochrome=(settings.printColor||data.printColor)==='bw';
  const rgb=(r,g,b)=>{if(monochrome){const v=.2126*r+.7152*g+.0722*b;return PDFLib.rgb(v,v,v)}return PDFLib.rgb(r,g,b)};
  const doc=await PDFDocument.create();
  const font=await doc.embedFont(StandardFonts.Helvetica), bold=await doc.embedFont(StandardFonts.HelveticaBold), italic=await doc.embedFont(StandardFonts.HelveticaOblique);
  const serif=await doc.embedFont(StandardFonts.TimesRoman),serifBold=await doc.embedFont(StandardFonts.TimesRomanBold),serifItalic=await doc.embedFont(StandardFonts.TimesRomanItalic),serifBoldItalic=await doc.embedFont(StandardFonts.TimesRomanBoldItalic),boldItalic=await doc.embedFont(StandardFonts.HelveticaBoldOblique);
  const pages=[doc.addPage([1008,612]),doc.addPage([1008,612])], warnings=[];
  const black=rgb(.08,.08,.08), gold=rgb(.8,.58,.22), gray=rgb(.8,.83,.82);
  const clean=s=>String(s||'').replace(/[–—]/g,'-').replace(/·/g,' / ').replace(/[“”]/g,'"').replace(/[’]/g,"'").replace(/[^\x20-\x7e\n\r\u00a0-\u00ff]/g,'?');
  function lines(text,size,width,f=font){const result=[];for(const para of clean(text).split('\n')){let line='';for(const word of para.split(' ')){if(f.widthOfTextAtSize(line+(line?' ':'')+word,size)>width&&line){result.push(line);line=''}for(const ch of word){if(f.widthOfTextAtSize(line+ch,size)>width){result.push(line);line=''}line+=ch}line+=' '}result.push(line.trimEnd())}return result}
  function text(p,s,x,top,size=11,f=font){p.drawText(clean(s),{x,y:612-top-size,font:f,size,color:black})}
  function centered(p,s,x,top,w,size=12,f=font){let n=size;while(f.widthOfTextAtSize(clean(s),n)>w&&n>8)n-=.25;if(f.widthOfTextAtSize(clean(s),n)>w)throw Error('A heading or hymn title is too long. Shorten it so it fits clearly.');text(p,s,x+(w-f.widthOfTextAtSize(clean(s),n))/2,top,n,f)}
  function headingBlock(value,x,top,width,maxHeight,size,min,section){let rows=lines(value,size,width);while(rows.length*size*1.2>maxHeight&&size>min){size-=.25;rows=lines(value,size,width);}if(rows.length*size*1.2>maxHeight)throw Error(section+' is too long. Shorten it to fit the cover or program.');const height=rows.length*size*1.2;rows.forEach((line,i)=>centered(p,line,x,top+i*size*1.2,width,size));return height;}
  function rule(p,x,top,w,color=black,thickness=.7){p.drawLine({start:{x,y:612-top},end:{x:x+w,y:612-top},color,thickness})}
  function rounded(p,x,top,w,h,r=15,fill){const d=`M ${r} 0 H ${w-r} Q ${w} 0 ${w} ${r} V ${h-r} Q ${w} ${h} ${w-r} ${h} H ${r} Q 0 ${h} 0 ${h-r} V ${r} Q 0 0 ${r} 0 Z`;p.drawSvgPath(d,{x,y:612-top,borderColor:black,borderWidth:1,...(fill?{color:fill}:{})})}
  function rect(p,x,top,w,h,fill,border=black,bw=.7){p.drawRectangle({x,y:612-top-h,width:w,height:h,...(fill?{color:fill}:{}),borderColor:border,borderWidth:bw})}
  function paragraph(p,s,x,top,w,h,size=10,f=font,min=8,section='This text section'){const originalSize=size;let a=lines(s,size,w,f);while(a.length*size*1.2>h&&size>min){size-=.25;a=lines(s,size,w,f)}if(a.length*size*1.2>h)throw Error(section+' is too long. Shorten it before downloading.');if(size<originalSize&&size<9)warnings.push('small text');a.forEach((l,i)=>text(p,l,x,top+i*size*1.2,size,f));return a.length*size*1.2}
  const images={};async function img(name){if(!images[name]){const r=await fetch(name);if(!r.ok)throw Error('Could not load bulletin artwork.');const b=await r.arrayBuffer();if(monochrome){const bitmap=await createImageBitmap(new Blob([b])),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();const pixels=context.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4){const v=Math.round(.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2]);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;}context.putImageData(pixels,0,0);images[name]=await doc.embedPng(canvas.toDataURL('image/png'));}else images[name]=new Uint8Array(b)[0]===137?await doc.embedPng(b):await doc.embedJpg(b)}return images[name]}
  async function picture(p,name,x,top,w,h){const im=await img(name),s=Math.min(w/im.width,h/im.height);p.drawImage(im,{x:x+(w-im.width*s)/2,y:612-top-h+(h-im.height*s)/2,width:im.width*s,height:im.height*s})}
  function entryPlan(label,value){
    const w=274;let size=12;while(font.widthOfTextAtSize(clean(label+' '+value),size)>w&&size>8)size-=.25;
    if(font.widthOfTextAtSize(clean(label+' '+value),size)<=w)return {size,left:[clean(label)],right:[clean(value)],height:size*1.2};
    size=9;const left=lines(label,size,104),right=lines(value,size,156);return {size,left,right,height:Math.max(left.length,right.length)*size*1.2};
  }
  function entry(p,label,value,top){const plan=entryPlan(label,value),x=19,w=274;for(let i=0;i<Math.max(plan.left.length,plan.right.length);i++){const l=plan.left[i]||'',r=plan.right[i]||'',lw=font.widthOfTextAtSize(l,plan.size),rw=font.widthOfTextAtSize(r,plan.size);text(p,l,x,top+i*plan.size*1.2,plan.size);text(p,r,x+w-rw,top+i*plan.size*1.2,plan.size);if(i===0&&w-lw-rw>14)text(p,'.'.repeat(Math.floor((w-lw-rw-14)/font.widthOfTextAtSize('.',plan.size))),x+lw+7,top,plan.size);}}
  function hymn(p,label,value,top){const m=value.match(/^(Hymn\s*\S+)\s*[·|/]\s*(.*)$/i);entry(p,label,m?m[1]:value,top);if(m)centered(p,'“'+m[2]+'”',19,top+14,274,11.5)}
  // Program panel: same positions and visual hierarchy as the reference.
  const p=pages[1];headingBlock(data.ward,16,18,290,36,23,13,'Ward / branch name');centered(p,'Sacrament Meeting',16,54,290,22);centered(p,dateText(),16,80,290,18);
  if(entryPlan('Presiding',data.presiding).height>28||entryPlan('Conducting',data.conducting).height>22)throw Error('Presiding or Conducting is too long. Shorten the name or title.');entry(p,'Presiding',data.presiding,108);entry(p,'Conducting',data.conducting,139);paragraph(p,data.welcomeNotes??'Welcome and Announcements',19,161,274,22,12,font,8,'Welcome and Announcements');
  if(typeof hymnIsVisible!=='function'||hymnIsVisible('opening'))hymn(p,'Opening Hymn',data.opening,185);if(data.invocation.trim())entry(p,'Invocation',data.invocation,220);paragraph(p,data.wardStakeNotes??'Ward/Stake Items',19,244,274,27,12,font,8,'Ward / Stake Items');
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
  if(data.closing.trim()&&(typeof hymnIsVisible!=='function'||hymnIsVisible('closing')))items.push({kind:'hymn',label:'Closing Hymn',value:data.closing});
  if(data.benediction.trim())items.push({kind:'entry',label:'Benediction',value:data.benediction});
  for(const item of items){
    item.height=item.kind==='entry'?Math.max(15,entryPlan(item.label,item.value).height):item.kind==='notes'?lines(item.value,11.5,270).length*13.8:item.kind==='hymn'&&/^(Hymn\s*\S+)\s*[·|/]\s*(.*)$/i.test(item.value)?30:15;
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
  // Fit filled Ward sections to their content, wrapping columns without clipping.
  const wardData=readWard(),leaders=wardData.leadership.filter(row=>row.calling||row.name||row.phone),missionaries=wardData.missionaries.filter(row=>[row.name,row.mission,row.address1,row.address2,row.address3,row.email].some(value=>String(value||'').trim())).map(row=>[row.name,row.mission,row.address1,row.address2,row.address3,row.email].map(value=>String(value||'')).join('\n')),schedule=wardData.schedule.filter(row=>row.className||row.time),notes=String(wardData.notes||'').trim();
  if(missionaries.length>4)throw Error('The missionary panel fits up to four full contact entries. Remove an entry or shorten the information before exporting.');
  const drawRows=(rows,x,y,size,face=font,width=0)=>rows.forEach((line,i)=>width?centered(p,line,x,y+i*size*1.2,width,size,face):text(p,line,x,y+i*size*1.2,size,face));
  function wardPlan(density){
    const blocks=[],leaderSize=8.1-density*.6,missionSize=9-density*1.5,bodySize=10.5-density*2,scheduleSize=9-density,smallSize=9-density,notesSize=8.5-density;
    if(leaders.length){const rows=leaders.map(row=>{const cells=[lines(row.calling,leaderSize,103),lines(row.name,leaderSize,103),lines(row.phone,leaderSize,66)];return {cells,height:Math.max(...cells.map(c=>c.length))*leaderSize*1.2};});blocks.push({kind:'leadership',rows,size:leaderSize,height:27+rows.reduce((n,r)=>n+r.height,0)});}
    if(data.interviews.trim()){const rows=lines(data.interviews,smallSize,274);blocks.push({kind:'interviews',rows,size:smallSize,height:rows.length*smallSize*1.2+10});}
    if(missionaries.length){
      const full=missionaries.length===1,rows=missionaries.map((content,i)=>lines(content,missionSize,full||missionaries.length===3&&i===2?274:135));
      const firstHeight=Math.max(...rows.slice(0,2).map(r=>r.length))*missionSize*1.2,secondHeight=rows.length>2?Math.max(...rows.slice(2).map(r=>r.length))*missionSize*1.2:0;
      blocks.push({kind:'missionaries',rows,size:missionSize,firstHeight,secondHeight,height:26+firstHeight+(secondHeight?secondHeight+10:0)});
    }
    if(data.temple.trim()){const rows=lines(data.temple,bodySize,275);blocks.push({kind:'temple',rows,size:bodySize,height:27+rows.length*bodySize*1.2});}
    if(schedule.length||notes||data.fifthSunday.trim()){
      const classWidth=notes?102:138,timeWidth=notes?91:143,rows=schedule.map(row=>{const cells=[lines(row.className,scheduleSize,classWidth),lines(row.time,scheduleSize,timeWidth)];return {cells,height:Math.max(...cells.map(c=>c.length))*scheduleSize*1.2};}),noteRows=notes?lines(notes,notesSize,78):[],fifth=String(data.fifthSunday||'').trim()?lines(data.fifthSunday,8,282):[];
      const bodyHeight=Math.max(rows.reduce((n,r)=>n+r.height,0),notes?15+noteRows.length*notesSize*1.2:0);
      blocks.push({kind:'schedule',rows,noteRows,size:scheduleSize,notesSize,classWidth,bodyHeight,fifth,height:27+bodyHeight+(fifth.length?fifth.length*9.6+9:0)});
    }
    return blocks;
  }
  let blocks=wardPlan(0),density=0;
  const wardHeight=()=>blocks.reduce((sum,block)=>sum+block.height,0)+Math.max(0,blocks.length-1)*8;
  while(wardHeight()>581&&density<1){density=Math.min(1,density+.05);blocks=wardPlan(density);}
  if(wardHeight()>581)throw Error('Ward/branch information is too full to print clearly. Shorten leadership, missionary, temple, or schedule details.');
  if(density>0)warnings.push('Ward/branch information uses smaller text');
  let wardY=17+Math.min(55,Math.max(0,(581-wardHeight())/2));
  for(const block of blocks){
    if(block.kind==='leadership'){
      rect(p,347,wardY,298,block.height,null,black,1.5);centered(p,'Ward Leadership',353,wardY+4,286,12,bold);let y=wardY+22;
      for(const row of block.rows){row.cells.forEach((cell,i)=>drawRows(cell,[355,464,574][i],y,block.size));y+=row.height;}
    }else if(block.kind==='interviews'){
      rule(p,355,wardY,284,black,1);drawRows(block.rows,360,wardY+5,block.size);rule(p,355,wardY+block.height,284,black,1);
    }else if(block.kind==='missionaries'){
      rounded(p,346,wardY,302,block.height,15);const title='MISSIONARIES FROM THE '+data.ward.toUpperCase();centered(p,font.widthOfTextAtSize(clean(title),8)>284?'MISSIONARIES':title,351,wardY+4,292,10,bold);
      for(let i=0;i<block.rows.length;i++){const bottom=i>=2,y=wardY+21+(bottom?block.firstHeight+10:0),full=block.rows.length===1||block.rows.length===3&&i===2;drawRows(block.rows[i],full?360:357+(i%2)*145,y,block.size,font,full?274:0);}
      if(block.secondHeight)rule(p,355,wardY+21+block.firstHeight+5,280,black,1);
    }else if(block.kind==='temple'){
      rect(p,346,wardY,302,block.height,null,black,1);centered(p,'Las Vegas Nevada Temple',353,wardY+4,288,12,bold);drawRows(block.rows,360,wardY+22,block.size);
    }else{
      rect(p,347,wardY,300,block.height,null,black,1);centered(p,meetingDate().getFullYear()+' Meeting Schedule',351,wardY+4,286,10,bold);let y=wardY+22;
      for(const row of block.rows){drawRows(row.cells[0],351,y,block.size);drawRows(row.cells[1],351+block.classWidth+5,y,block.size);y+=row.height;}
      if(block.noteRows.length){rect(p,556,wardY+20,86,block.bodyHeight+3);centered(p,'NOTES',558,wardY+22,82,9);drawRows(block.noteRows,560,wardY+36,block.notesSize);}
      if(block.fifth.length)drawRows(block.fifth,351,wardY+27+block.bodyHeight,8);
    }
    wardY+=block.height+8;
  }
  // Keep the cover image fixed; place optional content after it.
  const quote=String(data.coverQuote||'').trim(),showQr=data.coverShowQr==='yes'&&/^data:image\/(png|jpeg);base64,/.test(data.coverQr||'');
  await picture(p,'assets/masthead.png',721,29,255,80);
  await picture(p,data.cover,722,113,252,336);
  function coverFooterPlan(density){
    const quoteSize=12-density*2,wardSize=21-density*8,stakeSize=16-density*5;
    const quoteRows=quote?lines(quote,quoteSize,283):[],wardRows=data.ward.trim()?lines(data.ward.toUpperCase(),wardSize,315):[],stakeRows=data.stake.trim()?lines(data.stake.toUpperCase(),stakeSize,315):[];
    const quoteHeight=quoteRows.length*quoteSize*1.2,wardHeight=wardRows.length*wardSize*1.2,stakeHeight=stakeRows.length*stakeSize*1.2;
    let y=quote?455:450;const quoteTop=y;if(quoteRows.length)y+=quoteHeight+5;const wardTop=y;if(wardRows.length)y+=wardHeight+3;const stakeTop=y;if(stakeRows.length)y+=stakeHeight;
    const qrTop=Math.max(528,y+5),bottom=showQr?qrTop+55+2+9.6:y;
    return {quoteSize,wardSize,stakeSize,quoteRows,wardRows,stakeRows,quoteTop,wardTop,stakeTop,qrTop,bottom,quoteHeight};
  }
  let coverDensity=0,footer=coverFooterPlan(0);
  while((footer.bottom>606||footer.quoteHeight>45)&&coverDensity<1){coverDensity=Math.min(1,coverDensity+.05);footer=coverFooterPlan(coverDensity);}
  if(footer.bottom>606||footer.quoteHeight>45)throw Error('The cover quote and names are too long to fit below the full-size image. Shorten the text or hide the QR code.');
  footer.quoteRows.forEach((line,i)=>centered(p,line,705,footer.quoteTop+i*footer.quoteSize*1.2,283,footer.quoteSize,italic));
  footer.wardRows.forEach((line,i)=>centered(p,line,685,footer.wardTop+i*footer.wardSize*1.2,315,footer.wardSize));
  footer.stakeRows.forEach((line,i)=>centered(p,line,685,footer.stakeTop+i*footer.stakeSize*1.2,315,footer.stakeSize));
  if(showQr){await picture(p,data.coverQr,823,footer.qrTop,55,55);centered(p,'Scan for more',794,footer.qrTop+57,113,8,italic);}
  // Announcements keep their own column and the calendar occupies two panels.
  const a=pages[0];rounded(a,10,33,323,559,18);centered(a,'ANNOUNCEMENTS',17,37,309,22,bold);
  const notices=typeof readNews==='function'?readNews().filter(n=>n.show!==false&&(n.title.trim()||n.body.trim())):data.announcements.split(/\n\s*\n/).filter(Boolean).map(text=>{const [title,...body]=text.split('\n');return {title,body:body.join('\n'),icon:'auto'}});if(letter){const first=calendarWindow().through;const future=events().filter(e=>e.date>dateKey(first));if(future.length)notices.push({title:'Future events',body:future.map(futureEventText).join(' / '),icon:''});}let y=69;
  const artwork=[[/choir/i,'choir'],[/ym\s*\/\s*yw|youth/i,2],[/primary activ/i,'primary-activities'],[/tithing/i,19],[/lunch/i,'lunch'],[/primary program/i,8],[/relief society/i,20],[/christmas/i,0]];
  const generalIcons={'choir':'music','2':'youth','primary-activities':'children','19':'giving','lunch':'meal','8':'program','20':'community','0':'holiday'};
  const contact=String(data.submission||'').trim();let contactSize=8,contactRows=contact?lines(contact,contactSize,286,italic):[];while(contactRows.length*contactSize*1.2>45&&contactSize>7.5){contactSize-=.25;contactRows=lines(contact,contactSize,286,italic);}if(contactRows.length*contactSize*1.2>45)throw Error('Bulletin contact information is too long. Shorten the instructions.');
  const contactHeight=contactRows.length*contactSize*1.2,contactTop=contact?Math.min(562,588-contactHeight-5):592,newsHeight=contactTop-77;
  function noticePlan(n,scaleSize){
    const requested=[9,10,11,12,14].includes(Number(n.fontSize))?Number(n.fontSize):10.3,size=Math.max(8.5,requested*scaleSize/10.3),faces=n.fontFamily==='serif'?{normal:serif,bold:serifBold,italic:serifItalic,bolditalic:serifBoldItalic}:{normal:font,bold,italic,bolditalic:boldItalic},bodyFace=faces[n.fontStyle]||faces.normal,titleFace=['italic','bolditalic'].includes(n.fontStyle)?faces.bolditalic:faces.bold;
    const content=[n.title,n.body].join('\n'),art=n.icon==='upload'?(n.image||null):(n.icon==='auto'?artwork.find(([re])=>re.test(content))?.[1]:n.icon||null),x=art!=null?61:18,w=art!=null?263:304;
    const tokenize=(value,f)=>clean(value||'').replace(/\r\n?/g,'\n').split(/(\n)/).flatMap(part=>part==='\n'?[{br:true}]:part.split(/\s+/).filter(Boolean).map(t=>({t,f})));
    const tokens=[...tokenize(n.title,titleFace),...tokenize(n.body,bodyFace)];let yy=0,xx=0,runs=[];
    for(const token of tokens){if(token.br){yy+=size*1.16;xx=0;continue;}const {t,f}=token;let chunk='';const chunks=[];for(const ch of t){if(f.widthOfTextAtSize(chunk+ch,size)>w&&chunk){chunks.push(chunk);chunk='';}chunk+=ch;}chunks.push(chunk);chunks.forEach((part,i)=>{const tw=f.widthOfTextAtSize(part+(i===chunks.length-1?' ':''),size);if(xx+tw>w&&xx>0){yy+=size*1.16;xx=0;}runs.push({t:part,f,xx,yy});xx+=tw;});}
    return {art,x,runs,size,height:Math.max(art!=null?33:0,yy+size*1.16)+9};
  }
  let size=10.3;while(size>8.5&&notices.reduce((v,n)=>v+noticePlan(n,size).height,0)>newsHeight)size=Math.max(8.5,size-.1);
  if(notices.reduce((v,n)=>v+noticePlan(n,size).height,0)>newsHeight)throw Error('Announcements'+(letter?' and future events':'')+' are too full to print clearly. Shorten or hide an item.');if(size<9)warnings.push('Announcements use smaller text');if(size<10.2&&notices.some(n=>n.fontSize))warnings.push('Announcement text scaled to fit');
  const extraGap=Math.min(14,Math.max(0,(newsHeight-notices.reduce((v,n)=>v+noticePlan(n,size).height,0))/Math.max(1,notices.length)));
  for(const n of notices){const plan=noticePlan(n,size);if(plan.art!=null)await picture(a,(String(plan.art).startsWith('data:image/')?plan.art:generalIcons[String(plan.art)]?`assets/icons/${generalIcons[String(plan.art)]}.png`:/^\d+$/.test(String(plan.art))?`assets/art-${plan.art}.png`:`assets/${plan.art}.png`),16,y+2,38,33);for(const r of plan.runs)text(a,r.t,plan.x+r.xx,y+r.yy,plan.size,r.f);y+=plan.height+extraGap;}
  if(y>contactTop)throw Error('Announcements are too close to the contact footer. Shorten or hide an item.');
  if(contact){rule(a,10,contactTop,323,rgb(.32,.2,.5));contactRows.forEach((line,i)=>text(a,line,35,contactTop+4+i*contactSize*1.2,contactSize,italic));}
  if(!letter){
  const range=calendarWindow(),first=range.from,rows=5,x0=366,calW=622,cw=calW/7,gridTop=129,ch=436/rows,dates=Array.from({length:35},(_,i)=>{const date=new Date(first);date.setDate(first.getDate()+i);return date;});
  const monthHeading=[...new Set(dates.map(date=>date.toLocaleDateString('en-US',{month:'long'})))].join('/');rect(a,364,56,626,35,gray,gray);centered(a,monthHeading,366,57,622,25,bold);
  ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'].forEach((day,i)=>{rect(a,x0+i*cw,106,cw,23);centered(a,day,x0+i*cw+2,109,cw-4,12)});
  const allEvents=events();for(let i=0;i<rows*7;i++){const date=dates[i],key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,x=x0+i%7*cw,top=gridTop+Math.floor(i/7)*ch;rect(a,x,top,cw,ch);text(a,String(date.getDate()),x+5,top+1,12);if(date.getDate()===1)text(a,date.toLocaleDateString('en-US',{month:'long'}).toUpperCase(),x+15,top+4,8,bold);const ee=allEvents.filter(e=>e.date===key),bodyX=x+4,bodyTop=top+17,bodyWidth=cw-8,bodyHeight=ch-20;
    const iconEvents=ee.filter(e=>e.art!=null),textEvents=ee.filter(e=>e.art==null).map(e=>({event:e,rows:lines(e.text,7.5,cw-9)})),textHeight=textEvents.reduce((sum,e)=>sum+e.rows.length*8+2,0),iconHeight=bodyHeight-textHeight-(textEvents.length&&iconEvents.length?3:0);
    if(textHeight>bodyHeight)throw Error('Too many events in calendar day '+key+'. Shorten event names or hide an item.');
    if(iconEvents.length){
      const gap=3,hasTimes=iconEvents.some(e=>e.calendarText!=='no'&&calendarTime(e.time)),timeBand=hasTimes?9:0,minTimeWidth=Math.max(0,...iconEvents.map(e=>font.widthOfTextAtSize(e.calendarText==='no'?'':calendarTime(e.time),6.5)));
      let layout=null;
      for(let cols=1;cols<=iconEvents.length;cols++){
        const rowCount=Math.ceil(iconEvents.length/cols),tileWidth=(bodyWidth-gap*(cols-1))/cols,tileHeight=(iconHeight-gap*(rowCount-1))/rowCount,score=Math.min(tileWidth,tileHeight-timeBand);
        if(tileWidth>=minTimeWidth&&(!layout||score>layout.score))layout={cols,rowCount,tileWidth,tileHeight,score};
      }
      if(!layout||layout.score<14)throw Error('Too many icon events in calendar day '+key+'. Hide an item or use shorter text-only entries.');
      for(let eventIndex=0;eventIndex<iconEvents.length;eventIndex++){
        const event=iconEvents[eventIndex],row=Math.floor(eventIndex/layout.cols),col=eventIndex%layout.cols,countInRow=Math.min(layout.cols,iconEvents.length-row*layout.cols),rowWidth=countInRow*layout.tileWidth+(countInRow-1)*gap,tileX=bodyX+(bodyWidth-rowWidth)/2+col*(layout.tileWidth+gap),tileTop=bodyTop+row*(layout.tileHeight+gap),time=event.calendarText==='no'?'':calendarTime(event.time),pictureHeight=layout.tileHeight-(time?9:0),art=event.art;
        const path=String(art).startsWith('data:image/')?art:generalIcons[String(art)]?`assets/icons/${generalIcons[String(art)]}.png`:/^\d+$/.test(String(art))?`assets/art-${art}.png`:`assets/${art}.png`;
        await picture(a,path,tileX,tileTop,layout.tileWidth,pictureHeight);
        if(time)centered(a,time,tileX,tileTop+layout.tileHeight-7.5,layout.tileWidth,6.5);
      }
    }
    let textTop=bodyTop+(iconEvents.length?iconHeight+3:0);for(const entry of textEvents){entry.rows.forEach((line,index)=>text(a,line,x+5,textTop+index*8,7.5));textTop+=entry.rows.length*8+2;}
  }


  if(data.monthBorderMode!=='off'){
    const hex=/^#[0-9a-f]{6}$/i.test(data.monthBorderColor||'')?data.monthBorderColor:'#b85432',border=data.monthBorderMode==='color'?rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255):black;
    const edge=(x1,t1,x2,t2)=>a.drawLine({start:{x:x1,y:612-t1},end:{x:x2,y:612-t2},color:border,thickness:2.5});
    const monthKey=date=>date.getFullYear()+'-'+date.getMonth(),firstMonth=monthKey(first),keys=dates.map(monthKey);
    for(let i=0;i<dates.length;i++)if(keys[i]!==firstMonth){const row=Math.floor(i/7),col=i%7,x=x0+col*cw,top=gridTop+row*ch,key=keys[i];if(row===0||keys[i-7]!==key)edge(x,top,x+cw,top);if(row===4||keys[i+7]!==key)edge(x,top+ch,x+cw,top+ch);if(col===0||keys[i-1]!==key)edge(x,top,x,top+ch);if(col===6||keys[i+1]!==key)edge(x+cw,top,x+cw,top+ch);}
  }
  const endDate=range.through,after=allEvents.filter(e=>e.date>dateKey(endDate));if(after.length){const future='Future events: '+after.sort((a,b)=>a.date.localeCompare(b.date)).map(futureEventText).join(' / ');if(lines(future,8,619).length*9.6>23)throw Error('Future events are too full to fit below the calendar. Shorten event names or hide some events.');paragraph(a,future,367,574,619,23,8.5,font,8);}
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
