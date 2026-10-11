import type {Expert} from '../../src/domain/contracts.ts';
export function consultationForModule(moduleId:string):Expert|null;
export function moduleConsultationView(moduleId:string,esc:(value:unknown)=>string):string;
export function expertDetail(expert:Expert,esc:(value:unknown)=>string):string;
