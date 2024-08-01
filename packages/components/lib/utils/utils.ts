// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<Fn>(fn: Fn, delay: number): Fn {
    let lastTime = 0;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return function (...args: unknown[]) {
        const now = Date.now();
        if (now - lastTime > delay) {
            lastTime = now;
            // eslint-disable-next-line @typescript-eslint/ban-types
            (fn as Function)(...args);
        }
    };
}