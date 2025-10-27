import { useCallback, useRef } from 'react';

// A simpler and more robust implementation
export default function useLongPress(onLongPress, onClick, { delay = 500 } = {}) {
    const timeout = useRef();
    const startPos = useRef({ x: 0, y: 0 });
    const isLongPress = useRef(false);
    const isScrolling = useRef(false);

    const start = useCallback((event) => {
        // Get initial touch/mouse position
        const point = event.touches ? event.touches[0] : event;
        startPos.current = { x: point.clientX, y: point.clientY };

        // Reset flags for the new interaction
        isLongPress.current = false;
        isScrolling.current = false;

        // Start the timer for the long press
        timeout.current = setTimeout(() => {
            // If the finger hasn't moved (is not scrolling), trigger the long press
            if (!isScrolling.current) {
                isLongPress.current = true;
                onLongPress(event);
            }
        }, delay);
    }, [onLongPress, delay]);

    const move = useCallback((event) => {
        // If there's no start position recorded, do nothing
        if (!startPos.current.x && !startPos.current.y) {
            return;
        }

        const point = event.touches ? event.touches[0] : event;
        const deltaX = Math.abs(point.clientX - startPos.current.x);
        const deltaY = Math.abs(point.clientY - startPos.current.y);
        const threshold = 10; // A 10-pixel movement threshold

        // If the finger has moved more than the threshold, it's a scroll
        if (deltaX > threshold || deltaY > threshold) {
            isScrolling.current = true;
            // Immediately cancel the long press timer if it's running
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
        }
    }, []);

    const end = useCallback((event) => {
        // Always clear the timer when the press ends
        if (timeout.current) {
            clearTimeout(timeout.current);
        }

        // IMPORTANT: Trigger the onClick function ONLY if it was NOT a long press AND it was NOT a scroll
        if (!isLongPress.current && !isScrolling.current) {
            onClick(event);
        }

        // Reset start position for the next interaction
        startPos.current = { x: 0, y: 0 };
    }, [onClick]);

    return {
        onMouseDown: start,
        onTouchStart: start,
        onMouseMove: move,
        onTouchMove: move,
        onMouseUp: end,
        onTouchEnd: end,
        onMouseLeave: end, // Also treat leaving the element as an 'end' event to prevent sticky states
    };
}
