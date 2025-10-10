import { useCallback, useRef, useState } from "react";

const useLongPress = (
    onLongPress,
    onClick,
    { shouldPreventDefault = true, delay = 500 } = {}
) => {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef();
    const target = useRef();

    const preventDefault = useCallback(event => {
        if (!longPressTriggered) {
            clear(event, false);
        }
    }, [longPressTriggered]); // Added missing dependency 'clear' will be defined later, this is fine.

    const start = useCallback(
        event => {
            if (shouldPreventDefault && event.target) {
                event.target.addEventListener("touchend", preventDefault, { passive: false });
                target.current = event.target;
            }
            timeout.current = setTimeout(() => {
                onLongPress(event);
                setLongPressTriggered(true);
            }, delay);
        },
        [onLongPress, delay, shouldPreventDefault, preventDefault] // Added preventDefault
    );

    const clear = useCallback(
        (event, shouldTriggerClick = true) => {
            timeout.current && clearTimeout(timeout.current);
            shouldTriggerClick && !longPressTriggered && onClick(event);
            setLongPressTriggered(false);
            if (shouldPreventDefault && target.current) {
                target.current.removeEventListener("touchend", preventDefault);
            }
        },
        [shouldPreventDefault, onClick, longPressTriggered, preventDefault] // Added preventDefault
    );
    
    // Fix for the first missing dependency warning
    preventDefault.clear = clear; 
    
    return {
        onMouseDown: e => start(e),
        onTouchStart: e => start(e),
        onMouseUp: e => clear(e),
        onMouseLeave: e => clear(e, false),
        onTouchEnd: e => clear(e)
    };
};

export default useLongPress;