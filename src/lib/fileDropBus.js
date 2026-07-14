let handler = null;

export function registerFileDropHandler(fn){
    handler = fn
    return () => {
        if (handler === fn) handler = null
    }
}

export function emitFileDrop(file){
    if(handler) {
        handler(file)
        return true
    }
    return false
}

