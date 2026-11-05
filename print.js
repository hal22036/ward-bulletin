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
  const appearance=typeof textAppearance==='function'?textAppearance():{};let currentAppearance={};
  const mono=await doc.embedFont(StandardFonts.Courier),monoBold=await doc.embedFont(StandardFonts.CourierBold),monoItalic=await doc.embedFont(StandardFonts.CourierOblique),monoBoldItalic=await doc.embedFont(StandardFonts.CourierBoldOblique);
  const fontFamilies={sans:{normal:font,bold,italic,bolditalic:boldItalic},serif:{normal:serif,bold:serifBold,italic:serifItalic,bolditalic:serifBoldItalic},mono:{normal:mono,bold:monoBold,italic:monoItalic,bolditalic:monoBoldItalic}},fontCatalog=window.BULLETIN_FONT_CATALOG||[],usedFamilies=new Set([...Object.values(appearance).map(settings=>settings?.family),...(typeof readNews==='function'?readNews().map(item=>item.fontFamily):[]),...meetingSequence(true).map(item=>meetingEntryFonts(item.id).family),...['ward','heading','date'].map(id=>meetingEntryFonts(id).family)]);
  if(!window.bulletinFontBytes)window.bulletinFontBytes=new Map();
  for(const family of fontCatalog.filter(item=>usedFamilies.has(item.id))){if(!window.fontkit)throw Error('Font support is still loading. Refresh the page and try again.');doc.registerFontkit(window.fontkit);const variants={};await Promise.all(Object.entries(family.variants).map(async([style,path])=>{if(!window.bulletinFontBytes.has(path))window.bulletinFontBytes.set(path,(async()=>{const response=await fetch(path);if(!response.ok)throw Error('Could not load '+family.label+'. Refresh and try again.');return new Uint8Array(await response.arrayBuffer());})());try{variants[style]=await doc.embedFont(await window.bulletinFontBytes.get(path),{subset:true});}catch(error){window.bulletinFontBytes.delete(path);throw error;}}));fontFamilies[family.id]=variants;}

  function useSection(key,overrides={}){currentAppearance={...(appearance.global||{}),...(appearance[key]||{}),...overrides};for(const name of ['family','style','size','color'])if(currentAppearance[name]==='')currentAppearance[name]=appearance.global?.[name];}
  function useMeetingEntry(id){useSection('meeting',meetingEntryFonts(id));}
  function fitSize(size,height){return Math.min(size,height/styleSize(1));}
  function styleSize(size){const base=Number(currentAppearance.size)||10;return size*Math.min(1.6,Math.max(.8,base/10));}
  function requestedStyle(f){return ['normal','bold','italic','bolditalic'].includes(currentAppearance.style)?currentAppearance.style:[bold,serifBold,monoBold].includes(f)?'bold':[italic,serifItalic,monoItalic].includes(f)?'italic':[boldItalic,serifBoldItalic,monoBoldItalic].includes(f)?'bolditalic':'normal';}
  function familyFaces(f){return fontFamilies[currentAppearance.family]||([serif,serifBold,serifItalic,serifBoldItalic].includes(f)?fontFamilies.serif:[mono,monoBold,monoItalic,monoBoldItalic].includes(f)?fontFamilies.mono:fontFamilies.sans);}
  function face(f){const variants=familyFaces(f),style=requestedStyle(f);return variants[style]||(style.includes('bold')?variants.bold:null)||(style.includes('italic')?variants.italic:null)||variants.normal;}
  function measure(f,value,size){return face(f).widthOfTextAtSize(value,styleSize(size));}
  function textColor(){const value=currentAppearance.color;if(!/^#[0-9a-f]{6}$/i.test(value||''))return black;return rgb(parseInt(value.slice(1,3),16)/255,parseInt(value.slice(3,5),16)/255,parseInt(value.slice(5,7),16)/255);}
  const clean=s=>String(s||'').replace(/[–—]/g,'-').replace(/·/g,' / ').replace(/[“”]/g,'"').replace(/[’]/g,"'").replace(/[^\x20-\x7e\n\r\u00a0-\u00ff]/g,'?');
  function lines(text,size,width,f=font){const result=[];for(const para of clean(text).split('\n')){let line='';for(const word of para.split(' ')){if(measure(f,line+(line?' ':'')+word,size)>width&&line){result.push(line);line=''}for(const ch of word){if(measure(f,line+ch,size)>width){result.push(line);line=''}line+=ch}line+=' '}result.push(line.trimEnd())}return result}
  function text(p,s,x,top,size=11,f=font){const chosen=face(f),style=requestedStyle(f),variants=familyFaces(f),syntheticItalic=style.includes('italic')&&chosen!==variants.italic&&chosen!==variants.bolditalic,syntheticBold=style.includes('bold')&&chosen!==variants.bold&&chosen!==variants.bolditalic,options={x,y:612-top-styleSize(size),font:chosen,size:styleSize(size),color:textColor(),...(syntheticItalic?{ySkew:PDFLib.degrees(12)}:{})};p.drawText(clean(s),options);if(syntheticBold)p.drawText(clean(s),{...options,x:x+.22});}
  function centered(p,s,x,top,w,size=12,f=font){let n=size;while(measure(f,clean(s),n)>w&&n>8)n-=.25;if(measure(f,clean(s),n)>w)throw Error('A heading or hymn title is too long. Shorten it so it fits clearly.');text(p,s,x+(w-measure(f,clean(s),n))/2,top,n,f)}
  function aligned(p,value,x,top,width,size=12,alignment='original',f=font){if(alignment==='left')text(p,value,x,top,size,f);else if(alignment==='right')text(p,value,x+width-measure(f,clean(value),size),top,size,f);else centered(p,value,x,top,width,size,f);}
  function headingBlock(value,x,top,width,maxHeight,size,min,section){let rows=lines(value,size,width);while(rows.length*styleSize(size)*1.2>maxHeight&&size>min){size-=.25;rows=lines(value,size,width);}if(rows.length*styleSize(size)*1.2>maxHeight)throw Error(section+' is too long. Shorten it to fit the cover or program.');const height=rows.length*styleSize(size)*1.2;rows.forEach((line,i)=>aligned(p,line,x,top+i*styleSize(size)*1.2,width,size,section==='Ward / branch name'?entryAlignment('ward'):'original'));return height;}
  function rule(p,x,top,w,color=black,thickness=.7){p.drawLine({start:{x,y:612-top},end:{x:x+w,y:612-top},color,thickness})}
  function rounded(p,x,top,w,h,r=15,fill){const d=`M ${r} 0 H ${w-r} Q ${w} 0 ${w} ${r} V ${h-r} Q ${w} ${h} ${w-r} ${h} H ${r} Q 0 ${h} 0 ${h-r} V ${r} Q 0 0 ${r} 0 Z`;p.drawSvgPath(d,{x,y:612-top,borderColor:black,borderWidth:1,...(fill?{color:fill}:{})})}
  function rect(p,x,top,w,h,fill,border=black,bw=.7){p.drawRectangle({x,y:612-top-h,width:w,height:h,...(fill?{color:fill}:{}),borderColor:border,borderWidth:bw})}
  function monthLabel(p,date,x,top,width){if(date.getDate()!==1)return 0;const config=typeof calendarMonthLabelSettings==='function'?calendarMonthLabelSettings():{},key=dateKey(date).slice(0,7),settings=config.labels?.[key]||{};if(config.show===false||settings.show===false)return 0;const wording=String(settings.text??date.toLocaleDateString('en-US',{month:'long'}).toUpperCase()).trim();if(!wording)return 0;const left=x+7+measure(font,'1',fitSize(12,14)),previous=currentAppearance;currentAppearance={...previous,...(settings.size?{size:10}:{}),...(settings.color?{color:settings.color}:{})};try{const size=[6,7,8,9,10,12,14,16].includes(Number(settings.size))?Number(settings.size):8,rows=lines(wording,size,width-(left-x)-3,bold),height=4+(rows.length-1)*styleSize(size)*1.2+styleSize(size);if(height>45)throw Error('The month label for '+key+' is too large. Shorten its wording or choose a smaller label size.');rows.forEach((line,i)=>text(p,line,left,top+4+i*styleSize(size)*1.2,size,bold));return height;}finally{currentAppearance=previous;}}
  function paragraph(p,s,x,top,w,h,size=10,f=font,min=8,section='This text section'){const originalSize=size;let a=lines(s,size,w,f);while(a.length*styleSize(size)*1.2>h&&size>min){size-=.25;a=lines(s,size,w,f)}if(a.length*styleSize(size)*1.2>h)throw Error(section+' is too long. Shorten it before downloading.');if(size<originalSize&&size<9)warnings.push('small text');a.forEach((l,i)=>text(p,l,x,top+i*styleSize(size)*1.2,size,f));return a.length*styleSize(size)*1.2}
  const images={};async function img(name){if(!images[name]){const r=await fetch(name);if(!r.ok)throw Error('Could not load bulletin artwork.');const b=await r.arrayBuffer();if(monochrome){const bitmap=await createImageBitmap(new Blob([b])),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();const pixels=context.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4){const v=Math.round(.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2]);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;}context.putImageData(pixels,0,0);images[name]=await doc.embedPng(canvas.toDataURL('image/png'));}else images[name]=new Uint8Array(b)[0]===137?await doc.embedPng(b):await doc.embedJpg(b)}return images[name]}
  async function picture(p,name,x,top,w,h){const im=await img(name),s=Math.min(w/im.width,h/im.height);p.drawImage(im,{x:x+(w-im.width*s)/2,y:612-top-h+(h-im.height*s)/2,width:im.width*s,height:im.height*s})}
  const calendarCrops=new Map();
  async function calendarPicture(p,path,x,top,w,h){
    if(!calendarCrops.has(path)){let cropped=path;try{const response=await fetch(path);if(!response.ok)throw Error();const bitmap=await createImageBitmap(new Blob([await response.arrayBuffer()])),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,right=-1,upper=canvas.height,bottom=-1;for(let yy=0;yy<canvas.height;yy++)for(let xx=0;xx<canvas.width;xx++){const i=(yy*canvas.width+xx)*4;if(pixels[i+3]>20&&Math.min(pixels[i],pixels[i+1],pixels[i+2])<245){left=Math.min(left,xx);right=Math.max(right,xx);upper=Math.min(upper,yy);bottom=Math.max(bottom,yy);}}if(right>=left){left=Math.max(0,left-2);upper=Math.max(0,upper-2);right=Math.min(canvas.width-1,right+2);bottom=Math.min(canvas.height-1,bottom+2);const trimmed=document.createElement('canvas');trimmed.width=right-left+1;trimmed.height=bottom-upper+1;trimmed.getContext('2d').drawImage(canvas,left,upper,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);cropped=trimmed.toDataURL('image/png');}}catch{}calendarCrops.set(path,cropped);}
    await picture(p,calendarCrops.get(path),x,top,w,h);
  }
  function entryPlan(label,value,alignment='original'){
    if(alignment!=='original'){const combinedRows=lines(label+(value?' ..... '+value:''),12,274);return {size:12,combinedRows,height:combinedRows.length*styleSize(14.4)};}
    const w=274;let size=12;while(measure(font,clean(label+' '+value),size)>w&&size>8)size-=.25;
    if(measure(font,clean(label+' '+value),size)<=w)return {size,left:[clean(label)],right:[clean(value)],height:styleSize(size)*1.2};
    size=9;const left=lines(label,size,104),right=lines(value,size,156);return {size,left,right,height:Math.max(left.length,right.length)*styleSize(size)*1.2};
  }
  function entry(p,label,value,top,alignment='original'){const plan=entryPlan(label,value,alignment),x=19,w=274;if(plan.combinedRows){plan.combinedRows.forEach((row,i)=>aligned(p,row,x,top+i*styleSize(14.4),w,12,alignment));return;}for(let i=0;i<Math.max(plan.left.length,plan.right.length);i++){const l=plan.left[i]||'',r=plan.right[i]||'',lw=measure(font,l,plan.size),rw=measure(font,r,plan.size);text(p,l,x,top+i*styleSize(plan.size)*1.2,plan.size);text(p,r,x+w-rw,top+i*styleSize(plan.size)*1.2,plan.size);if(i===0&&w-lw-rw>14)text(p,'.'.repeat(Math.floor((w-lw-rw-14)/measure(font,'.',plan.size))),x+lw+7,top,plan.size);}}
  function hymnPlan(label,value,rightLabel='Hymn',extraLines=[],alignment='original',lineAlignments=[]){const parts=splitHymn(value),right=parts.number?[rightLabel,parts.number].filter(Boolean).join(' '):(rightLabel==='Hymn'?'':rightLabel),headerHeight=right?Math.max(15,entryPlan(label,right,alignment).height):styleSize(15),titleRows=parts.name?lines('“'+parts.name+'”',11.5,274):[],creditRows=(extraLines||[]).flatMap((line,i)=>String(line).trim()?lines(line,10.5,274).map(text=>({text,alignment:lineAlignments[i]&&lineAlignments[i]!=='original'?lineAlignments[i]:alignment})):[]);return {right,headerHeight,titleRows,creditRows,height:headerHeight+titleRows.length*styleSize(13.8)+creditRows.length*styleSize(12.6)};}
  function hymn(p,label,value,top,maxHeight=0,rightLabel='Hymn',extraLines=[],alignment='original',lineAlignments=[]){const plan=hymnPlan(label,value,rightLabel,extraLines,alignment,lineAlignments);if(plan.right)entry(p,label,plan.right,top,alignment);else aligned(p,label,19,top,274,12,alignment==='original'?'left':alignment);let y=top+plan.headerHeight;for(const row of plan.titleRows){aligned(p,row,19,y,274,11.5,alignment);y+=styleSize(13.8);}for(const row of plan.creditRows){aligned(p,row.text,19,y,274,10.5,row.alignment);y+=styleSize(12.6);}}
  // Program panel: same positions and visual hierarchy as the reference.
  const p=pages[1];useMeetingEntry('ward');const meetingHeadingHeight=headingBlock(data.ward,16,18,290,36,23,13,'Ward / branch name');useMeetingEntry('heading');aligned(p,typeof programHeading==='function'?programHeading():'Sacrament Meeting',16,Math.max(49,18+meetingHeadingHeight),290,22,entryAlignment('heading'));useMeetingEntry('date');aligned(p,dateText(),16,80,290,18,entryAlignment('date'));useSection('meeting');
  if(data.meetingItemOrder||meetingSequence().some(item=>Object.keys(meetingEntryFonts(item.id)).length)||meetingSequence().some(item=>item.alignment!=='original')||meetingSequence().some(item=>item.kind==='hymn'&&(!splitHymn(item.value).number||(item.extraLines||[]).some(line=>line.trim())))){
   const items=meetingSequence();for(const item of items){useMeetingEntry(item.id);item.height=item.kind==='entry'?Math.max(15,entryPlan(item.label,item.value,item.alignment).height):item.kind==='notes'?lines(item.value,11.5,270).length*styleSize(13.8):item.kind==='hymn'?hymnPlan(item.label,item.value,item.rightLabel,item.extraLines,item.alignment,item.lineAlignments).height:styleSize(15);}
   const sacramentItems=items.filter(item=>['sacrament','administration'].includes(item.id)),showSacramentBars=data.sacramentBars!=='false';if(showSacramentBars&&sacramentItems.length){sacramentItems[0].barBefore=true;sacramentItems.at(-1).barAfter=true;}for(const item of items){item.before=item.barBefore?9:0;item.after=item.barAfter?9:0;}const top=108,bottom=586,total=items.reduce((sum,item)=>sum+item.height+item.before+item.after,0);if(total>bottom-top)throw Error('Too many program items to fit clearly. Shorten information or hide an item before publishing.');const gap=Math.min(22,(bottom-top-total)/Math.max(1,items.length-1));let y=top;
   for(const item of items){useMeetingEntry(item.id);y+=item.before;if(item.barBefore)rule(p,20,y-6,272,gold,3);if(item.kind==='entry')entry(p,item.label,item.value,y,item.alignment);else if(item.kind==='hymn')hymn(p,item.label,item.value,y,0,item.rightLabel,item.extraLines,item.alignment,item.lineAlignments);else if(item.kind==='center'){if(item.dots){const width=measure(font,clean(item.value),11.5),dots='.'.repeat(Math.max(0,Math.floor((274-width-16)/(2*measure(font,'.',11.5)))));aligned(p,dots+'  '+item.value+'  '+dots,19,y,274,11.5,item.alignment);}else aligned(p,item.value,19,y,274,11.5,item.alignment);}else lines(item.value,11.5,270).forEach((line,index)=>aligned(p,line,19,y+index*styleSize(13.8),274,11.5,item.alignment));if(item.barAfter)rule(p,20,y+item.height+4,272,gold,3);y+=item.height+item.after+gap;}
  }else{
  if(entryPlan('Presiding',data.presiding).height>28||entryPlan('Conducting',data.conducting).height>22)throw Error('Presiding or Conducting is too long. Shorten the name or title.');entry(p,'Presiding',data.presiding,108);entry(p,'Conducting',data.conducting,139);paragraph(p,data.welcomeNotes??'Welcome and Announcements',19,161,274,22,12,font,8,'Welcome and Announcements');
  if(typeof hymnIsVisible!=='function'||hymnIsVisible('opening'))hymn(p,'Opening Hymn',data.opening,185,31,hymnRightText('opening'),hymnExtraLines('opening'));if(data.invocation.trim())entry(p,'Invocation',data.invocation,220);paragraph(p,data.wardStakeNotes??'Ward/Stake Items',19,244,274,27,12,font,8,'Ward / Stake Items');
  if(data.sacramentBars!=='false')rule(p,20,274,272,gold,3);if(typeof hymnIsVisible!=='function'||hymnIsVisible('sacrament'))hymn(p,'Sacrament Hymn',data.sacrament,279,31,hymnRightText('sacrament'),hymnExtraLines('sacrament'));text(p,'Administration of the Sacrament',19,314,11.5);if(data.sacramentBars!=='false')rule(p,20,333,272,gold,3);
  // Share the available space between visible program items and closing items.
  const items=[];
  let options=null;try{options=JSON.parse(data.programOptions)}catch{}
  if(options&&Array.isArray(options.speakers)){
    if(options.fast)items.push({kind:'center',value:'Fast and Testimony Meeting'});
    const speakers=options.showSpeakers?options.speakers.filter(speaker=>speaker.show!==false&&String(speaker.name||'').trim()):[];
    const hymns=typeof readExtraHymns==='function'?readExtraHymns().filter(h=>h.show&&(h.number.trim()||h.name.trim())):[];
    for(let position=0;position<=speakers.length;position++){
      if(position>0){const speaker=speakers[position-1];items.push({kind:'entry',label:speaker.type||'Speaker',value:speaker.name});}
      for(const hymn of hymns.filter(h=>Math.min(h.after,speakers.length)===position))items.push({kind:'hymn',label:hymn.label||'Hymn',rightLabel:hymnRightText(hymn),extraLines:hymn.extraLines||[],value:hymn.number?'Hymn '+hymn.number+(hymn.name?' · '+hymn.name:''):hymn.name});
    }
    if(options.showNotes!==false&&options.notes?.trim())items.push({kind:'notes',value:options.notes});
    if(options.showNotes!==false)for(const info of options.information||[])if(info.show!==false&&info.text?.trim())items.push({kind:'notes',value:[info.title,info.text].filter(Boolean).join('\n')});
  }else if(data.program?.trim())items.push({kind:'notes',value:data.program});
  if(data.closing.trim()&&(typeof hymnIsVisible!=='function'||hymnIsVisible('closing')))items.push({kind:'hymn',label:'Closing Hymn',rightLabel:hymnRightText('closing'),extraLines:hymnExtraLines('closing'),value:data.closing});
  if(data.benediction.trim())items.push({kind:'entry',label:'Benediction',value:data.benediction});
  for(const item of items){
    item.height=item.kind==='entry'?Math.max(15,entryPlan(item.label,item.value,item.alignment).height):item.kind==='notes'?lines(item.value,11.5,270).length*styleSize(13.8):item.kind==='hymn'?hymnPlan(item.label,item.value,item.rightLabel,item.extraLines,item.alignment,item.lineAlignments).height:styleSize(15);
  }
  const top=345,bottom=586,total=items.reduce((sum,item)=>sum+item.height,0);
  if(total>bottom-top)throw Error('Too many program items to fit clearly. Shorten notes or hide an item before downloading.');
  const gap=(bottom-top-total)/(items.length+1);
  let programY=top+gap;
  for(const item of items){
    if(item.kind==='entry')entry(p,item.label,item.value,programY);
    else if(item.kind==='hymn')hymn(p,item.label,item.value,programY,0,item.rightLabel,item.extraLines);
    else if(item.kind==='center'){
      const title=item.value,size=11.5,width=measure(font,clean(title),size),dotWidth=measure(font,'.',size);
      const dots='.'.repeat(Math.max(0,Math.floor((274-width-16)/(2*dotWidth))));
      centered(p,dots+'  '+title+'  '+dots,19,programY,274,size);
    }else lines(item.value,11.5,270).forEach((line,index)=>centered(p,line,19,programY+index*styleSize(13.8),274,11.5));
    programY+=item.height+gap;
  }
  }
  // Fit filled Ward sections to their content, wrapping columns without clipping.
  const wardData=readWard(),leaders=wardData.leadership.filter(row=>row.calling||row.name||row.phone),missionaries=wardData.missionaries.filter(row=>[row.name,row.mission,row.address1,row.address2,row.address3,row.email].some(value=>String(value||'').trim())).map(row=>[row.name,row.mission,row.address1,row.address2,row.address3,row.email].map(value=>String(value||'')).join('\n')),schedule=wardData.schedule.filter(row=>row.className||row.time),notes=String(wardData.notes||'').trim(),notesRows=(wardData.notesRows||[]).filter(row=>row.className||row.room),hasNotes=!!(notes||notesRows.length);
  if(missionaries.length>4&&wardSection('missionaries').mode!=='text')throw Error('The missionary panel fits up to four full contact entries. Remove an entry or shorten the information before exporting.');
  const drawRows=(rows,x,y,size,face=font,width=0)=>rows.forEach((line,i)=>width?centered(p,line,x,y+i*styleSize(size)*1.2,width,size,face):text(p,line,x,y+i*styleSize(size)*1.2,size,face));
  function wardHeading(key,size,width,minBand=27){const titleRows=String(wardSection(key).title||'').trim()?lines(wardSection(key).title,size,width,bold):[];return {titleRows,titleSize:size,band:titleRows.length?Math.max(minBand,titleRows.length*styleSize(size)*1.2+10):7};}
  function wardPlan(density){
    const blocks=[],leaderSize=8.1-density*.6,missionSize=9-density*1.5,bodySize=10.5-density*2,scheduleSize=9-density,smallSize=9-density,notesSize=8.5-density;
    const fifthPlan=()=>{const fifth=String(data.fifthSunday||'').trim()?lines(data.fifthSunday,8,282):[],fifthTitle=fifth.length&&wardSection('fifthSunday').title.trim()?lines(wardSection('fifthSunday').title,8,282,bold):[],fifthTitleHeight=fifthTitle.length*styleSize(8)*1.2;return {fifth,fifthTitle,fifthTitleHeight,fifthHeight:fifth.length?(fifth.length+fifthTitle.length)*styleSize(8)*1.2+9:0};};
    const generalPlan=(key,kind,size)=>{const section=wardSection(key);if(section.mode!=='text')return false;useSection(kind);const rows=section.body.trim()?lines(section.body,size,274):[],heading=wardHeading(key,12,282),extra=key==='information'?fifthPlan():{fifth:[],fifthTitle:[],fifthTitleHeight:0,fifthHeight:0};if(rows.length||extra.fifth.length)blocks.push({kind,general:true,...heading,rows,size,...extra,bodyHeight:rows.length*styleSize(size)*1.2,height:heading.band+rows.length*styleSize(size)*1.2+extra.fifthHeight});return true;};
    useSection('leadership');if(!generalPlan('leadership','leadership',bodySize)&&leaders.length){const heading=wardHeading('leadership',12,286),rows=leaders.map(row=>{const cells=[lines(row.calling,leaderSize,103),lines(row.name,leaderSize,103),lines(row.phone,leaderSize,66)];return {cells,height:Math.max(...cells.map(c=>c.length))*styleSize(leaderSize)*1.2};});blocks.push({kind:'leadership',...heading,rows,size:leaderSize,height:heading.band+rows.reduce((n,r)=>n+r.height,0)});}
    useSection('interviews');if(data.interviews.trim()){const heading=wardHeading('interviews',10,274,0),rows=lines(data.interviews,smallSize,274);blocks.push({kind:'interviews',...heading,rows,size:smallSize,height:rows.length*styleSize(smallSize)*1.2+heading.band+3});}
    useSection('missionaries');if(!generalPlan('missionaries','missionaries',bodySize)&&missionaries.length){const heading=wardHeading('missionaries',10,284,26),full=missionaries.length===1,rows=missionaries.map((content,i)=>lines(content,missionSize,full||missionaries.length===3&&i===2?274:135));const firstHeight=Math.max(...rows.slice(0,2).map(r=>r.length))*styleSize(missionSize)*1.2,secondHeight=rows.length>2?Math.max(...rows.slice(2).map(r=>r.length))*styleSize(missionSize)*1.2:0;blocks.push({kind:'missionaries',...heading,rows,size:missionSize,firstHeight,secondHeight,height:heading.band+firstHeight+(secondHeight?secondHeight+10:0)});}
    useSection('temple');if(data.temple.trim()){const heading=wardHeading('temple',12,288),rows=lines(data.temple,bodySize,275);blocks.push({kind:'temple',...heading,rows,size:bodySize,height:heading.band+rows.length*styleSize(bodySize)*1.2});}
    if(!generalPlan('information','schedule',bodySize)&&(schedule.length||hasNotes||data.fifthSunday.trim())){
      useSection('notes');const titleRows=hasNotes&&String(wardData.notesTitle||'').trim()?lines(wardData.notesTitle,9,78,bold):[],noteRows=notes?lines(notes,notesSize,78):[],classRows=notesRows.map(row=>{const cells=[lines(row.className,notesSize,45),lines(row.room,notesSize,26)];return {cells,height:Math.max(...cells.map(cell=>cell.length))*styleSize(notesSize)*1.2};}),titleHeight=titleRows.length*styleSize(9)*1.2,noteHeader=classRows.length?styleSize(8)*1.2+3:0,noteHeight=hasNotes?titleHeight+5+noteHeader+classRows.reduce((sum,row)=>sum+row.height,0)+(noteRows.length?noteRows.length*styleSize(notesSize)*1.2+3:0):0;
      useSection('schedule');const heading=wardHeading('information',10,286),classWidth=hasNotes?102:138,timeWidth=hasNotes?91:143,rows=schedule.map(row=>{const cells=[lines(row.className,scheduleSize,classWidth),lines(row.time,scheduleSize,timeWidth)];return {cells,height:Math.max(...cells.map(c=>c.length))*styleSize(scheduleSize)*1.2};}),extra=fifthPlan(),bodyHeight=Math.max(rows.reduce((n,r)=>n+r.height,0),noteHeight);
      blocks.push({kind:'schedule',...heading,rows,noteRows,noteTitleRows:titleRows,titleHeight,noteHeader,classRows,size:scheduleSize,notesSize,classWidth,bodyHeight,...extra,height:heading.band+bodyHeight+extra.fifthHeight});
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
    useSection(block.kind);if(block.general){
      if(block.kind==='missionaries')rounded(p,346,wardY,302,block.height,15);else rect(p,347,wardY,300,block.height,null,black,1);
      drawRows(block.titleRows,353,wardY+4,block.titleSize,bold,286);drawRows(block.rows,360,wardY+block.band-5,block.size);
      if(block.fifth.length){drawRows(block.fifthTitle,351,wardY+block.band+block.bodyHeight,8,bold);drawRows(block.fifth,351,wardY+block.band+block.bodyHeight+block.fifthTitleHeight,8);}
    }else if(block.kind==='leadership'){
      rect(p,347,wardY,298,block.height,null,black,1.5);drawRows(block.titleRows,353,wardY+4,block.titleSize,bold,286);let y=wardY+block.band-5;
      for(const row of block.rows){row.cells.forEach((cell,i)=>drawRows(cell,[355,464,574][i],y,block.size));y+=row.height;}
    }else if(block.kind==='interviews'){
      rule(p,355,wardY,284,black,1);drawRows(block.titleRows,360,wardY+4,block.titleSize,bold,274);drawRows(block.rows,360,wardY+block.band-2,block.size);rule(p,355,wardY+block.height,284,black,1);
    }else if(block.kind==='missionaries'){
      rounded(p,346,wardY,302,block.height,15);drawRows(block.titleRows,351,wardY+4,block.titleSize,bold,292);
      for(let i=0;i<block.rows.length;i++){const bottom=i>=2,y=wardY+block.band-5+(bottom?block.firstHeight+10:0),full=block.rows.length===1||block.rows.length===3&&i===2;drawRows(block.rows[i],full?360:357+(i%2)*145,y,block.size,font,full?274:0);}
      if(block.secondHeight)rule(p,355,wardY+block.band+block.firstHeight,280,black,1);
    }else if(block.kind==='temple'){
      rect(p,346,wardY,302,block.height,null,black,1);drawRows(block.titleRows,353,wardY+4,block.titleSize,bold,288);drawRows(block.rows,360,wardY+block.band-5,block.size);
    }else{
      rect(p,347,wardY,300,block.height,null,black,1);drawRows(block.titleRows,351,wardY+4,block.titleSize,bold,286);let y=wardY+block.band-5;
      for(const row of block.rows){drawRows(row.cells[0],351,y,block.size);drawRows(row.cells[1],351+block.classWidth+5,y,block.size);y+=row.height;}
      if(hasNotes){useSection('notes');const noteTop=wardY+block.band-7;rect(p,556,noteTop,86,block.bodyHeight+5);drawRows(block.noteTitleRows,560,noteTop+2,9,bold,78);let noteY=noteTop+block.titleHeight+5;if(block.classRows.length){text(p,'Class',560,noteY,8,bold);text(p,'Room #',608,noteY,8,bold);noteY+=block.noteHeader;for(const row of block.classRows){drawRows(row.cells[0],560,noteY,block.notesSize);row.cells[1].forEach((line,i)=>text(p,line,638-measure(font,line,block.notesSize),noteY+i*styleSize(block.notesSize)*1.2,block.notesSize));noteY+=row.height;}}if(block.noteRows.length)drawRows(block.noteRows,560,noteY+3,block.notesSize);useSection('schedule');}
      if(block.fifth.length){drawRows(block.fifthTitle,351,wardY+block.band+block.bodyHeight,8,bold);drawRows(block.fifth,351,wardY+block.band+block.bodyHeight+block.fifthTitleHeight,8);}
    }
    wardY+=block.height+8;
  }
  // Keep the cover image fixed; place optional content after it.
  useSection('cover');const quote=String(data.coverQuote||'').trim(),showQr=data.coverShowQr==='yes'&&/^data:image\/(png|jpeg);base64,/.test(data.coverQr||'');
  await picture(p,'assets/masthead.png',721,29,255,80);
  await picture(p,data.cover,722,113,252,336);
  function coverFooterPlan(density){
    const quoteSize=12-density*2,wardSize=21-density*8,stakeSize=16-density*5;
    const quoteRows=quote?lines(quote,quoteSize,283):[],wardRows=data.ward.trim()?lines(data.ward.toUpperCase(),wardSize,315):[],stakeRows=data.stake.trim()?lines(data.stake.toUpperCase(),stakeSize,315):[];
    const quoteHeight=quoteRows.length*styleSize(quoteSize)*1.2,wardHeight=wardRows.length*styleSize(wardSize)*1.2,stakeHeight=stakeRows.length*styleSize(stakeSize)*1.2;
    let y=quote?455:450;const quoteTop=y;if(quoteRows.length)y+=quoteHeight+5;const wardTop=y;if(wardRows.length)y+=wardHeight+3;const stakeTop=y;if(stakeRows.length)y+=stakeHeight;
    const qrTop=Math.max(528,y+5),bottom=showQr?qrTop+74:y;
    return {quoteSize,wardSize,stakeSize,quoteRows,wardRows,stakeRows,quoteTop,wardTop,stakeTop,qrTop,bottom,quoteHeight};
  }
  let coverDensity=0,footer=coverFooterPlan(0);
  while((footer.bottom>606||footer.quoteHeight>45)&&coverDensity<1){coverDensity=Math.min(1,coverDensity+.05);footer=coverFooterPlan(coverDensity);}
  if(footer.bottom>606||footer.quoteHeight>45)throw Error('The cover quote and names are too long to fit below the full-size image. Shorten the text or hide the QR code.');
  footer.quoteRows.forEach((line,i)=>centered(p,line,705,footer.quoteTop+i*styleSize(footer.quoteSize)*1.2,283,footer.quoteSize,italic));
  footer.wardRows.forEach((line,i)=>centered(p,line,685,footer.wardTop+i*styleSize(footer.wardSize)*1.2,315,footer.wardSize));
  footer.stakeRows.forEach((line,i)=>centered(p,line,685,footer.stakeTop+i*styleSize(footer.stakeSize)*1.2,315,footer.stakeSize));
  if(showQr){await picture(p,data.coverQr,823,footer.qrTop,55,55);await picture(p,'assets/scan-me.png',811,footer.qrTop+26,64,47);}
  // Announcements keep their own column and the calendar occupies two panels.
  const a=pages[0];useSection('announcements');rounded(a,10,33,323,559,18);centered(a,'ANNOUNCEMENTS',17,37,309,22,bold);
  const notices=typeof readNews==='function'?readNews().filter(n=>n.show!==false&&(n.title.trim()||n.body.trim())):data.announcements.split(/\n\s*\n/).filter(Boolean).map(text=>{const [title,...body]=text.split('\n');return {title,body:body.join('\n'),icon:'auto'}});if(letter){const first=calendarWindow().through;const future=events().filter(e=>e.date>dateKey(first));if(future.length)notices.push({title:'Future events',body:future.map(futureEventText).join(' / '),icon:''});}let y=69;
  const artwork=[[/choir/i,'choir'],[/ym\s*\/\s*yw|youth/i,2],[/primary activ/i,'primary-activities'],[/tithing/i,19],[/lunch/i,'lunch'],[/primary program/i,8],[/relief society/i,20],[/christmas/i,0]];
  const generalIcons={'choir':'music','2':'youth','primary-activities':'children','19':'giving','lunch':'meal','8':'program','20':'community','0':'holiday'};
  useSection('contact');const contact=String(data.submission||'').trim();let contactSize=8,contactRows=contact?lines(contact,contactSize,286,italic):[];while(contactRows.length*styleSize(contactSize)*1.2>45&&contactSize>7.5){contactSize-=.25;contactRows=lines(contact,contactSize,286,italic);}if(contactRows.length*styleSize(contactSize)*1.2>45)throw Error('Bulletin contact information is too long. Shorten the instructions.');
  const contactHeight=contactRows.length*styleSize(contactSize)*1.2,contactTop=contact?Math.min(562,588-contactHeight-5):592,newsHeight=contactTop-77;
  function noticePlan(n,scaleSize){
    useSection('announcements',{...(n.fontFamily?{family:n.fontFamily}:{}),...(n.fontStyle?{style:n.fontStyle}:{})});
    const requested=[9,10,11,12,14].includes(Number(n.fontSize))?Number(n.fontSize):10.3,size=Math.max(8.5,requested*scaleSize/10.3),faces=n.fontFamily==='serif'?{normal:serif,bold:serifBold,italic:serifItalic,bolditalic:serifBoldItalic}:{normal:font,bold,italic,bolditalic:boldItalic},bodyFace=faces[n.fontStyle]||faces.normal,titleFace=['italic','bolditalic'].includes(n.fontStyle)?faces.bolditalic:faces.bold;
    const content=[n.title,n.body].join('\n'),art=n.icon==='upload'?(n.image||null):(n.icon==='auto'?artwork.find(([re])=>re.test(content))?.[1]:n.icon||null),x=art!=null?61:18,w=art!=null?263:304;
    const tokenize=(value,f)=>clean(value||'').replace(/\r\n?/g,'\n').split(/(\n)/).flatMap(part=>part==='\n'?[{br:true}]:part.split(/\s+/).filter(Boolean).map(t=>({t,f})));
    const tokens=[...tokenize(n.title,titleFace),...tokenize(n.body,bodyFace)];let yy=0,xx=0,runs=[];
    for(const token of tokens){if(token.br){yy+=styleSize(size)*1.16;xx=0;continue;}const {t,f}=token;let chunk='';const chunks=[];for(const ch of t){if(measure(f,chunk+ch,size)>w&&chunk){chunks.push(chunk);chunk='';}chunk+=ch;}chunks.push(chunk);chunks.forEach((part,i)=>{const tw=measure(f,part+(i===chunks.length-1?' ':''),size);if(xx+tw>w&&xx>0){yy+=styleSize(size)*1.16;xx=0;}runs.push({t:part,f,xx,yy});xx+=tw;});}
    const textHeight=yy+styleSize(size)*1.16,contentHeight=Math.max(art!=null?33:0,textHeight);return {art,x,runs,size,height:contentHeight+9,iconOffset:(contentHeight-33)/2,textOffset:(contentHeight-textHeight)/2};
  }
  let size=10.3;while(size>8.5&&notices.reduce((v,n)=>v+noticePlan(n,size).height,0)>newsHeight)size=Math.max(8.5,size-.1);
  if(notices.reduce((v,n)=>v+noticePlan(n,size).height,0)>newsHeight)throw Error('Announcements'+(letter?' and future events':'')+' are too full to print clearly. Shorten or hide an item.');if(size<9)warnings.push('Announcements use smaller text');if(size<10.2&&notices.some(n=>n.fontSize))warnings.push('Announcement text scaled to fit');
  const extraGap=Math.min(14,Math.max(0,(newsHeight-notices.reduce((v,n)=>v+noticePlan(n,size).height,0))/Math.max(1,notices.length)));
  for(const n of notices){const plan=noticePlan(n,size);if(plan.art!=null)await picture(a,(String(plan.art).startsWith('data:image/')?plan.art:generalIcons[String(plan.art)]?`assets/icons/${generalIcons[String(plan.art)]}.png`:/^\d+$/.test(String(plan.art))?`assets/art-${plan.art}.png`:`assets/${plan.art}.png`),16,y+plan.iconOffset,38,33);for(const r of plan.runs)text(a,r.t,plan.x+r.xx,y+plan.textOffset+r.yy,plan.size,r.f);y+=plan.height+extraGap;}
  if(y>contactTop)throw Error('Announcements are too close to the contact footer. Shorten or hide an item.');
  if(contact){useSection('contact');rule(a,10,contactTop,323,rgb(.32,.2,.5));contactRows.forEach((line,i)=>text(a,line,35,contactTop+4+i*styleSize(contactSize)*1.2,contactSize,italic));}
  if(!letter){
  useSection('calendar');const range=calendarWindow(),first=range.from,rows=5,x0=366,calW=622,cw=calW/7,gridTop=129,ch=436/rows,dates=Array.from({length:35},(_,i)=>{const date=new Date(first);date.setDate(first.getDate()+i);return date;});
  const monthHeading=[...new Set(dates.map(date=>date.toLocaleDateString('en-US',{month:'long'})))].join('/');rect(a,364,56,626,35,gray,gray);centered(a,monthHeading,366,57,622,fitSize(25,28),bold);
  ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'].forEach((day,i)=>{centered(a,day,x0+i*cw+2,109,cw-4,fitSize(12,18))});
  const allEvents=events();for(let i=0;i<rows*7;i++){const date=dates[i],key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,x=x0+i%7*cw,top=gridTop+Math.floor(i/7)*ch;text(a,String(date.getDate()),x+5,top+1,fitSize(12,14));const labelHeight=monthLabel(a,date,x,top,cw);const ee=allEvents.filter(e=>e.date===key),bodyOffset=Math.max(14,styleSize(fitSize(12,14))+3,labelHeight+2),bodyX=x+2,bodyTop=top+bodyOffset,bodyWidth=cw-4,bodyHeight=ch-bodyOffset-2;
    const iconEvents=ee.filter(e=>e.art!=null),textEvents=ee.filter(e=>e.art==null).map(e=>({event:e,rows:lines(e.text,7.5,cw-9)})),textHeight=textEvents.reduce((sum,e)=>sum+e.rows.length*styleSize(8)+2,0),iconHeight=bodyHeight-textHeight-(textEvents.length&&iconEvents.length?3:0);
    if(textHeight>bodyHeight)throw Error('Too many events in calendar day '+key+'. Shorten event names or hide an item.');
    if(iconEvents.length){
      const gap=1,stacked=iconEvents.length<=4,sideTimes=stacked&&iconEvents.length>1,hasTimes=iconEvents.some(e=>e.calendarText!=='no'&&calendarTime(e.time)),timeBand=hasTimes&&!sideTimes?styleSize(9):0,minTimeWidth=Math.max(0,...iconEvents.map(e=>measure(font,e.calendarText==='no'?'':calendarTime(e.time),6.5)));
      let layout=null;
      for(let cols=stacked?1:Math.ceil(iconEvents.length/4);cols<=(stacked?1:iconEvents.length);cols++){
        const rowCount=Math.ceil(iconEvents.length/cols),tileWidth=(bodyWidth-gap*(cols-1))/cols,tileHeight=(iconHeight-gap*(rowCount-1))/rowCount,score=Math.min(tileWidth-(sideTimes&&hasTimes?minTimeWidth+3:0),tileHeight-timeBand);
        if(tileWidth>=minTimeWidth&&(!layout||score>layout.score))layout={cols,rowCount,tileWidth,tileHeight,score};
      }
      if(!layout||layout.score<(stacked?12:14))throw Error('Too many icon events in calendar day '+key+'. Hide an item or use shorter text-only entries.');
      const weight=event=>event.iconSize==='large'?2.5:event.iconSize==='small'?.6:1,rowWeights=Array.from({length:layout.rowCount},(_,row)=>Math.max(...iconEvents.slice(row*layout.cols,(row+1)*layout.cols).map(weight))),weightTotal=rowWeights.reduce((a,b)=>a+b,0),available=iconHeight-gap*(layout.rowCount-1),minimum=Math.min(12+timeBand,available/layout.rowCount),remaining=Math.max(0,available-minimum*layout.rowCount),rowHeights=rowWeights.map(value=>minimum+remaining*value/weightTotal);
      for(let eventIndex=0;eventIndex<iconEvents.length;eventIndex++){
        const event=iconEvents[eventIndex],row=Math.floor(eventIndex/layout.cols),col=eventIndex%layout.cols,countInRow=Math.min(layout.cols,iconEvents.length-row*layout.cols),rowWidth=countInRow*layout.tileWidth+(countInRow-1)*gap,tileX=bodyX+(bodyWidth-rowWidth)/2+col*(layout.tileWidth+gap),tileTop=bodyTop+rowHeights.slice(0,row).reduce((a,b)=>a+b,0)+row*gap,tileHeight=rowHeights[row],time=event.calendarText==='no'?'':calendarTime(event.time),pictureHeight=(tileHeight-(time&&!sideTimes?styleSize(9):0))*(layout.cols>1?Math.min(1,weight(event)/rowWeights[row]):1),pictureWidth=layout.tileWidth-(sideTimes&&hasTimes?minTimeWidth+2:0),art=event.art;
        const path=String(art).startsWith('data:image/')?art:generalIcons[String(art)]?`assets/icons/${generalIcons[String(art)]}.png`:/^\d+$/.test(String(art))?`assets/art-${art}.png`:`assets/${art}.png`;
        await calendarPicture(a,path,tileX,tileTop+(tileHeight-(time&&!sideTimes?styleSize(9):0)-pictureHeight)/2,pictureWidth,pictureHeight);
        if(time){if(sideTimes)text(a,time,tileX+pictureWidth+2,tileTop+(tileHeight-styleSize(6.5))/2,6.5);else centered(a,time,tileX,tileTop+tileHeight-styleSize(7.5),layout.tileWidth,6.5);}
      }
    }
    let textTop=bodyTop+(iconEvents.length?iconHeight+3:0);for(const entry of textEvents){entry.rows.forEach((line,index)=>text(a,line,x+5,textTop+index*styleSize(8),7.5));textTop+=entry.rows.length*styleSize(8)+2;}
  }


  // Draw the complete grid once, above artwork, so every edge has the same solid stroke.
  const gridBottom=gridTop+rows*ch,gridPath=[`M 0 0 H ${calW} V ${gridBottom-106} H 0 Z`];
  for(let col=1;col<7;col++)gridPath.push(`M ${col*cw} 0 V ${gridBottom-106}`);
  for(let row=0;row<rows;row++)gridPath.push(`M 0 ${gridTop-106+row*ch} H ${calW}`);
  a.drawSvgPath(gridPath.join(' '),{x:x0,y:612-106,borderColor:rgb(0,0,0),borderWidth:1});

  if(data.monthBorderMode!=='off'){
    const monthKey=date=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0'),keys=dates.map(monthKey),counts={};keys.forEach(key=>counts[key]=(counts[key]||0)+1);const mainMonth=Object.keys(counts).reduce((best,key)=>counts[key]>counts[best]?key:best),smallMonths=Object.keys(counts).filter(key=>key!==mainMonth);
    const fallback=/^#[0-9a-f]{6}$/i.test(data.monthBorderColor||'')?data.monthBorderColor:'#b85432';
    for(let i=0;i<dates.length;i++)if(keys[i]!==mainMonth){const key=keys[i],saved=(data.monthBorderColors||{})[key],hex=/^#[0-9a-f]{6}$/i.test(saved||'')?saved:smallMonths.indexOf(key)>0?'#416d91':fallback,border=data.monthBorderMode==='color'?rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255):black;
      const edge=(x1,t1,x2,t2)=>a.drawLine({start:{x:x1,y:612-t1},end:{x:x2,y:612-t2},color:border,thickness:2.5,lineCap:2});
      const row=Math.floor(i/7),col=i%7,x=x0+col*cw,top=gridTop+row*ch;if(row===0||keys[i-7]!==key)edge(x,top,x+cw,top);if(row===4||keys[i+7]!==key)edge(x,top+ch,x+cw,top+ch);if(col===0||keys[i-1]!==key)edge(x,top,x,top+ch);if(col===6||keys[i+1]!==key)edge(x+cw,top,x+cw,top+ch);
    }
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
