/**
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isVisible(element) {
    return element.offsetWidth > 0
        || element.offsetHeight > 0
        || element.getClientRects().length > 0
}
