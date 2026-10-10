import type {Artifact} from '../domain/contracts.ts';
export interface ModuleDefinition {id:string;number:number;title:string;stages:string[];free:boolean}
export const MODULES:ModuleDefinition[]=[
  {
    "id": "market-research",
    "number": 1,
    "title": "市场调研",
    "stages": [
      "market-research"
    ],
    "free": true
  },
  {
    "id": "product-opportunity",
    "number": 2,
    "title": "产品机会",
    "stages": [
      "product-opportunity"
    ],
    "free": true
  },
  {
    "id": "site-and-content",
    "number": 3,
    "title": "建站",
    "stages": [
      "site-and-content"
    ],
    "free": false
  },
  {
    "id": "seo-geo",
    "number": 4,
    "title": "SEO与GEO",
    "stages": [
      "seo-geo",
      "seo",
      "geo"
    ],
    "free": false
  },
  {
    "id": "content-operations",
    "number": 5,
    "title": "内容运营",
    "stages": [
      "content-operations"
    ],
    "free": false
  },
  {
    "id": "acquisition",
    "number": 6,
    "title": "LinkedIn主动获客",
    "stages": [
      "acquisition"
    ],
    "free": false
  },
  {
    "id": "buyer-check",
    "number": 7,
    "title": "客户背调",
    "stages": [
      "buyer-check"
    ],
    "free": true
  },
  {
    "id": "sales-feedback",
    "number": 8,
    "title": "销售反馈",
    "stages": [
      "sales-feedback"
    ],
    "free": true
  },
  {
    "id": "next-cycle",
    "number": 9,
    "title": "优化下一轮",
    "stages": [
      "next-cycle"
    ],
    "free": false
  },
  {
    "id": "social-media",
    "number": 10,
    "title": "社媒运营",
    "stages": [
      "social-media"
    ],
    "free": false
  },
  {
    "id": "facebook-ads",
    "number": 11,
    "title": "Facebook广告",
    "stages": [
      "facebook-ads"
    ],
    "free": false
  },
  {
    "id": "google-ads",
    "number": 12,
    "title": "Google Ads",
    "stages": [
      "google-ads"
    ],
    "free": false
  },
  {
    "id": "email-outreach",
    "number": 13,
    "title": "邮件开发",
    "stages": [
      "email-outreach"
    ],
    "free": false
  }
];
export function moduleForStage(stage:string):string|null{return MODULES.find(m=>m.stages.includes(stage))?.id||null;}
export function artifactsForModule(state:Record<string,unknown>,moduleId:string):Artifact[]{return ((state.artifacts||[]) as Artifact[]).filter(a=>{const task=((state.tasks||[]) as {id:string;stage:string}[]).find(t=>t.id===a.taskId);return moduleForStage(task?.stage||a.module)===moduleId;});}
