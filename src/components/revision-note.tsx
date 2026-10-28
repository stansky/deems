"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "./ui";
import { useLocalDraft } from "./use-local-draft";
import { useCommandDraft } from "./use-command-draft";
import { CareerHistory } from "./features/career/history";
import type { CommandMeta, RecordRevision } from "@/domains/career/contracts";
export function RevisionNote({noteKey,value,revision,revisions,saving,mutate,label="Your version",placeholder="Write this as you would actually say it. Add only details and results you can stand behind.",saveLabel="Save my version"}:{label?:string;placeholder?:string;saveLabel?:string;noteKey:string;value:string;revision:number;revisions:RecordRevision[];saving:boolean;mutate:(action:string,data:unknown,meta?:CommandMeta)=>Promise<boolean>}) {
  const {draft,setDraft,clearDraft}=useLocalDraft(`note:${noteKey}`,{value});
  const command=useCommandDraft(`note:${noteKey}`,revision);
  const [error,setError]=useState("");
  async function save() {
    setError("");
    try { const data={key:noteKey,value:draft.value};const meta=command.meta("note",data); if(await mutate("note",data,meta)){command.commit(meta.expectedRevision+1);clearDraft();} }
    catch(e){setError(e instanceof Error?e.message:"Could not save your draft.");}
  }
  return <><label className="field-label">{label}<textarea className="notes-textarea" placeholder={placeholder} value={draft.value} onChange={e=>setDraft({value:e.target.value})}/></label>{error&&<p role="alert">{error}</p>}{(command.reviewRequired||command.baseRevision!==revision)&&<div className="notice"><p>The saved version changed, or this draft predates revision tracking. Compare your draft with the saved text.</p><pre style={{whiteSpace:"pre-wrap"}}>{value||"No saved text."}</pre><Button variant="secondary" onClick={()=>command.acceptRevision(revision)}>Use current revision for my draft</Button></div>}<Button disabled={saving} onClick={save}>{saveLabel}<Check size={15}/></Button><details className="target-history-section"><summary>Saved note history</summary><CareerHistory revisions={revisions} entityType="note" entityId={noteKey}/></details></>;
}
