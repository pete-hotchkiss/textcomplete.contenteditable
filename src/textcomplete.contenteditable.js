// @flow

import Editor from "textcomplete/lib/editor"
import SearchResult from "textcomplete/lib/search_result"
import { calculateElementOffset, getLineHeightPx } from "textcomplete/lib/utils"

const CALLBACK_METHODS = ["onInput", "onKeydown"]

export default class extends Editor {
  el: HTMLElement
  selection: Selection

  constructor(el: HTMLElement) {
    super()
    this.el = el
    this.document = el.ownerDocument
    this.view = this.document.defaultView
    this.selection = this.view.getSelection()

    CALLBACK_METHODS.forEach(method => {
      ;(this: any)[method] = (this: any)[method].bind(this)
    })

    this.startListening()
  }

  destroy() {
    super.destroy()
    this.stopListening()
    ;(this: any).el = null
    return this
  }

  applySearchResult(searchResult: SearchResult) {
    let before = this.getBeforeCursor()
    const after = this.getAfterCursor()

    if (before != null && after != null) {

      if (searchResult.strategy.props.striptag) {
        before = searchResult.strategy.props.striptag(before)
      }

      const replace = searchResult.replace(before, after)


      if (Array.isArray(replace)) {

        const range = this.getRange()

        if (range.startContainer.childNodes.length > 0) {
            range.selectNode(range.startContainer.childNodes[range.endOffset]);
        } else {
              range.selectNode((range.startContainer.firstChild) ? range.startContainer.firstChild : range.startContainer);
        }

        range.startContainer.focus();

        let html = `${replace[0]}${replace[1]}&nbsp;`;

        this.document.execCommand("insertHTML", false, html);
        range.detach()

        const newRange = this.getRange();

        const cleanstring = replace[0].replace(/<\/?[^>]+(>|$)/g, "");
        const atEnd = cleanstring.trim().endsWith(newRange.startContainer.textContent);

        if (atEnd) {
            newRange.setStart(newRange.startContainer, newRange.startContainer.length);
        } else {
            newRange.setStart(newRange.startContainer, 1);
        }
        newRange.collapse(true);
      }
    }
  }

  getCursorOffset() {
    const range = this.getRange()
    const rangeRects = range.getBoundingClientRect()

    const docRects = this.document.body.getBoundingClientRect()
    const container = range.startContainer
    const el: HTMLElement = (container instanceof Text
      ? container.parentElement
      : container: any)

    const left = rangeRects.left - docRects.left
    const lineHeight = getLineHeightPx(el)
    const top = rangeRects.top - docRects.top + lineHeight
    return this.el.dir !== "rtl"
      ? { left, lineHeight, top }
      : { right: left, lineHeight, top }
  }

  getBeforeCursor() {
    const range = this.getRange()
    if (range.collapsed && range.startContainer instanceof Text) {
      return range.startContainer.wholeText.substring(0, range.startOffset)
    }
    return null
  }

  getAfterCursor() {
    const range = this.getRange()
    if (range.collapsed && range.startContainer instanceof Text) {
      return range.startContainer.wholeText.substring(range.startOffset)
    }
    return null
  }

  /** @private */
  onInput(_: Event) {
    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      // Safari behaves much stranger than Chrome and Firefox.
      return
    }
    this.emitChangeEvent()
  }

  /** @private */
  onKeydown(e: KeyboardEvent) {
    const code = this.getCode(e)
    let event
    if (code === "UP" || code === "DOWN") {
      event = this.emitMoveEvent(code)
    } else if (code === "ENTER") {
      event = this.emitEnterEvent()
    } else if (code === "ESC") {
      event = this.emitEscEvent()
    }
    if (event && event.defaultPrevented) {
      e.preventDefault()
    }
  }

  /** @private */
  startListening() {
    this.el.addEventListener("input", this.onInput)
    this.el.addEventListener("keydown", this.onKeydown)
  }

  /** @private */
  stopListening() {
    this.el.removeEventListener("input", this.onInput)
    this.el.removeEventListener("keydown", this.onKeydown)
  }

  /** @private */
  getRange(force: ?boolean): Range {
    for (let i = 0, l = this.selection.rangeCount; i < l; i++) {
      const range = this.selection.getRangeAt(i)
      if (this.el.contains(range.startContainer)) {
        return range
      }
    }
    // The element is not active.
    if (force) {
      throw new Error("Unexpected")
    }
    const activeElement = this.document.activeElement
    this.el.focus()
    const range = this.getRange(true)
    activeElement && activeElement.focus()
    return range
  }
}
