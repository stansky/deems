"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { php } from "@codemirror/lang-php";
import { StreamLanguage } from "@codemirror/language";
import { go } from "@codemirror/legacy-modes/mode/go";
const Editor=dynamic(()=>import("@uiw/react-codemirror"),{ssr:false,loading:()=> <p>Loading code editor...</p>});
export function CodeEditor({value,onChange,language,readOnly=false}:{value:string;onChange:(value:string)=>void;language:"python"|"javascript"|"go"|"php";readOnly?:boolean}){
  const extensions=useMemo(()=>[language==="python"?python():language==="go"?StreamLanguage.define(go):language==="php"?php():javascript()],[language]);
  const label={python:"Python",javascript:"JavaScript",go:"Go",php:"PHP"}[language];
  return <div style={{border:"1px solid #dfe3e8",borderRadius:8,overflow:"hidden",fontSize:13}}><Editor value={value} height={readOnly?"auto":"340px"} maxHeight={readOnly?"650px":undefined} extensions={extensions} onChange={onChange} readOnly={readOnly} editable={!readOnly} aria-label={`${label} ${readOnly?"reference solution":"code editor"}`} basicSetup={{autocompletion:false,highlightActiveLine:!readOnly,foldGutter:true}} theme="light" /></div>;
}
export default CodeEditor;
