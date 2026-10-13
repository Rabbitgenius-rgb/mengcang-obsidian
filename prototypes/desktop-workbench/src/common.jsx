import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';

// Browser previews retain their original card proportions with owned placeholders.
// RealArt below continues to use the actual desktop source without demo fallback.
const art = {
  mist: [1, 328, 294, 207, 133],
  lake: [1, 1206, 61, 236, 166],
  forest: [1, 1357, 394, 66, 83],
  leafShadow: [2, 1237, 125, 194, 113],
  coast: [2, 1105, 127, 93, 88],
  typography: [2, 989, 128, 93, 87],
  website: [2, 874, 271, 94, 87],
  paper: [2, 988, 265, 96, 97],
  brush: [2, 874, 418, 91, 87],
  mountain: [2, 988, 418, 94, 88],
  plant: [2, 1106, 418, 92, 87],
  bookTree: [2, 545, 661, 74, 104],
  bookMountain: [3, 224, 636, 107, 175],
  bookSea: [2, 238, 695, 69, 101],
  bookWild: [2, 335, 695, 68, 100],
  bookSummer: [2, 429, 695, 68, 100],
  bookSlow: [2, 140, 876, 65, 102],
  bookIsland: [2, 238, 877, 66, 101],
  bookPoem: [2, 336, 877, 68, 101],
  bookLight: [2, 430, 877, 66, 101],
};
export function Art({src,real=false,name='mist',className='',alt='',style={}}) {
  return real ? <RealArt src={src} className={className} alt={alt} style={style}/> : <PreviewArt name={name} className={className} alt={alt} style={style}/>;
}
function RealArt({src,className='',alt='',style={}}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  useEffect(()=>{const retry=()=>setFailed(false);window.addEventListener('mengcang-assets-refresh',retry);return()=>window.removeEventListener('mengcang-assets-refresh',retry);},[]);
  return <span className={`art real-art ${className} ${!src || failed?'real-art-missing':''}`} style={style}>{src && !failed ? <img draggable={false} loading="lazy" decoding="async" alt={alt} src={src} onError={()=>setFailed(true)}/> : <span role="img" aria-label={alt ? `${alt}：${src?'文件无法读取':'未关联图片'}` : '未关联图片'}>{src?'文件无法读取':'未关联图片'}</span>}</span>;
}
function PreviewArt({name='mist',className='',alt='',style={}}) {
  const ref = useRef(null); const [box,setBox] = useState(null);
  const [,,,w,h]=art[name] || art.mist;
  useLayoutEffect(()=>{ const node=ref.current; const o=new ResizeObserver(([e])=>setBox(e.contentRect));o.observe(node);return()=>o.disconnect(); },[]);
  return <span ref={ref} className={`art ${className}`} role="img" aria-label={alt ? `${alt}（演示占位图）` : '演示占位图'} style={{aspectRatio:`${w}/${h}`,...style}}>
    {box && <img draggable="false" aria-hidden="true" alt="" src="/assets/inspiration-placeholder.svg" style={{width:box.width,height:box.height,left:0,top:0,objectFit:'contain'}}/>}
  </span>;
}
export function EmptyState({title='没有找到内容',description='换个关键词，或添加一条新的记录。'}) {return <div className="empty-state"><IconSearch size={25} stroke={1.3}/><strong>{title}</strong><p>{description}</p></div>}
