import { isElementNode, isScriptElement, isSlotElement, isStyleElement } from './node-type-guards';
import { Context } from '../core/context';

/** Options subset needed by SlotCloner */
export interface SlotClonerOptions {
    ignoreElements?: (element: Element) => boolean;
    copyStyles: boolean;
}

/** Exported for reuse in document-cloner.ts */
export const IGNORE_ATTRIBUTE = 'data-html2canvas-ignore';

/**
 * Handles shadow DOM child cloning, slot assignment, and light DOM traversal.
 * Extracted from DocumentCloner to reduce file size and improve separation of concerns.
 */
export class SlotCloner {
    constructor(
        private readonly cloneNodeFn: (node: Node, copyStyles: boolean) => Node,
        private readonly options: SlotClonerOptions,
        private readonly context: Context
    ) {}

    appendChildNode(clone: HTMLElement | SVGElement, child: Node, copyStyles: boolean): void {
        this.safeAppendClonedChild(clone, child, copyStyles);
    }

    /**
     * Clone child nodes from source element to clone element.
     * Handles shadow DOM, slots, and light DOM appropriately.
     */
    cloneChildNodes(node: Element, clone: HTMLElement | SVGElement, copyStyles: boolean): void {
        if (node.shadowRoot && clone.shadowRoot) {
            // Both original and clone have shadow roots - clone shadow DOM content
            this.cloneShadowDOMChildren(node.shadowRoot, clone.shadowRoot, copyStyles);
            // Also clone light DOM (slot content sources)
            this.cloneLightDOMChildren(node, clone, copyStyles);
        } else if (node.shadowRoot && !clone.shadowRoot) {
            // Original has shadow root but clone doesn't (creation failed)
            // Fallback: clone shadow DOM content as light DOM to preserve content
            this.cloneShadowDOMAsLightDOM(node.shadowRoot, clone, copyStyles);
        } else {
            // No shadow DOM - just clone light DOM children
            this.cloneLightDOMChildren(node, clone, copyStyles);
        }
    }

    /**
     * Check if a child node should be cloned based on filtering rules.
     * Filters out: scripts, ignored elements, and optionally styles.
     */
    private shouldCloneChild(child: Node): boolean {
        return (
            !isElementNode(child) ||
            (!isScriptElement(child) &&
                !child.hasAttribute(IGNORE_ATTRIBUTE) &&
                (typeof this.options.ignoreElements !== 'function' || !this.options.ignoreElements(child)))
        );
    }

    /**
     * Check if a style element should be cloned based on copyStyles option.
     */
    private shouldCloneStyleElement(child: Node): boolean {
        return !this.options.copyStyles || !isElementNode(child) || !isStyleElement(child);
    }

    /**
     * Safely append a cloned child to a target, applying all filtering rules.
     */
    private safeAppendClonedChild(
        target: ShadowRoot | HTMLElement | SVGElement,
        child: Node,
        copyStyles: boolean
    ): void {
        if (this.shouldCloneChild(child) && this.shouldCloneStyleElement(child)) {
            target.appendChild(this.cloneNodeFn(child, copyStyles));
        }
    }

    /**
     * Clone assigned nodes from a slot element to the target.
     */
    private cloneAssignedNodes(assignedNodes: Node[], target: ShadowRoot, copyStyles: boolean): void {
        assignedNodes.forEach((node) => {
            this.safeAppendClonedChild(target, node, copyStyles);
        });
    }

    /**
     * Clone fallback content from a slot element when no nodes are assigned.
     */
    private cloneSlotFallbackContent(slot: Element, target: ShadowRoot, copyStyles: boolean): void {
        for (let child = slot.firstChild; child; child = child.nextSibling) {
            this.safeAppendClonedChild(target, child, copyStyles);
        }
    }

    /**
     * Handle cloning of a slot element, including assigned nodes or fallback content.
     */
    private cloneSlotElement(slot: Element, targetShadowRoot: ShadowRoot, copyStyles: boolean): void {
        if (!isSlotElement(slot)) {
            return;
        }

        const slotElement = slot as HTMLSlotElement;

        // Defensive check: ensure assignedNodes method exists
        if (typeof slotElement.assignedNodes !== 'function') {
            this.context.logger.warn('HTMLSlotElement.assignedNodes is not available', slot);
            this.cloneSlotFallbackContent(slot, targetShadowRoot, copyStyles);
            return;
        }

        const assignedNodes = slotElement.assignedNodes();

        // Defensive check: ensure assignedNodes returns an array
        if (!assignedNodes || !Array.isArray(assignedNodes)) {
            this.context.logger.warn('assignedNodes() did not return a valid array', slot);
            this.cloneSlotFallbackContent(slot, targetShadowRoot, copyStyles);
            return;
        }

        if (assignedNodes.length > 0) {
            // Clone assigned nodes
            this.cloneAssignedNodes(assignedNodes, targetShadowRoot, copyStyles);
        } else {
            // Clone fallback content
            this.cloneSlotFallbackContent(slot, targetShadowRoot, copyStyles);
        }
    }

    /**
     * Clone shadow DOM children to the target shadow root.
     */
    private cloneShadowDOMChildren(shadowRoot: ShadowRoot, targetShadowRoot: ShadowRoot, copyStyles: boolean): void {
        for (let child = shadowRoot.firstChild; child; child = child.nextSibling) {
            if (isElementNode(child) && isSlotElement(child)) {
                // Handle slot elements specially
                this.cloneSlotElement(child, targetShadowRoot, copyStyles);
            } else {
                // Clone regular elements
                this.safeAppendClonedChild(targetShadowRoot, child, copyStyles);
            }
        }
    }

    /**
     * Clone light DOM children to the target element.
     */
    private cloneLightDOMChildren(node: Element, clone: HTMLElement | SVGElement, copyStyles: boolean): void {
        for (let child = node.firstChild; child; child = child.nextSibling) {
            this.appendChildNode(clone, child, copyStyles);
        }
    }

    /**
     * Clone slot element as light DOM when shadow root creation failed.
     */
    private cloneSlotElementAsLightDOM(slot: Element, clone: HTMLElement | SVGElement, copyStyles: boolean): void {
        if (!isSlotElement(slot)) {
            return;
        }

        const slotElement = slot as HTMLSlotElement;

        if (typeof slotElement.assignedNodes !== 'function') {
            // Fallback: clone slot's children
            for (let child = slot.firstChild; child; child = child.nextSibling) {
                this.appendChildNode(clone, child, copyStyles);
            }
            return;
        }

        const assignedNodes = slotElement.assignedNodes();

        if (assignedNodes && Array.isArray(assignedNodes) && assignedNodes.length > 0) {
            // Clone assigned nodes as light DOM
            assignedNodes.forEach((node) => this.appendChildNode(clone, node, copyStyles));
        } else {
            // Clone fallback content as light DOM
            for (let child = slot.firstChild; child; child = child.nextSibling) {
                this.appendChildNode(clone, child, copyStyles);
            }
        }
    }

    /**
     * Clone shadow DOM content as light DOM when shadow root creation failed.
     * This is a fallback mechanism to ensure content is not lost.
     */
    private cloneShadowDOMAsLightDOM(
        shadowRoot: ShadowRoot,
        clone: HTMLElement | SVGElement,
        copyStyles: boolean
    ): void {
        for (let child = shadowRoot.firstChild; child; child = child.nextSibling) {
            if (isElementNode(child) && isSlotElement(child)) {
                this.cloneSlotElementAsLightDOM(child, clone, copyStyles);
            } else {
                this.appendChildNode(clone, child, copyStyles);
            }
        }
    }
}
