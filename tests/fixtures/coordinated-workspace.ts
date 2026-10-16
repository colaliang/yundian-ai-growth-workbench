import {runWorkspaceMutation} from '../../src/runtime/workspace.ts';
// Tests use the same local mutation coordinator as official entry points.
export function fixtureMutation<T>(root:string,operation:()=>T|Promise<T>):Promise<T>{return runWorkspaceMutation(root,{},()=>operation());}
