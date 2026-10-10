export const MAX_EVIDENCE_LENGTH=4000;

export function isEvidenceReady(value){
 return typeof value==='string'&&value.trim().length>0&&value.length<=MAX_EVIDENCE_LENGTH;
}
