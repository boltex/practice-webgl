/**
 * * Checks if a string is formatted as a valid rrggbb color code.
 * @param hexString hexadecimal 6 digits string, without leading '0x'
 * @returns True if the string is a valid representation of an hexadecimal 6 digit number
 */
export function isHexColor(hexString: string): boolean {
    return typeof hexString === 'string'
        && hexString.length === 6
        && !isNaN(Number('0x' + hexString));
}

/**
 * Will reset if no parameters are passed.
 */
export function setZoom(zoomLevel = 1.0, siteWidth = 'device-width'): void {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute(
            'content',
            'width=' + siteWidth + ', initial-scale=' + zoomLevel
        );
    }
}

export function fullScreen(element: Element): Promise<void> {
    if (document.fullscreenElement) {
        return Promise.resolve();  // already fullscreen
    }
    if (element.requestFullscreen) {
        return element.requestFullscreen().catch((err) => {
            alert(
                `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
            );
        });
        // } else if (element.mozRequestFullScreen) { // Firefox
        //     return element.mozRequestFullScreen();
        // } else if (element.webkitRequestFullscreen) { // Chrome, Safari, Opera
        //     return element.webkitRequestFullscreen();
        // } else if (element.msRequestFullscreen) { // IE/Edge
        //    return  element.msRequestFullscreen();
    } else {
        return Promise.resolve();
    }
}

