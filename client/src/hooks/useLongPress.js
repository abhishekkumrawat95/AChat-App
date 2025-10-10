import { useCallback, useRef, useState } from 'react';

export default function useLongPress(onLongPress, onClick, { delay = 500 } = {}) {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef();

    const start = useCallback((event) => {
        // We use a timeout to detect a long press.
        timeout.current = setTimeout(() => {
            onLongPress(event);
            setLongPressTriggered(true); // Set a flag to indicate a long press happened.
        }, delay);
    }, [onLongPress, delay]);

    const clear = useCallback((event) => {
        // If the mouse is released, clear the timeout.
        timeout.current && clearTimeout(timeout.current);

        // IMPORTANT: Only trigger the regular onClick if a long press has NOT been triggered.
        if (longPressTriggered === false) {
            onClick(event);
        }

        // Reset the flag for the next press.
        setLongPressTriggered(false);
    }, [onClick, longPressTriggered]);
    
    // If the mouse leaves the element, we should cancel the long press.
    const cancel = () => {
        timeout.current && clearTimeout(timeout.current);
        setLongPressTriggered(false);
    };

    return {
        onMouseDown: (e) => start(e),
        onTouchStart: (e) => start(e),
        onMouseUp: (e) => clear(e),
        onTouchEnd: (e) => clear(e),
        onMouseLeave: cancel,
    };
}