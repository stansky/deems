"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { php } from "@codemirror/lang-php";
import { StreamLanguage } from "@codemirror/language";
import { go } from "@codemirror/legacy-modes/mode/go";
import { useTheme } from "./theme";
const Editor=dynamic(()=>import("@uiw/react-codemirror"),{ssr:false,loading:()=> <p>Loading code editor...</p>});
export function CodeEditor({value,onChange,language,readOnly=false}:{value:string;onChange:(value:string)=>void;language:"python"|"javascript"|"go"|"php";readOnly?:boolean}){
  const { resolved } = useTheme();
  const extensions=useMemo(()=>[language==="python"?python():language==="go"?StreamLanguage.define(go):language==="php"?php():javascript()],[language]);
  const label={python:"Python",javascript:"JavaScript",go:"Go",php:"PHP"}[language];
  return <div className="deems-code-editor" style={{border:"1px solid var(--ui-line, #dfe3e8)",borderRadius:8,overflow:"hidden",fontSize:14}}><Editor value={value} height={readOnly?"auto":"400px"} maxHeight={readOnly?"650px":undefined} extensions={extensions} onChange={onChange} readOnly={readOnly} editable={!readOnly} aria-label={`${label} ${readOnly?"reference solution":"code editor"}`} basicSetup={{autocompletion:false,highlightActiveLine:!readOnly,foldGutter:true}} theme={resolved} /></div>;
}
export default CodeEditor;
