"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
declare global { interface Window { EXCALIDRAW_ASSET_PATH?: string | string[] } }

const Canvas=dynamic(async()=>{
  window.EXCALIDRAW_ASSET_PATH="/excalidraw-assets/";
  return (await import("@excalidraw/excalidraw")).Excalidraw;
},{ssr:false,loading:()=> <p style={{padding:24}}>Loading your design canvas...</p>});
function parseScene(value:string):ExcalidrawInitialDataState {
  try { const data=JSON.parse(value); return {elements:Array.isArray(data.elements)?data.elements:[],appState:{viewBackgroundColor:"#ffffff"},files:data.files??{}}; }
  catch{return {elements:[],appState:{viewBackgroundColor:"#ffffff"}};}
}
export function DesignBoard({value,onChange}:{value:string;onChange:(value:string)=>void}){
  const [api,setApi]=useState<ExcalidrawImperativeAPI|null>(null);
  const last=useRef(value);
  const initial=useRef(parseScene(value));
  useEffect(()=>{
    if(api && value!==last.current){
      last.current=value;
      const scene=parseScene(value);
      api.updateScene({elements:scene.elements??[]});
      if(scene.files)api.addFiles(Object.values(scene.files));
    }
  },[value,api]);
  return <div style={{height:500,border:"1px solid #dfe3e8",borderRadius:8,overflow:"hidden"}}>
    <Canvas excalidrawAPI={setApi} initialData={initial.current} theme="light" UIOptions={{tools:{image:false},canvasActions:{loadScene:false,saveToActiveFile:false,export:false}}} onChange={(elements,_appState,files)=>{
      const serialized=JSON.stringify({elements,files});
      if(serialized!==last.current){last.current=serialized;onChange(serialized);}
    }}/>
  </div>;
}
export default DesignBoard;
