import { useEffect } from 'react'
import { registerFileDropHandler } from '../lib/fileDropBus'


export function useFileDrop(onFile){
useEffect(()=>{
    const unregister = registerFileDropHandler(onFile)
    return unregister;
}, [onFile])
}