interface FunctionType {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]): void
}

export function throttle<Fn extends FunctionType>(fn: Fn, delay: number): Fn {
    let lastTime = 0;

    return function (...args: unknown[]) {
        const now = Date.now();
        if (now - lastTime > delay) {
            lastTime = now;
            // eslint-disable-next-line @typescript-eslint/ban-types
            (fn as Function)(...args);
        }
    } as Fn
}



export function debounce<Fn extends FunctionType>(fn: Fn, delay: number): Fn {
    let timer: number | null = null

    return function (...args: unknown[]) {
        if (timer != null) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            fn(...args)
        }, delay)
    } as Fn

}